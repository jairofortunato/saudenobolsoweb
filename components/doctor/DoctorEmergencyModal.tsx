'use client';

import React, { useState } from 'react';
import { 
  Modal,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button
} from '../index';
import { Medication, Allergy, Exam, Disease, Consultation } from '../../types/database';

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

interface DoctorEmergencyModalProps {
  patient: PatientProfile;
  medicalData: PatientMedicalData;
  isOpen: boolean;
  onClose: () => void;
}

export function DoctorEmergencyModal({ patient, medicalData, isOpen, onClose }: DoctorEmergencyModalProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Não informado';
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const getSeverityColor = (severity: string | null) => {
    switch (severity) {
      case 'life-threatening': return 'bg-red-600 text-white';
      case 'severe': return 'bg-red-500 text-white';
      case 'moderate': return 'bg-orange-500 text-white';
      case 'mild': return 'bg-yellow-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getSeverityText = (severity: string | null) => {
    switch (severity) {
      case 'life-threatening': return 'RISCO DE VIDA';
      case 'severe': return 'SEVERA';
      case 'moderate': return 'MODERADA';
      case 'mild': return 'LEVE';
      default: return 'NÃO ESPECIFICADA';
    }
  };

  // Get critical medications (active only)
  const activeMedications = medicalData.medications.filter(m => m.is_active);
  
  // Get critical allergies (life-threatening and severe first)
  const criticalAllergies = medicalData.allergies.sort((a, b) => {
    const severityOrder = { 'life-threatening': 0, 'severe': 1, 'moderate': 2, 'mild': 3 };
    return (severityOrder[a.severity as keyof typeof severityOrder] || 4) - 
           (severityOrder[b.severity as keyof typeof severityOrder] || 4);
  });

  // Get active diseases (chronic and active conditions)
  const activeDiseases = medicalData.diseases.filter(d => d.status === 'active' || d.is_chronic);

  // Get recent consultations (last 3 months)
  const recentConsultations = medicalData.consultations
    .filter(c => {
      const consultationDate = new Date(c.consultation_date);
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return consultationDate >= threeMonthsAgo;
    })
    .slice(0, 3);

  return (
    <Modal open={isOpen} onClose={onClose} className="max-w-4xl">
      <div className="p-6 max-h-[80vh] overflow-y-auto">
        {/* Emergency Header */}
        <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded-lg mb-6">
          <div className="flex items-center">
            <div className="text-red-500 text-3xl mr-3">🚨</div>
            <div>
              <h2 className="text-2xl font-bold text-red-800">
                INFORMAÇÕES DE EMERGÊNCIA
              </h2>
              <p className="text-red-700 text-lg">
                Dados críticos para atendimento médico
              </p>
            </div>
          </div>
        </div>

        {/* Patient Critical Info */}
        <Card className="mb-6 bg-red-50 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-800 text-xl">👤 DADOS DO PACIENTE</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-bold text-red-700">NOME:</label>
                <p className="text-lg font-bold text-slate-800">{patient.full_name}</p>
              </div>
              <div>
                <label className="text-sm font-bold text-red-700">PIN:</label>
                <p className="text-2xl font-mono font-bold text-red-800">{patient.pin}</p>
              </div>
              <div>
                <label className="text-sm font-bold text-red-700">IDADE:</label>
                <p className="text-lg font-bold text-slate-800">
                  {patient.birth_date ? `${calculateAge(patient.birth_date)} anos` : 'N/A'}
                </p>
              </div>
            </div>
            
            {patient.emergency_contact_name && (
              <div className="mt-4 p-3 bg-orange-100 border border-orange-300 rounded">
                <label className="text-sm font-bold text-orange-700">CONTATO DE EMERGÊNCIA:</label>
                <p className="text-lg text-orange-800">
                  {patient.emergency_contact_name} - {patient.emergency_contact_phone}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Critical Allergies */}
          <Card className="bg-red-50 border-red-200">
            <CardHeader>
              <CardTitle className="text-red-800 text-lg">⚠️ ALERGIAS CRÍTICAS</CardTitle>
            </CardHeader>
            <CardContent>
              {criticalAllergies.length > 0 ? (
                <div className="space-y-3">
                  {criticalAllergies.slice(0, 5).map((allergy) => (
                    <div key={allergy.id} className="p-3 bg-white border border-red-200 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-red-800">{allergy.name}</h4>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${getSeverityColor(allergy.severity)}`}>
                          {getSeverityText(allergy.severity)}
                        </span>
                      </div>
                      {allergy.reaction && (
                        <p className="text-sm text-red-700"><strong>Reação:</strong> {allergy.reaction}</p>
                      )}
                    </div>
                  ))}
                  {criticalAllergies.length > 5 && (
                    <p className="text-sm text-red-600 font-medium">
                      + {criticalAllergies.length - 5} outras alergias
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-slate-600 text-center py-4">Nenhuma alergia registrada</p>
              )}
            </CardContent>
          </Card>

          {/* Active Medications */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-800 text-lg">💊 MEDICAMENTOS ATIVOS</CardTitle>
            </CardHeader>
            <CardContent>
              {activeMedications.length > 0 ? (
                <div className="space-y-3">
                  {activeMedications.slice(0, 5).map((medication) => (
                    <div key={medication.id} className="p-3 bg-white border border-blue-200 rounded">
                      <h4 className="font-bold text-blue-800 mb-1">{medication.name}</h4>
                      {medication.dosage && (
                        <p className="text-sm text-blue-700"><strong>Dosagem:</strong> {medication.dosage}</p>
                      )}
                      {medication.frequency && (
                        <p className="text-sm text-blue-700"><strong>Frequência:</strong> {medication.frequency}</p>
                      )}
                    </div>
                  ))}
                  {activeMedications.length > 5 && (
                    <p className="text-sm text-blue-600 font-medium">
                      + {activeMedications.length - 5} outros medicamentos
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-slate-600 text-center py-4">Nenhum medicamento ativo</p>
              )}
            </CardContent>
          </Card>

          {/* Active Diseases */}
          <Card className="bg-orange-50 border-orange-200">
            <CardHeader>
              <CardTitle className="text-orange-800 text-lg">🩺 CONDIÇÕES ATIVAS</CardTitle>
            </CardHeader>
            <CardContent>
              {activeDiseases.length > 0 ? (
                <div className="space-y-3">
                  {activeDiseases.slice(0, 5).map((disease) => (
                    <div key={disease.id} className="p-3 bg-white border border-orange-200 rounded">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-orange-800">{disease.name}</h4>
                        {disease.is_chronic && (
                          <span className="px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded">
                            CRÔNICA
                          </span>
                        )}
                      </div>
                      {disease.diagnosed_date && (
                        <p className="text-sm text-orange-700">
                          <strong>Diagnóstico:</strong> {formatDate(disease.diagnosed_date)}
                        </p>
                      )}
                    </div>
                  ))}
                  {activeDiseases.length > 5 && (
                    <p className="text-sm text-orange-600 font-medium">
                      + {activeDiseases.length - 5} outras condições
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-slate-600 text-center py-4">Nenhuma condição ativa</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Consultations */}
          <Card className="bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-green-800 text-lg">👩‍⚕️ CONSULTAS RECENTES</CardTitle>
            </CardHeader>
            <CardContent>
              {recentConsultations.length > 0 ? (
                <div className="space-y-3">
                  {recentConsultations.map((consultation) => (
                    <div key={consultation.id} className="p-3 bg-white border border-green-200 rounded">
                      <h4 className="font-bold text-green-800 mb-1">Dr. {consultation.doctor_name}</h4>
                      {consultation.specialty && (
                        <p className="text-sm text-green-700"><strong>Especialidade:</strong> {consultation.specialty}</p>
                      )}
                      <p className="text-sm text-green-700">
                        <strong>Data:</strong> {formatDate(consultation.consultation_date)}
                      </p>
                      {consultation.diagnosis && (
                        <p className="text-sm text-green-700"><strong>Diagnóstico:</strong> {consultation.diagnosis}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-600 text-center py-4">Nenhuma consulta recente</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Close Button */}
        <div className="flex justify-center mt-6">
          <Button 
            variant="outline" 
            size="lg"
            onClick={onClose}
            className="min-w-32"
          >
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
} 