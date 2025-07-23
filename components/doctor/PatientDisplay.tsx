'use client';

import React, { useState } from 'react';
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  BadgeToggleCard
} from '../index';
import { DoctorEmergencyModal } from './DoctorEmergencyModal';
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

interface PatientDisplayProps {
  patient: PatientProfile;
  medicalData: PatientMedicalData;
  onNewSearch?: () => void;
}

export function PatientDisplay({ patient, medicalData, onNewSearch }: PatientDisplayProps) {
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);

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
      case 'life-threatening': return 'text-red-800 bg-red-100 border-red-300';
      case 'severe': return 'text-red-700 bg-red-50 border-red-200';
      case 'moderate': return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'mild': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-red-700 bg-red-50';
      case 'resolved': return 'text-green-700 bg-green-50';
      case 'in_remission': return 'text-blue-700 bg-blue-50';
      default: return 'text-gray-700 bg-gray-50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Ativa';
      case 'resolved': return 'Resolvida';
      case 'in_remission': return 'Em remissão';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Patient Information - Compact */}
      <Card className="p-2">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">👤 {patient.full_name}</CardTitle>
          <Button 
            variant="danger" 
            size="sm" 
            onClick={() => setIsEmergencyModalOpen(true)}
          >
            🚨 Emergência
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <label className="text-xs font-medium text-slate-500">PIN</label>
              <p className="font-mono text-slate-800">{patient.pin}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Idade</label>
              <p className="text-slate-800">
                {patient.birth_date ? `${calculateAge(patient.birth_date)} anos` : 'N/A'}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Telefone</label>
              <p className="text-slate-800">{patient.phone || 'N/A'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Email</label>
              <p className="text-slate-800 truncate">{patient.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>




      {/* Allergies Card */}
      <Card className="hover:shadow-md transition-shadow p-3">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <span>⚠️ Alergias</span>
            <span className="text-sm font-normal text-slate-500">
              {medicalData.allergies.length} registros
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {medicalData.allergies.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-1">
              {medicalData.allergies.map((allergy) => (
                <BadgeToggleCard
                  key={allergy.id}
                  id={allergy.id}
                  title={allergy.name}
                  variant="orange"
                  isEditing={false}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">Gravidade:</span>
                      <span className={`px-2 py-1 rounded text-xs ${getSeverityColor(allergy.severity)}`}>
                        {getSeverityText(allergy.severity)}
                      </span>
                    </div>
                    {allergy.reaction && (
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Reação:</span>
                        <p className="text-sm text-slate-600 mt-1">{allergy.reaction}</p>
                      </div>
                    )}
                    {allergy.notes && (
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Observações:</span>
                        <p className="text-sm text-slate-600 mt-1">{allergy.notes}</p>
                      </div>
                    )}
                    <div className="text-xs text-slate-500 pt-2 border-t border-slate-200">
                      Registrado em: {formatDate(allergy.created_at)}
                    </div>
                  </div>
                </BadgeToggleCard>
              ))}
            </div>
          ) : (
            <div className="text-center py-1">
              <p className="text-slate-500 text-sm">Nenhuma alergia registrada</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diseases Card */}
      <Card className="hover:shadow-md transition-shadow p-3">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <span>🩺 Doenças</span>
            <span className="text-sm font-normal text-slate-500">
              {medicalData.diseases.length} registros
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {medicalData.diseases.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-1">
              {medicalData.diseases.map((disease) => (
                <BadgeToggleCard
                  key={disease.id}
                  id={disease.id}
                  title={disease.name}
                  variant="red"
                  isEditing={false}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">Status:</span>
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(disease.status)}`}>
                        {getStatusText(disease.status)}
                      </span>
                    </div>
                    {disease.diagnosed_date && (
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Diagnosticado:</span>
                        <p className="text-sm text-slate-600 mt-1">{formatDate(disease.diagnosed_date)}</p>
                      </div>
                    )}
                    {disease.is_chronic && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">Tipo:</span>
                        <span className="text-sm text-blue-600">Crônica</span>
                      </div>
                    )}
                    {disease.description && (
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Descrição:</span>
                        <p className="text-sm text-slate-600 mt-1">{disease.description}</p>
                      </div>
                    )}
                    {disease.notes && (
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Observações:</span>
                        <p className="text-sm text-slate-600 mt-1">{disease.notes}</p>
                      </div>
                    )}
                    <div className="text-xs text-slate-500 pt-2 border-t border-slate-200">
                      Registrado em: {formatDate(disease.created_at)}
                    </div>
                  </div>
                </BadgeToggleCard>
              ))}
            </div>
          ) : (
            <div className="text-center py-1">
              <p className="text-slate-500 text-sm">Nenhuma doença registrada</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Medications Card */}
      <Card className="hover:shadow-md transition-shadow p-3">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <span>💊 Medicamentos</span>
            <span className="text-sm font-normal text-slate-500">
              {medicalData.medications.filter(m => m.is_active).length} ativos
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {medicalData.medications.filter(m => m.is_active).length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-1">
              {medicalData.medications.filter(m => m.is_active).map((medication) => (
                <BadgeToggleCard
                  key={medication.id}
                  id={medication.id}
                  title={medication.name}
                  variant="blue"
                  isEditing={false}
                >
                  <div className="space-y-1">
                    {medication.dosage && (
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Dosagem:</span>
                        <p className="text-sm text-slate-600 mt-1">{medication.dosage}</p>
                      </div>
                    )}
                    {medication.frequency && (
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Frequência:</span>
                        <p className="text-sm text-slate-600 mt-1">{medication.frequency}</p>
                      </div>
                    )}
                    {medication.start_date && (
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Início:</span>
                        <p className="text-sm text-slate-600 mt-1">{formatDate(medication.start_date)}</p>
                      </div>
                    )}
                    {medication.end_date && (
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Fim:</span>
                        <p className="text-sm text-slate-600 mt-1">{formatDate(medication.end_date)}</p>
                      </div>
                    )}
                    {medication.notes && (
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Observações:</span>
                        <p className="text-sm text-slate-600 mt-1">{medication.notes}</p>
                      </div>
                    )}
                    <div className="text-xs text-slate-500 pt-2 border-t border-slate-200">
                      Registrado em: {formatDate(medication.created_at)}
                    </div>
                  </div>
                </BadgeToggleCard>
              ))}
            </div>
          ) : (
            <div className="text-center py-1">
              <p className="text-slate-500 text-sm">Nenhum medicamento ativo</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exams Card */}
      <Card className="hover:shadow-md transition-shadow p-3">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <span>🔬 Exames</span>
            <span className="text-sm font-normal text-slate-500">
              {medicalData.exams.length} registros
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {medicalData.exams.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-1">
              {medicalData.exams.map((exam) => (
                <BadgeToggleCard
                  key={exam.id}
                  id={exam.id}
                  title={exam.name}
                  variant="purple"
                  isEditing={false}
                >
                  <div className="space-y-1">
                    <div>
                      <span className="text-sm font-semibold text-slate-800">Data do exame:</span>
                      <p className="text-sm text-slate-600 mt-1">{formatDate(exam.exam_date)}</p>
                    </div>
                    {exam.doctor_name && (
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Médico:</span>
                        <p className="text-sm text-slate-600 mt-1">Dr. {exam.doctor_name}</p>
                      </div>
                    )}
                    {exam.result && (
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Resultado:</span>
                        <p className="text-sm text-slate-600 mt-1">{exam.result}</p>
                      </div>
                    )}
                    {exam.notes && (
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Observações:</span>
                        <p className="text-sm text-slate-600 mt-1">{exam.notes}</p>
                      </div>
                    )}
                    {exam.file_url && (
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Arquivo:</span>
                        <a 
                          href={exam.file_url || '#'} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline block mt-1"
                        >
                          Ver arquivo 📄
                        </a>
                      </div>
                    )}
                    <div className="text-xs text-slate-500 pt-2 border-t border-slate-200">
                      Registrado em: {formatDate(exam.created_at)}
                    </div>
                  </div>
                </BadgeToggleCard>
              ))}
            </div>
          ) : (
            <div className="text-center py-1">
              <p className="text-slate-500 text-sm">Nenhum exame registrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Consultations Card */}
      <Card className="hover:shadow-md transition-shadow p-3">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <span>👩‍⚕️ Consultas</span>
            <span className="text-sm font-normal text-slate-500">
              {medicalData.consultations.length} registros
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {medicalData.consultations.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-1">
              {medicalData.consultations.map((consultation) => (
                <BadgeToggleCard
                  key={consultation.id}
                  id={consultation.id}
                  title={`Dr. ${consultation.doctor_name}`}
                  variant="green"
                  isEditing={false}
                >
                  <div className="space-y-1">
                    {consultation.specialty && (
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Especialidade:</span>
                        <p className="text-sm text-slate-600 mt-1">{consultation.specialty}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-sm font-semibold text-slate-800">Data da consulta:</span>
                      <p className="text-sm text-slate-600 mt-1">{formatDate(consultation.consultation_date)}</p>
                    </div>
                    {consultation.reason && (
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Motivo:</span>
                        <p className="text-sm text-slate-600 mt-1">{consultation.reason}</p>
                      </div>
                    )}
                    {consultation.diagnosis && (
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Diagnóstico:</span>
                        <p className="text-sm text-slate-600 mt-1">{consultation.diagnosis}</p>
                      </div>
                    )}
                    {consultation.treatment && (
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Tratamento:</span>
                        <p className="text-sm text-slate-600 mt-1">{consultation.treatment}</p>
                      </div>
                    )}
                    {consultation.follow_up_date && (
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Retorno:</span>
                        <p className="text-sm text-slate-600 mt-1">{formatDate(consultation.follow_up_date)}</p>
                      </div>
                    )}
                    {consultation.notes && (
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Observações:</span>
                        <p className="text-sm text-slate-600 mt-1">{consultation.notes}</p>
                      </div>
                    )}
                    <div className="text-xs text-slate-500 pt-2 border-t border-slate-200">
                      Registrado em: {formatDate(consultation.created_at)}
                    </div>
                  </div>
                </BadgeToggleCard>
              ))}
            </div>
          ) : (
            <div className="text-center py-1">
              <p className="text-slate-500 text-sm">Nenhuma consulta registrada</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Emergency Modal */}
      <DoctorEmergencyModal
        patient={patient}
        medicalData={medicalData}
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
      />
    </div>
  );
} 