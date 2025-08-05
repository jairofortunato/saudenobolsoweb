'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Alert } from '../../../components/ui/Alert';
import { Loading } from '../../../components/ui/Loading';

// ProntoDoc Pre-recorded Client
import { 
  ProntoDocPrerecordedClient, 
  PrerecordedEvent, 
  PrerecordedTranscriptionResult,
  PrerecordedSessionDetails 
} from '../../../lib/prontodoc-client-prerecorded';

export default function ProntoDocPrerecordedPage() {
  const { user, loading: authLoading } = useAuth();
  
  // Session 1 State
  const [isRecording1, setIsRecording1] = useState(false);
  const [isTranscribing1, setIsTranscribing1] = useState(false);
  const [transcript1, setTranscript1] = useState('');
  const [transcriptionResult1, setTranscriptionResult1] = useState<PrerecordedTranscriptionResult | null>(null);
  const [recordingDuration1, setRecordingDuration1] = useState(0);
  const [audioSize1, setAudioSize1] = useState(0);
  const [selectedFile1, setSelectedFile1] = useState<File | null>(null);

  // Session 2 State
  const [isRecording2, setIsRecording2] = useState(false);
  const [isTranscribing2, setIsTranscribing2] = useState(false);
  const [transcript2, setTranscript2] = useState('');
  const [transcriptionResult2, setTranscriptionResult2] = useState<PrerecordedTranscriptionResult | null>(null);
  const [recordingDuration2, setRecordingDuration2] = useState(0);
  const [audioSize2, setAudioSize2] = useState(0);
  const [selectedFile2, setSelectedFile2] = useState<File | null>(null);

  // Session 3 State
  const [isRecording3, setIsRecording3] = useState(false);
  const [isTranscribing3, setIsTranscribing3] = useState(false);
  const [transcript3, setTranscript3] = useState('');
  const [transcriptionResult3, setTranscriptionResult3] = useState<PrerecordedTranscriptionResult | null>(null);
  const [recordingDuration3, setRecordingDuration3] = useState(0);
  const [audioSize3, setAudioSize3] = useState(0);
  const [selectedFile3, setSelectedFile3] = useState<File | null>(null);

  // Global State
  const [error, setError] = useState<string | null>(null);
  
  // AI Processing State - Session 1
  const [aiModel1, setAiModel1] = useState('gpt-4o');
  const [transcriptionModel1, setTranscriptionModel1] = useState('nova-3');
  const [instructionPrompt1, setInstructionPrompt1] = useState(`Você é uma assistente médica especializada em registros clínicos. A seguir, você receberá a transcrição de uma conversa entre um médico e um paciente. Sua tarefa é transformar essa transcrição em um prontuário clínico estruturado no seguinte formato:

🧾 Formato do Prontuário:

Alergias:
Liste aqui as alergias mencionadas. Se o paciente não relatar nenhuma, escreva "Não referidas".

MUC (Medicações de uso contínuo):
Liste as medicações que o paciente faz uso contínuo. Se não houver, escreva "Não referidas".

Comorbidades:
Liste as condições clínicas prévias relatadas. Se não houver, escreva "Não referidas".

SOAP (Evolução clínica):

S – Subjetivo:
Descreva o que o paciente relatou espontaneamente sobre seus sintomas, queixas, histórico do problema, e impacto nas atividades diárias.

O – Objetivo:
Descreva os achados clínicos observados pelo médico, como inspeção, palpação, ausculta, sinais clínicos, exames físicos (se mencionados).

A – Avaliação:
Informe a hipótese diagnóstica do médico com base nas informações subjetivas e objetivas.

P – Plano:
Descreva a conduta proposta pelo médico: exames solicitados, medicamentos prescritos, orientações ou encaminhamentos.

Instruções adicionais:

Resuma com linguagem clínica e objetiva.

Organize em formato limpo e fácil de ler.

Se uma informação não for mencionada na transcrição, use "Não referido(a)" no campo correspondente.

Não invente dados. Apenas use o que está presente na transcrição.`);
  const [isProcessingAI1, setIsProcessingAI1] = useState(false);
  const [prontuarioResult1, setProntuarioResult1] = useState('');

  // AI Processing State - Session 2
  const [aiModel2, setAiModel2] = useState('gpt-4o');
  const [transcriptionModel2, setTranscriptionModel2] = useState('best');
  const [instructionPrompt2, setInstructionPrompt2] = useState(`Você é um assistente médico especializado em organizar transcrições de consultas médicas em prontuários estruturados.

Analise a transcrição fornecida e organize as informações em um prontuário médico estruturado seguindo este formato:

## IDENTIFICAÇÃO DO PACIENTE
- Nome: [extrair se mencionado]
- Data da consulta: [data atual se não especificada]

## QUEIXA PRINCIPAL
[Motivo principal da consulta]

## HISTÓRIA DA DOENÇA ATUAL
[Sintomas atuais, início, evolução, fatores de melhora/piora]

## HISTÓRIA MÉDICA PREGRESSA
[Doenças anteriores, cirurgias, medicamentos em uso]

## EXAME FÍSICO
[Achados do exame físico se mencionados]

## HIPÓTESE DIAGNÓSTICA
[Possível diagnóstico baseado nos sintomas]

## CONDUTA/PLANO
[Tratamento prescrito, medicamentos, orientações]

## OBSERVAÇÕES
[Informações adicionais relevantes]

Mantenha a linguagem técnica médica apropriada e seja preciso na organização das informações.`);
  const [isProcessingAI2, setIsProcessingAI2] = useState(false);
  const [prontuarioResult2, setProntuarioResult2] = useState('');

  // AI Processing State - Session 3
  const [aiModel3, setAiModel3] = useState('gpt-4o');
  const [transcriptionModel3, setTranscriptionModel3] = useState('whisper-1');
  const [instructionPrompt3, setInstructionPrompt3] = useState(`Você é um assistente médico especializado em análise de transcrições médicas. Analise a transcrição fornecida e extraia as informações mais importantes organizando-as em um formato clínico estruturado.

## ESTRUTURA SOLICITADA:

### 📋 INFORMAÇÕES BÁSICAS
- **Paciente**: [Nome se mencionado]
- **Data**: [Data da consulta]
- **Tipo de consulta**: [Consulta inicial, retorno, urgência, etc.]

### 🩺 QUEIXA PRINCIPAL
[Principal motivo da consulta]

### 📝 HISTÓRIA CLÍNICA
**Sintomas atuais:**
- [Lista dos sintomas relatados]
- [Duração e características]

**Medicações em uso:**
- [Medicamentos mencionados]

**Alergias:**
- [Alergias relatadas ou "Não referidas"]

### 🔍 EXAME FÍSICO
[Achados do exame físico se mencionados]

### 💊 PRESCRIÇÃO/ORIENTAÇÕES
[Medicamentos prescritos e orientações médicas]

### 📅 SEGUIMENTO
[Retorno agendado ou orientações de seguimento]

**INSTRUÇÕES:**
- Use apenas informações presentes na transcrição
- Mantenha linguagem médica apropriada
- Se alguma informação não foi mencionada, escreva "Não referido"
- Seja conciso mas completo`);
  const [isProcessingAI3, setIsProcessingAI3] = useState(false);
  const [prontuarioResult3, setProntuarioResult3] = useState('');
  
  // Refs
  const fileInputRef1 = useRef<HTMLInputElement | null>(null);
  const fileInputRef2 = useRef<HTMLInputElement | null>(null);
  const fileInputRef3 = useRef<HTMLInputElement | null>(null);

  // File import handlers for each session
  const handleFileSelect1 = useCallback(() => {
    fileInputRef1.current?.click();
  }, []);

  const handleFileSelect2 = useCallback(() => {
    fileInputRef2.current?.click();
  }, []);

  const handleFileSelect3 = useCallback(() => {
    fileInputRef3.current?.click();
  }, []);

  const handleFileChange1 = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('audio/')) {
        setError('Please select an audio file');
        return;
      }
      if (file.size > 100 * 1024 * 1024) {
        setError('File size must be less than 100MB');
        return;
      }
      setSelectedFile1(file);
      setError(null);
      console.log('📁 Session 1 - Selected audio file:', file.name, 'Size:', file.size);
    }
  }, []);

  const handleFileChange2 = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('audio/')) {
        setError('Please select an audio file');
        return;
      }
      if (file.size > 100 * 1024 * 1024) {
        setError('File size must be less than 100MB');
        return;
      }
      setSelectedFile2(file);
      setError(null);
      console.log('📁 Session 2 - Selected audio file:', file.name, 'Size:', file.size);
    }
  }, []);

  const handleFileChange3 = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('audio/')) {
        setError('Please select an audio file');
        return;
      }
      if (file.size > 100 * 1024 * 1024) {
        setError('File size must be less than 100MB');
        return;
      }
      setSelectedFile3(file);
      setError(null);
      console.log('📁 Session 3 - Selected audio file:', file.name, 'Size:', file.size);
    }
  }, []);

  // File upload handlers for each session
  const handleUploadFile1 = useCallback(async () => {
    if (!selectedFile1 || !user) {
      setError('No file selected or user not logged in');
      return;
    }

    setError(null);
    setTranscript1('');
    setTranscriptionResult1(null);
    setIsTranscribing1(true);
    setAudioSize1(selectedFile1.size);

    try {
      const sessionId = `prerecorded_file_1_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const formData = new FormData();
      formData.append('audio_file', selectedFile1);
      formData.append('session_id', sessionId);
      formData.append('patient_id', 'temp_patient_id');
      formData.append('doctor_id', 'temp_doctor_id');
      formData.append('language', 'pt-BR');
      formData.append('model', transcriptionModel1);

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_AI_PROCESSOR_URL || 'https://saude-ai-processor-production.up.railway.app';
      const uploadUrl = `${apiBaseUrl}/api/prontodoc/prerecorded/transcribe`;
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }

      const result: PrerecordedTranscriptionResult = await response.json();
      setTranscriptionResult1(result);
      setTranscript1(result.transcript);
      setIsTranscribing1(false);
      
    } catch (error) {
      console.error('❌ Session 1 - Error uploading file:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload file');
      setIsTranscribing1(false);
    }
  }, [selectedFile1, user, transcriptionModel1]);

  const handleUploadFile2 = useCallback(async () => {
    if (!selectedFile2 || !user) {
      setError('No file selected or user not logged in');
      return;
    }

    setError(null);
    setTranscript2('');
    setTranscriptionResult2(null);
    setIsTranscribing2(true);
    setAudioSize2(selectedFile2.size);

    try {
      const sessionId = `prerecorded_file_2_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const formData = new FormData();
      formData.append('audio_file', selectedFile2);
      formData.append('session_id', sessionId);
      formData.append('patient_id', 'temp_patient_id');
      formData.append('doctor_id', 'temp_doctor_id');
      formData.append('language', 'pt');
      formData.append('model', transcriptionModel2);

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_AI_PROCESSOR_URL || 'https://saude-ai-processor-production.up.railway.app';
      const uploadUrl = `${apiBaseUrl}/api/prontodoc/prerecorded/transcribe-assemblyai`;

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }

      const result: PrerecordedTranscriptionResult = await response.json();
      setTranscriptionResult2(result);
      setTranscript2(result.transcript);
      setIsTranscribing2(false);
      
    } catch (error) {
      console.error('❌ Session 2 - Error uploading file:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload file');
      setIsTranscribing2(false);
    }
  }, [selectedFile2, user, transcriptionModel2]);

  const handleUploadFile3 = useCallback(async () => {
    if (!selectedFile3 || !user) {
      setError('No file selected or user not logged in');
      return;
    }

    setError(null);
    setTranscript3('');
    setTranscriptionResult3(null);
    setIsTranscribing3(true);
    setAudioSize3(selectedFile3.size);

    try {
      const sessionId = `prerecorded_file_3_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const formData = new FormData();
      formData.append('audio_file', selectedFile3);
      formData.append('session_id', sessionId);
      formData.append('patient_id', 'temp_patient_id');
      formData.append('doctor_id', 'temp_doctor_id');
      formData.append('language', 'pt');
      formData.append('model', transcriptionModel3);

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_AI_PROCESSOR_URL || 'https://saude-ai-processor-production.up.railway.app';
      const uploadUrl = `${apiBaseUrl}/api/prontodoc/prerecorded/transcribe-openai-whisper`;
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }

      const result: PrerecordedTranscriptionResult = await response.json();
      setTranscriptionResult3(result);
      setTranscript3(result.transcript);
      setIsTranscribing3(false);
      
    } catch (error) {
      console.error('❌ Session 3 - Error uploading file:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload file');
      setIsTranscribing3(false);
    }
  }, [selectedFile3, user, transcriptionModel3]);

  // AI Processing handlers for each session
  const handleProcessWithAI1 = useCallback(async () => {
    if (!transcript1.trim()) {
      setError('No transcript available for AI processing');
      return;
    }

    setIsProcessingAI1(true);
    setError(null);

    try {
      const response = await fetch('/api/ai-processing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: aiModel1,
          instructionPrompt: instructionPrompt1,
          transcript: transcript1,
          sessionId: 1
        }),
      });

      if (!response.ok) {
        throw new Error(`AI processing failed: ${response.status}`);
      }

      const result = await response.json();
      setProntuarioResult1(result.prontuario);
      setIsProcessingAI1(false);

    } catch (error) {
      console.error('❌ AI processing error (Session 1):', error);
      setError(error instanceof Error ? error.message : 'Failed to process with AI');
      setIsProcessingAI1(false);
    }
  }, [transcript1, aiModel1, instructionPrompt1]);

  const handleProcessWithAI2 = useCallback(async () => {
    if (!transcript2.trim()) {
      setError('No transcript available for AI processing');
      return;
    }

    setIsProcessingAI2(true);
    setError(null);

    try {
      const response = await fetch('/api/ai-processing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: aiModel2,
          instructionPrompt: instructionPrompt2,
          transcript: transcript2,
          sessionId: 2
        }),
      });

      if (!response.ok) {
        throw new Error(`AI processing failed: ${response.status}`);
      }

      const result = await response.json();
      setProntuarioResult2(result.prontuario);
      setIsProcessingAI2(false);

    } catch (error) {
      console.error('❌ AI processing error (Session 2):', error);
      setError(error instanceof Error ? error.message : 'Failed to process with AI');
      setIsProcessingAI2(false);
    }
  }, [transcript2, aiModel2, instructionPrompt2]);

  const handleProcessWithAI3 = useCallback(async () => {
    if (!transcript3.trim()) {
      setError('No transcript available for AI processing');
      return;
    }

    setIsProcessingAI3(true);
    setError(null);

    try {
      const response = await fetch('/api/ai-processing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: aiModel3,
          instructionPrompt: instructionPrompt3,
          transcript: transcript3,
          sessionId: 3
        }),
      });

      if (!response.ok) {
        throw new Error(`AI processing failed: ${response.status}`);
      }

      const result = await response.json();
      setProntuarioResult3(result.prontuario);
      setIsProcessingAI3(false);

    } catch (error) {
      console.error('❌ AI processing error (Session 3):', error);
      setError(error instanceof Error ? error.message : 'Failed to process with AI');
      setIsProcessingAI3(false);
    }
  }, [transcript3, aiModel3, instructionPrompt3]);

  // Clear handlers for each session
  const handleClearResults1 = useCallback(() => {
    setTranscript1('');
    setTranscriptionResult1(null);
    setRecordingDuration1(0);
    setAudioSize1(0);
    setSelectedFile1(null);
    setProntuarioResult1('');
    setError(null);
  }, []);

  const handleClearResults2 = useCallback(() => {
    setTranscript2('');
    setTranscriptionResult2(null);
    setRecordingDuration2(0);
    setAudioSize2(0);
    setSelectedFile2(null);
    setProntuarioResult2('');
    setError(null);
  }, []);

  const handleClearResults3 = useCallback(() => {
    setTranscript3('');
    setTranscriptionResult3(null);
    setRecordingDuration3(0);
    setAudioSize3(0);
    setSelectedFile3(null);
    setProntuarioResult3('');
    setError(null);
  }, []);

  const handleClearAIResults1 = useCallback(() => {
    setProntuarioResult1('');
  }, []);

  const handleClearAIResults2 = useCallback(() => {
    setProntuarioResult2('');
  }, []);

  const handleClearAIResults3 = useCallback(() => {
    setProntuarioResult3('');
  }, []);

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loading variant="primary" size="lg" />
          <p className="text-slate-600">Loading authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-slate-600">Please log in to use ProntoDoc Pre-recorded</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-2">
      <div className="mx-auto space-y-4">

        {/* Error Alert */}
        {error && (
          <Alert variant="error">
            <div className="font-medium">Error</div>
            <div className="text-sm mt-1">{error}</div>
          </Alert>
        )}

        {/* ROW 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          
          {/* Session 1 - Audio Input */}
          <div className="space-y-4">
            <Card className="min-h-[600px]">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                  🎤 Audio Input #1 - DEEPGRAM
              </CardTitle>
            </CardHeader>
              <CardContent className="flex flex-col h-full">
                
                {/* Transcription Model Selection */}
                <div className="space-y-2 mb-6">
                  <label className="text-sm font-medium text-slate-700">Transcription Model:</label>
                  <select 
                    value={transcriptionModel1}
                    onChange={(e) => setTranscriptionModel1(e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm"
                  >
                    <option value="nova-3">Nova 3</option>
                    <option value="nova-2">Nova 2</option>
                    <option value="enhanced">Enhanced</option>
                    <option value="base">Base</option>
                  </select>
              </div>
              
                {/* File Import Section */}
                <div className="space-y-4 mb-6">
                  <h3 className="font-medium text-slate-700 border-b pb-2">📁 Import File</h3>
                  
                  <input
                    ref={fileInputRef1}
                    type="file"
                    accept="audio/*"
                    onChange={handleFileChange1}
                    className="hidden"
                  />
                  
                  <div 
                    onClick={handleFileSelect1}
                    className={`
                      border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors text-sm
                      ${selectedFile1 
                        ? 'border-green-300 bg-green-50' 
                        : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
                      }
                    `}
                  >
                    {selectedFile1 ? (
                      <div>
                        <div className="text-green-600 mb-1">✅ Selected</div>
                        <div className="font-medium text-xs">{selectedFile1.name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatFileSize(selectedFile1.size)}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-gray-400 mb-1">📁</div>
                        <div className="font-medium text-gray-700 text-xs">Click to select</div>
                        <div className="text-xs text-gray-500 mt-1">MP3, WAV, M4A...</div>
                </div>
              )}
            </div>

                  <div className="flex gap-2">
                    {selectedFile1 && (
                      <>
                <Button 
                          onClick={handleUploadFile1}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
                          disabled={isTranscribing1}
                          size="sm"
                        >
                          🚀 Upload
                </Button>
                <Button 
                          onClick={() => setSelectedFile1(null)}
                          variant="outline"
                          disabled={isTranscribing1}
                          size="sm"
                        >
                          ❌
                </Button>
                      </>
                    )}
                  </div>
                </div>

                {isTranscribing1 && (
                  <div className="flex items-center gap-2 text-blue-600 text-sm p-3 bg-blue-50 rounded-lg mb-6">
                    <Loading variant="primary" size="sm" />
                    <span>Processing audio...</span>
                  </div>
                )}

                <div className="mt-auto">
                  {transcriptionResult1 && (
                <Button 
                      onClick={handleClearResults1}
                  variant="outline"
                      className="w-full"
                      size="sm"
                >
                      🗑️ Clear All Results
                </Button>
              )}
            </div>

              </CardContent>
            </Card>
          </div>

          {/* Session 1 - Transcription Results */}
          <div className="space-y-4">
            <Card className="min-h-[600px]">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  📝 Transcription Results #1
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col h-full">
                
                {transcriptionResult1 ? (
                  <>
                    <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-lg text-xs mb-4">
                      <div>
                        <div className="font-medium text-slate-600">Duration</div>
                        <div>{transcriptionResult1.duration.toFixed(1)}s</div>
                      </div>
                      <div>
                        <div className="font-medium text-slate-600">Words</div>
                        <div>{transcriptionResult1.word_count}</div>
                      </div>
                      <div>
                        <div className="font-medium text-slate-600">Confidence</div>
                        <div>{(transcriptionResult1.confidence * 100).toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="font-medium text-slate-600">Size</div>
                        <div>{formatFileSize(audioSize1)}</div>
                      </div>
                    </div>

                    <div className="flex-1">
                      <h3 className="font-medium text-slate-700 mb-2 text-sm">Transcript:</h3>
                      <div className="p-3 bg-white border rounded-lg h-full overflow-y-auto text-sm text-black whitespace-pre-wrap">
                        {transcript1 || 'No transcript available'}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-500">
                    <div className="text-center">
                      <div className="text-4xl mb-2">🎯</div>
                      <p className="text-sm">Transcription results will appear here</p>
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>
          </div>

          {/* Session 1 - AI Processing */}
          <div className="space-y-4">
            <Card className="min-h-[600px]">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  🤖 AI Processing #1
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col h-full">
                
                <div className="space-y-2 mb-6">
                  <label className="text-sm font-medium text-slate-700">AI Model:</label>
                  <select 
                    value={aiModel1}
                    onChange={(e) => setAiModel1(e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm"
                  >
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  </select>
                </div>

                <div className="space-y-2 flex-1">
                  <label className="text-sm font-medium text-slate-700">Instruction Prompt:</label>
                  <textarea
                    value={instructionPrompt1}
                    onChange={(e) => setInstructionPrompt1(e.target.value)}
                    className="w-full p-2 border rounded-lg text-xs text-black min-h-[400px] resize-none"
                    placeholder="Enter AI instruction prompt..."
                  />
                </div>

                <div className="mt-6">
                  <Button 
                    onClick={handleProcessWithAI1}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    disabled={isProcessingAI1 || !transcript1.trim()}
                    size="sm"
                  >
                    {isProcessingAI1 ? (
                      <div className="flex items-center gap-2">
                <Loading variant="primary" size="sm" />
                        <span>Processing...</span>
              </div>
                    ) : (
                      '🚀 Process with AI'
                    )}
                  </Button>

                  {prontuarioResult1 && (
                    <Button 
                      onClick={handleClearAIResults1}
                      variant="outline"
                      className="w-full mt-2"
                      size="sm"
                    >
                      🗑️ Clear AI Results
                    </Button>
                  )}
                </div>

          </CardContent>
        </Card>
          </div>

          {/* Session 1 - Prontuario Results */}
          <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
                  📋 Prontuário Result #1
            </CardTitle>
          </CardHeader>
              <CardContent>
                <div className="p-3 bg-white border rounded-lg h-[500px] overflow-y-auto text-xs text-black whitespace-pre-wrap">
                  {prontuarioResult1 || 'Processed prontuário will appear here...'}
                </div>
              </CardContent>
            </Card>
          </div>

        </div>

        {/* ROW 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          
          {/* Session 2 - Audio Input */}
          <div className="space-y-4">
            <Card className="min-h-[600px]">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  🎤 Audio Input #2 - ASSEMBLYAI
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col h-full">
                
                <div className="space-y-2 mb-6">
                  <label className="text-sm font-medium text-slate-700">AssemblyAI Model:</label>
                  <select 
                    value={transcriptionModel2}
                    onChange={(e) => setTranscriptionModel2(e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm"
                  >
                    <option value="best">Best (Highest Accuracy)</option>
                    <option value="nano">Nano (Faster)</option>
                  </select>
                </div>

                <div className="space-y-4 mb-6">
                  <h3 className="font-medium text-slate-700 border-b pb-2">📁 Import File</h3>
                  
            <input
                    ref={fileInputRef2}
              type="file"
              accept="audio/*"
                    onChange={handleFileChange2}
              className="hidden"
            />
            
            <div 
                    onClick={handleFileSelect2}
              className={`
                      border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors text-sm
                      ${selectedFile2 
                  ? 'border-green-300 bg-green-50' 
                  : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
                }
              `}
            >
                    {selectedFile2 ? (
                <div>
                        <div className="text-green-600 mb-1">✅ Selected</div>
                        <div className="font-medium text-xs">{selectedFile2.name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatFileSize(selectedFile2.size)}
                  </div>
                </div>
              ) : (
                <div>
                        <div className="text-gray-400 mb-1">📁</div>
                        <div className="font-medium text-gray-700 text-xs">Click to select</div>
                        <div className="text-xs text-gray-500 mt-1">MP3, WAV, M4A...</div>
                </div>
              )}
            </div>

                  <div className="flex gap-2">
                    {selectedFile2 && (
                      <>
              <Button 
                          onClick={handleUploadFile2}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
                          disabled={isTranscribing2}
                          size="sm"
                        >
                          🚀 Upload
              </Button>
                <Button 
                          onClick={() => setSelectedFile2(null)}
                          variant="outline"
                          disabled={isTranscribing2}
                          size="sm"
                        >
                          ❌
                </Button>
                      </>
                    )}
                  </div>
                </div>

                {isTranscribing2 && (
                  <div className="flex items-center gap-2 text-blue-600 text-sm p-3 bg-blue-50 rounded-lg mb-6">
                    <Loading variant="primary" size="sm" />
                    <span>Processing audio...</span>
                  </div>
                )}

                <div className="mt-auto">
                  {transcriptionResult2 && (
                <Button 
                      onClick={handleClearResults2}
                  variant="outline"
                      className="w-full"
                      size="sm"
                >
                      🗑️ Clear All Results
                </Button>
              )}
            </div>

          </CardContent>
        </Card>
        </div>

          {/* Session 2 - Transcription Results */}
          <div className="space-y-4">
            <Card className="min-h-[600px]">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                  📝 Transcription Results #2
              </CardTitle>
            </CardHeader>
              <CardContent className="flex flex-col h-full">
              
                {transcriptionResult2 ? (
                  <>
                    <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-lg text-xs mb-4">
                <div>
                  <div className="font-medium text-slate-600">Duration</div>
                        <div>{transcriptionResult2.duration.toFixed(1)}s</div>
                </div>
                <div>
                  <div className="font-medium text-slate-600">Words</div>
                        <div>{transcriptionResult2.word_count}</div>
                </div>
                <div>
                  <div className="font-medium text-slate-600">Confidence</div>
                        <div>{(transcriptionResult2.confidence * 100).toFixed(1)}%</div>
                </div>
                <div>
                        <div className="font-medium text-slate-600">Size</div>
                        <div>{formatFileSize(audioSize2)}</div>
                </div>
              </div>

                    <div className="flex-1">
                                            <h3 className="font-medium text-slate-700 mb-2 text-sm">Transcript:</h3>
                      <div className="p-3 bg-white border rounded-lg h-full overflow-y-auto text-sm text-black whitespace-pre-wrap">
                        {transcript2 || 'No transcript available'}
                </div>
              </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-500">
                    <div className="text-center">
                      <div className="text-4xl mb-2">🎯</div>
                      <p className="text-sm">Transcription results will appear here</p>
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>
                        </div>

          {/* Session 2 - AI Processing */}
          <div className="space-y-4">
            <Card className="min-h-[600px]">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  🤖 AI Processing #2
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col h-full">
                
                <div className="space-y-2 mb-6">
                  <label className="text-sm font-medium text-slate-700">AI Model:</label>
                  <select 
                    value={aiModel2}
                    onChange={(e) => setAiModel2(e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm"
                  >
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  </select>
                      </div>

                <div className="space-y-2 flex-1">
                  <label className="text-sm font-medium text-slate-700">Instruction Prompt:</label>
                                      <textarea
                      value={instructionPrompt2}
                      onChange={(e) => setInstructionPrompt2(e.target.value)}
                      className="w-full p-2 border rounded-lg text-xs text-black min-h-[400px] resize-none"
                      placeholder="Enter AI instruction prompt..."
                    />
                  </div>

                <div className="mt-6">
                  <Button 
                    onClick={handleProcessWithAI2}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    disabled={isProcessingAI2 || !transcript2.trim()}
                    size="sm"
                  >
                    {isProcessingAI2 ? (
                      <div className="flex items-center gap-2">
                        <Loading variant="primary" size="sm" />
                        <span>Processing...</span>
                </div>
                    ) : (
                      '🚀 Process with AI'
                    )}
                  </Button>

                  {prontuarioResult2 && (
                    <Button 
                      onClick={handleClearAIResults2}
                      variant="outline"
                      className="w-full mt-2"
                      size="sm"
                    >
                      🗑️ Clear AI Results
                    </Button>
                  )}
                </div>

            </CardContent>
          </Card>
          </div>

          {/* Session 2 - Prontuario Results */}
          <div className="space-y-4">
        <Card>
          <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  📋 Prontuário Result #2
                </CardTitle>
          </CardHeader>
          <CardContent>
                <div className="p-3 bg-white border rounded-lg h-[500px] overflow-y-auto text-xs text-black whitespace-pre-wrap">
                  {prontuarioResult2 || 'Processed prontuário will appear here...'}
                </div>
              </CardContent>
            </Card>
          </div>

        </div>

        {/* ROW 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          
          {/* Session 3 - Audio Input */}
          <div className="space-y-4">
            <Card className="min-h-[600px]">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  🎤 Audio Input #3 - OPENAI WHISPER
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col h-full">
                
                <div className="space-y-2 mb-6">
                  <label className="text-sm font-medium text-slate-700">OpenAI Whisper Model:</label>
                  <select 
                    value={transcriptionModel3}
                    onChange={(e) => setTranscriptionModel3(e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm"
                  >
                    <option value="whisper-1">Whisper Large v3 (Best Quality)</option>
                  </select>
                </div>

                <div className="space-y-4 mb-6">
                  <h3 className="font-medium text-slate-700 border-b pb-2">📁 Import File</h3>
                  
                  <input
                    ref={fileInputRef3}
                    type="file"
                    accept="audio/*"
                    onChange={handleFileChange3}
                    className="hidden"
                  />
                  
                  <div 
                    onClick={handleFileSelect3}
                    className={`
                      border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors text-sm
                      ${selectedFile3 
                        ? 'border-green-300 bg-green-50' 
                        : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
                      }
                    `}
                  >
                    {selectedFile3 ? (
              <div>
                        <div className="text-green-600 mb-1">✅ Selected</div>
                        <div className="font-medium text-xs">{selectedFile3.name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatFileSize(selectedFile3.size)}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-gray-400 mb-1">📁</div>
                        <div className="font-medium text-gray-700 text-xs">Click to select</div>
                        <div className="text-xs text-gray-500 mt-1">MP3, WAV, M4A...</div>
                      </div>
                    )}
              </div>
              
                  <div className="flex gap-2">
                    {selectedFile3 && (
                      <>
                        <Button 
                          onClick={handleUploadFile3}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
                          disabled={isTranscribing3}
                          size="sm"
                        >
                          🚀 Upload
                        </Button>
                        <Button 
                          onClick={() => setSelectedFile3(null)}
                          variant="outline"
                          disabled={isTranscribing3}
                          size="sm"
                        >
                          ❌
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {isTranscribing3 && (
                  <div className="flex items-center gap-2 text-blue-600 text-sm p-3 bg-blue-50 rounded-lg mb-6">
                    <Loading variant="primary" size="sm" />
                    <span>Processing audio...</span>
                  </div>
                )}

                <div className="mt-auto">
                  {transcriptionResult3 && (
                    <Button 
                      onClick={handleClearResults3}
                      variant="outline"
                      className="w-full"
                      size="sm"
                    >
                      🗑️ Clear All Results
                    </Button>
                  )}
                </div>

              </CardContent>
            </Card>
          </div>

          {/* Session 3 - Transcription Results */}
          <div className="space-y-4">
            <Card className="min-h-[600px]">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  📝 Transcription Results #3
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col h-full">
                
                {transcriptionResult3 ? (
                  <>
                    <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-lg text-xs mb-4">
              <div>
                        <div className="font-medium text-slate-600">Duration</div>
                        <div>{transcriptionResult3.duration.toFixed(1)}s</div>
                      </div>
                      <div>
                        <div className="font-medium text-slate-600">Words</div>
                        <div>{transcriptionResult3.word_count}</div>
                      </div>
                      <div>
                        <div className="font-medium text-slate-600">Confidence</div>
                        <div>{(transcriptionResult3.confidence * 100).toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="font-medium text-slate-600">Size</div>
                        <div>{formatFileSize(audioSize3)}</div>
                      </div>
              </div>
              
                    <div className="flex-1">
                                            <h3 className="font-medium text-slate-700 mb-2 text-sm">Transcript:</h3>
                      <div className="p-3 bg-white border rounded-lg h-full overflow-y-auto text-sm text-black whitespace-pre-wrap">
                        {transcript3 || 'No transcript available'}
            </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-500">
                    <div className="text-center">
                      <div className="text-4xl mb-2">🎯</div>
                      <p className="text-sm">Transcription results will appear here</p>
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>
            </div>
            
          {/* Session 3 - AI Processing */}
          <div className="space-y-4">
            <Card className="min-h-[600px]">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  🤖 AI Processing #3
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col h-full">
                
                <div className="space-y-2 mb-6">
                  <label className="text-sm font-medium text-slate-700">AI Model:</label>
                  <select 
                    value={aiModel3}
                    onChange={(e) => setAiModel3(e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm"
                  >
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  </select>
            </div>

                <div className="space-y-2 flex-1">
                  <label className="text-sm font-medium text-slate-700">Instruction Prompt:</label>
                                      <textarea
                      value={instructionPrompt3}
                      onChange={(e) => setInstructionPrompt3(e.target.value)}
                      className="w-full p-2 border rounded-lg text-xs text-black min-h-[400px] resize-none"
                      placeholder="Enter AI instruction prompt..."
                    />
                </div>

                <div className="mt-6">
                  <Button 
                    onClick={handleProcessWithAI3}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    disabled={isProcessingAI3 || !transcript3.trim()}
                    size="sm"
                  >
                    {isProcessingAI3 ? (
                      <div className="flex items-center gap-2">
                        <Loading variant="primary" size="sm" />
                        <span>Processing...</span>
                      </div>
                    ) : (
                      '🚀 Process with AI'
                    )}
                  </Button>

                  {prontuarioResult3 && (
                    <Button 
                      onClick={handleClearAIResults3}
                      variant="outline"
                      className="w-full mt-2"
                      size="sm"
                    >
                      🗑️ Clear AI Results
                    </Button>
                  )}
                </div>

          </CardContent>
        </Card>
          </div>

          {/* Session 3 - Prontuario Results */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  📋 Prontuário Result #3
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-3 bg-white border rounded-lg h-[500px] overflow-y-auto text-xs text-black whitespace-pre-wrap">
                  {prontuarioResult3 || 'Processed prontuário will appear here...'}
                </div>
              </CardContent>
            </Card>
          </div>

        </div>

      </div>
    </div>
  );
}