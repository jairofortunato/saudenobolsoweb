'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/layout/Sidebar';

interface Prontuario {
  id: string;
  title: string;
  patient_name: string | null;
  template_name: string | null;
  specialty: string | null;
  created_at: string;
}

export default function ProntuariosPage() {
  const [prontuarios, setProntuarios] = useState<Prontuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadProntuarios() {
      try {
        const params = new URLSearchParams();
        if (searchTerm) params.set('search', searchTerm);
        
        const response = await fetch(`/api/prontuarios?${params}`);
        if (response.ok) {
          const data = await response.json();
          setProntuarios(data.prontuarios || []);
        }
      } catch (error) {
        console.error('Error loading prontuários:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProntuarios();
  }, [searchTerm]);

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Histórico de Consultas</h1>
            
            <div className="flex gap-4 items-center">
              <input
                type="text"
                placeholder="Buscar prontuários..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 p-3 border border-gray-300 rounded-lg"
              />
              
              <Link
                href="/doctor/prontodoc-rcr30"
                className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 whitespace-nowrap"
              >
                + Nova Consulta
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {prontuarios.map((prontuario) => (
                <Link
                  key={prontuario.id}
                  href={`/prontuarios/${prontuario.id}`}
                  className="block p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-lg transition-all duration-200"
                >
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                    {prontuario.title}
                  </h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    {prontuario.patient_name && (
                      <p>Paciente: {prontuario.patient_name}</p>
                    )}
                    {prontuario.template_name && (
                      <p>Template: {prontuario.template_name}</p>
                    )}
                    <p>Data: {new Date(prontuario.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {!loading && prontuarios.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">Nenhum prontuário encontrado</p>
              <Link
                href="/doctor/prontodoc-rcr30"
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Criar primeira consulta
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}