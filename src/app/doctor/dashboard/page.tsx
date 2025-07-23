'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '../../../../components/layout/DashboardLayout';
import { useAuth } from '../../../../hooks/useAuth';
import { 
  Loading
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
        {/* Always show PatientSearch for easy searching */}
        <PatientSearch 
          onPatientFound={handlePatientFound}
          onClear={handleNewSearch}
        />
        
        {/* Show PatientDisplay when a patient is found */}
        {searchResult && (
          <PatientDisplay 
            patient={searchResult.patient}
            medicalData={searchResult.medicalData}
            onNewSearch={handleNewSearch}
          />
        )}
      </div>
    </DashboardLayout>
  );
} 