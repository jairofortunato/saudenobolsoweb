'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { useAuth } from '../../../hooks/useAuth';
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  NovaEntradaModal,
  ProcessingResultsModal,
  Loading,
  BadgeToggleCard,
  RawMedicalEntriesCard,
  ExportInfo
} from '../../../components';
import { getDisplayName } from '../../../lib/auth-utils';
import { Medication, Allergy, Exam, Disease, Consultation } from '../../../types/database';

interface MedicalData {
  medications: Medication[];
  allergies: Allergy[];
  exams: Exam[];
  diseases: Disease[];
  consultations: Consultation[];
}

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [isNovaEntradaModalOpen, setIsNovaEntradaModalOpen] = useState(false);
  const [isProcessingResultsModalOpen, setIsProcessingResultsModalOpen] = useState(false);
  const [processingResult, setProcessingResult] = useState<any>(null);
  const [medicalData, setMedicalData] = useState<MedicalData>({
    medications: [],
    allergies: [],
    exams: [],
    diseases: [],
    consultations: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit/Delete state management
  const [editing, setEditing] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>({});

  // Fetch medical data from all APIs
  const fetchMedicalData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      
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
      setError('Failed to load medical data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleProcessingComplete = useCallback((result: any) => {
    console.log('Processing completed:', result);
    setProcessingResult(result);
    setIsProcessingResultsModalOpen(true);
    // Refresh medical data to show new entries
    fetchMedicalData();
  }, [fetchMedicalData]);

  // Redirect doctors to their own dashboard
  useEffect(() => {
    if (profile && profile.role === 'doctor') {
      router.replace('/doctor/dashboard');
      return;
    }
  }, [profile, router]);

  useEffect(() => {
    fetchMedicalData();
  }, [fetchMedicalData]);

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
      setMedicalData(prev => ({
        ...prev,
        [category]: prev[category as keyof MedicalData].filter((item: any) => item.id !== id)
      }));
      
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
      const updatedItem = result[editCategory.slice(0, -1)]; // Remove 's' from plural
      
      // Update local state - ensure the id is preserved
      setMedicalData(prev => ({
        ...prev,
        [editCategory]: prev[editCategory as keyof MedicalData].map((item: any) => {
          if (item.id === editing) {
            // Ensure the updated item has the id field
            return { ...item, ...updatedItem, id: editing };
          }
          return item;
        })
      }));
      
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

  // DashboardLayout will handle cases where user or profile is missing
  if (!user) {
    return null;
  }

  const handleCategoryClick = (category: string) => {
    router.push(`/${category}`);
  };

  const handleEmergencyClick = () => {
    router.push('/emergency');
  };

  const handleNovaEntradaClick = () => {
    setIsNovaEntradaModalOpen(true);
  };

  const handleNovaEntradaSubmit = (data: { category: string; content: string }) => {
    console.log('Nova entrada submitted:', data);
    // Note: This is called when form is submitted, not when processing completes
    // Data refresh happens in handleProcessingComplete after AI processing succeeds
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  };

  const getSeverityColor = (severity: string | null) => {
    switch (severity) {
      case 'life-threatening': return 'text-red-800 bg-red-100';
      case 'severe': return 'text-red-700 bg-red-50';
      case 'moderate': return 'text-orange-700 bg-orange-50';
      case 'mild': return 'text-yellow-700 bg-yellow-50';
      default: return 'text-gray-700 bg-gray-50';
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

  const getSeverityText = (severity: string | null) => {
    switch (severity) {
      case 'life-threatening': return 'Risco de vida';
      case 'severe': return 'Severa';
      case 'moderate': return 'Moderada';
      case 'mild': return 'Leve';
      default: return 'Não especificada';
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

  // If profile is missing, DashboardLayout will show a loading state
  return (
    <DashboardLayout
      title={`${profile ? getDisplayName(profile) : 'Usuário'}`}
      subtitle="Gerencie suas informações médicas de forma segura"
      breadcrumbs={[]}
    > 
      {profile ? (
        <>
                      <div className="grid gap-4">
                      <div className="mb-2">
                <Button 
                      variant="danger" 
                      size="md" 
                      className="w-full transform hover:scale-105 transition-transform"
                      onClick={handleEmergencyClick}
                    >
                      🚨 Emergência
                    </Button>
              </div>
   
            {/* Medical Data Display for Patients */}
            {profile.role === 'patient' && (
              <>
                {loading ? (
                  <div className="text-center py-8">
                    <Loading size="lg" />
                    <p className="text-slate-600 mt-4">Carregando dados médicos...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <p className="text-red-600">{error}</p>
                  </div>
                ) : (
                  <>
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
                            {medicalData.allergies.filter(allergy => allergy && allergy.id).map((allergy) => (
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
                            {medicalData.diseases.filter(disease => disease && disease.id).map((disease) => (
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
                            {medicalData.medications.filter(m => m.is_active && m && m.id).map((medication) => (
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
                            {medicalData.exams.filter(exam => exam && exam.id).map((exam) => (
                              <BadgeToggleCard
                                key={exam.id}
                                id={exam.id}
                                title={exam.name}
                                variant="slate"
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
                                    className="bg-transparent border-none outline-none text-sm font-medium text-slate-800"
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
                                        className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-slate-500"
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
                                          className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-slate-500"
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
                                          className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-slate-500"
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
                                          className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-slate-500"
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
                                          className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-slate-500"
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
                            {medicalData.consultations.filter(consultation => consultation && consultation.id).map((consultation) => (
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
                      </CardContent>
                    </Card>

                    {/* Export Medical Information Card */}
                    <ExportInfo />

                    {/* Raw Medical Entries Card */}
                    <RawMedicalEntriesCard />
                  </>
                )}
              </>
            )}


          </div>

          {/* Nova Entrada Button - Fixed at bottom for patients */}
          {profile.role === 'patient' && (
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
              <Button 
                variant="success" 
                size="lg"
                className="px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition-shadow"
                onClick={handleNovaEntradaClick}
              >
                ➕ Nova Entrada
              </Button>
            </div>
          )}

          {/* Nova Entrada Modal */}
          <NovaEntradaModal
            open={isNovaEntradaModalOpen}
            onClose={() => setIsNovaEntradaModalOpen(false)}
            onSubmit={handleNovaEntradaSubmit}
            onProcessingComplete={handleProcessingComplete}
          />

          {/* Processing Results Modal */}
          <ProcessingResultsModal
            open={isProcessingResultsModalOpen}
            onClose={() => setIsProcessingResultsModalOpen(false)}
            processingResult={processingResult}
          />
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-slate-600">Carregando informações do perfil...</p>
        </div>
      )}
    </DashboardLayout>
  );
} 