'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SimpleProntuario } from '@/components/rcr-30/SimpleProntuario';
import { Sidebar } from '@/components/layout/Sidebar';

interface Prontuario {
  id: string;
  title: string | null;
  content: string;
  patient_name: string | null;
  template_name: string | null;
  specialty: string | null;
  created_at: string;
  summary: string | null;
  meta: any;
}

export default function ProntuarioPage() {
  const params = useParams();
  const router = useRouter();
  const [prontuario, setProntuario] = useState<Prontuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProntuario() {
      if (!params?.id) return;

      try {
        // Get the session token for authorization
        const { createClient } = await import('../../../../lib/supabase');
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        // Add authorization header if we have a session
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        
        console.log('🔧 [PRONTUARIO PAGE] Making request to load individual prontuário');
        
        const response = await fetch(`/api/prontuarios/${params.id}`, {
          headers
        });
        
        if (response.ok) {
          const data = await response.json();
          setProntuario(data.prontuario);
          console.log('✅ [PRONTUARIO PAGE] Successfully loaded prontuário');
        } else {
          console.error('❌ [PRONTUARIO PAGE] Failed to load prontuário:', response.status, response.statusText);
          setError('Prontuário não encontrado');
        }
      } catch (err) {
        console.error('❌ [PRONTUARIO PAGE] Error loading prontuário:', err);
        setError('Erro ao carregar prontuário');
      } finally {
        setLoading(false);
      }
    }

    loadProntuario();
  }, [params?.id]);

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Carregando prontuário...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !prontuario) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || 'Prontuário não encontrado'}</p>
            <button
              onClick={() => router.push('/doctor/prontodoc-rcr30')}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              ← Voltar às Consultas
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white">
      <Sidebar />
      <div className="flex-1 overflow-auto bg-white">
        <div className="max-w-4xl mx-auto p-6 bg-white">
          <div className="mb-6">
            <button
              onClick={() => router.push('/doctor/prontodoc-rcr30')}
              className="text-sm text-blue-600 hover:text-blue-700 mb-4"
            >
              ← Voltar às Consultas
            </button>
            
            <div className="border-b border-gray-200 pb-4 mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                {prontuario.title || prontuario.meta?.title || prontuario.summary || 'Prontuário'}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                {(prontuario.patient_name || prontuario.meta?.patient_name) ? (
                  <span>Paciente: {prontuario.patient_name || prontuario.meta?.patient_name}</span>
                ) : (
                  <span>Paciente: Não informado</span>
                )}
                {(prontuario.template_name || prontuario.meta?.template_name) && (
                  <span>Template: {prontuario.template_name || prontuario.meta?.template_name}</span>
                )}
                {(prontuario.specialty || prontuario.meta?.specialty) && (
                  <span>Especialidade: {prontuario.specialty || prontuario.meta?.specialty}</span>
                )}
                <span>Data: {new Date(prontuario.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          </div>

          <SimpleProntuario 
            prontuario={prontuario.content}
            onSaved={() => {
              // Refresh page or show success message
              window.location.reload();
            }}
          />
        </div>
      </div>
    </div>
  );
}