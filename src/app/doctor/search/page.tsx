'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '../../../../components/layout/DashboardLayout';
import { useAuth } from '../../../../hooks/useAuth';
import { 
  PatientSearch,
  PatientDisplay
} from '../../../../components';
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

export default function DoctorPatientSearchPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [patientResult, setPatientResult] = useState<{
    patient: PatientProfile;
    medicalData: PatientMedicalData;
  } | null>(null);

  // Redirect if not a doctor
  useEffect(() => {
    if (profile && profile.role !== 'doctor') {
      router.push('/dashboard');
      return;
    }
  }, [profile, router]);

  const handlePatientFound = (result: { patient: PatientProfile; medicalData: PatientMedicalData }) => {
    setPatientResult(result);
  };

  const handleClearSearch = () => {
    setPatientResult(null);
  };



  if (profile?.role !== 'doctor') {
    return null;
  }

  return (
    <DashboardLayout
      title="Buscar Paciente"
      subtitle="Busque e visualize os dados médicos de um paciente"
      breadcrumbs={[
        { label: 'Dashboard', href: '/doctor/dashboard' },
        { label: 'Buscar Paciente' }
      ]}
    >
      {!patientResult ? (
        <PatientSearch 
          onPatientFound={handlePatientFound}
          onClear={handleClearSearch}
        />
      ) : (
        <PatientDisplay 
          patient={patientResult.patient}
          medicalData={patientResult.medicalData}
          onNewSearch={handleClearSearch}
        />
      )}
    </DashboardLayout>
  );
} 