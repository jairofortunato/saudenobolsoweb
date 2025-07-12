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

interface Consultation {
  id: string;
  doctor_name: string;
  specialty: string | null;
  consultation_date: string;
  reason: string | null;
  diagnosis: string | null;
  treatment: string | null;
  follow_up_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export default function ConsultationsPage() {
  const { user, profile } = useAuth();
  const [isNovaEntradaModalOpen, setIsNovaEntradaModalOpen] = useState(false);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Consultation>>({});
  const [saving, setSaving] = useState(false);

  // Fetch consultations data
  useEffect(() => {
    const fetchConsultations = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/consultations');
        
        if (!response.ok) {
          throw new Error('Failed to fetch consultations');
        }
        
        const data = await response.json();
        setConsultations(data.consultations || []);
      } catch (err) {
        console.error('Error fetching consultations:', err);
        setError('Failed to load consultations');
      } finally {
        setLoading(false);
      }
    };

    fetchConsultations();
  }, [user]);

  // Refresh consultations after adding new one
  const refreshConsultations = async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/consultations');
      if (response.ok) {
        const data = await response.json();
        setConsultations(data.consultations || []);
      }
    } catch (err) {
      console.error('Error refreshing consultations:', err);
    }
  };

  // Delete consultation function
  const deleteConsultation = async (consultationId: string, doctorName: string) => {
    const confirmed = window.confirm(`Tem certeza que deseja deletar a consulta com "${doctorName}"?`);
    if (!confirmed) return;

    try {
      setDeleting(consultationId);
      
      const response = await fetch(`/api/consultations?id=${consultationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete consultation');
      }

      // Remove from local state
      setConsultations(prev => prev.filter(consultation => consultation.id !== consultationId));
      
    } catch (err) {
      console.error('Error deleting consultation:', err);
      alert('Erro ao deletar consulta. Tente novamente.');
    } finally {
      setDeleting(null);
    }
  };

  // Edit consultation function
  const startEditing = (consultation: Consultation) => {
    setEditing(consultation.id);
    setEditData({
      doctor_name: consultation.doctor_name,
      specialty: consultation.specialty,
      consultation_date: consultation.consultation_date,
      reason: consultation.reason,
      diagnosis: consultation.diagnosis,
      treatment: consultation.treatment,
      follow_up_date: consultation.follow_up_date,
      notes: consultation.notes
    });
  };

  const cancelEditing = () => {
    setEditing(null);
    setEditData({});
  };

  const saveConsultation = async () => {
    if (!editing || !editData.doctor_name?.trim() || !editData.consultation_date) return;

    try {
      setSaving(true);
      
      const response = await fetch('/api/consultations', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editing,
          doctor_name: editData.doctor_name,
          specialty: editData.specialty,
          consultation_date: editData.consultation_date,
          reason: editData.reason,
          diagnosis: editData.diagnosis,
          treatment: editData.treatment,
          follow_up_date: editData.follow_up_date,
          notes: editData.notes
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update consultation');
      }

      const result = await response.json();
      
      // Update local state with the updated consultation
      setConsultations(prev => 
        prev.map(consultation => 
          consultation.id === editing ? result.consultation : consultation
        )
      );
      
      setEditing(null);
      setEditData({});
      
    } catch (err) {
      console.error('Error updating consultation:', err);
      alert('Erro ao salvar consulta. Tente novamente.');
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
    // Refresh the consultations list after successful submission
    setTimeout(refreshConsultations, 1000);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  };

  const getConsultationDateStatus = (consultationDate: string) => {
    const date = new Date(consultationDate);
    const today = new Date();
    const diffDays = Math.ceil((today.getTime() - date.getTime()) / (1000 * 3600 * 24));
    
    if (diffDays === 0) {
      return { label: 'Hoje', color: 'bg-green-100 text-green-800' };
    } else if (diffDays === 1) {
      return { label: 'Ontem', color: 'bg-green-100 text-green-800' };
    } else if (diffDays <= 7) {
      return { label: `${diffDays} dias atrás`, color: 'bg-blue-100 text-blue-800' };
    } else if (diffDays <= 30) {
      return { label: `${diffDays} dias atrás`, color: 'bg-yellow-100 text-yellow-800' };
    } else {
      return { label: `${Math.floor(diffDays / 30)} mês(es) atrás`, color: 'bg-gray-100 text-gray-800' };
    }
  };

  return (
    <DashboardLayout
      title="🩺 Consultas"
      subtitle="Gerencie suas consultas e acompanhamentos médicos"
      breadcrumbs={[
        { label: 'Início', href: '/dashboard' },
        { label: 'Consultas', href: '/consultations' }
      ]}
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-slate-800">
            Suas Consultas
            {!loading && (
              <span className="ml-2 text-sm font-normal text-slate-600">
                {consultations.length} {consultations.length === 1 ? 'consulta' : 'consultas'}
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
                Erro ao carregar consultas
              </h3>
              <p className="text-red-600 mb-6">{error}</p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                🔄 Tentar Novamente
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Consultations List */}
        {!loading && !error && (
          <>
            {consultations.length === 0 ? (
              /* Placeholder for when no consultations exist */
              <Card className="text-center py-12">
                <CardContent>
                  <div className="text-6xl mb-4">🩺</div>
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">
                    Nenhuma consulta registrada
                  </h3>
                  <p className="text-slate-600 mb-6">
                    Mantenha o histórico de suas consultas para melhor acompanhamento médico
                  </p>
                  <p className="text-sm text-slate-500">
                    Use o botão 📋 no canto inferior da tela para adicionar sua primeira consulta
                  </p>
                </CardContent>
              </Card>
            ) : (
              /* Consultations Grid */
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {consultations.map((consultation) => (
                  <Card key={consultation.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg font-semibold text-slate-800 leading-tight">
                          {editing === consultation.id ? (
                            <input
                              type="text"
                              value={editData.doctor_name || ''}
                              onChange={(e) => setEditData(prev => ({ ...prev, doctor_name: e.target.value }))}
                              className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Nome do médico"
                            />
                          ) : (
                            `🩺 ${consultation.doctor_name}`
                          )}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          {editing === consultation.id ? (
                            <>
                              <button
                                onClick={saveConsultation}
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
                                onClick={() => startEditing(consultation)}
                                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-full transition-colors"
                                title="Editar consulta"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => deleteConsultation(consultation.id, consultation.doctor_name)}
                                disabled={deleting === consultation.id}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-full transition-colors disabled:opacity-50"
                                title="Deletar consulta"
                              >
                                {deleting === consultation.id ? '⏳' : '🗑️'}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Specialty */}
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="flex items-center text-sm">
                          <span className="font-medium text-blue-800 mr-2">⚕️ Especialidade:</span>
                          {editing === consultation.id ? (
                            <input
                              type="text"
                              value={editData.specialty || ''}
                              onChange={(e) => setEditData(prev => ({ ...prev, specialty: e.target.value }))}
                              className="flex-1 bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Especialidade médica"
                            />
                          ) : (
                            <span className="text-blue-700">{consultation.specialty || 'Não especificado'}</span>
                          )}
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="space-y-2">
                        <div className="bg-green-50 rounded-lg p-3">
                          <div className="flex items-center text-sm">
                            <span className="font-medium text-green-800 mr-2">📅 Data da Consulta:</span>
                            {editing === consultation.id ? (
                              <input
                                type="date"
                                value={editData.consultation_date || ''}
                                onChange={(e) => setEditData(prev => ({ ...prev, consultation_date: e.target.value }))}
                                className="flex-1 bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            ) : (
                              <span className="text-green-700">{formatDate(consultation.consultation_date)}</span>
                            )}
                          </div>
                        </div>

                        <div className="bg-green-50 rounded-lg p-3">
                          <div className="flex items-center text-sm">
                            <span className="font-medium text-green-800 mr-2">📅 Retorno:</span>
                            {editing === consultation.id ? (
                              <input
                                type="date"
                                value={editData.follow_up_date || ''}
                                onChange={(e) => setEditData(prev => ({ ...prev, follow_up_date: e.target.value }))}
                                className="flex-1 bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            ) : (
                              <span className="text-green-700">{formatDate(consultation.follow_up_date) || 'Não especificado'}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Reason */}
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="text-sm">
                          <span className="font-medium text-blue-800 block mb-1">🎯 Motivo:</span>
                          {editing === consultation.id ? (
                            <textarea
                              value={editData.reason || ''}
                              onChange={(e) => setEditData(prev => ({ ...prev, reason: e.target.value }))}
                              rows={3}
                              className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Motivo da consulta"
                            />
                          ) : (
                            <span className="text-blue-700">{consultation.reason || 'Não especificado'}</span>
                          )}
                        </div>
                      </div>

                      {/* Diagnosis */}
                      <div className="bg-purple-50 rounded-lg p-3">
                        <div className="text-sm">
                          <span className="font-medium text-purple-800 block mb-1">🔍 Diagnóstico:</span>
                          {editing === consultation.id ? (
                            <textarea
                              value={editData.diagnosis || ''}
                              onChange={(e) => setEditData(prev => ({ ...prev, diagnosis: e.target.value }))}
                              rows={3}
                              className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Diagnóstico da consulta"
                            />
                          ) : (
                            <span className="text-purple-700">{consultation.diagnosis || 'Não especificado'}</span>
                          )}
                        </div>
                      </div>

                      {/* Treatment */}
                      <div className="bg-indigo-50 rounded-lg p-3">
                        <div className="text-sm">
                          <span className="font-medium text-indigo-800 block mb-1">💊 Tratamento:</span>
                          {editing === consultation.id ? (
                            <textarea
                              value={editData.treatment || ''}
                              onChange={(e) => setEditData(prev => ({ ...prev, treatment: e.target.value }))}
                              rows={3}
                              className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Tratamento prescrito"
                            />
                          ) : (
                            <span className="text-indigo-700">{consultation.treatment || 'Não especificado'}</span>
                          )}
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="text-sm">
                          <span className="font-medium text-slate-700 block mb-1">📝 Observações:</span>
                          {editing === consultation.id ? (
                            <textarea
                              value={editData.notes || ''}
                              onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                              rows={3}
                              className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Observações sobre a consulta"
                            />
                          ) : (
                            <span className="text-slate-600">{consultation.notes || 'Nenhuma observação'}</span>
                          )}
                        </div>
                      </div>

                      {/* Created Date */}
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-xs text-slate-500">
                          Adicionado em {formatDate(consultation.created_at)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Add Consultation Button - Fixed at bottom */}
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <Button 
            variant="success" 
            size="lg"
            className="px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition-shadow"
            onClick={handleNovaEntradaClick}
          >
            📋 Adicionar Consulta
          </Button>
        </div>

        {/* Nova Entrada Modal */}
        <NovaEntradaModal
          open={isNovaEntradaModalOpen}
          onClose={() => setIsNovaEntradaModalOpen(false)}
          onSubmit={handleNovaEntradaSubmit}
          defaultCategory="consultations"
        />
      </div>
    </DashboardLayout>
  );
} 