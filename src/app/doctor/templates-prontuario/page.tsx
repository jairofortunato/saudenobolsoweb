'use client';

import { useState, useEffect } from 'react';
import { CreateTemplateModal } from '../../../../components/doctor/CreateTemplateModal';
import { DashboardLayout } from '../../../../components/layout/DashboardLayout';
import { Button } from '../../../../components/ui/Button';
import { useAuth } from '../../../../hooks/useAuth';
import { createClient } from '../../../../lib/supabase';

const EXAMPLE_PRONTUARIO = `🧾 Prontuário:

Alergias:
- Não referidas.

MUC:
- Ozempic.

Comorbidades:
- Não referidas.

S:
- O paciente relata estar com anorexia após o uso de Ozempic, resultando em perda de peso excessiva.

O:
- Não referidos achados clínicos.

A:
- Anorexia secundária ao uso de Ozempic.

P:
- Recomendo interromper o uso de Ozempic.
- Orientação para aumentar a ingestão calórica, sugerindo o consumo de alimentos com maior densidade calórica.`;

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

const DEFAULT_TEMPLATE_PROMPT = `Você é um assistente médico especializado em registros clínicos. A seguir, você receberá a transcrição de uma conversa entre um médico e um paciente. Sua tarefa é transformar essa transcrição em um prontuário clínico estruturado no seguinte formato:

🧾 Prontuário:

Alergias:
Liste aqui as alergias mencionadas. Se o paciente não relatar nenhuma, escreva "Não referidas".

MUC:
Liste as medicações que o paciente faz uso contínuo. As medicações devem ser escritas uma após a outra, separadas por vírgula e para facilitar a visualização utilizamos códigos para falar a quantidade e o horário que a pessoa toma medicação. Exemplo: a paciente relata que toma 1 comprimido de losartana 50mg pela manhã e outro à noite, hidroclorotiazida 25mg um pela manhã, a escrita deve ser "MUC: losartana 50mg 1-0-1, hidroclorotiazida 25mg 1-0-0"
Se não houver, escreva "Não referidas". Medicações utilizadas em caso sintomático não devem aparecer aqui, exemplo: "tomei um paracetamol, pois estava com febre", "fiz uso de vonau para náusea", isso não se configura como medicação de uso contínuo.

Comorbidades:
Liste as condições clínicas prévias relatadas. Se não houver, escreva "Não referidas". As comorbidades devem seguir a regra do Código Internacional de Doenças (CID 10). Exemplos: se o paciente referir que tem pressão alta, deve ser colocado como "HAS".

HMP: esse campo significa história mórbida pregressa e é utilizado quando o paciente relata eventos que aconteceram no passado e refletem na sua saúde. Cada evento deve ser separado por vírgula e deve ser escrito de maneira sucinta apenas para ajudar o médico na reflexão da anamnese. Exemplo: paciente relata que já teve internação por pneumonia prévia em 2012 e realizou uma colecistectomia em 2017". No momento em que o prontuário for gerado deve estar escrito a condição e a data em que ocorreu. Exemplo: "HMP: internação por pneumonia em 2012, colecistectomia em 2017". Sempre colocar em ordem cronológica com o que aconteceu primeiro escrito antes.

S:
Descreva o que o paciente relatou espontaneamente sobre seus sintomas, queixas, histórico do problema, e impacto nas atividades diárias.

O:
Descreva os achados clínicos observados pelo médico, como inspeção, palpação, ausculta, sinais clínicos, exames físicos (se mencionados).

A:
(Na avaliação seja mais objetivo, utilize apenas palavras (exemplos: HAS, bursite do ombro, fibromialgia). Quando estiver com dúvida diagnóstica coloque um ponto de interrogação (exemplo: insuficiência cardíaca?).)
Informe a hipótese diagnóstica do médico com base nas informações subjetivas e objetivas.

P: (escrito em primeira pessoa do presente)
Descreva a conduta proposta pelo médico: exames solicitados, medicamentos prescritos, orientações ou encaminhamentos.

Instruções adicionais:

Tire todos os asteriscos da formatação.

Palavras estranhas ou incompletas provavelmente são erros da transcrição passando nomes de remédios ou doenças, corrija.

Resuma com linguagem clínica e objetiva.

Organize em formato limpo e fácil de ler.

Se uma informação não for mencionada na transcrição, use "Não referido(a)" no campo correspondente.

Não invente dados. Apenas use o que está presente na transcrição.

Não proponha um plano terapêutico, se o médico não propor um plano terapêutico na transcrição apenas coloque "P:" e deixe que o médico escreva ao final da transcrição.

Na avaliação em "A:" pode até dar sugestões, mas sempre diagnósticos médicos que estejam de acordo com o CID 10 (exemplos: rinossinusite, pneumonia, infarto agudo do miocárdio, asma, labirintite).

Existem algumas expressões que são macetes usados na prática clínica, aqui deixo alguns exemplos:
- "HGT" = hemoglicoteste -> é o teste que mostra quanto está a glicemia do paciente realizado no momento com uma gota de sangue coletada no momento da consulta. A informação deve ser coloada no "O:", abaixo da pressão arterial. Exemplo: "HGT: 324"

Cada aparelho do exame físico deve ser colocado em uma linha diferente para facilitar a visualização e entendimento. Aqui vai um exemplo:

"O:
BEG LOC MUC AAA
Neuro normal, ECG 15, sem sinais meníngeos
Oroscopia: sem placas, sp
AC: 2T RR S/S BNF
AP: MV + bilateral, S/RA, eupneico
Abd: flácido, indolor, RHA+, Murphy e Blumberg negativos, sem sinais de peritonismo, PPL negativo
MMII: sem sinais de empastamento ou trombose, pulsos periféricos presentes"

Caso sejam relatadas informações sobre região íntima (vagina na mulher, pênis no homem), coloque:
"Região íntima:" e descreva o que for falado na consulta sobre o exame físico dessa região com termos técnicos. Essa parte também segue o exame físico cranio-caudal, ficando abaixo do "Abd:"

Caso seja relatada a pressão arterial do paciente essa deve ser colocada na última linha do exame físico. Ex: "PA: 120x80".

Caso a saturação de O2 do paciente seja relatada na consulta essa deve aparecer ao final do exame do aparelho pulmonar, exemplo "AP: MV+ bilateral, S/RA, eupneico, sat 97%"

Caso a frequência cardíaca do paciente seja relatada na consulta, essa deve aparecer ao final do exame da ausculta cardíaca, exemplo: "AC: 2T, RR, S/S, BNF, FC 87 bpm"

Regras especiais para Exame Físico (mapeamento automático), lembre-se que o exame físico deve seguir a sequência cranio-caudal, com as partes do corpo que ficam mais para cima aparecem primeiro no exame físico.
Sempre que a transcrição contiver exatamente as frases abaixo, registre no prontuário a forma padronizada correspondente:

"bom estado geral" = "BEG, LOC, MUC, AAA"

"neuro normal" = "Neuro normal, ECG 15, sem sinais meníngeos"

"oroscopia normal" → Oroscopia sem alterações, sem hiperemia ou exsudato

"ausculta cardíaca normal" = "AC: 2T, RR, S/S, BNF"

"ausculta pulmonar normal" = "AP: MV+ bilateral, S/RA, eupneico"

"abdome normal" = "Abd: flácido, indolor, RHA+, Murphy e Blumberg negativos, sem sinais de peritonismo, PPL negativo"

"membros inferiores normais" → MMII: sem sinais de empastamento ou trombose, pulsos periféricos presentes`;

