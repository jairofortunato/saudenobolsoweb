'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Button,
  Input
} from '../index';
import { createClient } from '../../lib/supabase';

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
  const [templates, setTemplates] = useState<ConsultationTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
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

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
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
      
      if (data.fallback) {
        setIsFallbackMode(true);
      }
      setTemplates(loadedTemplates);

      if (!selectedTemplate && loadedTemplates.length > 0) {
        const defaultTemplate = loadedTemplates.find((t: ConsultationTemplate) => 
          t.is_default && t.name.includes('SOAP')
        ) || loadedTemplates.find((t: ConsultationTemplate) => t.is_default) || loadedTemplates[0];
        
        onTemplateSelected(defaultTemplate);
      }

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load templates');
      
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

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Você precisa estar logado para criar templates.');
      }
      
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
      
      setTemplates(prev => [...prev, createdTemplate]);
      onTemplateSelected(createdTemplate);

      setNewTemplateName('');
      setNewTemplateSpecialty('');
      setNewTemplatePrompt(newTemplatePrompt);
      setShowCreateForm(false);

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create template');
    } finally {
      setIsCreating(false);
    }
  }, [newTemplateName, newTemplateSpecialty, newTemplatePrompt, onTemplateSelected, isFallbackMode]);

  const handleTemplateSelect = (template: ConsultationTemplate) => {
    onTemplateSelected(template);
  };

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return (
    <div className={`space-y-8 ${className}`}>
      {error && (
        <div className="text-center">
          <div className="inline-block p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            ⚠️ {error}
          </div>
        </div>
      )}

      <div className="text-center space-y-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">
          Qual template de consulta?
        </h2>
        
        <div className="relative  mx-auto">
          <select
            value={selectedTemplate?.id || ''}
            onChange={(e) => {
              const template = templates.find(t => t.id === e.target.value);
              if (template) handleTemplateSelect(template);
            }}
            disabled={disabled || isLoading}
            className="w-full text-lg py-4 px-6 rounded-full border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <option>Carregando templates...</option>
            ) : (
              templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} {template.is_default ? '(Padrão)' : ''}
                </option>
              ))
            )}
          </select>
          
          {isLoading && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          
          {selectedTemplate && (
            <div className="mt-4 p-4 rounded-lg">
              <div className="">
             
                <Button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  variant="outline"
                  disabled={disabled || isLoading || isFallbackMode}
                  className="text-sm"
                  title={isFallbackMode ? 'Configure o Supabase para criar templates personalizados' : ''}
                >
                  {showCreateForm ? '❌ Cancelar' : isFallbackMode ? '🔒 Novo' : '➕ Novo Template'}
                </Button>
              </div>
            </div>
          )}

          {showCreateForm && !isFallbackMode && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Template *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Especialidade *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prompt de IA *</label>
                  <textarea
                    value={newTemplatePrompt}
                    onChange={(e) => setNewTemplatePrompt(e.target.value)}
                    placeholder="Instruções para a IA processar a transcrição..."
                    disabled={isCreating}
                    className="w-full h-32 p-3 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-2">
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
                    {isCreating ? 'Criando...' : '✅ Criar Template'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}