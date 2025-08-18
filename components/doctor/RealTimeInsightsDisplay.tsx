'use client';

import React, { useState, useCallback, useEffect } from 'react';

/**
 * =====================================
 * REAL-TIME INSIGHTS DISPLAY COMPONENT
 * =====================================
 * 
 * This component displays live medical insights during long consultations.
 * It processes partial transcriptions and shows diagnostic suggestions,
 * key symptoms, and treatment considerations in real-time.
 * 
 * FEATURES:
 * - Live medical analysis display
 * - Diagnostic hypothesis tracking
 * - Symptom pattern recognition
 * - Treatment suggestion prompts
 * - Risk factor identification
 * - Urgency level indicators
 * - Historical insights tracking
 */

interface MedicalInsights {
  diagnostic_hypotheses: string[];
  key_symptoms: string[];
  risk_factors: string[];
  suggested_questions: string[];
  treatment_considerations: string[];
  urgency_level: 'low' | 'medium' | 'high' | 'urgent';
}

interface InsightEntry {
  chunk_number: number;
  timestamp: string;
  insights: MedicalInsights;
  processing_time: number;
}

interface ChunkedRecordingChunk {
  chunk_number: number;
  audio_blob: Blob;
  transcript: string;
  confidence: number;
  timestamp: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'error';
}

interface RealTimeInsightsDisplayProps {
  sessionId: string;
  patientContext?: {
    name?: string;
    age?: number;
    gender?: string;
  };
  onInsightsGenerated: (insights: InsightEntry) => void;
  onError: (error: string) => void;
  className?: string;
}

