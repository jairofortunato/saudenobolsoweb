'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { useAuth } from '../../../hooks/useAuth';
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Loading
} from '../../../components';

interface MedicalData {
  medications: any[];
  allergies: any[];
  exams: any[];
  diseases: any[];
  consultations: any[];
}

export default function EmergencyPage() {
  const { user, profile } = useAuth();
  const [medicalData, setMedicalData] = useState<MedicalData>({
    medications: [],
    allergies: [],
    exams: [],
    diseases: [],
    consultations: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMedicalData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        
        // Fetch data from all medical categories
        const [
          medicationsRes,
          allergiesRes,
          examsRes,
          diseasesRes,
          consultationsRes
        ] = await Promise.all([
          fetch('/api/medications'),
          fetch('/api/allergies'),
          fetch('/api/exams'),
          fetch('/api/diseases'),
          fetch('/api/consultations')
        ]);

        const [
          medicationsData,
          allergiesData,
          examsData,
          diseasesData,
          consultationsData
        ] = await Promise.all([
          medicationsRes.json(),
          allergiesRes.json(),
          examsRes.json(),
          diseasesRes.json(),
          consultationsRes.json()
        ]);

        setMedicalData({
          medications: medicationsData.medications || [],
          allergies: allergiesData.allergies || [],
          exams: examsData.exams || [],
          diseases: diseasesData.diseases || [],
          consultations: consultationsData.consultations || []
        });
      } catch (error) {
        console.error('Error fetching medical data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMedicalData();
  }, [user]);

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <DashboardLayout
        title="🚨 Emergência"
        subtitle="Informações críticas para atendimento médico"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Emergência', href: '/emergency' }
        ]}
      >
        <div className="flex justify-center items-center h-64">
          <Loading size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="🚨 Emergência"
      subtitle="Informações críticas para atendimento médico"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Emergência', href: '/emergency' }
      ]}
    >
      <div className="space-y-8">
        {/* Emergency Header */}
        <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded-lg">
          <div className="flex items-center">
            <div className="text-red-500 text-2xl mr-3">🚨</div>
            <div>
              <h2 className="text-xl font-bold text-red-800">
                Informações de Emergência
              </h2>
              <p className="text-red-700">
                Mantenha essas informações sempre atualizadas para situações de emergência
              </p>
            </div>
          </div>
        </div>

        {/* Patient Information */}
        <Card className="bg-white border-red-200">
          <CardHeader className="bg-white">
            <CardTitle className="text-red-800 text-2xl">👤 DADOS DO PACIENTE</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-bold text-red-700">Nome:</h3>
                <p className="text-slate-700 text-2xl mt-2">{profile?.full_name || 'Não informado'}</p>
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-700">CPF:</h3>
                <p className="text-slate-700 font-mono text-2xl mt-2">{profile?.cpf || 'Não informado'}</p>
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-700">PIN:</h3>
                <p className="text-slate-700 font-mono text-3xl font-bold mt-2">{profile?.pin || 'Não informado'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Medications */}
        <Card className="bg-white border-red-200">
          <CardHeader className="bg-white">
            <CardTitle className="text-red-800 text-2xl">💊 MEDICAMENTOS</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {medicalData.medications.length > 0 ? (
              <div className="space-y-6">
                {medicalData.medications.map((medication, index) => (
                  <div key={index} className="border-b border-red-200 pb-4">
                    <h3 className="text-2xl font-bold text-red-700 mb-3">{medication.name}</h3>
                    {medication.dosage && (
                      <p className="text-lg text-slate-700 mb-1"><strong>Dosagem:</strong> {medication.dosage}</p>
                    )}
                    {medication.frequency && (
                      <p className="text-lg text-slate-700 mb-1"><strong>Frequência:</strong> {medication.frequency}</p>
                    )}
                    {medication.notes && (
                      <p className="text-slate-600 mt-2">{medication.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-4xl mb-2">💊</div>
                <p className="text-slate-600 text-lg">Nenhum medicamento registrado</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Allergies */}
        <Card className="bg-white border-red-200">
          <CardHeader className="bg-white">
            <CardTitle className="text-red-800 text-2xl">⚠️ ALERGIAS</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {medicalData.allergies.length > 0 ? (
              <div className="space-y-6">
                {medicalData.allergies.map((allergy, index) => (
                  <div key={index} className="border-b border-red-200 pb-4">
                    <h3 className="text-2xl font-bold text-red-700 mb-3">{allergy.name}</h3>
                    {allergy.severity && (
                      <p className="text-lg text-slate-700 mb-1"><strong>Gravidade:</strong> {allergy.severity}</p>
                    )}
                    {allergy.notes && (
                      <p className="text-slate-600 mt-2">{allergy.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-4xl mb-2">⚠️</div>
                <p className="text-slate-600 text-lg">Nenhuma alergia registrada</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Diseases */}
        <Card className="bg-white border-red-200">
          <CardHeader className="bg-white">
            <CardTitle className="text-red-800 text-2xl">🩺 DOENÇAS</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {medicalData.diseases.length > 0 ? (
              <div className="space-y-6">
                {medicalData.diseases.map((disease, index) => (
                  <div key={index} className="border-b border-red-200 pb-4">
                    <h3 className="text-2xl font-bold text-red-700 mb-3">{disease.name}</h3>
                    {disease.diagnosed_date && (
                      <p className="text-lg text-slate-700 mb-1"><strong>Diagnóstico:</strong> {new Date(disease.diagnosed_date).toLocaleDateString('pt-BR')}</p>
                    )}
                    {disease.is_chronic && (
                      <p className="text-lg text-orange-600 mb-1"><strong>Condição Crônica</strong></p>
                    )}
                    {disease.notes && (
                      <p className="text-slate-600 mt-2">{disease.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-4xl mb-2">🩺</div>
                <p className="text-slate-600 text-lg">Nenhuma doença registrada</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Exams */}
        <Card className="bg-white border-red-200">
          <CardHeader className="bg-white">
            <CardTitle className="text-red-800 text-2xl">📋 EXAMES</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {medicalData.exams.length > 0 ? (
              <div className="space-y-6">
                {medicalData.exams.map((exam, index) => (
                  <div key={index} className="border-b border-red-200 pb-4">
                    <h3 className="text-2xl font-bold text-red-700 mb-3">{exam.name}</h3>
                    {exam.exam_date && (
                      <p className="text-lg text-slate-700 mb-1"><strong>Data:</strong> {new Date(exam.exam_date).toLocaleDateString('pt-BR')}</p>
                    )}
                    {exam.result && (
                      <p className="text-lg text-slate-700 mb-1"><strong>Resultado:</strong> {exam.result}</p>
                    )}
                    {exam.notes && (
                      <p className="text-slate-600 mt-2">{exam.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-4xl mb-2">📋</div>
                <p className="text-slate-600 text-lg">Nenhum exame registrado</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Consultations */}
        <Card className="bg-white border-red-200">
          <CardHeader className="bg-white">
            <CardTitle className="text-red-800 text-2xl">🏥 CONSULTAS</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {medicalData.consultations.length > 0 ? (
              <div className="space-y-6">
                {medicalData.consultations.map((consultation, index) => (
                  <div key={index} className="border-b border-red-200 pb-4">
                    <h3 className="text-2xl font-bold text-red-700 mb-3">{consultation.doctor_name}</h3>
                    {consultation.specialty && (
                      <p className="text-lg text-slate-700 mb-1"><strong>Especialidade:</strong> {consultation.specialty}</p>
                    )}
                    {consultation.consultation_date && (
                      <p className="text-lg text-slate-700 mb-1"><strong>Data:</strong> {new Date(consultation.consultation_date).toLocaleDateString('pt-BR')}</p>
                    )}
                    {consultation.notes && (
                      <p className="text-slate-600 mt-2">{consultation.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-4xl mb-2">🏥</div>
                <p className="text-slate-600 text-lg">Nenhuma consulta registrada</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
} 