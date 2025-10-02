'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '../../../../components/layout/DashboardLayout';
import { useAuth } from '../../../../hooks/useAuth';
import { Loading } from '../../../../components';
import { createClient } from '../../../../lib/supabase';
import { PatientSearchAndDisplay } from '../../../../components/rcr-30/PatientSearchAndDisplay';

interface ProntuarioData {
  id: string;
  content: string;
  patient_name: string | null;
  patient_id: string | null;
  created_at: string;
  title?: string | null;
  template_name?: string | null;
  specialty?: string | null;
  summary?: string | null;
  meta?: any;
}

export default function ProntuarioDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [prontuario, setProntuario] = useState<ProntuarioData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingProntuario, setEditingProntuario] = useState(false);
  const [editedText, setEditedText] = useState<string>('');

  const prontuarioId = params.id as string;

  const formatProntuarioText = (prontuarioData: any): string => {
    if (!prontuarioData) return '';

    const prontuarioObj = prontuarioData as any;
    return prontuarioObj.prontuario_text ||
           prontuarioObj.content ||
           prontuarioObj.text ||
           JSON.stringify(prontuarioData, null, 2);
  };

  const loadProntuario = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      console.log('Loading prontuario with ID:', prontuarioId);

      const response = await fetch(`/api/prontuarios/${prontuarioId}`, {
        headers
      });

      if (response.ok) {
        const data = await response.json();
        setProntuario({
          ...data.prontuario,
          patient_id: null
        });
        console.log('Successfully loaded prontuário');
      } else {
        console.error('Failed to load prontuário:', response.status, response.statusText);
        setError('Prontuário não encontrado');
      }
    } catch (err: any) {
      console.error('Error loading prontuario:', err);
      setError(err.message || 'Erro ao carregar prontuário');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!profile || profile.role !== 'doctor') {
      router.push('/dashboard');
      return;
    }

    loadProntuario();
  }, [profile, prontuarioId]);

  const handlePatientLinked = async (patientName: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('appointments')
        .update({ patient_name: patientName })
        .eq('id', prontuarioId);

      if (error) throw error;

      // Reload prontuario data
      await loadProntuario();
    } catch (err: any) {
      console.error('Error linking patient:', err);
      alert('Erro ao vincular paciente. Tente novamente.');
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Prontuário">
        <div className="flex justify-center py-12">
          <Loading size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !prontuario) {
    return (
      <DashboardLayout title="Prontuário">
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error || 'Prontuário não encontrado'}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Prontuário">
      <div className="min-h-screen bg-white">
        <div className="py-8">
          <div className="mb-6">
            <button
              onClick={() => router.push('/prontuarios')}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              ← Voltar aos Prontuários
            </button>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Left Column - Prontuário Content */}
            <div>
              <h2 className="text-2xl font-bold mb-6 text-black">Prontuário</h2>
              <div className="mb-4">
                <span className="text-sm text-gray-600">
                  Data: {new Date(prontuario.created_at).toLocaleDateString('pt-BR')} às {new Date(prontuario.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {editingProntuario ? (
                <div className="space-y-3">
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={async () => {
                        try {
                          const supabase = createClient();
                          const { error } = await supabase
                            .from('appointments')
                            .update({ prontuario: { prontuario_text: editedText } })
                            .eq('id', prontuarioId);

                          if (error) throw error;

                          await loadProntuario();
                          setEditingProntuario(false);
                          setEditedText('');
                        } catch (err: any) {
                          console.error('Error updating prontuario:', err);
                          alert('Erro ao salvar prontuário. Tente novamente.');
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => {
                        setEditingProntuario(false);
                        setEditedText('');
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                  <textarea
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    className="w-full min-h-[500px] p-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ) : (
                <div>
                  <div className="flex gap-2 mb-3 pb-3 border-b border-gray-200">
                    <button
                      onClick={() => {
                        setEditingProntuario(true);
                        setEditedText(prontuario.content);
                      }}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded hover:bg-blue-100 transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm('Tem certeza que deseja deletar este prontuário?')) {
                          return;
                        }

                        try {
                          const supabase = createClient();
                          const { error } = await supabase
                            .from('appointments')
                            .delete()
                            .eq('id', prontuarioId);

                          if (error) throw error;

                          router.push('/prontuarios');
                        } catch (err: any) {
                          console.error('Error deleting prontuario:', err);
                          alert('Erro ao deletar prontuário. Tente novamente.');
                        }
                      }}
                      className="px-3 py-1.5 bg-red-50 text-red-700 text-sm rounded hover:bg-red-100 transition-colors"
                    >
                      Deletar
                    </button>
                  </div>
                  <div className="text-sm text-black whitespace-pre-wrap leading-relaxed">
                    {prontuario.content}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Patient Info/Search */}
            <div>
              <h2 className="text-2xl font-bold mb-6 text-black">Paciente</h2>
              {prontuario.patient_name ? (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-lg font-medium text-gray-900">{prontuario.patient_name}</p>
                  <p className="text-sm text-gray-600 mt-1">Vinculado a este prontuário</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 mb-4">Nenhum paciente vinculado. Busque ou crie um paciente:</p>
                  <PatientSearchAndDisplay
                    onPatientSelected={(patient) => {
                      if (patient) {
                        handlePatientLinked(patient.full_name);
                      }
                    }}
                  />
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}