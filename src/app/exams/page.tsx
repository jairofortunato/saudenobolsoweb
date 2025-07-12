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

interface Exam {
  id: string;
  name: string;
  exam_date: string;
  result: string | null;
  file_url: string | null;
  doctor_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export default function ExamsPage() {
  const { user, profile } = useAuth();
  const [isNovaEntradaModalOpen, setIsNovaEntradaModalOpen] = useState(false);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Exam>>({});
  const [saving, setSaving] = useState(false);

  // Fetch exams data
  useEffect(() => {
    const fetchExams = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/exams');
        
        if (!response.ok) {
          throw new Error('Failed to fetch exams');
        }
        
        const data = await response.json();
        setExams(data.exams || []);
      } catch (err) {
        console.error('Error fetching exams:', err);
        setError('Failed to load exams');
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, [user]);

  // Refresh exams after adding new one
  const refreshExams = async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/exams');
      if (response.ok) {
        const data = await response.json();
        setExams(data.exams || []);
      }
    } catch (err) {
      console.error('Error refreshing exams:', err);
    }
  };

  // Delete exam function
  const deleteExam = async (examId: string, examName: string) => {
    const confirmed = window.confirm(`Tem certeza que deseja deletar o exame "${examName}"?`);
    if (!confirmed) return;

    try {
      setDeleting(examId);
      
      const response = await fetch(`/api/exams?id=${examId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete exam');
      }

      // Remove from local state
      setExams(prev => prev.filter(exam => exam.id !== examId));
      
    } catch (err) {
      console.error('Error deleting exam:', err);
      alert('Erro ao deletar exame. Tente novamente.');
    } finally {
      setDeleting(null);
    }
  };

  // Edit exam function
  const startEditing = (exam: Exam) => {
    setEditing(exam.id);
    setEditData({
      name: exam.name,
      exam_date: exam.exam_date,
      result: exam.result,
      file_url: exam.file_url,
      doctor_name: exam.doctor_name,
      notes: exam.notes
    });
  };

  const cancelEditing = () => {
    setEditing(null);
    setEditData({});
  };

  const saveExam = async () => {
    if (!editing || !editData.name?.trim() || !editData.exam_date) return;

    try {
      setSaving(true);
      
      const response = await fetch('/api/exams', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editing,
          name: editData.name,
          exam_date: editData.exam_date,
          result: editData.result,
          file_url: editData.file_url,
          doctor_name: editData.doctor_name,
          notes: editData.notes
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update exam');
      }

      const result = await response.json();
      
      // Update local state with the updated exam
      setExams(prev => 
        prev.map(exam => 
          exam.id === editing ? result.exam : exam
        )
      );
      
      setEditing(null);
      setEditData({});
      
    } catch (err) {
      console.error('Error updating exam:', err);
      alert('Erro ao salvar exame. Tente novamente.');
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
    // Refresh the exams list after successful submission
    setTimeout(refreshExams, 1000);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  };

  const getExamDateStatus = (examDate: string) => {
    const date = new Date(examDate);
    const today = new Date();
    const diffDays = Math.ceil((today.getTime() - date.getTime()) / (1000 * 3600 * 24));
    
    if (diffDays === 0) {
      return { label: 'Hoje', color: 'bg-blue-100 text-blue-800' };
    } else if (diffDays === 1) {
      return { label: 'Ontem', color: 'bg-green-100 text-green-800' };
    } else if (diffDays <= 7) {
      return { label: `${diffDays} dias atrás`, color: 'bg-green-100 text-green-800' };
    } else if (diffDays <= 30) {
      return { label: `${diffDays} dias atrás`, color: 'bg-yellow-100 text-yellow-800' };
    } else {
      return { label: `${Math.floor(diffDays / 30)} mês(es) atrás`, color: 'bg-gray-100 text-gray-800' };
    }
  };

  return (
    <DashboardLayout
      title="📋 Exames"
      subtitle="Gerencie seus exames e resultados"
      breadcrumbs={[
        { label: 'Início', href: '/dashboard' },
        { label: 'Exames', href: '/exams' }
      ]}
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-slate-800">
            Seus Exames
            {!loading && (
              <span className="ml-2 text-sm font-normal text-slate-600">
                {exams.length} {exams.length === 1 ? 'exame' : 'exames'}
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
                Erro ao carregar exames
              </h3>
              <p className="text-red-600 mb-6">{error}</p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                🔄 Tentar Novamente
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Exams List */}
        {!loading && !error && (
          <>
            {exams.length === 0 ? (
              /* Placeholder for when no exams exist */
              <Card className="text-center py-12">
                <CardContent>
                  <div className="text-6xl mb-4">📋</div>
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">
                    Nenhum exame registrado
                  </h3>
                  <p className="text-slate-600 mb-6">
                    Mantenha seus exames organizados para facilitar o acompanhamento médico
                  </p>
                  <p className="text-sm text-slate-500">
                    Use o botão 🔍 no canto inferior da tela para adicionar seu primeiro exame
                  </p>
                </CardContent>
              </Card>
            ) : (
              /* Exams Grid */
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {exams.map((exam) => (
                  <Card key={exam.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg font-semibold text-slate-800 leading-tight">
                          {editing === exam.id ? (
                            <input
                              type="text"
                              value={editData.name || ''}
                              onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                              className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Nome do exame"
                            />
                          ) : (
                            `📋 ${exam.name}`
                          )}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          {editing === exam.id ? (
                            <>
                              <button
                                onClick={saveExam}
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
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getExamDateStatus(exam.exam_date).color}`}>
                                {getExamDateStatus(exam.exam_date).label}
                              </span>
                              <button
                                onClick={() => startEditing(exam)}
                                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-full transition-colors"
                                title="Editar exame"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => deleteExam(exam.id, exam.name)}
                                disabled={deleting === exam.id}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-full transition-colors disabled:opacity-50"
                                title="Deletar exame"
                              >
                                {deleting === exam.id ? '⏳' : '🗑️'}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Exam Date */}
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="flex items-center text-sm">
                          <span className="font-medium text-blue-800 mr-2">📅 Data:</span>
                          {editing === exam.id ? (
                            <input
                              type="date"
                              value={editData.exam_date || ''}
                              onChange={(e) => setEditData(prev => ({ ...prev, exam_date: e.target.value }))}
                              className="flex-1 bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <span className="text-blue-700">{formatDate(exam.exam_date)}</span>
                          )}
                        </div>
                      </div>

