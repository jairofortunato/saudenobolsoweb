'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '../../../../../components/layout/DashboardLayout';
import { useAuth } from '../../../../../hooks/useAuth';
import { Loading } from '../../../../../components';
import { createClient } from '../../../../../lib/supabase';
import { Medication, Allergy, Exam, Disease, Consultation } from '../../../../../types/database';
import { PatientDisplay } from '../../../../../components/rcr-30/PatientDisplay';

interface ExpandedState {
  [key: string]: boolean;
}

interface PatientProfile {
  id: string;
  full_name: string;
  cpf: string;
  pin: string;
  email: string;
  phone?: string;
  birth_date?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  created_at: string;
}

interface PatientMedicalData {
  medications: Medication[];
  allergies: Allergy[];
  exams: Exam[];
  diseases: Disease[];
  consultations: Consultation[];
  prontuarios: Prontuario[];
}

interface Prontuario {
  id: string;
  prontuario: any;
  created_at: string;
  patient_name?: string;
}

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [medicalData, setMedicalData] = useState<PatientMedicalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedProntuarios, setExpandedProntuarios] = useState<ExpandedState>({});
  const [editingProntuario, setEditingProntuario] = useState<string | null>(null);
  const [editedText, setEditedText] = useState<string>('');
  const [deletingProntuario, setDeletingProntuario] = useState<string | null>(null);

  const patientId = params.id as string;

  const toggleProntuario = (id: string) => {
    setExpandedProntuarios(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Auto-expand the most recent prontuario when data loads
  useEffect(() => {
    if (medicalData && medicalData.prontuarios.length > 0) {
      const mostRecentId = medicalData.prontuarios[0].id;
      setExpandedProntuarios({ [mostRecentId]: true });
    }
  }, [medicalData]);

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

      // Reload data
      await loadPatientData();
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

      // Reload data
      await loadPatientData();
    } catch (err: any) {
      console.error('Error deleting prontuario:', err);
      alert('Erro ao deletar prontuário. Tente novamente.');
    } finally {
      setDeletingProntuario(null);
    }
  };

  useEffect(() => {
    if (!profile || profile.role !== 'doctor') {
      router.push('/doctor/prontodoc-rcr30');
      return;
    }

    loadPatientData();
  }, [profile, patientId]);

  const loadPatientData = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Fetch patient profile
      const { data: patientData, error: patientError } = await supabase
        .from('profiles')
        .select('profile_id, full_name, cpf, pin, email, phone, birth_date, address, emergency_contact_name, emergency_contact_phone, created_at')
        .eq('profile_id', patientId)
        .single();

      if (patientError) throw patientError;

      setPatient({
        id: patientData.profile_id,
        full_name: patientData.full_name,
        cpf: patientData.cpf,
        pin: patientData.pin,
        email: patientData.email,
        phone: patientData.phone,
        birth_date: patientData.birth_date,
        address: patientData.address,
        emergency_contact_name: patientData.emergency_contact_name,
        emergency_contact_phone: patientData.emergency_contact_phone,
        created_at: patientData.created_at
      });

      // Fetch medical data in parallel
      // Note: appointments table uses patient_name for filtering, not patient_id
      // We need to get appointments where patient_name matches this patient's full_name
      const [medicationsRes, allergiesRes, examsRes, diseasesRes, consultationsRes, prontuariosRes] = await Promise.all([
        supabase.from('medications').select('*').eq('patient_id', patientId),
        supabase.from('allergies').select('*').eq('patient_id', patientId),
        supabase.from('exams').select('*').eq('patient_id', patientId),
        supabase.from('diseases').select('*').eq('patient_id', patientId),
        supabase.from('consultations').select('*').eq('patient_id', patientId),
        supabase.from('appointments')
          .select('id, prontuario, created_at, patient_name, status')
          .eq('patient_name', patientData.full_name)
          .not('prontuario', 'is', null)
          .order('created_at', { ascending: false })
      ]);

      setMedicalData({
        medications: medicationsRes.data || [],
        allergies: allergiesRes.data || [],
        exams: examsRes.data || [],
        diseases: diseasesRes.data || [],
        consultations: consultationsRes.data || [],
        prontuarios: prontuariosRes.data || []
      });
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados do paciente');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Dados do Paciente">
        <div className="flex justify-center py-12">
          <Loading size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !patient || !medicalData) {
    return (
      <DashboardLayout title="Dados do Paciente">
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error || 'Paciente não encontrado'}
        </div>
      </DashboardLayout>
    );
  }

  const formatProntuarioText = (prontuarioData: any): string => {
    if (!prontuarioData) return '';

    const prontuarioObj = prontuarioData as any;
    return prontuarioObj.prontuario_text ||
           prontuarioObj.content ||
           prontuarioObj.text ||
           JSON.stringify(prontuarioData, null, 2);
  };

  return (
    <DashboardLayout title={patient.full_name}>
      <div className="min-h-screen">
        <div className="py-8">

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Left Column - Prontuários */}
            <div>
              <h2 className="text-2xl font-medium mb-6 text-black font-geist">Prontuários</h2>
              {medicalData.prontuarios.length > 0 ? (
                <div className="space-y-3">
                  {medicalData.prontuarios.map((prontuario) => (
                    <div key={prontuario.id}>
                      <button
                        onClick={() => toggleProntuario(prontuario.id)}
                        className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors rounded-lg flex items-center justify-between"
                      >
                        <span className="text-sm font-medium text-gray-900">
                          {new Date(prontuario.created_at).toLocaleDateString('pt-BR')} às {new Date(prontuario.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
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
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 font-medium">Nenhum prontuário cadastrado.</p>
                </div>
              )}
            </div>

            {/* Right Column - Medical Data */}
            <div>
              <h2 className="text-2xl font-medium mb-6 text-black font-geist">Dados Médicos</h2>
              <PatientDisplay
                patient={patient}
                medicalData={{
                  medications: medicalData.medications,
                  allergies: medicalData.allergies,
                  exams: medicalData.exams,
                  diseases: medicalData.diseases,
                  consultations: medicalData.consultations
                }}
              />
            </div>
          </div>

          {/* Empty state */}
          {medicalData.allergies.length === 0 &&
           medicalData.medications.length === 0 &&
           medicalData.diseases.length === 0 &&
           medicalData.exams.length === 0 &&
           medicalData.consultations.length === 0 &&
           medicalData.prontuarios.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-gray-500 font-medium">Nenhum dado médico cadastrado para este paciente.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
