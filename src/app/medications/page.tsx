'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { useAuth } from '../../../hooks/useAuth';
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  NovaEntradaModal,
  Loading
} from '../../../components';

interface Medication {
  id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export default function MedicationsPage() {
  const { user, profile } = useAuth();
  const [isNovaEntradaModalOpen, setIsNovaEntradaModalOpen] = useState(false);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Medication>>({});
  const [saving, setSaving] = useState(false);

  // Fetch medications data
  useEffect(() => {
    const fetchMedications = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/medications');
        
        if (!response.ok) {
          throw new Error('Failed to fetch medications');
        }
        
        const data = await response.json();
        setMedications(data.medications || []);
      } catch (err) {
        console.error('Error fetching medications:', err);
        setError('Failed to load medications');
      } finally {
        setLoading(false);
      }
    };

    fetchMedications();
  }, [user]);

  // Refresh medications after adding new one
  const refreshMedications = async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/medications');
      if (response.ok) {
        const data = await response.json();
        setMedications(data.medications || []);
      }
    } catch (err) {
      console.error('Error refreshing medications:', err);
    }
  };

  // Delete medication function
  const deleteMedication = async (medicationId: string, medicationName: string) => {
    const confirmed = window.confirm(`Tem certeza que deseja deletar o medicamento "${medicationName}"?`);
    if (!confirmed) return;

    try {
      setDeleting(medicationId);
      
      const response = await fetch(`/api/medications?id=${medicationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete medication');
      }

      // Remove from local state
      setMedications(prev => prev.filter(med => med.id !== medicationId));
      
    } catch (err) {
      console.error('Error deleting medication:', err);
      alert('Erro ao deletar medicamento. Tente novamente.');
    } finally {
      setDeleting(null);
    }
  };

  // Edit medication function
  const startEditing = (medication: Medication) => {
    setEditing(medication.id);
    setEditData({
      name: medication.name,
      dosage: medication.dosage,
      frequency: medication.frequency,
      start_date: medication.start_date,
      end_date: medication.end_date,
      notes: medication.notes
    });
  };

  const cancelEditing = () => {
    setEditing(null);
    setEditData({});
  };

  const saveMedication = async () => {
    if (!editing || !editData.name?.trim()) return;

    try {
      setSaving(true);
      
      const response = await fetch('/api/medications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editing,
          name: editData.name,
          dosage: editData.dosage,
          frequency: editData.frequency,
          start_date: editData.start_date,
          end_date: editData.end_date,
          notes: editData.notes
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update medication');
      }

      const result = await response.json();
      
      // Update local state with the updated medication
      setMedications(prev => 
        prev.map(med => 
          med.id === editing ? result.medication : med
        )
      );
      
      setEditing(null);
      setEditData({});
      
    } catch (err) {
      console.error('Error updating medication:', err);
      alert('Erro ao salvar medicamento. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return null;
  }

  const handleNovaEntradaClick = () => {
    setIsNovaEntradaModalOpen(true);
  };

  const handleNovaEntradaSubmit = (data: { category: string; content: string }) => {
    console.log('Nova entrada submitted:', data);
    // Refresh the medications list after successful submission
    setTimeout(refreshMedications, 1000);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  };

  return (
    <DashboardLayout
      title="💊 Medicamentos"
      subtitle="Gerencie seus medicamentos e tratamentos"
      breadcrumbs={[
        { label: 'Início', href: '/dashboard' },
        { label: 'Medicamentos', href: '/medications' }
      ]}
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-slate-800">
            Seus Medicamentos
            {!loading && (
              <span className="ml-2 text-sm font-normal text-slate-600">
                {medications.length} {medications.length === 1 ? 'medicamento' : 'medicamentos'}
              </span>
            )}
          </h2>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-12">
            <Loading size="lg" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold text-red-700 mb-2">
                Erro ao carregar medicamentos
              </h3>
              <p className="text-red-600 mb-6">{error}</p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                🔄 Tentar Novamente
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Medications List */}
        {!loading && !error && (
          <>
            {medications.length === 0 ? (
              /* Placeholder for when no medications exist */
              <Card className="text-center py-12">
                <CardContent>
                  <div className="text-6xl mb-4">💊</div>
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">
                    Nenhum medicamento registrado
                  </h3>
                  <p className="text-slate-600 mb-6">
                    Comece adicionando seus medicamentos atuais para manter um controle completo
                  </p>
                  <p className="text-sm text-slate-500">
                    Use o botão ➕ no canto inferior da tela para adicionar seu primeiro medicamento
                  </p>
                </CardContent>
              </Card>
            ) : (
              /* Medications Grid */
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {medications.map((medication) => (
                  <Card key={medication.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg font-semibold text-slate-800 leading-tight">
                          {editing === medication.id ? (
                            <input
                              type="text"
                              value={editData.name || ''}
                              onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                              className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Nome do medicamento"
                            />
                          ) : (
                            `💊 ${medication.name}`
                          )}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          {editing === medication.id ? (
                            <>
                              <button
                                onClick={saveMedication}
                                disabled={saving}
                                className="text-green-600 hover:text-green-800 hover:bg-green-50 p-2 rounded-full transition-colors disabled:opacity-50"
                                title="Salvar alterações"
                              >
                                {saving ? '⏳' : '✅'}
                              </button>
                              <button
                                onClick={cancelEditing}
                                disabled={saving}
                                className="text-gray-600 hover:text-gray-800 hover:bg-gray-50 p-2 rounded-full transition-colors disabled:opacity-50"
                                title="Cancelar edição"
                              >
                                ❌
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditing(medication)}
                                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-full transition-colors"
                                title="Editar medicamento"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => deleteMedication(medication.id, medication.name)}
                                disabled={deleting === medication.id}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-full transition-colors disabled:opacity-50"
                                title="Deletar medicamento"
                              >
                                {deleting === medication.id ? '⏳' : '🗑️'}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Dosage and Frequency */}
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="flex items-center text-sm mb-1">
                          <span className="font-medium text-blue-800 mr-2">Dosagem:</span>
                          {editing === medication.id ? (
                            <input
                              type="text"
                              value={editData.dosage || ''}
                              onChange={(e) => setEditData(prev => ({ ...prev, dosage: e.target.value }))}
                              className="flex-1 bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Ex: 500mg"
                            />
                          ) : (
                            <span className="text-blue-700">{medication.dosage || 'Não especificado'}</span>
                          )}
                        </div>
                        <div className="flex items-center text-sm">
                          <span className="font-medium text-blue-800 mr-2">Frequência:</span>
                          {editing === medication.id ? (
                            <input
                              type="text"
                              value={editData.frequency || ''}
                              onChange={(e) => setEditData(prev => ({ ...prev, frequency: e.target.value }))}
                              className="flex-1 bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Ex: 2x ao dia"
                            />
                          ) : (
                            <span className="text-blue-700">{medication.frequency || 'Não especificado'}</span>
                          )}
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-slate-600">
                          <span className="font-medium mr-2">📅 Início:</span>
                          {editing === medication.id ? (
                            <input
                              type="date"
                              value={editData.start_date || ''}
                              onChange={(e) => setEditData(prev => ({ ...prev, start_date: e.target.value }))}
                              className="bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <span>{formatDate(medication.start_date) || 'Não especificado'}</span>
                          )}
                        </div>
                        <div className="flex items-center text-sm text-slate-600">
                          <span className="font-medium mr-2">🏁 Fim:</span>
                          {editing === medication.id ? (
                            <input
                              type="date"
                              value={editData.end_date || ''}
                              onChange={(e) => setEditData(prev => ({ ...prev, end_date: e.target.value }))}
                              className="bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <span>{formatDate(medication.end_date) || 'Não especificado'}</span>
                          )}
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="text-sm">
                          <span className="font-medium text-slate-700 block mb-1">📝 Observações:</span>
                          {editing === medication.id ? (
                            <textarea
                              value={editData.notes || ''}
                              onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                              rows={3}
                              className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Observações sobre o medicamento"
                            />
                          ) : (
                            <span className="text-slate-600">{medication.notes || 'Nenhuma observação'}</span>
                          )}
                        </div>
                      </div>

                      {/* Created Date */}
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-xs text-slate-500">
                          Adicionado em {formatDate(medication.created_at)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Add Medication Button - Fixed at bottom */}
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <Button 
            variant="primary" 
            size="lg"
            className="px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition-shadow"
            onClick={handleNovaEntradaClick}
          >
            ➕ Adicionar Medicamento
          </Button>
        </div>

        {/* Nova Entrada Modal */}
        <NovaEntradaModal
          open={isNovaEntradaModalOpen}
          onClose={() => setIsNovaEntradaModalOpen(false)}
          onSubmit={handleNovaEntradaSubmit}
          defaultCategory="medications"
        />
      </div>
    </DashboardLayout>
  );
} 