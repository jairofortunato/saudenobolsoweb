'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '../../../../components/layout/DashboardLayout';
import { useAuth } from '../../../../hooks/useAuth';
import { 
  Loading,
  Button,
  NovaEntradaModal,
  CreatePatientModal
} from '../../../../components';
import { PatientSearch } from '../../../../components/doctor/PatientSearch';
import { PatientDisplay } from '../../../../components/doctor/PatientDisplay';
import { getDisplayName } from '../../../../lib/auth-utils';
import { Medication, Allergy, Exam, Disease, Consultation } from '../../../../types/database';
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

interface PatientMedicalData {
  medications: Medication[];
  allergies: Allergy[];
  exams: Exam[];
  diseases: Disease[];
  consultations: Consultation[];
}

interface PatientSearchResult {
  patient: PatientProfile;
  medicalData: PatientMedicalData;
}

export default function DoctorDashboardPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [searchResult, setSearchResult] = useState<PatientSearchResult | null>(null);
  // Top action modals
  const [isCreatePatientOpen, setIsCreatePatientOpen] = useState(false);
  const [isNovaEntradaOpen, setIsNovaEntradaOpen] = useState(false);
  const [processingResult, setProcessingResult] = useState<any>(null);

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

  const handlePatientFound = (result: PatientSearchResult) => {
    setSearchResult(result);
  };

  const handleNewSearch = () => {
    setSearchResult(null);
  };

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

  const handleNovaEntradaSubmit = (data: { category: string; content: string }) => {
    console.log('Nova entrada submitted:', data);
  };

  const handleProcessingComplete = (result: any) => {
    setProcessingResult(result);
    console.log('Processing completed:', result);
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
            variant="secondary"
            onClick={() => setIsCreatePatientOpen(true)}
            className="flex items-center gap-2"
          >
            <span>👤</span>
            <span>Criar Paciente</span>
          </Button>
          <Button
            variant="primary"
            onClick={() => setIsNovaEntradaOpen(true)}
            className="flex items-center gap-2"
          >
            <span>➕</span>
            <span>Nova Entrada Médica</span>
          </Button>
        </div>

        {/* Buscar Paciente - moved up */}
        <div className=" rounded-lg ">
      
          <PatientSearch 
            onPatientFound={handlePatientFound}
            onClear={handleNewSearch}
          />
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

        {/* Patient Display Section */}
        {searchResult && (
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">
              📋 Dados do Paciente
            </h2>
            <PatientDisplay 
              patient={searchResult.patient}
              medicalData={searchResult.medicalData}
              onNewSearch={handleNewSearch}
            />
          </div>
        )}

        {/* Modals */}
        <CreatePatientModal
          open={isCreatePatientOpen}
          onClose={() => setIsCreatePatientOpen(false)}
          onPatientCreated={handlePatientCreated}
        />
        <NovaEntradaModal
          open={isNovaEntradaOpen}
          onClose={() => setIsNovaEntradaOpen(false)}
          onSubmit={handleNovaEntradaSubmit}
          onProcessingComplete={handleProcessingComplete}
        />
      </div>
    </DashboardLayout>
  );
} 