export function RealTimeInsightsDisplay({
  sessionId,
  patientContext,
  onInsightsGenerated,
  onError,
  className
}: RealTimeInsightsDisplayProps) {
  const [insights, setInsights] = useState<InsightEntry[]>([]);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [currentInsights, setCurrentInsights] = useState<MedicalInsights | null>(null);
  const [partialTranscript, setPartialTranscript] = useState('');

  console.log('🧠 [INSIGHTS-DISPLAY] Component state:', {
    sessionId,
    insightsCount: insights.length,
    isGeneratingInsights,
    hasCurrentInsights: !!currentInsights,
    patientContext
  });

  // Generate insights from chunk transcript
  const generateInsightsFromChunk = useCallback(async (chunk: ChunkedRecordingChunk) => {
    console.log('🧠 [INSIGHTS-DISPLAY] Generating insights for chunk', chunk.chunk_number);

    if (!chunk.transcript || chunk.transcript.trim().length < 50) {
      console.log('📝 [INSIGHTS-DISPLAY] Transcript too short for insights, skipping chunk', chunk.chunk_number);
      return;
    }

    setIsGeneratingInsights(true);

    try {
      // Combine with existing partial transcript for context
      const combinedTranscript = partialTranscript + '\n\n' + chunk.transcript;
      setPartialTranscript(combinedTranscript);

      // Get previous insights for context
      const previousInsights = insights.map(entry => 
        `Chunk ${entry.chunk_number + 1}: ${entry.insights.diagnostic_hypotheses.join(', ')}`
      );

      // Prepare request for insights API
      const requestBody = {
        partial_transcript: combinedTranscript,
        session_id: sessionId,
        chunk_number: chunk.chunk_number,
        patient_context: patientContext,
        previous_insights: previousInsights
      };

      console.log('📤 [INSIGHTS-DISPLAY] Sending insights request');

      const response = await fetch('/api/doctor/generate-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ [INSIGHTS-DISPLAY] Insights generated successfully:', result);

      // Create insight entry
      const insightEntry: InsightEntry = {
        chunk_number: chunk.chunk_number,
        timestamp: new Date().toISOString(),
        insights: result.insights,
        processing_time: result.processing_time
      };

      // Update insights state
      setInsights(prev => [...prev, insightEntry]);
      setCurrentInsights(result.insights);

      // Notify parent component
      onInsightsGenerated(insightEntry);

    } catch (error) {
      console.error('❌ [INSIGHTS-DISPLAY] Failed to generate insights:', error);
      onError(`Failed to generate insights for chunk ${chunk.chunk_number}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingInsights(false);
    }
  }, [sessionId, patientContext, insights, partialTranscript, onInsightsGenerated, onError]);

  // Public method to trigger insights generation
  const processChunkForInsights = useCallback((chunk: ChunkedRecordingChunk) => {
    if (chunk.processing_status === 'completed' && chunk.transcript) {
      generateInsightsFromChunk(chunk);
    }
  }, [generateInsightsFromChunk]);

  // Expose method to parent component
  useEffect(() => {
    // Store reference to the processing function for external use
    (window as any).processChunkForInsights = processChunkForInsights;
    
    return () => {
      delete (window as any).processChunkForInsights;
    };
  }, [processChunkForInsights]);

  // Get urgency color class
  const getUrgencyColor = (level: string): string => {
    switch (level) {
      case 'urgent': return 'bg-red-100 border-red-500 text-red-800';
      case 'high': return 'bg-orange-100 border-orange-500 text-orange-800';
      case 'medium': return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      case 'low': return 'bg-green-100 border-green-500 text-green-800';
      default: return 'bg-gray-100 border-gray-500 text-gray-800';
    }
  };

  // Get urgency label
  const getUrgencyLabel = (level: string): string => {
    switch (level) {
      case 'urgent': return 'URGENTE';
      case 'high': return 'ALTO';
      case 'medium': return 'MÉDIO';
      case 'low': return 'BAIXO';
      default: return 'INDEFINIDO';
    }
  };

  return (
    <div className={`real-time-insights-display ${className || ''}`}>
      <div className="insights-header mb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Insights em Tempo Real</h3>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Sessão: {sessionId.slice(0, 8)}...</span>
            {isGeneratingInsights && (
              <div className="flex items-center gap-1">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                <span className="text-blue-600">Analisando...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {insights.length === 0 && !isGeneratingInsights && (
        <div className="empty-state p-6 text-center text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="mb-2">🧠</div>
          <div className="font-medium">Aguardando transcrições</div>
          <div className="text-sm">Os insights aparecerão conforme a consulta progride</div>
        </div>
      )}

      {currentInsights && (
        <div className="current-insights mb-6">
          <div className={`p-4 rounded-lg border-l-4 ${getUrgencyColor(currentInsights.urgency_level)}`}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Análise Atual</h4>
              <span className={`px-2 py-1 text-xs font-medium rounded ${getUrgencyColor(currentInsights.urgency_level)}`}>
                Urgência: {getUrgencyLabel(currentInsights.urgency_level)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentInsights.diagnostic_hypotheses.length > 0 && (
                <div className="insight-section">
                  <h5 className="font-medium text-sm mb-2 text-gray-700">🔍 Hipóteses Diagnósticas</h5>
                  <ul className="space-y-1">
                    {currentInsights.diagnostic_hypotheses.map((hypothesis, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-blue-600 font-medium">•</span>
                        <span>{hypothesis}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {currentInsights.key_symptoms.length > 0 && (
                <div className="insight-section">
                  <h5 className="font-medium text-sm mb-2 text-gray-700">🩺 Sintomas Chave</h5>
                  <div className="flex flex-wrap gap-1">
                    {currentInsights.key_symptoms.map((symptom, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {symptom}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {currentInsights.risk_factors.length > 0 && (
                <div className="insight-section">
                  <h5 className="font-medium text-sm mb-2 text-gray-700">⚠️ Fatores de Risco</h5>
                  <div className="flex flex-wrap gap-1">
                    {currentInsights.risk_factors.map((factor, index) => (
                      <span key={index} className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                        {factor}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {currentInsights.suggested_questions.length > 0 && (
                <div className="insight-section">
                  <h5 className="font-medium text-sm mb-2 text-gray-700">❓ Perguntas Sugeridas</h5>
                  <ul className="space-y-1">
                    {currentInsights.suggested_questions.map((question, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-green-600 font-medium">→</span>
                        <span className="italic">{question}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {currentInsights.treatment_considerations.length > 0 && (
              <div className="insight-section mt-4">
                <h5 className="font-medium text-sm mb-2 text-gray-700">💊 Considerações de Tratamento</h5>
                <ul className="space-y-1">
                  {currentInsights.treatment_considerations.map((consideration, index) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <span className="text-purple-600 font-medium">•</span>
                      <span>{consideration}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {insights.length > 1 && (
        <div className="insights-history">
          <h4 className="font-medium text-gray-700 mb-3">Histórico de Insights</h4>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {insights.slice(0, -1).reverse().map((entry, index) => (
              <div key={entry.chunk_number} className="p-3 bg-gray-50 rounded border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Segmento {entry.chunk_number + 1}</span>
                  <span className={`px-2 py-1 text-xs rounded ${getUrgencyColor(entry.insights.urgency_level)}`}>
                    {getUrgencyLabel(entry.insights.urgency_level)}
                  </span>
                </div>
                
                {entry.insights.diagnostic_hypotheses.length > 0 && (
                  <div className="text-sm text-gray-600">
                    <strong>Hipóteses:</strong> {entry.insights.diagnostic_hypotheses.slice(0, 2).join(', ')}
                    {entry.insights.diagnostic_hypotheses.length > 2 && '...'}
                  </div>
                )}
                
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(entry.timestamp).toLocaleTimeString('pt-BR')} • 
                  Processado em {entry.processing_time}ms
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {insights.length > 0 && (
        <div className="insights-summary mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <div className="text-sm text-blue-800">
            <strong>Resumo:</strong> {insights.length} análise(s) realizada(s) • 
            Última atualização: {currentInsights ? new Date().toLocaleTimeString('pt-BR') : 'N/A'}
          </div>
        </div>
      )}
    </div>
  );
}