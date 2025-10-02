'use client';
import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { useAuth } from '../../../hooks/useAuth';
import { Loading } from '../../../components';
import { createClient } from '../../../lib/supabase';
import { PatientSearchAndDisplay } from '../../../components/rcr-30/PatientSearchAndDisplay';

interface Prontuario {
  id: string;
  prontuario: any;
  patient_name: string | null;
  patient_id: string | null;
  created_at: string;
}

interface ExpandedState {
  [key: string]: boolean;
}

export default function ProntuariosPage() {
  const { profile } = useAuth();
  const [prontuarios, setProntuarios] = useState<Prontuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProntuarios, setExpandedProntuarios] = useState<ExpandedState>({});
  const [editingProntuario, setEditingProntuario] = useState<string | null>(null);
  const [editedText, setEditedText] = useState<string>('');
  const [deletingProntuario, setDeletingProntuario] = useState<string | null>(null);

  const toggleProntuario = (id: string) => {
    setExpandedProntuarios(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const formatProntuarioText = (prontuarioData: any): string => {
    if (!prontuarioData) return '';

    const prontuarioObj = prontuarioData as any;
    return prontuarioObj.prontuario_text ||
           prontuarioObj.content ||
           prontuarioObj.text ||
           JSON.stringify(prontuarioData, null, 2);
  };

  const loadProntuarios = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('appointments')
        .select('id, prontuario, patient_name, created_at')
        .not('prontuario', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProntuarios((data || []).map(item => ({
        ...item,
        patient_id: null
      })));
    } catch (error) {
      console.error('Error loading prontuários:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      loadProntuarios();
    }
  }, [profile]);

  const handleEditProntuario = (prontuario: Prontuario) => {
    setEditingProntuario(prontuario.id);
    setEditedText(formatProntuarioText(prontuario.prontuario));
  };

  const handleSaveProntuario = async (id: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('appointments')
        .update({ prontuario: { prontuario_text: editedText } })
        .eq('id', id);

      if (error) throw error;

      await loadProntuarios();
      setEditingProntuario(null);
      setEditedText('');
    } catch (err: any) {
      console.error('Error updating prontuario:', err);
      alert('Erro ao salvar prontuário. Tente novamente.');
    }
  };

  const handleCancelEdit = () => {
    setEditingProntuario(null);
    setEditedText('');
  };

  const handleDeleteProntuario = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este prontuário?')) {
      return;
    }

    try {
      setDeletingProntuario(id);
      const supabase = createClient();
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadProntuarios();
    } catch (err: any) {
      console.error('Error deleting prontuario:', err);
      alert('Erro ao deletar prontuário. Tente novamente.');
    } finally {
      setDeletingProntuario(null);
    }
  };

  const handlePatientLinked = async () => {
    // Reload prontuarios after patient is linked
    await loadProntuarios();
  };

  if (loading) {
    return (
      <DashboardLayout title="Prontuários">
        <div className="flex justify-center py-12">
          <Loading size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Prontuários">
      <div className="min-h-screen bg-white">
        <div className="py-8">
          {prontuarios.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Nenhum prontuário encontrado.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {prontuarios.map((prontuario) => (
                <div key={prontuario.id}>
                  <button
                    onClick={() => toggleProntuario(prontuario.id)}
                    className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors rounded-lg flex items-center justify-between"
                  >
                    <div className="flex-1">
                      {prontuario.patient_name ? (
                        <span className="text-sm font-medium text-gray-900">
                          {prontuario.patient_name} - {new Date(prontuario.created_at).toLocaleDateString('pt-BR')} às {new Date(prontuario.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-gray-500 italic">
                          Sem paciente - {new Date(prontuario.created_at).toLocaleDateString('pt-BR')} às {new Date(prontuario.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-600 transition-transform ${expandedProntuarios[prontuario.id] ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expandedProntuarios[prontuario.id] && (
                    <div className="mt-2 px-4 py-4 bg-white border-l-2 border-gray-300">
                      {editingProntuario === prontuario.id ? (
                        <div className="space-y-3">
                          <div className="flex gap-2 mb-3">
                            <button
                              onClick={() => handleSaveProntuario(prontuario.id)}
                              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Salvar
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                          <textarea
                            value={editedText}
                            onChange={(e) => setEditedText(e.target.value)}
                            className="w-full min-h-[300px] p-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      ) : (
                        <div>
                          <div className="flex gap-2 mb-3 pb-3 border-b border-gray-200">
                            <button
                              onClick={() => handleEditProntuario(prontuario)}
                              className="px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded hover:bg-blue-100 transition-colors"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteProntuario(prontuario.id)}
                              disabled={deletingProntuario === prontuario.id}
                              className="px-3 py-1.5 bg-red-50 text-red-700 text-sm rounded hover:bg-red-100 transition-colors disabled:opacity-50"
                            >
                              {deletingProntuario === prontuario.id ? 'Deletando...' : 'Deletar'}
                            </button>
                          </div>

                          {/* Patient Search Component for prontuarios without patient */}
                          {!prontuario.patient_name && (
                            <div className="mb-4 pb-4 border-b border-gray-200">
                              <PatientSearchAndDisplay
                                onPatientSelected={(patient) => {
                                  if (patient) {
                                    handlePatientLinked();
                                  }
                                }}
                              />
                            </div>
                          )}

                          <div className="text-sm text-black whitespace-pre-wrap leading-relaxed">
                            {formatProntuarioText(prontuario.prontuario)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}