                      {/* Result */}
                      <div className="bg-green-50 rounded-lg p-3">
                        <div className="text-sm">
                          <span className="font-medium text-green-800 block mb-1">📊 Resultado:</span>
                          {editing === exam.id ? (
                            <textarea
                              value={editData.result || ''}
                              onChange={(e) => setEditData(prev => ({ ...prev, result: e.target.value }))}
                              rows={3}
                              className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Resultado do exame"
                            />
                          ) : (
                            <span className="text-green-700">{exam.result || 'Não especificado'}</span>
                          )}
                        </div>
                      </div>

                      {/* Doctor */}
                      <div className="flex items-center text-sm text-slate-600">
                        <span className="font-medium mr-2">👨‍⚕️ Médico:</span>
                        {editing === exam.id ? (
                          <input
                            type="text"
                            value={editData.doctor_name || ''}
                            onChange={(e) => setEditData(prev => ({ ...prev, doctor_name: e.target.value }))}
                            className="flex-1 bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Nome do médico"
                          />
                        ) : (
                          <span>{exam.doctor_name || 'Não especificado'}</span>
                        )}
                      </div>

                      {/* File Link */}
                      <div className="flex items-center text-sm">
                        <span className="font-medium text-slate-600 mr-2">📎 Arquivo:</span>
                        {editing === exam.id ? (
                          <input
                            type="url"
                            value={editData.file_url || ''}
                            onChange={(e) => setEditData(prev => ({ ...prev, file_url: e.target.value }))}
                            className="flex-1 bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="URL do arquivo"
                          />
                        ) : (
                          exam.file_url ? (
                            <a
                              href={exam.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 font-medium flex items-center"
                            >
                              Ver arquivo
                            </a>
                          ) : (
                            <span className="text-slate-500">Não especificado</span>
                          )
                        )}
                      </div>

                      {/* Notes */}
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="text-sm">
                          <span className="font-medium text-slate-700 block mb-1">📝 Observações:</span>
                          {editing === exam.id ? (
                            <textarea
                              value={editData.notes || ''}
                              onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                              rows={3}
                              className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Observações sobre o exame"
                            />
                          ) : (
                            <span className="text-slate-600">{exam.notes || 'Nenhuma observação'}</span>
                          )}
                        </div>
                      </div>

                      {/* Created Date */}
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-xs text-slate-500">
                          Adicionado em {formatDate(exam.created_at)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Add Exam Button - Fixed at bottom */}
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <Button 
            variant="secondary" 
            size="lg"
            className="px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition-shadow"
            onClick={handleNovaEntradaClick}
          >
            🔍 Adicionar Exame
          </Button>
        </div>

        {/* Nova Entrada Modal */}
        <NovaEntradaModal
          open={isNovaEntradaModalOpen}
          onClose={() => setIsNovaEntradaModalOpen(false)}
          onSubmit={handleNovaEntradaSubmit}
          defaultCategory="exams"
        />
      </div>
    </DashboardLayout>
  );
} 