'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Alert } from './Alert';

interface ProcessingResultsModalProps {
  open: boolean;
  onClose: () => void;
  processingResult: {
    success: boolean;
    data?: {
      entries_created: number;
      category: string;
      stored_entries: any[];
    };
    processing?: {
      classification?: any;
      originalText: string;
      entriesCreated: number;
    };
  };
}

const categoryConfig = {
  medications: { 
    label: 'Medicamentos', 
    icon: '💊', 
    color: 'text-blue-800',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  allergies: { 
    label: 'Alergias', 
    icon: '⚠️', 
    color: 'text-orange-800',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  exams: { 
    label: 'Exames', 
    icon: '🔬', 
    color: 'text-purple-800',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  diseases: { 
    label: 'Condições Médicas', 
    icon: '🩺', 
    color: 'text-red-800',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  consultations: { 
    label: 'Consultas', 
    icon: '👩‍⚕️', 
    color: 'text-green-800',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
};

export const ProcessingResultsModal: React.FC<ProcessingResultsModalProps> = ({
  open,
  onClose,
  processingResult
}) => {
  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // If we have stored_entries from the processing result, use them
  // Otherwise, fetch recent entries from the database
  useEffect(() => {
    if (!open) return;

    if (processingResult?.data?.stored_entries && processingResult.data.stored_entries.length > 0) {
      setRecentEntries(processingResult.data.stored_entries);
    } else if (processingResult?.data?.entries_created && processingResult.data.entries_created > 0) {
      // Fallback: fetch recent entries from database
      fetchRecentEntries();
    }
  }, [open, processingResult]);

  const fetchRecentEntries = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/recent-entries');
      if (!response.ok) {
        throw new Error('Failed to fetch recent entries');
      }
      
      const data = await response.json();
      setRecentEntries(data.entries || []);
    } catch (err) {
      console.error('Error fetching recent entries:', err);
      setError('Erro ao carregar os dados salvos');
    } finally {
      setLoading(false);
    }
  };

  const groupEntriesByCategory = (entries: any[]) => {
    const grouped: { [key: string]: any[] } = {};
    
    entries.forEach(entry => {
      const category = entry.category || entry.table_name || 'unknown';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(entry);
    });
    
    return grouped;
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Não informado';
    try {
      return new Date(dateString).toLocaleString('pt-BR');
    } catch {
      return dateString;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Não informado';
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  };

  const renderEntry = (entry: any, category: string) => {
    const config = categoryConfig[category as keyof typeof categoryConfig] || {
      label: category,
      icon: '📋',
      color: 'text-gray-800',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200'
    };

    const renderField = (label: string, value: any, type: 'text' | 'date' | 'datetime' | 'boolean' = 'text') => {
      if (value === null || value === undefined || value === '') return null;
      
      let displayValue = value;
      if (type === 'date') displayValue = formatDate(value);
      if (type === 'datetime') displayValue = formatDateTime(value);
      if (type === 'boolean') displayValue = value ? 'Sim' : 'Não';
      
      return (
        <li className="flex justify-between py-1 border-b border-gray-100 last:border-b-0">
          <span className="font-medium text-gray-700 text-sm">{label}:</span>
          <span className="text-gray-900 text-sm max-w-xs text-right">{displayValue}</span>
        </li>
      );
    };

    switch (category) {
      case 'medications':
        return (
          <div key={entry.id} className={`p-4 rounded-lg border ${config.borderColor} ${config.bgColor} mb-3`}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{config.icon}</span>
              <h4 className={`font-bold ${config.color} text-lg`}>
                {entry.name || 'Medicamento'}
              </h4>
            </div>
            <ul className="space-y-1">
              {renderField('Nome', entry.name)}
              {renderField('Dosagem', entry.dosage)}
              {renderField('Frequência', entry.frequency)}
              {renderField('Observações', entry.notes)}
              {renderField('Criado em', entry.created_at, 'datetime')}
              {renderField('Atualizado em', entry.updated_at, 'datetime')}
            </ul>
          </div>
        );

      case 'allergies':
        return (
          <div key={entry.id} className={`p-4 rounded-lg border ${config.borderColor} ${config.bgColor} mb-3`}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{config.icon}</span>
              <h4 className={`font-bold ${config.color} text-lg`}>
                {entry.name || 'Alergia'}
              </h4>
            </div>
            <ul className="space-y-1">
              {renderField('Nome', entry.name)}
              {renderField('Severidade', entry.severity)}
              {renderField('Observações', entry.notes)}
              {renderField('Criado em', entry.created_at, 'datetime')}
              {renderField('Atualizado em', entry.updated_at, 'datetime')}
            </ul>
          </div>
        );

      case 'exams':
        return (
          <div key={entry.id} className={`p-4 rounded-lg border ${config.borderColor} ${config.bgColor} mb-3`}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{config.icon}</span>
              <h4 className={`font-bold ${config.color} text-lg`}>
                {entry.name || 'Exame'}
              </h4>
            </div>
            <ul className="space-y-1">
              {renderField('Nome', entry.name)}
              {renderField('Data do Exame', entry.date, 'date')}
              {renderField('Resultado', entry.result)}
              {renderField('Observações', entry.notes)}
              {renderField('Criado em', entry.created_at, 'datetime')}
              {renderField('Atualizado em', entry.updated_at, 'datetime')}
            </ul>
          </div>
        );

      case 'diseases':
        return (
          <div key={entry.id} className={`p-4 rounded-lg border ${config.borderColor} ${config.bgColor} mb-3`}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{config.icon}</span>
              <h4 className={`font-bold ${config.color} text-lg`}>
                {entry.name || 'Condição Médica'}
              </h4>
            </div>
            <ul className="space-y-1">
              {renderField('Nome', entry.name)}
              {renderField('Data do Diagnóstico', entry.diagnosed_on, 'date')}
              {renderField('Condição Crônica', entry.chronic, 'boolean')}
              {renderField('Observações', entry.notes)}
              {renderField('Criado em', entry.created_at, 'datetime')}
              {renderField('Atualizado em', entry.updated_at, 'datetime')}
            </ul>
          </div>
        );

      case 'consultations':
        return (
          <div key={entry.id} className={`p-4 rounded-lg border ${config.borderColor} ${config.bgColor} mb-3`}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{config.icon}</span>
              <h4 className={`font-bold ${config.color} text-lg`}>
                Consulta {entry.doctor_name ? `- Dr(a). ${entry.doctor_name}` : ''}
              </h4>
            </div>
            <ul className="space-y-1">
              {renderField('Médico', entry.doctor_name)}
              {renderField('Especialidade', entry.specialty)}
              {renderField('Data da Consulta', entry.date, 'datetime')}
              {renderField('Observações', entry.notes)}
              {renderField('Criado em', entry.created_at, 'datetime')}
              {renderField('Atualizado em', entry.updated_at, 'datetime')}
            </ul>
          </div>
        );

      default:
        return (
          <div key={entry.id} className={`p-4 rounded-lg border ${config.borderColor} ${config.bgColor} mb-3`}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{config.icon}</span>
              <h4 className={`font-bold ${config.color} text-lg`}>
                {entry.name || 'Entrada Médica'}
              </h4>
            </div>
            <div className="bg-gray-100 p-3 rounded text-xs">
              <details>
                <summary className="cursor-pointer font-medium">Ver dados completos</summary>
                <pre className="mt-2 whitespace-pre-wrap overflow-x-auto">
                  {JSON.stringify(entry, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        );
    }
  };

  const groupedEntries = groupEntriesByCategory(recentEntries);
  const totalEntries = recentEntries.length;

  return (
    <Modal open={open} onClose={onClose} size="full" title="✅ Processamento Concluído">
      <div className="space-y-6">
        {/* Success Header */}
        <div className="text-center bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">
            Dados Processados com Sucesso!
          </h2>
          <p className="text-green-700">
            {totalEntries} entrada{totalEntries !== 1 ? 's' : ''} médica{totalEntries !== 1 ? 's foram criadas' : ' foi criada'} no seu histórico
          </p>
        </div>

        {/* Processing Summary */}
        {processingResult?.processing && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">📊 Resumo do Processamento</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-blue-700">Texto Original:</span>
                <p className="text-blue-600 mt-1 bg-white p-2 rounded border border-blue-100 max-h-20 overflow-y-auto">
                  {processingResult.processing.originalText}
                </p>
              </div>
              <div>
                <span className="font-medium text-blue-700">Entradas Criadas:</span>
                <p className="text-blue-600 mt-1">
                  {processingResult.processing.entriesCreated} item{processingResult.processing.entriesCreated !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-blue-300 border-t-blue-600 rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando dados salvos...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="error">
            <span className="text-lg">⚠️</span>
            <span className="ml-2">{error}</span>
          </Alert>
        )}

        {/* Results Display */}
        {!loading && !error && totalEntries > 0 && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-slate-800">
              📋 Dados Salvos no seu Histórico:
            </h3>
            
            {Object.entries(groupedEntries).map(([category, entries]) => {
              const config = categoryConfig[category as keyof typeof categoryConfig] || {
                label: category,
                icon: '📋',
                color: 'text-gray-800'
              };
              
              return (
                <div key={category} className="space-y-3">
                  <h4 className={`text-lg font-semibold ${config.color} flex items-center gap-2`}>
                    <span className="text-2xl">{config.icon}</span>
                    {config.label} ({entries.length})
                  </h4>
                  <div className="space-y-3">
                    {entries.map(entry => renderEntry(entry, category))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* No Results */}
        {!loading && !error && totalEntries === 0 && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🤔</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Nenhum dado encontrado
            </h3>
            <p className="text-gray-600">
              Os dados podem não ter sido salvos corretamente ou ainda estão sendo processados.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-6 border-t border-slate-200">
          <Button
            variant="outline"
            size="lg"
            onClick={onClose}
            className="flex-1"
          >
            Voltar ao Dashboard
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={() => window.location.reload()}
            className="flex-1"
          >
            Atualizar Página
          </Button>
        </div>
      </div>
    </Modal>
  );
}; 