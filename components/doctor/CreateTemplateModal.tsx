'use client';

import React, { useState, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Alert } from '../ui/Alert';
import { createClient } from '../../lib/supabase';

interface CreateTemplateModalProps {
  open: boolean;
  onClose: () => void;
  onTemplateCreated?: (template: any) => void;
}

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

export function CreateTemplateModal({ open, onClose, onTemplateCreated }: CreateTemplateModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    specialty: '',
    ai_prompt_template: `Você é um assistente médico especializado em registros clínicos. A seguir, você receberá a transcrição de uma conversa entre um médico e um paciente. Sua tarefa é transformar essa transcrição em um prontuário clínico estruturado no seguinte formato:

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

Não invente dados. Apenas use o que está presente na transcrição.`,
    is_public: false
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      specialty: '',
      ai_prompt_template: `Você é um assistente médico especializado em registros clínicos. A seguir, você receberá a transcrição de uma conversa entre um médico e um paciente. Sua tarefa é transformar essa transcrição em um prontuário clínico estruturado no seguinte formato:

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

Não invente dados. Apenas use o que está presente na transcrição.`,
      is_public: false
    });
    setError('');
    setSuccess('');
  }, []);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Nome do template é obrigatório');
      return false;
    }
    if (!formData.specialty.trim()) {
      setError('Especialidade é obrigatória');
      return false;
    }
    if (!formData.ai_prompt_template.trim()) {
      setError('Prompt de IA é obrigatório');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Você precisa estar logado para criar templates.');
      }

      const newTemplate = {
        name: formData.name.trim(),
        specialty: formData.specialty.trim(),
        template_structure: {
          sections: [
            { name: 'Queixa Principal', required: true },
            { name: 'História da Doença Atual', required: true },
            { name: 'Exame Físico', required: true },
            { name: 'Avaliação', required: true },
            { name: 'Plano Terapêutico', required: true }
          ]
        },
        ai_prompt_template: formData.ai_prompt_template.trim(),
        is_default: false,
        is_public: formData.is_public
      };

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

      setSuccess('Template criado com sucesso!');
      
      if (onTemplateCreated) {
        onTemplateCreated(createdTemplate);
      }

      // Reset form and close modal after a short delay
      setTimeout(() => {
        resetForm();
        onClose();
      }, 1500);

    } catch (error: any) {
      console.error('Error creating template:', error);
      setError(error.message || 'Erro ao criar template. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  return (
    <Modal 
      open={open} 
      onClose={handleClose}
      title="Criar Novo Template"
      description="Crie um novo formato de consulta personalizado"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="error">
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert variant="success">
            {success}
          </Alert>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome do Template *
          </label>
          <Input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Ex: Consulta Cardiológica"
            disabled={loading}
            className="w-full"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Especialidade *
          </label>
          <Input
            type="text"
            value={formData.specialty}
            onChange={(e) => handleInputChange('specialty', e.target.value)}
            placeholder="Ex: Cardiologia"
            disabled={loading}
            className="w-full"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Prompt de IA *
          </label>
          <textarea
            value={formData.ai_prompt_template}
            onChange={(e) => handleInputChange('ai_prompt_template', e.target.value)}
            placeholder="Instruções para a IA processar a transcrição..."
            disabled={loading}
            className="w-full h-48 p-3 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={formData.is_public}
              onChange={(e) => handleInputChange('is_public', e.target.checked)}
              disabled={loading}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              Tornar este template público (outros médicos poderão usar)
            </span>
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading || !formData.name.trim() || !formData.specialty.trim() || !formData.ai_prompt_template.trim()}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? 'Criando...' : '✅ Criar Template'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}