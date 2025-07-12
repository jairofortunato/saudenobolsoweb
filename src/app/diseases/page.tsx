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

interface Disease {
  id: string;
  name: string;
  diagnosed_date: string | null;
  is_chronic: boolean;
  status: 'active' | 'resolved' | 'in_remission';
  description: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export default function DiseasesPage() {
  const { user, profile } = useAuth();
  const [isNovaEntradaModalOpen, setIsNovaEntradaModalOpen] = useState(false);
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Disease>>({});
  const [saving, setSaving] = useState(false);

  // Fetch diseases data
  useEffect(() => {
    const fetchDiseases = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/diseases');
        
        if (!response.ok) {
          throw new Error('Failed to fetch diseases');
        }
        
        const data = await response.json();
        setDiseases(data.diseases || []);
      } catch (err) {
        console.error('Error fetching diseases:', err);
        setError('Failed to load diseases');
      } finally {
        setLoading(false);
      }
    };

    fetchDiseases();
  }, [user]);

  // Refresh diseases after adding new one
  const refreshDiseases = async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/diseases');
      if (response.ok) {
        const data = await response.json();
        setDiseases(data.diseases || []);
      }
    } catch (err) {
      console.error('Error refreshing diseases:', err);
    }
  };

  // Delete disease function
  const deleteDisease = async (diseaseId: string, diseaseName: string) => {
    const confirmed = window.confirm(`Tem certeza que deseja deletar a doença "${diseaseName}"?`);
    if (!confirmed) return;

    try {
      setDeleting(diseaseId);
      
      const response = await fetch(`/api/diseases?id=${diseaseId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete disease');
      }

      // Remove from local state
      setDiseases(prev => prev.filter(disease => disease.id !== diseaseId));
      
    } catch (err) {
      console.error('Error deleting disease:', err);
      alert('Erro ao deletar doença. Tente novamente.');
    } finally {
      setDeleting(null);
    }
  };

  // Edit disease function
  const startEditing = (disease: Disease) => {
    setEditing(disease.id);
    setEditData({
      name: disease.name,
      diagnosed_date: disease.diagnosed_date,
      is_chronic: disease.is_chronic,
      status: disease.status,
      description: disease.description,
      notes: disease.notes
    });
  };

  const cancelEditing = () => {
    setEditing(null);
    setEditData({});
  };

  const saveDisease = async () => {
    if (!editing || !editData.name?.trim()) return;

    try {
      setSaving(true);
      
      const response = await fetch('/api/diseases', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editing,
          name: editData.name,
          diagnosed_date: editData.diagnosed_date,
          is_chronic: editData.is_chronic,
          status: editData.status,
          description: editData.description,
          notes: editData.notes
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update disease');
      }

      const result = await response.json();
      
      // Update local state with the updated disease
      setDiseases(prev => 
        prev.map(disease => 
          disease.id === editing ? result.disease : disease
        )
      );
      
      setEditing(null);
      setEditData({});
      
    } catch (err) {
      console.error('Error updating disease:', err);
      alert('Erro ao salvar doença. Tente novamente.');
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
    // Refresh the diseases list after successful submission
    setTimeout(refreshDiseases, 1000);
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
      title="🦠 Doenças"
      subtitle="Gerencie suas condições médicas e histórico"
      breadcrumbs={[
        { label: 'Início', href: '/dashboard' },
        { label: 'Doenças', href: '/diseases' }
      ]}
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-slate-800">
            Suas Doenças
            {!loading && (
              <span className="ml-2 text-sm font-normal text-slate-600">
                {diseases.length} {diseases.length === 1 ? 'doença' : 'doenças'}
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
                Erro ao carregar doenças
              </h3>
              <p className="text-red-600 mb-6">{error}</p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                🔄 Tentar Novamente
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Diseases List */}
        {!loading && !error && (
          <>
            {diseases.length === 0 ? (
              /* Placeholder for when no diseases exist */
              <Card className="text-center py-12">
                <CardContent>
                  <div className="text-6xl mb-4">🦠</div>
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">
                    Nenhuma doença registrada
                  </h3>
                  <p className="text-slate-600 mb-6">
                    Mantenha um registro das suas condições médicas para melhor acompanhamento
                  </p>
                  <p className="text-sm text-slate-500">
                    Use o botão 🏥 no canto inferior da tela para adicionar sua primeira doença
                  </p>
                </CardContent>
              </Card>
            ) : (
              /* Diseases Grid */
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {diseases.map((disease) => (
                  <Card key={disease.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg font-semibold text-slate-800 leading-tight">
                          {editing === disease.id ? (
                            <input
                              type="text"
                              value={editData.name || ''}
                              onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                              className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Nome da doença"
                            />
                          ) : (
                            `🦠 ${disease.name}`
                          )}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          {editing === disease.id ? (
                            <>
                              <button
                                onClick={saveDisease}
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
                                onClick={() => startEditing(disease)}
                                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-full transition-colors"
                                title="Editar doença"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => deleteDisease(disease.id, disease.name)}
                                disabled={deleting === disease.id}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-full transition-colors disabled:opacity-50"
                                title="Deletar doença"
                              >
                                {deleting === disease.id ? '⏳' : '🗑️'}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Status and Chronic */}
                      {editing === disease.id && (
                        <div className="space-y-2">
                          <div className="bg-red-50 rounded-lg p-3">
                            <div className="flex items-center text-sm">
                              <span className="font-medium text-red-800 mr-2">🏥 Status:</span>
                              <select
                                value={editData.status || ''}
                                onChange={(e) => setEditData(prev => ({ ...prev, status: e.target.value as any }))}
                                className="flex-1 bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="active">Ativo</option>
                                <option value="resolved">Resolvido</option>
                                <option value="in_remission">Em Remissão</option>
                              </select>
                            </div>
                          </div>
                          <div className="bg-orange-50 rounded-lg p-3">
                            <div className="flex items-center text-sm">
                              <span className="font-medium text-orange-800 mr-2">🔄 Condição:</span>
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={editData.is_chronic || false}
                                  onChange={(e) => setEditData(prev => ({ ...prev, is_chronic: e.target.checked }))}
                                  className="mr-2"
                                />
                                <span className="text-orange-700">Crônica</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Diagnosed Date */}
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="flex items-center text-sm">
                          <span className="font-medium text-blue-800 mr-2">📅 Diagnóstico:</span>
                          {editing === disease.id ? (
                            <input
                              type="date"
                              value={editData.diagnosed_date || ''}
                              onChange={(e) => setEditData(prev => ({ ...prev, diagnosed_date: e.target.value }))}
                              className="flex-1 bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <span className="text-blue-700">{formatDate(disease.diagnosed_date) || 'Não especificado'}</span>
                          )}
                        </div>
                      </div>

                      {/* Chronic Condition */}
                      {!editing && disease.is_chronic && (
                        <div className="bg-yellow-50 rounded-lg p-3">
                          <div className="flex items-center text-sm">
                            <span className="font-medium text-yellow-800 mr-2">🔄 Condição:</span>
                            <span className="text-yellow-700">Crônica</span>
                          </div>
                        </div>
                      )}

                      {/* Description */}
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="text-sm">
                          <span className="font-medium text-slate-700 block mb-1">📄 Descrição:</span>
                          {editing === disease.id ? (
                            <textarea
                              value={editData.description || ''}
                              onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                              rows={3}
                              className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Descrição da doença"
                            />
                          ) : (
                            <span className="text-slate-600">{disease.description || 'Não especificado'}</span>
                          )}
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="text-sm">
                          <span className="font-medium text-slate-700 block mb-1">📝 Observações:</span>
                          {editing === disease.id ? (
                            <textarea
                              value={editData.notes || ''}
                              onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                              rows={3}
                              className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Observações sobre a doença"
                            />
                          ) : (
                            <span className="text-slate-600">{disease.notes || 'Nenhuma observação'}</span>
                          )}
                        </div>
                      </div>

                      {/* Created Date */}
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-xs text-slate-500">
                          Adicionado em {formatDate(disease.created_at)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Add Disease Button - Fixed at bottom */}
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <Button 
            variant="danger" 
            size="lg"
            className="px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition-shadow"
            onClick={handleNovaEntradaClick}
          >
            🏥 Adicionar Doença
          </Button>
        </div>

        {/* Nova Entrada Modal */}
        <NovaEntradaModal
          open={isNovaEntradaModalOpen}
          onClose={() => setIsNovaEntradaModalOpen(false)}
          onSubmit={handleNovaEntradaSubmit}
          defaultCategory="diseases"
        />
      </div>
    </DashboardLayout>
  );
} 