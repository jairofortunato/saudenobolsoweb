'use client';

import React, { useState } from 'react';
import { 
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
  
  // Edit/Delete state management
  const [editing, setEditing] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>({});

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

  // Generic delete function
  const deleteItem = async (id: string, category: string, name: string) => {
    try {
      setDeleting(id);
      
      const response = await fetch(`/api/${category}?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete ${category}`);
      }

      // Remove from local state
      // Note: In a real implementation, you'd want to update the parent component's state
      console.log(`Deleted ${category} with id: ${id}`);
      
    } catch (err) {
      console.error(`Error deleting ${category}:`, err);
      alert(`Erro ao deletar ${category}. Tente novamente.`);
    } finally {
      setDeleting(null);
    }
  };

  // Start editing function
  const startEditing = (item: any, category: string) => {
    setEditing(item.id);
    setEditCategory(category);
    setEditData(item);
  };

  // Cancel editing function
  const cancelEditing = () => {
    setEditing(null);
    setEditCategory(null);
    setEditData({});
  };

  // Save function
  const saveItem = async () => {
    if (!editing || !editCategory) return;

    try {
      setSaving(true);
      
      const response = await fetch(`/api/${editCategory}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update ${editCategory}`);
      }

      const result = await response.json();
      console.log(`Updated ${editCategory}:`, result);
      
      setEditing(null);
      setEditCategory(null);
      setEditData({});
      
    } catch (err) {
      console.error(`Error updating ${editCategory}:`, err);
      alert(`Erro ao salvar ${editCategory}. Tente novamente.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Allergies Section */}
      <div>
        <div>
          <h3 className="flex items-center justify-between text-lg font-semibold text-black">
            <span>⚠️ Alergias</span>
            <span className="text-sm font-normal text-slate-500">
              {medicalData.allergies.length} registros
            </span>
          </h3>
        </div>
        <div>
          {medicalData.allergies.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-1">
              {medicalData.allergies.map((allergy) => (
                <BadgeToggleCard
                  key={allergy.id}
                  id={allergy.id}
                  title={allergy.name}
                  variant="orange"
                  category="Alergia"
                  createdBy={allergy.created_by || "Sistema"}
                  createdAt={allergy.created_at}
                  description={allergy.reaction ? `Reação: ${allergy.reaction}` : undefined}
                  isEditing={editing === allergy.id}
                  isDeleting={deleting === allergy.id}
                  onEdit={() => startEditing(allergy, 'allergies')}
                  onDelete={() => deleteItem(allergy.id, 'allergies', allergy.name)}
                  onCancel={cancelEditing}
                  onSave={saveItem}
                  isSaving={saving}
                  deleteConfirmMessage={`Tem certeza que deseja deletar a alergia "${allergy.name}"?`}
                  editingTitle={
                    <input
                      type="text"
                      value={editData.name || ''}
                      onChange={(e) => setEditData((prev: Record<string, any>) => ({ ...prev, name: e.target.value }))}
                      className="bg-transparent border-none outline-none text-sm font-medium text-orange-800"
                      placeholder="Nome da alergia"
                    />
                  }
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">Gravidade:</span>
                      {editing === allergy.id ? (
                        <select
                          value={editData.severity || ''}
                          onChange={(e) => setEditData((prev: Record<string, any>) => ({ ...prev, severity: e.target.value }))}
                          className="px-2 py-1 rounded text-xs border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="">Selecione</option>
                          <option value="mild">Leve</option>
                          <option value="moderate">Moderada</option>
                          <option value="severe">Severa</option>
                          <option value="life-threatening">Risco de vida</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-1 rounded text-xs ${getSeverityColor(allergy.severity)}`}>
                          {getSeverityText(allergy.severity)}
                        </span>
                      )}
                    </div>
                    {(allergy.reaction || editing === allergy.id) && (
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Reação:</span>
                        {editing === allergy.id ? (
                          <input
                            type="text"
                            value={editData.reaction || ''}
                            onChange={(e) => setEditData((prev: Record<string, any>) => ({ ...prev, reaction: e.target.value }))}
                            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="Descreva a reação"
                          />
                        ) : (
                          <p className="text-sm text-slate-600 mt-1">{allergy.reaction}</p>
                        )}
                      </div>
                    )}
                    {(allergy.notes || editing === allergy.id) && (
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Observações:</span>
                        {editing === allergy.id ? (
                          <textarea
                            value={editData.notes || ''}
                            onChange={(e) => setEditData((prev: Record<string, any>) => ({ ...prev, notes: e.target.value }))}
                            rows={2}
                            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="Observações adicionais"
                          />
                        ) : (
                          <p className="text-sm text-slate-600 mt-1">{allergy.notes}</p>
                        )}
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
        </div>
      </div>

      {/* Diseases Section */}
      <div>
        <div>
          <h3 className="flex items-center justify-between text-lg font-semibold text-black">
            <span>🩺 Doenças</span>
            <span className="text-sm font-normal text-slate-500">
              {medicalData.diseases.length} registros
            </span>
          </h3>
        </div>
        <div>
          {medicalData.diseases.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-1">
              {medicalData.diseases.map((disease) => (
                <BadgeToggleCard
                  key={disease.id}
                  id={disease.id}
                  title={disease.name}
                  variant="red"
                  category="Doença"
                  createdBy={disease.created_by || "Sistema"}
                  createdAt={disease.created_at}
                  description={disease.description ? `Descrição: ${disease.description}` : undefined}
                  isEditing={editing === disease.id}
                  isDeleting={deleting === disease.id}
                  onEdit={() => startEditing(disease, 'diseases')}
                  onDelete={() => deleteItem(disease.id, 'diseases', disease.name)}
                  onCancel={cancelEditing}
                  onSave={saveItem}
                  isSaving={saving}
                  deleteConfirmMessage={`Tem certeza que deseja deletar a doença "${disease.name}"?`}
                  editingTitle={
                    <input
                      type="text"
                      value={editData.name || ''}
                      onChange={(e) => setEditData((prev: Record<string, any>) => ({ ...prev, name: e.target.value }))}
                      className="bg-transparent border-none outline-none text-sm font-medium text-red-800"
                      placeholder="Nome da doença"
                    />
                  }
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">Status:</span>
                      {editing === disease.id ? (
                        <select
                          value={editData.status || ''}
                          onChange={(e) => setEditData((prev: Record<string, any>) => ({ ...prev, status: e.target.value }))}
                          className="px-2 py-1 rounded text-xs border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          <option value="">Selecione</option>
                          <option value="active">Ativa</option>
                          <option value="resolved">Resolvida</option>
                          <option value="in_remission">Em remissão</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(disease.status)}`}>
                          {getStatusText(disease.status)}
                        </span>
                      )}
                    </div>
                    {(disease.diagnosed_date || editing === disease.id) && (
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Diagnosticado:</span>
                        {editing === disease.id ? (
                          <input
                            type="date"
                            value={editData.diagnosed_date || ''}
                            onChange={(e) => setEditData((prev: Record<string, any>) => ({ ...prev, diagnosed_date: e.target.value }))}
                            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        ) : (
                          <p className="text-sm text-slate-600 mt-1">{formatDate(disease.diagnosed_date)}</p>
                        )}
                      </div>
                    )}
                    {editing === disease.id && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">Tipo:</span>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={editData.is_chronic || false}
                            onChange={(e) => setEditData((prev: Record<string, any>) => ({ ...prev, is_chronic: e.target.checked }))}
                            className="focus:ring-2 focus:ring-red-500"
                          />
                          <span className="text-sm text-blue-600">Crônica</span>
                        </label>
                      </div>
                    )}
                    {!editing && disease.is_chronic && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">Tipo:</span>
                        <span className="text-sm text-blue-600">Crônica</span>
                      </div>
                    )}
                    {(disease.description || editing === disease.id) && (
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Descrição:</span>
                        {editing === disease.id ? (
                          <textarea
                            value={editData.description || ''}
                            onChange={(e) => setEditData((prev: Record<string, any>) => ({ ...prev, description: e.target.value }))}
                            rows={2}
                            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-red-500"
                            placeholder="Descrição da doença"
                          />
                        ) : (
                          <p className="text-sm text-slate-600 mt-1">{disease.description}</p>
                        )}
                      </div>
                    )}
                    {(disease.notes || editing === disease.id) && (
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Observações:</span>
                        {editing === disease.id ? (
                          <textarea
                            value={editData.notes || ''}
                            onChange={(e) => setEditData((prev: Record<string, any>) => ({ ...prev, notes: e.target.value }))}
                            rows={2}
                            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-red-500"
                            placeholder="Observações adicionais"
                          />
                        ) : (
                          <div className="mt-1">
                            {disease.notes?.split('\n').map((note, index) => (
                              <div key={index} className="text-sm text-slate-600 mb-1">
                                <span className="text-red-600 font-medium">•</span> {note.trim()}
                              </div>
                            ))}
                          </div>
                        )}
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
        </div>
      </div>

      {/* Medications Section */}
      <div>
        <div>
          <h3 className="flex items-center justify-between text-lg font-semibold text-black">
            <span>💊 Medicamentos</span>
            <span className="text-sm font-normal text-slate-500">
              {medicalData.medications.filter(m => m.is_active).length} ativos
            </span>
          </h3>
        </div>
        <div>
          {medicalData.medications.filter(m => m.is_active).length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-1">
              {medicalData.medications.filter(m => m.is_active).map((medication) => (
                <BadgeToggleCard
                  key={medication.id}
                  id={medication.id}
                  title={medication.name}
                  variant="blue"
                  category="Medicamento"
                  createdBy={medication.created_by || "Sistema"}
                  createdAt={medication.created_at}
                  description={medication.dosage ? `Dosagem: ${medication.dosage}` : undefined}
                  isEditing={editing === medication.id}
                  isDeleting={deleting === medication.id}
                  onEdit={() => startEditing(medication, 'medications')}
                  onDelete={() => deleteItem(medication.id, 'medications', medication.name)}
                  onCancel={cancelEditing}
                  onSave={saveItem}
                  isSaving={saving}
                  deleteConfirmMessage={`Tem certeza que deseja deletar o medicamento "${medication.name}"?`}
                  editingTitle={
                    <input
                      type="text"
                      value={editData.name || ''}
                      onChange={(e) => setEditData((prev: Record<string, any>) => ({ ...prev, name: e.target.value }))}
                      className="bg-transparent border-none outline-none text-sm font-medium text-blue-800"
                      placeholder="Nome do medicamento"
                    />
                  }
                >
                  <div className="space-y-1">
                    {(medication.dosage || editing === medication.id) && (
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Dosagem:</span>
                        {editing === medication.id ? (
                          <input
                            type="text"
                            value={editData.dosage || ''}
                            onChange={(e) => setEditData((prev: Record<string, any>) => ({ ...prev, dosage: e.target.value }))}
                            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Ex: 500mg"
                          />
                        ) : (
                          <p className="text-sm text-slate-600 mt-1">{medication.dosage}</p>
                        )}
                      </div>
                    )}
                    {(medication.frequency || editing === medication.id) && (
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Frequência:</span>
                        {editing === medication.id ? (
                          <input
                            type="text"
                            value={editData.frequency || ''}
                            onChange={(e) => setEditData((prev: Record<string, any>) => ({ ...prev, frequency: e.target.value }))}
                            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Ex: 2x ao dia"
                          />
                        ) : (
                          <p className="text-sm text-slate-600 mt-1">{medication.frequency}</p>
                        )}
                      </div>
                    )}
                    {(medication.start_date || editing === medication.id) && (
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Início:</span>
                        {editing === medication.id ? (
                          <input
                            type="date"
                            value={editData.start_date || ''}
                            onChange={(e) => setEditData((prev: Record<string, any>) => ({ ...prev, start_date: e.target.value }))}
                            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <p className="text-sm text-slate-600 mt-1">{formatDate(medication.start_date)}</p>
                        )}
                      </div>
                    )}
                    {(medication.end_date || editing === medication.id) && (
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Fim:</span>
                        {editing === medication.id ? (
                          <input
                            type="date"
                            value={editData.end_date || ''}
                            onChange={(e) => setEditData((prev: Record<string, any>) => ({ ...prev, end_date: e.target.value }))}
                            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <p className="text-sm text-slate-600 mt-1">{formatDate(medication.end_date)}</p>
                        )}
                      </div>
                    )}
                    {(medication.notes || editing === medication.id) && (
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Observações:</span>
                        {editing === medication.id ? (
                          <textarea
                            value={editData.notes || ''}
                            onChange={(e) => setEditData((prev: Record<string, any>) => ({ ...prev, notes: e.target.value }))}
                            rows={2}
                            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Observações sobre o medicamento"
                          />
                        ) : (
                          <p className="text-sm text-slate-600 mt-1">{medication.notes}</p>
                        )}
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
        </div>
      </div>

      {/* Exams Section */}
      <div>
        <div>
          <h3 className="flex items-center justify-between text-lg font-semibold text-black">
            <span>🔬 Exames</span>
            <span className="text-sm font-normal text-slate-500">
              {medicalData.exams.length} registros
            </span>
          </h3>
        </div>
        <div>
          {medicalData.exams.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-1">
              {medicalData.exams.map((exam) => (
                <BadgeToggleCard
                  key={exam.id}
                  id={exam.id}
                  title={exam.name}
                  variant="purple"
                  category="Exame"
                  createdBy={exam.created_by || "Sistema"}
                  createdAt={exam.created_at}
                  description={exam.doctor_name ? `Médico: Dr. ${exam.doctor_name}` : undefined}
                  isEditing={editing === exam.id}
                  isDeleting={deleting === exam.id}
                  onEdit={() => startEditing(exam, 'exams')}
                  onDelete={() => deleteItem(exam.id, 'exams', exam.name)}
                  onCancel={cancelEditing}
                  onSave={saveItem}
                  isSaving={saving}
                  deleteConfirmMessage={`Tem certeza que deseja deletar o exame "${exam.name}"?`}
                  editingTitle={
                    <input
                      type="text"
                      value={editData.name || ''}
                      onChange={(e) => setEditData((prev: Record<string, any>) => ({ ...prev, name: e.target.value }))}
                      className="bg-transparent border-none outline-none text-sm font-medium text-purple-800"
                      placeholder="Nome do exame"
                    />
                  }
                >
                  <div className="space-y-1">
                    <div>
                      <span className="text-sm font-semibold text-slate-800">Data do exame:</span>
                      {editing === exam.id ? (
                        <input
                          type="date"
                          value={editData.exam_date || ''}
                          onChange={(e) => setEditData((prev: Record<string, any>) => ({ ...prev, exam_date: e.target.value }))}
                          className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      ) : (
                        <p className="text-sm text-slate-600 mt-1">{formatDate(exam.exam_date)}</p>
                      )}
                    </div>
                    {(exam.doctor_name || editing === exam.id) && (
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Médico:</span>
                        {editing === exam.id ? (
                          <input
                            type="text"
                            value={editData.doctor_name || ''}
                            onChange={(e) => setEditData((prev: Record<string, any>) => ({ ...prev, doctor_name: e.target.value }))}
                            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Nome do médico"
                          />
                        ) : (
                          <p className="text-sm text-slate-600 mt-1">Dr. {exam.doctor_name}</p>
                        )}
                      </div>
                    )}
                    {(exam.result || editing === exam.id) && (
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Resultado:</span>
                        {editing === exam.id ? (
                          <textarea
                            value={editData.result || ''}
                            onChange={(e) => setEditData((prev: Record<string, any>) => ({ ...prev, result: e.target.value }))}
                            rows={2}
                            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Resultado do exame"
                          />
                        ) : (
                          <p className="text-sm text-slate-600 mt-1">{exam.result}</p>
                        )}
                      </div>
                    )}
                    {(exam.notes || editing === exam.id) && (
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Observações:</span>
                        {editing === exam.id ? (
                          <textarea
                            value={editData.notes || ''}
                            onChange={(e) => setEditData((prev: Record<string, any>) => ({ ...prev, notes: e.target.value }))}
                            rows={2}
                            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Observações sobre o exame"
                          />
                        ) : (
                          <p className="text-sm text-slate-600 mt-1">{exam.notes}</p>
                        )}
                      </div>
                    )}
                    {(exam.file_url || editing === exam.id) && (
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Arquivo:</span>
                        {editing === exam.id ? (
                          <input
                            type="url"
                            value={editData.file_url || ''}
                            onChange={(e) => setEditData((prev: Record<string, any>) => ({ ...prev, file_url: e.target.value }))}
                            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="URL do arquivo"
                          />
                        ) : (
                          <a 
                            href={exam.file_url || '#'} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline block mt-1"
                          >
                            Ver arquivo 📄
                          </a>
                        )}
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
        </div>
      </div>

      {/* Consultations Section */}
      <div>
        <div>
          <h3 className="flex items-center justify-between text-lg font-semibold text-black">
            <span>👩‍⚕️ Consultas</span>
            <span className="text-sm font-normal text-slate-500">
              {medicalData.consultations.length} registros
            </span>
          </h3>
        </div>
        <div>
          {medicalData.consultations.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-1">
              {medicalData.consultations.map((consultation) => (
                <BadgeToggleCard
                  key={consultation.id}
                  id={consultation.id}
                  title={`Dr. ${consultation.doctor_name}`}
                  variant="green"
                  category="Consulta"
                  createdBy={consultation.created_by || "Sistema"}
                  createdAt={consultation.created_at}
                  description={consultation.specialty ? `Especialidade: ${consultation.specialty}` : undefined}
                  isEditing={editing === consultation.id}
                  isDeleting={deleting === consultation.id}
                  onEdit={() => startEditing(consultation, 'consultations')}
                  onDelete={() => deleteItem(consultation.id, 'consultations', `Dr. ${consultation.doctor_name}`)}
                  onCancel={cancelEditing}
                  onSave={saveItem}
                  isSaving={saving}
                  deleteConfirmMessage={`Tem certeza que deseja deletar a consulta com "${consultation.doctor_name}"?`}
                  editingTitle={
                    <input
                      type="text"
                      value={editData.doctor_name || ''}
                      onChange={(e) => setEditData((prev: Record<string, any>) => ({ ...prev, doctor_name: e.target.value }))}
                      className="bg-transparent border-none outline-none text-sm font-medium text-green-800"
                      placeholder="Nome do médico"
                    />
                  }
                >
                  <div className="space-y-1">
                    {(consultation.specialty || editing === consultation.id) && (
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Especialidade:</span>
                        {editing === consultation.id ? (
                          <input
                            type="text"
                            value={editData.specialty || ''}
                            onChange={(e) => setEditData((prev: Record<string, any>) => ({ ...prev, specialty: e.target.value }))}
                            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
                            placeholder="Especialidade médica"
                          />
                        ) : (
                          <p className="text-sm text-slate-600 mt-1">{consultation.specialty}</p>
                        )}
                      </div>
                    )}
                    <div>
                      <span className="text-sm font-semibold text-slate-800">Data da consulta:</span>
                      {editing === consultation.id ? (
                        <input
                          type="date"
                          value={editData.consultation_date || ''}
                          onChange={(e) => setEditData((prev: Record<string, any>) => ({ ...prev, consultation_date: e.target.value }))}
                          className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      ) : (
                        <p className="text-sm text-slate-600 mt-1">{formatDate(consultation.consultation_date)}</p>
                      )}
                    </div>
                    {(consultation.reason || editing === consultation.id) && (
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Motivo:</span>
                        {editing === consultation.id ? (
                          <textarea
                            value={editData.reason || ''}
                            onChange={(e) => setEditData((prev: Record<string, any>) => ({ ...prev, reason: e.target.value }))}
                            rows={2}
                            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
                            placeholder="Motivo da consulta"
                          />
                        ) : (
                          <p className="text-sm text-slate-600 mt-1">{consultation.reason}</p>
                        )}
                      </div>
                    )}
                    {(consultation.diagnosis || editing === consultation.id) && (
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Diagnóstico:</span>
                        {editing === consultation.id ? (
                          <textarea
                            value={editData.diagnosis || ''}
                            onChange={(e) => setEditData((prev: Record<string, any>) => ({ ...prev, diagnosis: e.target.value }))}
                            rows={2}
                            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
                            placeholder="Diagnóstico da consulta"
                          />
                        ) : (
                          <p className="text-sm text-slate-600 mt-1">{consultation.diagnosis}</p>
                        )}
                      </div>
                    )}
                    {(consultation.treatment || editing === consultation.id) && (
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Tratamento:</span>
                        {editing === consultation.id ? (
                          <textarea
                            value={editData.treatment || ''}
                            onChange={(e) => setEditData((prev: Record<string, any>) => ({ ...prev, treatment: e.target.value }))}
                            rows={2}
                            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
                            placeholder="Tratamento recomendado"
                          />
                        ) : (
                          <p className="text-sm text-slate-600 mt-1">{consultation.treatment}</p>
                        )}
                      </div>
                    )}
                    {(consultation.follow_up_date || editing === consultation.id) && (
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Retorno:</span>
                        {editing === consultation.id ? (
                          <input
                            type="date"
                            value={editData.follow_up_date || ''}
                            onChange={(e) => setEditData((prev: Record<string, any>) => ({ ...prev, follow_up_date: e.target.value }))}
                            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        ) : (
                          <p className="text-sm text-slate-600 mt-1">{formatDate(consultation.follow_up_date)}</p>
                        )}
                      </div>
                    )}
                    {(consultation.notes || editing === consultation.id) && (
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Observações:</span>
                        {editing === consultation.id ? (
                          <textarea
                            value={editData.notes || ''}
                            onChange={(e) => setEditData((prev: Record<string, any>) => ({ ...prev, notes: e.target.value }))}
                            rows={2}
                            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
                            placeholder="Observações sobre a consulta"
                          />
                        ) : (
                          <p className="text-sm text-slate-600 mt-1">{consultation.notes}</p>
                        )}
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
        </div>
      </div>

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