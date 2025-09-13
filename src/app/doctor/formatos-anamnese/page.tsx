'use client';

import { useState } from 'react';
import { ConsultationTemplateSelector } from '../../../../components/doctor/ConsultationTemplateSelector';
import { CreateTemplateModal } from '../../../../components/doctor/CreateTemplateModal';
import { DashboardLayout } from '../../../../components/layout/DashboardLayout';
import { Button } from '../../../../components/ui/Button';
import { useAuth } from '../../../../hooks/useAuth';
import { createClient } from '../../../../lib/supabase';

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

export default function FormatosAnamnesePage() {
  const { profile } = useAuth();
  console.log('👤 [DEBUG] Profile object:', profile);
  const [selectedTemplate, setSelectedTemplate] = useState<ConsultationTemplate | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleTemplateSelected = (template: ConsultationTemplate) => {
    console.log('📋 [DEBUG] Template selected:', {
      id: template.id,
      name: template.name,
      created_by: template.created_by,
      is_default: template.is_default,
      is_public: template.is_public,
      fullTemplate: template
    });
    setSelectedTemplate(template);
    setIsEditing(false);
    setEditedPrompt('');
  };

  const handleTemplateCreated = (template: ConsultationTemplate) => {
    // Optionally select the newly created template
    setSelectedTemplate(template);
    // You might want to refresh the template list here
    console.log('Template created:', template);
  };

  const canEditTemplate = (template: ConsultationTemplate) => {
    console.log('🔍 [DEBUG] Checking edit permissions:', {
      hasProfile: !!profile,
      profileId: (profile as any)?.profile_id,
      templateCreatedBy: template.created_by,
      canEdit: profile && template.created_by === (profile as any)?.profile_id
    });
    
    // Use profile_id which is the actual profile identifier
    return profile && template.created_by === (profile as any)?.profile_id;
  };

  const handleStartEdit = () => {
    if (selectedTemplate) {
      setEditedPrompt(selectedTemplate.ai_prompt_template);
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedPrompt('');
  };

  const handleSaveEdit = async () => {
    if (!selectedTemplate || !profile) return;

    setIsSaving(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Você precisa estar logado para editar templates.');
      }

      const response = await fetch(`/api/doctor/consultation-templates/${selectedTemplate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ai_prompt_template: editedPrompt.trim()
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update template: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      
      // Update the selected template with the new prompt
      setSelectedTemplate(prev => prev ? {
        ...prev,
        ai_prompt_template: editedPrompt.trim()
      } : null);
      
      setIsEditing(false);
      setEditedPrompt('');
      
      console.log('Template updated successfully:', result);
    } catch (error: any) {
      console.error('Error updating template:', error);
      alert('Erro ao salvar template: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout
      showSidebar={true}
      containerMaxWidth="full"
    >
      {/* Custom content styled like RCR30Page */}
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Formatos de Anamnese
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            Selecione um formato de consulta e visualize o template completo
          </p>
          <Button
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 mx-auto"
          >
            <span>➕</span>
            <span>Criar Novo Template</span>
          </Button>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <div className="space-y-8">
        {/* Template Selection */}
        <ConsultationTemplateSelector 
          onTemplateSelected={handleTemplateSelected}
          selectedTemplate={selectedTemplate}
        />

        {/* Template Details Display */}
        {selectedTemplate && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            {/* Template Info */}
            <div className="mb-8">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {selectedTemplate.name}
                  </h2>
                  <p className="text-lg text-blue-600 font-medium">
                    {selectedTemplate.specialty}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {selectedTemplate.is_default && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                      Padrão
                    </span>
                  )}
                  {selectedTemplate.is_public && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                      Público
                    </span>
                  )}
                  {canEditTemplate(selectedTemplate) && (
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-medium rounded-full">
                      Meu Template
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Template Structure */}
            {selectedTemplate.template_structure?.sections && selectedTemplate.template_structure.sections.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                  📋 Estrutura da Consulta
                </h3>
                <div className="grid gap-3">
                  {selectedTemplate.template_structure.sections.map((section, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <span className="text-gray-800 font-medium">
                        {section.name}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        section.required 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {section.required ? 'Obrigatório' : 'Opcional'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Prompt Template */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-800">
                  🤖 Prompt de IA
                </h3>
                {canEditTemplate(selectedTemplate) && !isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStartEdit}
                    className="flex items-center gap-2"
                  >
                    <span>✏️</span>
                    <span>Editar</span>
                  </Button>
                )}
              </div>
              
              {isEditing ? (
                <div className="space-y-4">
                  <textarea
                    value={editedPrompt}
                    onChange={(e) => setEditedPrompt(e.target.value)}
                    className="w-full h-64 p-4 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                    placeholder="Digite o prompt de IA para este template..."
                  />
                  <div className="flex justify-end space-x-3">
                    <Button
                      variant="outline"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleSaveEdit}
                      disabled={isSaving || !editedPrompt.trim()}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isSaving ? 'Salvando...' : '💾 Salvar'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-6">
                  <pre className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-mono">
                    {selectedTemplate.ai_prompt_template}
                  </pre>
                </div>
              )}
            </div>

            {/* Template ID for reference */}
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 font-mono">
                ID do Template: {selectedTemplate.id}
              </p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!selectedTemplate && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Nenhum formato selecionado
            </h3>
            <p className="text-gray-600">
              Selecione um formato de consulta acima para visualizar os detalhes
            </p>
          </div>
        )}
          </div>
        </div>
      </div>

      {/* Create Template Modal */}
      <CreateTemplateModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTemplateCreated={handleTemplateCreated}
      />
    </DashboardLayout>
  );
}