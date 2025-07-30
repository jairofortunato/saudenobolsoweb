'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { Loading } from './Loading';
import { RawMedicalEntry } from '../../types/database';

interface RawMedicalEntriesCardProps {
  className?: string;
}

export const RawMedicalEntriesCard: React.FC<RawMedicalEntriesCardProps> = ({ 
  className = '' 
}) => {
  const [rawEntries, setRawEntries] = useState<RawMedicalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  // Fetch raw medical entries
  const fetchRawEntries = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/raw-medical-entries');
      if (!response.ok) {
        throw new Error('Failed to fetch raw medical entries');
      }
      
      const data = await response.json();
      setRawEntries(data.rawEntries || []);
    } catch (err) {
      console.error('Error fetching raw medical entries:', err);
      setError('Erro ao carregar entradas médicas originais');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRawEntries();
  }, []);

  const toggleExpanded = (entryId: string) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
    }
    setExpandedEntries(newExpanded);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('pt-BR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getProcessingStatusIcon = (entry: RawMedicalEntry) => {
    if (!entry.ai_processed) {
      return '⏳'; // Pending
    } else if (entry.processing_success) {
      return '✅'; // Success
    } else {
      return '❌'; // Error
    }
  };

  const getProcessingStatusText = (entry: RawMedicalEntry) => {
    if (!entry.ai_processed) {
      return 'Pendente';
    } else if (entry.processing_success) {
      return `Processado (${entry.entries_created} entrada${entry.entries_created !== 1 ? 's' : ''} criada${entry.entries_created !== 1 ? 's' : ''})`;
    } else {
      return 'Erro no processamento';
    }
  };

  const getProcessingStatusColor = (entry: RawMedicalEntry) => {
    if (!entry.ai_processed) {
      return 'text-yellow-700 bg-yellow-50';
    } else if (entry.processing_success) {
      return 'text-green-700 bg-green-50';
    } else {
      return 'text-red-700 bg-red-50';
    }
  };

  const getCategoryIcon = (category: string | null) => {
    switch (category) {
      case 'medications': return '💊';
      case 'allergies': return '⚠️';
      case 'exams': return '🔬';
      case 'diseases': return '🩺';
      case 'consultations': return '👩‍⚕️';
      default: return '🤖'; // Auto-detection
    }
  };

  const getCategoryLabel = (category: string | null) => {
    switch (category) {
      case 'medications': return 'Medicamentos';
      case 'allergies': return 'Alergias';
      case 'exams': return 'Exames';
      case 'diseases': return 'Doenças';
      case 'consultations': return 'Consultas';
      default: return 'Auto-detecção';
    }
  };

  const truncateText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <Card className={`hover:shadow-md transition-shadow p-3 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <span>📝 Entradas Médicas Originais</span>
          <span className="text-sm font-normal text-slate-500">
            {rawEntries.length} registro{rawEntries.length !== 1 ? 's' : ''}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4">
            <Loading size="md" />
            <p className="text-slate-600 mt-2 text-sm">Carregando entradas originais...</p>
          </div>
        ) : error ? (
          <div className="text-center py-4">
            <p className="text-red-600 text-sm">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchRawEntries}
              className="mt-2"
            >
              Tentar novamente
            </Button>
          </div>
        ) : rawEntries.length > 0 ? (
          <div className="space-y-3">
            {rawEntries.map((entry) => {
              const isExpanded = expandedEntries.has(entry.id);
              
              return (
                <div 
                  key={entry.id} 
                  className="border border-slate-200 rounded-lg p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-lg">
                        {getCategoryIcon(entry.category)}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-slate-700">
                            {getCategoryLabel(entry.category)}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getProcessingStatusColor(entry)}`}>
                            {getProcessingStatusIcon(entry)} {getProcessingStatusText(entry)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {formatDate(entry.created_at)}
                        </p>
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleExpanded(entry.id)}
                      className="ml-2 text-xs px-2 py-1"
                    >
                      {isExpanded ? 'Recolher' : 'Expandir'}
                    </Button>
                  </div>

                  {/* Content */}
                  <div className="bg-white rounded p-3 border border-slate-200">
                    <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {isExpanded ? entry.raw_text : truncateText(entry.raw_text)}
                    </p>
                  </div>

                  {/* Processing Error (if any) */}
                  {entry.processing_error && isExpanded && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                      <span className="font-medium text-red-800">Erro de processamento:</span>
                      <p className="text-red-700 mt-1">{entry.processing_error}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="text-4xl mb-2">📝</div>
            <p className="text-slate-500 text-sm mb-2">
              Nenhuma entrada médica original encontrada
            </p>
            <p className="text-slate-400 text-xs">
              Quando você adicionar informações médicas através da "Nova Entrada", 
              o texto original aparecerá aqui para referência.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 