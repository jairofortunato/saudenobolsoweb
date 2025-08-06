'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card,
  CardContent,
  Button,
  Input
} from '../index';
import { createClient } from '../../lib/supabase';

/**
 * =====================================
 * CONSULTATION TEMPLATE SELECTOR COMPONENT
 * =====================================
 * 
 * This component handles:
 * 1. Loading available consultation templates from database
 * 2. Allowing doctor to select existing templates
 * 3. Creating new custom templates
 * 4. Managing template structure and AI prompts
 * 
 * DATABASE TABLE: consultation_templates
 * - id: UUID primary key
 * - created_by: doctor who created template
 * - name: template name (e.g., "Consulta Geral", "Cardiologia")
 * - specialty: medical specialty
 * - template_structure: JSON defining expected sections
 * - ai_prompt_template: custom AI prompt for this consultation type
 * - is_default: boolean for default template
 * - is_public: boolean for sharing with other doctors
 * 
 * API ROUTES USED:
 * - GET /api/doctor/consultation-templates
 *   → Fetches available templates (own + public)
 * 
 * - POST /api/doctor/consultation-templates
 *   → Creates new custom template
 * 
 * DEFAULT TEMPLATE: "Consulta Geral" (SOAP format)
 * - Always available as fallback
 * - Uses standard SOAP methodology
 * - Can be customized by individual doctors
 */

interface ConsultationTemplate {
  id: string;
  name: string;
  specialty: string;
  template_structure: {
    sections: Array<{
      name: string;
      required: boolean;
    }>;
  };
  ai_prompt_template: string;
  is_default: boolean;
  is_public: boolean;
  created_by?: string;
}

interface ConsultationTemplateSelectorProps {
  onTemplateSelected: (template: ConsultationTemplate) => void;
  selectedTemplate: ConsultationTemplate | null;
  disabled?: boolean;
  className?: string;
}

