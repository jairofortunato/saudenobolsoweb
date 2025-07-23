'use client';

import React, { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { NovaEntradaModal } from '../../../components/ui/NovaEntradaModal';

const AutoDetectionDemo: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isTestingClassification, setIsTestingClassification] = useState(false);
  const [multiCategoryTestResults, setMultiCategoryTestResults] = useState<any[]>([]);
  const [isTestingMultiCategory, setIsTestingMultiCategory] = useState(false);

  // Sample medical texts for testing
  const sampleTexts = [
    {
      text: "Tomo Losartana 50mg uma vez ao dia desde março de 2023 para controlar minha pressão arterial.",
      expectedCategory: "medications",
      expectedLabel: "Medicamento"
    },
    {
      text: "Fui diagnosticado com diabetes tipo 2 em janeiro de 2024. Estou controlando com dieta e exercícios.",
      expectedCategory: "diseases", 
      expectedLabel: "Condição Médica"
    },
    {
      text: "Sou alérgico a camarão. Quando como, fico com urticária e coceira na pele.",
      expectedCategory: "allergies",
      expectedLabel: "Alergia"
    },
    {
      text: "Fiz exame de sangue semana passada com Dr. Silva. Colesterol total deu 190 mg/dL.",
      expectedCategory: "exams",
      expectedLabel: "Exame"
    },
    {
      text: "Consultei com cardiologista Dr. Santos ontem por causa de dor no peito. Ele pediu um eletrocardiograma.",
      expectedCategory: "consultations",
      expectedLabel: "Consulta"
    }
  ];

  // Multi-category test samples
  const multiCategoryTexts = [
    {
      text: "Fui ao Dr. Silva ontem para minha consulta de rotina. Ele me prescreveu Losartana 50mg uma vez ao dia para minha hipertensão e pediu um exame de sangue para verificar meu colesterol.",
      expectedCategories: ["consultations", "medications", "exams", "diseases"],
      expectedLabels: ["Consulta", "Medicamento", "Exame", "Condição Médica"]
    },
    {
      text: "Tenho diabetes tipo 2 há 3 anos. Tomo Metformina 500mg duas vezes ao dia. Ontem consultei com endocrinologista Dr. Costa que pediu hemoglobina glicada.",
      expectedCategories: ["diseases", "medications", "consultations", "exams"],
      expectedLabels: ["Condição Médica", "Medicamento", "Consulta", "Exame"]
    },
    {
      text: "Sou alérgico a penicilina - tenho reação grave com inchaço. Por isso sempre informo médicos nas consultas.",
      expectedCategories: ["allergies", "consultations"],
      expectedLabels: ["Alergia", "Consulta"]
    },
    {
      text: "Tomo Losartana 50mg de manhã e Metformina 500mg duas vezes ao dia. Também tenho diabetes tipo 2 e hipertensão. Sou alérgico a penicilina e camarão.",
      expectedCategories: ["medications", "diseases", "allergies"],
      expectedLabels: ["Medicamento", "Condição Médica", "Alergia"],
      description: "Teste com múltiplas entradas por categoria"
    },
    {
      text: "Fiz exame de sangue na segunda-feira e raio-X na terça. O hemograma mostrou anemia e o raio-X detectou uma pequena lesão no pulmão. Consultei Dr. Santos e Dr. Lima.",
      expectedCategories: ["exams", "diseases", "consultations"],
      expectedLabels: ["Exame", "Condição Médica", "Consulta"],
      description: "Múltiplos exames e consultas"
    }
  ];

  const testClassification = async () => {
    setIsTestingClassification(true);
    setTestResults([]);

    for (const sample of sampleTexts) {
      try {
        const response = await fetch('/api/ai/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: sample.text,
            submitDirectly: false // Just test classification without submitting
          })
        });

        const result = await response.json();
        
        setTestResults(prev => [...prev, {
          text: sample.text,
          expected: sample.expectedCategory,
          expectedLabel: sample.expectedLabel,
          detected: result.processing?.classification?.category,
          detectedLabel: getCategoryLabel(result.processing?.classification?.category),
          confidence: result.processing?.classification?.confidence,
          reasoning: result.processing?.classification?.reasoning,
          success: result.success && result.processing?.classification?.category === sample.expectedCategory
        }]);
      } catch (error) {
        setTestResults(prev => [...prev, {
          text: sample.text,
          expected: sample.expectedCategory,
          expectedLabel: sample.expectedLabel,
          detected: null,
          detectedLabel: null,
          confidence: null,
          reasoning: null,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }]);
      }
    }

    setIsTestingClassification(false);
  };

  const testMultiCategory = async () => {
    setIsTestingMultiCategory(true);
    setMultiCategoryTestResults([]);

    for (const sample of multiCategoryTexts) {
      try {
        const response = await fetch('/api/ai/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: sample.text,
            useMultiCategory: true,
            submitDirectly: false // Just test classification without submitting
          })
        });

        const result = await response.json();
        
        const detectedCategories = result.processing?.successfulCategories || [];
        const matchedCategories = detectedCategories.filter((cat: string) => 
          sample.expectedCategories.includes(cat)
        );
        
        setMultiCategoryTestResults(prev => [...prev, {
          text: sample.text,
          expected: sample.expectedCategories,
          expectedLabels: sample.expectedLabels,
          detected: detectedCategories,
          detectedLabels: detectedCategories.map(getCategoryLabel),
          matched: matchedCategories.length,
          total: sample.expectedCategories.length,
          success: matchedCategories.length >= Math.floor(sample.expectedCategories.length * 0.5), // 50% match threshold
          classification: result.processing?.classification
        }]);
      } catch (error) {
        setMultiCategoryTestResults(prev => [...prev, {
          text: sample.text,
          expected: sample.expectedCategories,
          expectedLabels: sample.expectedLabels,
          detected: [],
          detectedLabels: [],
          matched: 0,
          total: sample.expectedCategories.length,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }]);
      }
    }

    setIsTestingMultiCategory(false);
  };

  const getCategoryLabel = (categoryId: string) => {
    const labels = {
      'medications': 'Medicamento',
      'diseases': 'Condição Médica',
      'allergies': 'Alergia',
      'exams': 'Exame',
      'consultations': 'Consulta'
    };
    return labels[categoryId as keyof typeof labels] || categoryId;
  };

  const handleModalSubmit = (data: { category: string; content: string; multiCategory?: boolean; multiCategoryResults?: any }) => {
    console.log('Modal submitted:', data);
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🤖 Demo: Detecção Inteligente de Categorias Médicas
          </h1>
          <p className="text-lg text-gray-600">
            Esta página demonstra como nossa IA pode identificar automaticamente categorias médicas - tanto únicas quanto múltiplas em textos complexos.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Single Category Test */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">🎯 Teste: Categoria Única</h2>
            <p className="text-gray-600 mb-4">
              Teste a IA com textos médicos de exemplo para ver como ela identifica uma categoria principal.
            </p>
            
            <Button 
              onClick={testClassification}
              disabled={isTestingClassification}
              size="lg"
              className="w-full mb-4"
            >
              {isTestingClassification ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Testando Categoria Única...</span>
                </div>
              ) : (
                'Testar Categoria Única'
              )}
            </Button>

            {testResults.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-800">Resultados:</h3>
                {testResults.map((result, index) => (
                  <div key={index} className={`p-3 rounded-lg border ${
                    result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }`}>
                    <div className="text-sm text-gray-700 mb-2 font-medium">
                      "{result.text.substring(0, 50)}..."
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-medium">Esperado:</span> {result.expectedLabel}
                      </div>
                      <div className={`font-medium ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                        {result.success ? '✅' : '❌'}
                      </div>
                    </div>
                    {result.detected && (
                      <div className="text-xs text-gray-600 mt-1">
                        <span className="font-medium">Detectado:</span> {result.detectedLabel} ({result.confidence})
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Multi-Category Test */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">🔄 Teste: Múltiplas Categorias</h2>
            <p className="text-gray-600 mb-4">
              Teste a IA com textos complexos que contêm informações de múltiplas categorias médicas.
            </p>
            
            <Button 
              onClick={testMultiCategory}
              disabled={isTestingMultiCategory}
              size="lg"
              className="w-full mb-4"
              variant="outline"
            >
              {isTestingMultiCategory ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin h-4 w-4 border-2 border-gray-600 border-t-transparent rounded-full"></div>
                  <span>Testando Múltiplas Categorias...</span>
                </div>
              ) : (
                'Testar Múltiplas Categorias'
              )}
            </Button>

            {multiCategoryTestResults.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-800">Resultados:</h3>
                {multiCategoryTestResults.map((result, index) => (
                  <div key={index} className={`p-3 rounded-lg border ${
                    result.success ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'
                  }`}>
                    <div className="text-sm text-gray-700 mb-2 font-medium">
                      "{result.text.substring(0, 50)}..."
                    </div>
                    {result.description && (
                      <div className="text-xs text-blue-600 mb-2 font-medium">
                        {result.description}
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs mb-2">
                      <div>
                        <span className="font-medium">Esperado:</span> {result.expectedLabels.join(', ')}
                      </div>
                      <div className={`font-medium ${result.success ? 'text-green-600' : 'text-amber-600'}`}>
                        {result.matched}/{result.total} {result.success ? '✅' : '⚠️'}
                      </div>
                    </div>
                    {result.detected.length > 0 && (
                      <div className="text-xs text-gray-600 mb-2">
                        <span className="font-medium">Detectado:</span> {result.detectedLabels.join(', ')}
                      </div>
                    )}
                    {result.classification?.entriesCreated && (
                      <div className="text-xs text-green-700 font-medium">
                        <span className="mr-1">📊</span>
                        {result.classification.entriesCreated} entrada{result.classification.entriesCreated > 1 ? 's' : ''} criada{result.classification.entriesCreated > 1 ? 's' : ''}
                        {result.classification.totalItemsProcessed && result.classification.totalItemsProcessed > result.classification.entriesCreated && (
                          <span className="text-amber-600">
                            {' '}({result.classification.totalItemsProcessed - result.classification.entriesCreated} falharam)
                          </span>
                        )}
                      </div>
                    )}
                    {result.error && (
                      <div className="text-xs text-red-600 mt-1">
                        <span className="font-medium">Erro:</span> {result.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Manual Test */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">✏️ Teste Manual</h2>
          <p className="text-gray-600 mb-4">
            Abra o modal de nova entrada e teste tanto a detecção única quanto múltipla com seus próprios textos médicos.
          </p>
          
          <Button 
            onClick={() => setIsModalOpen(true)}
            size="lg"
            className="w-full"
          >
            Abrir Modal com Detecção Inteligente
          </Button>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">💡 Dicas: Categoria Única</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Medicamentos:</strong> "Tomo Dipirona 500mg quando tenho dor de cabeça"</li>
                <li>• <strong>Doenças:</strong> "Tenho hipertensão desde 2020"</li>
                <li>• <strong>Alergias:</strong> "Sou alérgico a penicilina"</li>
                <li>• <strong>Exames:</strong> "Fiz hemograma completo na semana passada"</li>
                <li>• <strong>Consultas:</strong> "Fui ao cardiologista ontem"</li>
              </ul>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">🔄 Dicas: Múltiplas Categorias</h3>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• <strong>Consulta + Medicamento:</strong> "Dr. Silva me prescreveu Losartana 50mg"</li>
                <li>• <strong>Doença + Exame:</strong> "Minha diabetes está controlada, fiz glicemia"</li>
                <li>• <strong>Alergia + Consulta:</strong> "Avisei o médico sobre minha alergia a penicilina"</li>
                <li>• <strong>Complexo:</strong> "Consulta + medicamento + exame + doença em um texto"</li>
              </ul>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg">
              <h3 className="font-semibold text-purple-900 mb-2">📊 Dicas: Múltiplas Entradas por Categoria</h3>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>• <strong>Vários medicamentos:</strong> "Tomo Losartana 50mg e Metformina 500mg"</li>
                <li>• <strong>Várias doenças:</strong> "Tenho diabetes, hipertensão e asma"</li>
                <li>• <strong>Várias alergias:</strong> "Sou alérgico a penicilina e camarão"</li>
                <li>• <strong>Vários exames:</strong> "Fiz hemograma e raio-X na semana passada"</li>
              </ul>
            </div>
          </div>
        </Card>

        <div className="p-6 bg-white rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">🔍 Como Funciona</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="font-semibold text-blue-900 mb-2">1. Análise Inteligente</div>
              <p className="text-blue-800">
                A IA analisa o texto completo identificando todas as informações médicas relevantes e suas categorias.
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="font-semibold text-green-900 mb-2">2. Classificação Múltipla</div>
              <p className="text-green-800">
                O sistema identifica TODAS as categorias presentes no texto, não apenas uma categoria principal.
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="font-semibold text-purple-900 mb-2">3. Extração de Arrays</div>
              <p className="text-purple-800">
                Para cada categoria, a IA extrai TODOS os itens mencionados, criando arrays de medicamentos, doenças, etc.
              </p>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg">
              <div className="font-semibold text-amber-900 mb-2">4. Criação Múltipla</div>
              <p className="text-amber-800">
                Cada item extraído se torna uma entrada separada no banco de dados, preservando todos os detalhes.
              </p>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3">🎯 Exemplo Prático</h3>
            <div className="bg-white p-4 rounded border">
              <p className="text-sm text-gray-700 mb-3">
                <strong>Texto de entrada:</strong> "Tomo Losartana 50mg de manhã e Metformina 500mg duas vezes ao dia. Tenho diabetes tipo 2 e hipertensão."
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-blue-900 mb-2">🏷️ Categorias Detectadas:</h4>
                  <ul className="text-blue-800 space-y-1">
                    <li>• Medicamentos (2 itens)</li>
                    <li>• Doenças (2 itens)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-green-900 mb-2">📝 Entradas Criadas:</h4>
                  <ul className="text-green-800 space-y-1">
                    <li>• Losartana 50mg (medicamento)</li>
                    <li>• Metformina 500mg (medicamento)</li>
                    <li>• Diabetes tipo 2 (doença)</li>
                    <li>• Hipertensão (doença)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <NovaEntradaModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
      />
    </div>
  );
};

export default AutoDetectionDemo; 