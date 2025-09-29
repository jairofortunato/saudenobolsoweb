'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '../../../../components/layout/DashboardLayout';
import { useAuth } from '../../../../hooks/useAuth';
import {
  Loading,
  Button,
  CreatePatientModal
} from '../../../../components';
import { getDisplayName } from '../../../../lib/auth-utils';
import { createClient } from '../../../../lib/supabase';

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


export default function DoctorDashboardPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  // Top action modals
  const [isCreatePatientOpen, setIsCreatePatientOpen] = useState(false);

  // Doctor patients table
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [patientsLoading, setPatientsLoading] = useState<boolean>(true);
  const [patientsError, setPatientsError] = useState<string | null>(null);

  // Redirect if not a doctor
  useEffect(() => {
    if (profile && profile.role !== 'doctor') {
      router.push('/dashboard');
      return;
    }
    if (profile) {
      setLoading(false);
    }
  }, [profile, router]);

  const handlePatientCreated = (patient: any) => {
    // Optimistically add to table top
    setPatients((prev) => [
      {
        id: patient.id,
        full_name: patient.full_name,
        cpf: patient.cpf,
        pin: patient.pin,
        email: patient.email,
        created_at: patient.created_at
      },
      ...prev
    ]);
  };


  // Load patients created by this doctor
  useEffect(() => {
    const fetchPatients = async () => {
      if (!profile || profile.role !== 'doctor') return;
      setPatientsLoading(true);
      setPatientsError(null);
      try {
        const supabase = createClient();
        const createdByValues = [profile.id].filter(Boolean);
        let query = supabase
          .from('profiles')
          .select('profile_id, full_name, cpf, pin, email, created_at')
          .eq('role', 'patient')
          .order('created_at', { ascending: false });

        if (createdByValues.length === 1) {
          query = query.eq('created_by', createdByValues[0] as string);
        } else if (createdByValues.length > 1) {
          // @ts-ignore - supabase-js supports .in
          query = query.in('created_by', createdByValues as string[]);
        }

        const { data, error } = await query;
        if (error) {
          throw error;
        }

        const mapped: PatientProfile[] = (data || []).map((p: any) => ({
          id: p.profile_id,
          full_name: p.full_name,
          cpf: p.cpf,
          pin: p.pin,
          email: p.email,
          created_at: p.created_at
        }));

        setPatients(mapped);
      } catch (err: any) {
        console.error('Error loading doctor patients:', err);
        setPatientsError('Falha ao carregar pacientes do médico');
      } finally {
        setPatientsLoading(false);
      }
    };

    fetchPatients();
  }, [profile]);

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (profile.role !== 'doctor') {
    return null;
  }

  return (
    <DashboardLayout
      title={`Dr. ${getDisplayName(profile)}`}
      subtitle="Painel médico"
      breadcrumbs={[
        { label: 'Dashboard Médico' }
      ]}
    >
      <div className="space-y-6">
        {/* Top Actions */}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            onClick={() => router.push('/doctor/prontodoc-rcr30')}
            className="flex items-center gap-2"
          >
            <span>📋</span>
            <span>Nova Consulta</span>
          </Button>
          <Button
            variant="secondary"
            onClick={() => router.push('/doctor/formatos-anamnese')}
            className="flex items-center gap-2"
          >
            <span>✏️</span>
            <span>Edite o formato da sua anamnese</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsCreatePatientOpen(true)}
            className="flex items-center gap-2"
          >
            <span>👤</span>
            <span>Criar Paciente</span>
          </Button>
        </div>

        
        {/* Tabela de Pacientes do Médico */}
        <div className=" rounded-lg   p-2">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Pacientes</h2>
          {patientsLoading ? (
            <div className="py-6"><Loading size="sm" /></div>
          ) : patientsError ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{patientsError}</div>
          ) : patients.length === 0 ? (
            <p className="text-slate-600 text-sm">Nenhum paciente cadastrado por você ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nome</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">CPF</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">PIN</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Criado em</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {patients.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-800">{p.full_name}</td>
                      <td className="px-4 py-2 text-slate-700 font-mono text-sm">{p.cpf}</td>
                      <td className="px-4 py-2 text-slate-700 font-mono text-sm">{p.pin}</td>
                      <td className="px-4 py-2 text-slate-600 text-sm">{new Date(p.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>


        {/* Modals */}
        <CreatePatientModal
          open={isCreatePatientOpen}
          onClose={() => setIsCreatePatientOpen(false)}
          onPatientCreated={handlePatientCreated}
        />
      </div>
    </DashboardLayout>
  );
} 