export function ConsultationTemplateSelector({ 
  onTemplateSelected, 
  selectedTemplate,
  disabled = false,
  className 
}: ConsultationTemplateSelectorProps) {
  // State management
  const [templates, setTemplates] = useState<ConsultationTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFallbackMode, setIsFallbackMode] = useState(false);

  // New template creation state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateSpecialty, setNewTemplateSpecialty] = useState('');
  const [newTemplatePrompt, setNewTemplatePrompt] = useState(`Você é um assistente médico especializado em registros clínicos. A seguir, você receberá a transcrição de uma conversa entre um médico e um paciente. Sua tarefa é transformar essa transcrição em um prontuário clínico estruturado no seguinte formato:

🧾 Formato do Prontuário:

Alergias:
Liste aqui as alergias mencionadas. Se o paciente não relatar nenhuma, escreva "Não referidas".

MUC (Medicações de uso contínuo):
Liste as medicações que o paciente faz uso contínuo. Se não houver, escreva "Não referidas".

Comorbidades:
Liste as condições clínicas prévias relatadas. Se não houver, escreva "Não referidas".

SOAP (Evolução clínica):

S – Subjetivo:
Descreva o que o paciente relatou espontaneamente sobre seus sintomas, queixas, histórico do problema, e impacto nas atividades diárias.

O – Objetivo:
Descreva os achados clínicos observados pelo médico, como inspeção, palpação, ausculta, sinais clínicos, exames físicos (se mencionados).

A – Avaliação:
Informe a hipótese diagnóstica do médico com base nas informações subjetivas e objetivas.

P – Plano:
Descreva a conduta proposta pelo médico: exames solicitados, medicamentos prescritos, orientações ou encaminhamentos.

Instruções adicionais:

Resuma com linguagem clínica e objetiva.

Organize em formato limpo e fácil de ler.

Se uma informação não for mencionada na transcrição, use "Não referido(a)" no campo correspondente.

Não invente dados. Apenas use o que está presente na transcrição.`);

  /**
   * LOAD AVAILABLE TEMPLATES
   * Fetches templates from database (own + public)
   */
  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('📋 Loading consultation templates...');

      const response = await fetch('/api/doctor/consultation-templates', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to load templates: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const loadedTemplates = data.templates || [];
      
      console.log('✅ Templates loaded:', loadedTemplates.length);
      if (data.fallback) {
        console.log('⚠️ Using fallback template due to database configuration issues');
        setIsFallbackMode(true);
      }
      setTemplates(loadedTemplates);

      // Auto-select default template if none selected
      if (!selectedTemplate && loadedTemplates.length > 0) {
        // Always prioritize the SOAP default template
        const defaultTemplate = loadedTemplates.find((t: ConsultationTemplate) => 
          t.is_default && t.name.includes('SOAP')
        ) || loadedTemplates.find((t: ConsultationTemplate) => t.is_default) || loadedTemplates[0];
        
        console.log('📋 Auto-selecting template:', defaultTemplate.name);
        onTemplateSelected(defaultTemplate);
      }

    } catch (error) {
      console.error('❌ Error loading templates:', error);
      setError(error instanceof Error ? error.message : 'Failed to load templates');
      
      // Fallback to hardcoded default template
      const fallbackTemplate: ConsultationTemplate = {
        id: 'default-soap',
        name: 'Consulta Geral (SOAP)',
        specialty: 'Clínica Geral',
        template_structure: {
          sections: [
            { name: 'Queixa Principal', required: true },
            { name: 'História da Doença Atual', required: true },
            { name: 'Revisão de Sistemas', required: false },
            { name: 'Exame Físico', required: true },
            { name: 'Avaliação', required: true },
            { name: 'Plano Terapêutico', required: true }
          ]
        },
        ai_prompt_template: newTemplatePrompt,
        is_default: true,
        is_public: true
      };
      setTemplates([fallbackTemplate]);
      if (!selectedTemplate) {
        onTemplateSelected(fallbackTemplate);
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedTemplate, onTemplateSelected, newTemplatePrompt]);

  /**
   * CREATE NEW TEMPLATE
   * Saves custom template to database
   */
  const handleCreateTemplate = useCallback(async () => {
    if (!newTemplateName.trim() || !newTemplateSpecialty.trim() || !newTemplatePrompt.trim()) {
      setError('Todos os campos são obrigatórios para criar um template.');
      return;
    }

    if (isFallbackMode) {
      setError('Criação de templates não disponível em modo desenvolvimento. Configure o Supabase para habilitar esta funcionalidade.');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      console.log('📝 Creating new template:', newTemplateName);

      const newTemplate = {
        name: newTemplateName.trim(),
        specialty: newTemplateSpecialty.trim(),
        template_structure: {
          sections: [
            { name: 'Queixa Principal', required: true },
            { name: 'História da Doença Atual', required: true },
            { name: 'Exame Físico', required: true },
            { name: 'Avaliação', required: true },
            { name: 'Plano Terapêutico', required: true }
          ]
        },
        ai_prompt_template: newTemplatePrompt.trim(),
        is_default: false,
        is_public: false
      };

      // Use Supabase client to get authenticated session
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Você precisa estar logado para criar templates.');
      }

      console.log('🔐 Making authenticated request with session token');
      
      const response = await fetch('/api/doctor/consultation-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(newTemplate)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create template: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      const createdTemplate = result.template;
      
      console.log('✅ Template created successfully:', createdTemplate.id);

      // Add to templates list and select it
      setTemplates(prev => [...prev, createdTemplate]);
      onTemplateSelected(createdTemplate);

      // Reset form
      setNewTemplateName('');
      setNewTemplateSpecialty('');
      setNewTemplatePrompt(newTemplatePrompt); // Keep default prompt
      setShowCreateForm(false);

    } catch (error) {
      console.error('❌ Error creating template:', error);
      setError(error instanceof Error ? error.message : 'Failed to create template');
    } finally {
      setIsCreating(false);
    }
  }, [newTemplateName, newTemplateSpecialty, newTemplatePrompt, onTemplateSelected, isFallbackMode]);

  /**
   * HANDLE TEMPLATE SELECTION
   */
  const handleTemplateSelect = (template: ConsultationTemplate) => {
    onTemplateSelected(template);
    console.log('📋 Template selected:', template.name);
  };

  // Load templates on component mount
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return (
    <div className={`space-y-4 ${className}`}>
      
      {/* =====================================
          ERROR DISPLAY
          ===================================== */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <span className="text-lg">⚠️</span>
              <div>
                <div className="font-medium">Erro</div>
                <div className="text-sm">{error}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* =====================================
          TEMPLATE SELECTOR
          ===================================== */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                📋 Selecionar Template de Consulta
              </h3>
              {isFallbackMode && (
                <div className="text-sm text-amber-600 mt-1">
                  ⚠️ Modo desenvolvimento - usando template padrão
                </div>
              )}
            </div>
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              variant="outline"
              disabled={disabled || isLoading || isFallbackMode}
              className="text-sm"
              title={isFallbackMode ? 'Configure o Supabase para criar templates personalizados' : ''}
            >
              {showCreateForm ? '❌ Cancelar' : isFallbackMode ? '🔒 Novo Template' : '➕ Novo Template'}
            </Button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3"></div>
              <span className="text-gray-600">Carregando templates...</span>
            </div>
          )}

          {/* Template Grid */}
          {!isLoading && templates.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => !disabled && handleTemplateSelect(template)}
                  className={`
                    p-4 border-2 rounded-lg cursor-pointer transition-all
                    ${selectedTemplate?.id === template.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-25'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 text-sm">
                      {template.name}
                    </h4>
                    <div className="flex gap-1">
                      {template.is_default && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                          Padrão
                        </span>
                      )}
                      {template.is_public && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                          Público
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 mb-2">
                    {template.specialty}
                  </div>
                  <div className="text-xs text-gray-500">
                    {template.template_structure.sections.length} seções
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Selected Template Info */}
          {selectedTemplate && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-blue-600">✅</span>
                <span className="font-medium text-blue-900">
                  Template Selecionado: {selectedTemplate.name}
                </span>
              </div>
              <div className="text-sm text-blue-700">
                Especialidade: {selectedTemplate.specialty}
              </div>
              <div className="text-sm text-blue-700">
                Seções: {selectedTemplate.template_structure.sections.map(s => s.name).join(', ')}
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      {/* =====================================
          FALLBACK MODE INFO
          ===================================== */}
      {isFallbackMode && showCreateForm && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="text-amber-600 text-2xl">⚠️</div>
              <div>
                <h4 className="text-lg font-semibold text-amber-900 mb-2">
                  Criação de Templates Indisponível
                </h4>
                <p className="text-amber-800 text-sm mb-3">
                  Para criar templates personalizados, é necessário configurar as variáveis de ambiente do Supabase:
                </p>
                <div className="bg-amber-100 p-3 rounded-lg text-xs font-mono text-amber-900">
                  <div>NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase</div>
                  <div>NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima</div>
                  <div>SUPABASE_SERVICE_ROLE_KEY=sua_chave_de_servico</div>
                </div>
                <p className="text-amber-700 text-sm mt-3">
                  Por enquanto, você pode usar o template SOAP padrão que já está funcionando perfeitamente.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* =====================================
          CREATE NEW TEMPLATE FORM
          ===================================== */}
      {showCreateForm && !isFallbackMode && (
        <Card className="border-green-200">
          <CardContent className="p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              ➕ Criar Novo Template
            </h4>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Template *
                </label>
                <Input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="Ex: Consulta Cardiológica"
                  disabled={isCreating}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Especialidade *
                </label>
                <Input
                  type="text"
                  value={newTemplateSpecialty}
                  onChange={(e) => setNewTemplateSpecialty(e.target.value)}
                  placeholder="Ex: Cardiologia"
                  disabled={isCreating}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prompt de IA *
                </label>
                <textarea
                  value={newTemplatePrompt}
                  onChange={(e) => setNewTemplatePrompt(e.target.value)}
                  placeholder="Instruções para a IA processar a transcrição..."
                  disabled={isCreating}
                  className="w-full h-40 p-3 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  onClick={() => setShowCreateForm(false)}
                  variant="outline"
                  disabled={isCreating}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateTemplate}
                  disabled={isCreating || !newTemplateName.trim() || !newTemplateSpecialty.trim() || !newTemplatePrompt.trim()}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isCreating ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Criando...</span>
                    </div>
                  ) : (
                    '✅ Criar Template'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}