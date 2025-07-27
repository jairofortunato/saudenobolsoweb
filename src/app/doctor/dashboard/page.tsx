'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '../../../../components/layout/DashboardLayout';
import { useAuth } from '../../../../hooks/useAuth';
import { 
  Loading,
  Button,
  NovaEntradaModal
} from '../../../../components';
import { PatientSearch } from '../../../../components/doctor/PatientSearch';
import { PatientDisplay } from '../../../../components/doctor/PatientDisplay';
import { getDisplayName } from '../../../../lib/auth-utils';
import { Medication, Allergy, Exam, Disease, Consultation } from '../../../../types/database';

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
  
  // NovaEntradaModal state
  const [isNovaEntradaModalOpen, setIsNovaEntradaModalOpen] = useState(false);
  const [processingResult, setProcessingResult] = useState<any>(null);

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

  const handleNovaEntradaSubmit = (data: { category: string; content: string }) => {
    console.log('Nova entrada submitted:', data);
    // The modal handles the AI processing internally
  };

  const handleProcessingComplete = (result: any) => {
    setProcessingResult(result);
    // You could show a success notification here
    console.log('Processing completed:', result);
  };

  const openNovaEntradaModal = () => {
    setIsNovaEntradaModalOpen(true);
  };

  const closeNovaEntradaModal = () => {
    setIsNovaEntradaModalOpen(false);
    setProcessingResult(null);
  };

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
        {/* Quick Actions Section */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">
            🚀 Ações Rápidas
          </h2>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="primary"
              onClick={openNovaEntradaModal}
              className="flex items-center gap-2"
            >
              <span>➕</span>
              <span>Nova Entrada Médica</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="flex items-center gap-2"
            >
              <span>🔄</span>
              <span>Atualizar</span>
            </Button>
          </div>
          <p className="text-sm text-slate-600 mt-3">
            💡 Use "Nova Entrada Médica" para adicionar informações médicas para um paciente via PIN
          </p>
        </div>

        {/* Patient Search Section */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">
            🔍 Buscar Paciente
          </h2>
          <PatientSearch 
            onPatientFound={handlePatientFound}
            onClear={handleNewSearch}
          />
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

        {/* NovaEntradaModal */}
        <NovaEntradaModal
          open={isNovaEntradaModalOpen}
          onClose={closeNovaEntradaModal}
          onSubmit={handleNovaEntradaSubmit}
          onProcessingComplete={handleProcessingComplete}
        />
      </div>
    </DashboardLayout>
  );
} 