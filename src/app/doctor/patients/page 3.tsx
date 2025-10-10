'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '../../../../components/layout/DashboardLayout';
import { useAuth } from '../../../../hooks/useAuth';
import {
  Loading,
  Button,
  Card,
  Input,
  CreatePatientModal
} from '../../../../components';
import { PatientSearch } from '../../../../components/doctor/PatientSearch';
import { PatientDisplay } from '../../../../components/doctor/PatientDisplay';
import { NovaEntradaModal } from '../../../../components/ui/NovaEntradaModal';
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

export default function DoctorPatientsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [searchResult, setSearchResult] = useState<PatientSearchResult | null>(null);
  const [isCreatePatientOpen, setIsCreatePatientOpen] = useState(false);

  // Patients table state
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [patientsLoading, setPatientsLoading] = useState<boolean>(true);
  const [patientsError, setPatientsError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Nova Entrada Modal state
  const [isNovaEntradaOpen, setIsNovaEntradaOpen] = useState(false);

  // Filtered patients based on search
  const filteredPatients = patients.filter(patient =>
    patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.cpf.includes(searchTerm) ||
    patient.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const handlePatientCreated = (patient: PatientProfile) => {
    setPatients((prev) => [
      {
        id: patient.id,
        full_name: patient.full_name,
        cpf: patient.cpf,
        pin: patient.pin,
        email: patient.email,
        phone: patient.phone,
        birth_date: patient.birth_date,
        address: patient.address,
        emergency_contact_name: patient.emergency_contact_name,
        emergency_contact_phone: patient.emergency_contact_phone,
        created_at: patient.created_at
      },
      ...prev
    ]);
  };

  const handleViewPatient = async (patient: PatientProfile) => {
    try {
      const response = await fetch('/api/doctor/patient-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin: patient.pin }),
      });

      const data = await response.json();

      if (response.ok) {
        setSearchResult(data);
      } else {
        console.error('Error loading patient data:', data.error);
      }
    } catch (error) {
      console.error('Error loading patient:', error);
    }
  };

  // Load patients created by this doctor
  useEffect(() => {
    const fetchPatients = async () => {
      if (!profile || profile.role !== 'doctor') return;
      setPatientsLoading(true);
      setPatientsError(null);

      console.log('👨‍⚕️ [PATIENTS] Profile object:', profile);
      console.log('👨‍⚕️ [PATIENTS] Profile ID:', profile.profile_id || profile.id);

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('profiles')
          .select('profile_id, full_name, cpf, pin, email, phone, birth_date, address, emergency_contact_name, emergency_contact_phone, created_at')
          .eq('role', 'patient')
          .eq('created_by', profile.profile_id || profile.id)
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        const mapped: PatientProfile[] = (data || []).map((p: Record<string, unknown>) => ({
          id: p.profile_id as string,
          full_name: p.full_name as string,
          cpf: p.cpf as string,
          pin: p.pin as string,
          email: p.email as string,
          phone: p.phone as string,
          birth_date: p.birth_date as string,
          address: p.address as string,
          emergency_contact_name: p.emergency_contact_name as string,
          emergency_contact_phone: p.emergency_contact_phone as string,
          created_at: p.created_at as string
        }));

        setPatients(mapped);
      } catch (err: unknown) {
        console.error('Error loading doctor patients:', err);
        setPatientsError('Falha ao carregar pacientes');
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
      title="Meus Pacientes"
      subtitle={`Dr. ${getDisplayName(profile)}`}
      className="font-petrona"
    >
      <div className="p-6 m-4 geist-regular">
        <div className="bg-white/30 backdrop-blur-md rounded-2xl border border-slate-200/50 p-6 space-y-6">

        {/* Patient Search Results */}
        {searchResult && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-800 font-petrona">
                📋 Dados do Paciente
              </h2>
              <Button
                variant="secondary"
                onClick={handleNewSearch}
                size="sm"
              >
                Nova Busca
              </Button>
            </div>
            <PatientDisplay
              patient={searchResult.patient}
              medicalData={searchResult.medicalData}
              onNewSearch={handleNewSearch}
            />
          </Card>
        )}

        {/* Patients Table */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-80">
              <Input
                type="text"
                placeholder="Buscar por nome, CPF ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {patientsLoading ? (
            <div className="py-8 flex justify-center">
              <Loading size="md" />
            </div>
          ) : patientsError ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {patientsError}
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-8">
              {searchTerm ? (
                <p className="text-slate-600">
                  Nenhum paciente encontrado para &quot;{searchTerm}&quot;
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-slate-600">Nenhum paciente cadastrado ainda.</p>
                  <Button
                    variant="primary"
                    onClick={() => setIsCreatePatientOpen(true)}
                    size="sm"
                  >
                    Criar Primeiro Paciente
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Paciente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Contato
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      PIN
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Data de Nascimento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Cadastrado em
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {filteredPatients.map((patient) => (
                    <tr
                      key={patient.id}
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={() => router.push(`/doctor/patients/${patient.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {patient.full_name}
                          </div>
                          <div className="text-sm text-slate-500 font-mono">
                            CPF: {patient.cpf}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-900">{patient.email}</div>
                        {patient.phone && (
                          <div className="text-sm text-slate-500">{patient.phone}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 font-mono">
                          {patient.pin}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {patient.birth_date ? new Date(patient.birth_date).toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {new Date(patient.created_at).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Create Patient Modal */}
        <CreatePatientModal
          open={isCreatePatientOpen}
          onClose={() => setIsCreatePatientOpen(false)}
          onPatientCreated={handlePatientCreated}
        />

        {/* Nova Entrada Modal */}
        <NovaEntradaModal
          open={isNovaEntradaOpen}
          onClose={() => setIsNovaEntradaOpen(false)}
          onSubmit={(data) => {
            console.log('Nova entrada submitted:', data);
          }}
          onProcessingComplete={(result) => {
            console.log('Processing complete:', result);
            // Refresh patient data if a patient was selected
            if (searchResult) {
              // Reload medical data for the current patient
              handleViewPatient(searchResult.patient);
            }
          }}
        />
        </div>
      </div>
    </DashboardLayout>
  );
}