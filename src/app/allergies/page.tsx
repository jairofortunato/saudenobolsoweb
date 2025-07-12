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

interface Allergy {
  id: string;
  name: string;
  severity: 'mild' | 'moderate' | 'severe' | 'life-threatening' | null;
  reaction: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export default function AllergiesPage() {
  const { user, profile } = useAuth();
  const [isNovaEntradaModalOpen, setIsNovaEntradaModalOpen] = useState(false);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Allergy>>({});
  const [saving, setSaving] = useState(false);

  // Fetch allergies data
  useEffect(() => {
    const fetchAllergies = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/allergies');
        
        if (!response.ok) {
          throw new Error('Failed to fetch allergies');
        }
        
        const data = await response.json();
        setAllergies(data.allergies || []);
      } catch (err) {
        console.error('Error fetching allergies:', err);
        setError('Failed to load allergies');
      } finally {
        setLoading(false);
      }
    };

    fetchAllergies();
  }, [user]);

  // Refresh allergies after adding new one
  const refreshAllergies = async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/allergies');
      if (response.ok) {
        const data = await response.json();
        setAllergies(data.allergies || []);
      }
    } catch (err) {
      console.error('Error refreshing allergies:', err);
    }
  };

  // Delete allergy function
  const deleteAllergy = async (allergyId: string, allergyName: string) => {
    const confirmed = window.confirm(`Tem certeza que deseja deletar a alergia "${allergyName}"?`);
    if (!confirmed) return;

    try {
      setDeleting(allergyId);
      
      const response = await fetch(`/api/allergies?id=${allergyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete allergy');
      }

      // Remove from local state
      setAllergies(prev => prev.filter(allergy => allergy.id !== allergyId));
      
    } catch (err) {
      console.error('Error deleting allergy:', err);
      alert('Erro ao deletar alergia. Tente novamente.');
    } finally {
      setDeleting(null);
    }
  };

  // Edit allergy function
  const startEditing = (allergy: Allergy) => {
    setEditing(allergy.id);
    setEditData({
      name: allergy.name,
      severity: allergy.severity,
      reaction: allergy.reaction,
      notes: allergy.notes
    });
  };

  const cancelEditing = () => {
    setEditing(null);
    setEditData({});
  };

  const saveAllergy = async () => {
    if (!editing || !editData.name?.trim()) return;

    try {
      setSaving(true);
      
      const response = await fetch('/api/allergies', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editing,
          name: editData.name,
          severity: editData.severity,
          reaction: editData.reaction,
          notes: editData.notes
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update allergy');
      }

      const result = await response.json();
      
      // Update local state with the updated allergy
      setAllergies(prev => 
        prev.map(allergy => 
          allergy.id === editing ? result.allergy : allergy
        )
      );
      
      setEditing(null);
      setEditData({});
      
    } catch (err) {
      console.error('Error updating allergy:', err);
      alert('Erro ao salvar alergia. Tente novamente.');
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
    // Refresh the allergies list after successful submission
    setTimeout(refreshAllergies, 1000);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  };

  const getSeverityBadge = (severity: string | null) => {
    if (!severity) return null;
    
    const severityConfig = {
      'mild': { label: 'Leve', color: 'bg-green-100 text-green-800' },
      'moderate': { label: 'Moderada', color: 'bg-yellow-100 text-yellow-800' },
      'severe': { label: 'Grave', color: 'bg-orange-100 text-orange-800' },
      'life-threatening': { label: 'Risco de Vida', color: 'bg-red-100 text-red-800' }
    };

    const config = severityConfig[severity as keyof typeof severityConfig];
    if (!config) return null;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <DashboardLayout
      title="🦠 Alergias"
      subtitle="Gerencie suas alergias e reações"
      breadcrumbs={[
        { label: 'Início', href: '/dashboard' },
        { label: 'Alergias', href: '/allergies' }
      ]}
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-slate-800">
            Suas Alergias
            {!loading && (
              <span className="ml-2 text-sm font-normal text-slate-600">
                {allergies.length} {allergies.length === 1 ? 'alergia' : 'alergias'}
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
                Erro ao carregar alergias
              </h3>
              <p className="text-red-600 mb-6">{error}</p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                🔄 Tentar Novamente
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Allergies List */}
        {!loading && !error && (
          <>
            {allergies.length === 0 ? (
              /* Placeholder for when no allergies exist */
              <Card className="text-center py-12">
                <CardContent>
                  <div className="text-6xl mb-4">🦠</div>
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">
                    Nenhuma alergia registrada
                  </h3>
                  <p className="text-slate-600 mb-6">
                    Registre suas alergias para que médicos e profissionais de saúde possam te ajudar melhor
                  </p>
                  <p className="text-sm text-slate-500">
                    Use o botão ⚠️ no canto inferior da tela para adicionar sua primeira alergia
                  </p>
                </CardContent>
              </Card>
            ) : (
              /* Allergies Grid */
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {allergies.map((allergy) => (
                  <Card key={allergy.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg font-semibold text-slate-800 leading-tight">
                          {editing === allergy.id ? (
                            <input
                              type="text"
                              value={editData.name || ''}
                              onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                              className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Nome da alergia"
                            />
                          ) : (
                            `🦠 ${allergy.name}`
                          )}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          {editing === allergy.id ? (
                            <>
                              <button
                                onClick={saveAllergy}
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
                              {getSeverityBadge(allergy.severity)}
                              <button
                                onClick={() => startEditing(allergy)}
                                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-full transition-colors"
                                title="Editar alergia"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => deleteAllergy(allergy.id, allergy.name)}
                                disabled={deleting === allergy.id}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-full transition-colors disabled:opacity-50"
                                title="Deletar alergia"
                              >
                                {deleting === allergy.id ? '⏳' : '🗑️'}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Severity */}
                      {editing === allergy.id && (
                        <div className="bg-purple-50 rounded-lg p-3">
                          <div className="flex items-center text-sm">
                            <span className="font-medium text-purple-800 mr-2">🔥 Gravidade:</span>
                            <select
                              value={editData.severity || ''}
                              onChange={(e) => setEditData(prev => ({ ...prev, severity: e.target.value as any }))}
                              className="flex-1 bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Selecione...</option>
                              <option value="mild">Leve</option>
                              <option value="moderate">Moderada</option>
                              <option value="severe">Grave</option>
                              <option value="life-threatening">Risco de Vida</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Reaction */}
                      <div className="bg-orange-50 rounded-lg p-3">
                        <div className="text-sm">
                          <span className="font-medium text-orange-800 block mb-1">⚠️ Reação:</span>
                          {editing === allergy.id ? (
                            <textarea
                              value={editData.reaction || ''}
                              onChange={(e) => setEditData(prev => ({ ...prev, reaction: e.target.value }))}
                              rows={3}
                              className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Descrição da reação alérgica"
                            />
                          ) : (
                            <span className="text-orange-700">{allergy.reaction || 'Não especificado'}</span>
                          )}
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="text-sm">
                          <span className="font-medium text-slate-700 block mb-1">📝 Observações:</span>
                          {editing === allergy.id ? (
                            <textarea
                              value={editData.notes || ''}
                              onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                              rows={3}
                              className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Observações sobre a alergia"
                            />
                          ) : (
                            <span className="text-slate-600">{allergy.notes || 'Nenhuma observação'}</span>
                          )}
                        </div>
                      </div>

                      {/* Created Date */}
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-xs text-slate-500">
                          Adicionado em {formatDate(allergy.created_at)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Add Allergy Button - Fixed at bottom */}
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <Button 
            variant="warning" 
            size="lg"
            className="px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition-shadow"
            onClick={handleNovaEntradaClick}
          >
            ⚠️ Adicionar Alergia
          </Button>
        </div>

        {/* Nova Entrada Modal */}
        <NovaEntradaModal
          open={isNovaEntradaModalOpen}
          onClose={() => setIsNovaEntradaModalOpen(false)}
          onSubmit={handleNovaEntradaSubmit}
          defaultCategory="allergies"
        />
      </div>
    </DashboardLayout>
  );
} 