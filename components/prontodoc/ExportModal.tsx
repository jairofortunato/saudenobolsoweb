'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { TranscriptSegment } from './TranscriptDisplay';
import { SessionDetails } from './SessionInfo';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  segments: TranscriptSegment[];
  sessionDetails: SessionDetails | null;
}

type ExportFormat = 'txt' | 'pdf' | 'docx' | 'json';

export function ExportModal({
  isOpen,
  onClose,
  segments,
  sessionDetails
}: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('txt');
  const [includeSpeakers, setIncludeSpeakers] = useState(true);
  const [includeTimestamps, setIncludeTimestamps] = useState(false);
  const [includeConfidence, setIncludeConfidence] = useState(false);
  const [finalOnly, setFinalOnly] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const formatOptions = [
    { value: 'txt' as ExportFormat, label: 'Texto (.txt)', description: 'Formato de texto simples' },
    { value: 'pdf' as ExportFormat, label: 'PDF (.pdf)', description: 'Documento PDF formatado' },
    { value: 'docx' as ExportFormat, label: 'Word (.docx)', description: 'Documento Microsoft Word' },
    { value: 'json' as ExportFormat, label: 'JSON (.json)', description: 'Dados estruturados com metadados' }
  ];

  const generateTextContent = useCallback((): string => {
    if (!sessionDetails) return '';

    const filteredSegments = finalOnly ? segments.filter(s => s.isFinal) : segments;
    
    let content = '';
    
    // Header
    content += '='.repeat(60) + '\n';
    content += 'TRANSCRIÇÃO DA CONSULTA MÉDICA - PRONTODOC\n';
    content += '='.repeat(60) + '\n\n';
    
    // Session Info
    content += `Sessão: ${sessionDetails.sessionId}\n`;
    if (sessionDetails.recordingId) {
      content += `Gravação: ${sessionDetails.recordingId}\n`;
    }
    content += `Paciente: ${sessionDetails.patient.name}\n`;
    content += `Médico: ${sessionDetails.doctor.name}\n`;
    if (sessionDetails.startedAt) {
      content += `Data/Hora: ${sessionDetails.startedAt.toLocaleString('pt-BR')}\n`;
    }
    content += `Tipo: ${sessionDetails.consultationType || 'Consulta Geral'}\n`;
    content += '\n' + '-'.repeat(60) + '\n\n';
    
    // Transcript
    filteredSegments.forEach((segment, index) => {
      if (includeSpeakers && segment.speakerLabel) {
        content += `[${segment.speakerLabel}] `;
      }
      
      if (includeTimestamps) {
        const startTime = Math.floor(segment.startTime);
        const mins = Math.floor(startTime / 60);
        const secs = startTime % 60;
        content += `[${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}] `;
      }
      
      content += segment.content;
      
      if (includeConfidence) {
        content += ` (${Math.round(segment.confidence * 100)}%)`;
      }
      
      content += '\n\n';
    });
    
    // Footer
    content += '-'.repeat(60) + '\n';
    content += `Total de segmentos: ${filteredSegments.length}\n`;
    content += `Gerado em: ${new Date().toLocaleString('pt-BR')}\n`;
    content += 'Sistema: ProntoDoc - Saúde no Bolso\n';
    
    return content;
  }, [segments, sessionDetails, includeSpeakers, includeTimestamps, includeConfidence, finalOnly]);

  const generateJSONContent = useCallback((): string => {
    const filteredSegments = finalOnly ? segments.filter(s => s.isFinal) : segments;
    
    const exportData = {
      metadata: {
        sessionId: sessionDetails?.sessionId,
        recordingId: sessionDetails?.recordingId,
        patient: sessionDetails?.patient,
        doctor: sessionDetails?.doctor,
        startedAt: sessionDetails?.startedAt?.toISOString(),
        consultationType: sessionDetails?.consultationType,
        specialty: sessionDetails?.specialty,
        exportedAt: new Date().toISOString(),
        exportSettings: {
          includeSpeakers,
          includeTimestamps,
          includeConfidence,
          finalOnly
        }
      },
      segments: filteredSegments.map(segment => ({
        id: segment.id,
        content: segment.content,
        confidence: segment.confidence,
        startTime: segment.startTime,
        endTime: segment.endTime,
        speakerId: segment.speakerId,
        speakerLabel: segment.speakerLabel,
        isFinal: segment.isFinal,
        timestamp: segment.timestamp.toISOString(),
        wordsCount: segment.content.split(' ').length
      })),
      summary: {
        totalSegments: filteredSegments.length,
        totalWords: filteredSegments.reduce((acc, s) => acc + s.content.split(' ').length, 0),
        averageConfidence: filteredSegments.length > 0 
          ? filteredSegments.reduce((acc, s) => acc + s.confidence, 0) / filteredSegments.length 
          : 0,
        duration: filteredSegments.length > 0 
          ? Math.max(...filteredSegments.map(s => s.endTime)) 
          : 0,
        uniqueSpeakers: new Set(filteredSegments.map(s => s.speakerId)).size
      }
    };
    
    return JSON.stringify(exportData, null, 2);
  }, [segments, sessionDetails, includeSpeakers, includeTimestamps, includeConfidence, finalOnly]);

  const handleExport = useCallback(async () => {
    if (segments.length === 0) return;

    setIsExporting(true);

    try {
      let content: string;
      let mimeType: string;
      let filename: string;

      const baseFilename = `prontodoc_${sessionDetails?.sessionId || 'session'}_${new Date().toISOString().split('T')[0]}`;

      switch (selectedFormat) {
        case 'txt':
          content = generateTextContent();
          mimeType = 'text/plain;charset=utf-8';
          filename = `${baseFilename}.txt`;
          break;
        case 'json':
          content = generateJSONContent();
          mimeType = 'application/json;charset=utf-8';
          filename = `${baseFilename}.json`;
          break;
        case 'pdf':
        case 'docx':
          // For PDF and DOCX, we'll fallback to text for now
          // In a real implementation, you'd use libraries like jsPDF or docx
          content = generateTextContent();
          mimeType = 'text/plain;charset=utf-8';
          filename = `${baseFilename}.txt`;
          alert('Exportação em PDF/DOCX será implementada em breve. Salvando como texto por enquanto.');
          break;
        default:
          throw new Error('Formato não suportado');
      }

      // Create and download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onClose();

    } catch (error) {
      console.error('Error exporting:', error);
      alert('Erro ao exportar transcrição. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  }, [selectedFormat, generateTextContent, generateJSONContent, segments.length, sessionDetails, onClose]);

  const previewContent = useCallback((): string => {
    const content = selectedFormat === 'json' ? generateJSONContent() : generateTextContent();
    return content.length > 500 ? content.substring(0, 500) + '...' : content;
  }, [selectedFormat, generateTextContent, generateJSONContent]);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader>
          <CardTitle className="text-xl">Exportar Transcrição</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6 overflow-y-auto">
          {/* Format Selection */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-3">Formato de Exportação</h3>
            <div className="grid grid-cols-2 gap-3">
              {formatOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedFormat(option.value)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    selectedFormat === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="font-medium text-slate-900">{option.label}</div>
                  <div className="text-xs text-slate-600 mt-1">{option.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Export Options */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-3">Opções de Exportação</h3>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={includeSpeakers}
                  onChange={(e) => setIncludeSpeakers(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">Incluir identificação de falantes</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={includeTimestamps}
                  onChange={(e) => setIncludeTimestamps(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">Incluir marcadores de tempo</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={includeConfidence}
                  onChange={(e) => setIncludeConfidence(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">Incluir níveis de confiança</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={finalOnly}
                  onChange={(e) => setFinalOnly(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">Apenas transcrições finais</span>
              </label>
            </div>
          </div>

          {/* Preview */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-3">Prévia do Conteúdo</h3>
            <div className="bg-slate-50 rounded-xl p-4 max-h-48 overflow-y-auto">
              <pre className="text-xs text-slate-700 whitespace-pre-wrap">
                {previewContent()}
              </pre>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-blue-50 rounded-xl p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Resumo da Exportação</h3>
            <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
              <div>
                <span className="font-medium">Segmentos:</span> {finalOnly ? segments.filter(s => s.isFinal).length : segments.length}
              </div>
              <div>
                <span className="font-medium">Palavras:</span> {
                  (finalOnly ? segments.filter(s => s.isFinal) : segments)
                    .reduce((acc, s) => acc + s.content.split(' ').length, 0)
                }
              </div>
              <div>
                <span className="font-medium">Formato:</span> {formatOptions.find(f => f.value === selectedFormat)?.label}
              </div>
              <div>
                <span className="font-medium">Sessão:</span> {sessionDetails?.sessionId?.slice(0, 8)}...
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isExporting}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleExport}
              loading={isExporting}
              disabled={segments.length === 0}
            >
              {isExporting ? 'Exportando...' : 'Exportar Transcrição'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </Modal>
  );
}