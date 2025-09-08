'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Prontuario {
  id: string;
  content: string;
  summary: string | null;
  created_at: string;
  title: string | null;
  patient_name: string | null;
  template_name: string | null;
  specialty: string | null;
  meta: {
    title?: string;
    patient_name?: string;
    template_name?: string;
    specialty?: string;
  } | null;
}

interface ProntuariosListProps {
  collapsed?: boolean;
}

export function ProntuariosList({ collapsed = false }: ProntuariosListProps) {
  const [prontuarios, setProntuarios] = useState<Prontuario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProntuarios() {
      try {
        // Get the session token for authorization
        const { createClient } = await import('../../lib/supabase');
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        // Add authorization header if we have a session
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        
        const response = await fetch('/api/prontuarios?limit=10', {
          headers
        });
        
        if (response.ok) {
          const data = await response.json();
          setProntuarios(data.prontuarios || []);
        } else {
          console.error('Error loading prontuários:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Error loading prontuários:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProntuarios();
  }, []);

  if (loading) {
    return (
      <div className={cn("space-y-2", collapsed && "flex flex-col items-center")}>
        {[1, 2, 3].map(i => (
          <div 
            key={i} 
            className={cn(
              "h-8 bg-slate-200 rounded animate-pulse",
              collapsed ? "w-8" : "w-full"
            )} 
          />
        ))}
      </div>
    );
  }

  if (prontuarios.length === 0) {
    return collapsed ? null : (
      <p className="text-xs text-slate-500 text-center py-4">
        Nenhuma consulta ainda
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {prontuarios.slice(0, collapsed ? 3 : 10).map((prontuario) => (
        <Link
          key={prontuario.id}
          href={`/prontuarios/${prontuario.id}`}
          className={cn(
            "block p-2 rounded-lg text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors duration-200",
            collapsed && "text-center"
          )}
          title={collapsed ? (prontuario.meta?.title || prontuario.summary || 'Prontuário') : undefined}
        >
          {collapsed ? (
            <div className="w-6 h-6 rounded-full bg-slate-300 flex items-center justify-center text-xs font-bold text-slate-600">
              {(prontuario.meta?.patient_name || prontuario.patient_name)?.charAt(0) || 'P'}
            </div>
          ) : (
            <div>
              <p className="font-medium truncate">{prontuario.meta?.title || prontuario.title || prontuario.summary || 'Prontuário'}</p>
              <p className="text-slate-500 text-xs truncate">
                {prontuario.meta?.patient_name || prontuario.patient_name || 'Paciente não informado'} • {new Date(prontuario.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          )}
        </Link>
      ))}
      
      
    </div>
  );
}