export default function FormatosAnamnesePage() {
  const { user, profile } = useAuth();
  const [userTemplates, setUserTemplates] = useState<ConsultationTemplate[]>([]);
  const [templateProntuarios, setTemplateProntuarios] = useState<Map<string, string>>(new Map());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editedPrompt, setEditedPrompt] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user templates on mount
  useEffect(() => {
    fetchUserTemplates();
  }, [profile, user]);

  const fetchUserTemplates = async () => {
    if (!profile) return;

    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('consultation_templates')
        .select('*')
        .eq('created_by', (profile as any)?.profile_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserTemplates(data || []);

      // Fetch prontuários for each template
      if (data && data.length > 0) {
        await fetchProntuariosForTemplates(data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProntuariosForTemplates = async (templates: ConsultationTemplate[]) => {
    if (!user) return;

    const supabase = createClient();
    const prontuarioMap = new Map<string, string>();

    console.log('Fetching prontuários for templates:', templates.map(t => ({ id: t.id, name: t.name })));
    console.log('User ID:', user.id);

    // Fetch the last prontuário for each template
    for (const template of templates) {
      try {
        console.log(`Searching for prontuários with template_id: ${template.id}`);

        const { data, error } = await supabase
          .from('appointments')
          .select('id, prontuario, template_id, created_at')
          .eq('user_id', user.id)
          .eq('template_id', template.id)
          .not('prontuario', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1);

        console.log(`Query result for template ${template.name}:`, { data, error });

        if (error) {
          console.error(`Error fetching prontuário for template ${template.name}:`, error);
          continue;
        }

        if (data && data.length > 0 && data[0]?.prontuario) {
          // Extract text from prontuario object
          const prontuarioData = data[0].prontuario;
          console.log(`Prontuario data for ${template.name}:`, typeof prontuarioData, prontuarioData);

          const prontuarioText = typeof prontuarioData === 'string'
            ? prontuarioData
            : prontuarioData.prontuario_text || prontuarioData.text || prontuarioData.content || JSON.stringify(prontuarioData, null, 2);

          console.log(`Setting prontuário for template ${template.name}: ${prontuarioText.substring(0, 100)}...`);
          prontuarioMap.set(template.id, prontuarioText);
        } else {
          console.log(`No prontuário data found for template ${template.name}`);
        }
      } catch (error) {
        console.error(`Exception fetching prontuário for template ${template.name}:`, error);
      }
    }

    console.log('Final prontuario map:', Array.from(prontuarioMap.entries()).map(([k, v]) => [k, v.substring(0, 50)]));
    setTemplateProntuarios(prontuarioMap);
  };

  const handleTemplateCreated = (template: ConsultationTemplate) => {
    // Refresh the list
    fetchUserTemplates();
    console.log('Template created:', template);
  };

  const canEditTemplate = (template: ConsultationTemplate) => {
    return profile && template.created_by === (profile as any)?.profile_id;
  };

  const handleStartEdit = (templateId: string, currentPrompt: string) => {
    setEditingTemplateId(templateId);
    setEditedPrompt(currentPrompt);
  };

  const handleCancelEdit = () => {
    setEditingTemplateId(null);
    setEditedPrompt('');
  };

  const handleSaveEdit = async (templateId: string) => {
    if (!profile) return;

    setIsSaving(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Você precisa estar logado para editar templates.');
      }

      const response = await fetch(`/api/doctor/consultation-templates/${templateId}`, {
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

      // Update the template in the list
      setUserTemplates(prev => prev.map(t =>
        t.id === templateId ? { ...t, ai_prompt_template: editedPrompt.trim() } : t
      ));

      setEditingTemplateId(null);
      setEditedPrompt('');

      console.log('Template updated successfully:', result);
    } catch (error: any) {
      console.error('Error updating template:', error);
      alert('Erro ao salvar template: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!profile || !confirm('Tem certeza que deseja excluir este template?')) return;

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Você precisa estar logado para excluir templates.');
      }

      const response = await fetch(`/api/doctor/consultation-templates/${templateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete template: ${response.status} ${errorText}`);
      }

      // Remove from list
      setUserTemplates(prev => prev.filter(t => t.id !== templateId));

      console.log('Template deleted successfully');
    } catch (error: any) {
      console.error('Error deleting template:', error);
      alert('Erro ao excluir template: ' + error.message);
    }
  };

  const renderTemplateSection = (
    title: string,
    example: string,
    instructions: string,
    isEditing: boolean,
    templateId?: string,
    onEdit?: () => void,
    onDelete?: () => void,
    isDefault: boolean = false
  ) => {
    return (
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{title}</h2>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Example */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Exemplo</h3>
            <div className="bg-white border border-gray-200 rounded-lg p-4 h-80 overflow-y-auto">
              <pre className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-sans">
                {example}
              </pre>
            </div>
          </div>

          {/* Right Column - Instructions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Instruções</h3>
              {!isDefault && onEdit && onDelete && !isEditing && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onEdit}
                    className="text-sm"
                  >
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onDelete}
                    className="text-sm text-red-600 hover:bg-red-50"
                  >
                    Excluir
                  </Button>
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-3">
                <textarea
                  value={editedPrompt}
                  onChange={(e) => setEditedPrompt(e.target.value)}
                  className="w-full h-80 p-4 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 overflow-y-auto"
                  placeholder="Digite as instruções para este template..."
                />
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    size="sm"
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => templateId && handleSaveEdit(templateId)}
                    disabled={isSaving || !editedPrompt.trim()}
                    className="bg-green-600 hover:bg-green-700"
                    size="sm"
                  >
                    {isSaving ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg p-4 h-80 overflow-y-auto">
                <pre className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {instructions}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout
      showSidebar={true}
      containerMaxWidth="full"
    >
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header with Create Button */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Templates de Prontuários</h1>
          <Button
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2"
          >
            <span>➕</span>
            <span>Criar Novo Template</span>
          </Button>
        </div>

        {/* Default SOAP Template */}
        {renderTemplateSection(
          "Template de Prontuário Padrão SOAP",
          EXAMPLE_PRONTUARIO,
          DEFAULT_TEMPLATE_PROMPT,
          false,
          undefined,
          undefined,
          undefined,
          true
        )}

        {/* User's Personalized Templates */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-600">Carregando seus templates...</p>
          </div>
        ) : userTemplates.length > 0 ? (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Prontuários Personalizados
              </h2>
            </div>
            {userTemplates.map((template, index) => (
              <div key={template.id}>
                {renderTemplateSection(
                  template.name,
                  templateProntuarios.get(template.id) || "Nenhum prontuário criado ainda com este template.",
                  template.ai_prompt_template,
                  editingTemplateId === template.id,
                  template.id,
                  () => handleStartEdit(template.id, template.ai_prompt_template),
                  () => handleDeleteTemplate(template.id),
                  false
                )}
              </div>
            ))}
          </>
        ) : (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
             Prontuários Personalizados
            </h2>
            <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Nenhum template personalizado
              </h3>
              <p className="text-gray-600">
                Crie seu primeiro template clicando no botão acima
              </p>
            </div>
          </div>
        )}
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