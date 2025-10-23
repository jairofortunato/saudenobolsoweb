'use client';

/**
 * =====================================
 * EXAM IMAGE UPLOAD COMPONENT
 * =====================================
 *
 * Allows users to upload medical exam images after prontuário generation.
 * Images are processed with OpenAI Vision API to extract medical information
 * and then merged with the existing prontuário.
 *
 * WORKFLOW:
 * 1. User uploads exam image (blood tests, X-rays, prescriptions, etc.)
 * 2. Image preview is shown
 * 3. Image is sent to /api/ai/extract-image endpoint
 * 4. Extracted text is merged with existing prontuário via /api/ai/merge-prontuario
 * 5. Updated prontuário is returned and displayed
 */

import { useState, useCallback, useRef } from 'react';
import Image from 'next/image';

interface ExamImageUploadProps {
  currentProntuario: any; // Can be string or object
  appointmentId?: string;
  onProntuarioUpdated: (updatedProntuario: string) => void;
  disabled?: boolean;
}

interface ProcessingState {
  status: 'idle' | 'uploading' | 'extracting' | 'merging' | 'completed' | 'error';
  progress: number;
  message: string;
  error?: string;
}

export function ExamImageUpload({
  currentProntuario,
  appointmentId,
  onProntuarioUpdated,
  disabled = false
}: ExamImageUploadProps) {
  // Helper function to extract text from prontuario (can be string or object)
  const extractProntuarioText = useCallback((prontuario: any): string => {
    if (typeof prontuario === 'string') {
      return prontuario;
    }
    if (typeof prontuario === 'object' && prontuario !== null) {
      return prontuario.prontuario_text ||
             prontuario.content ||
             prontuario.text ||
             JSON.stringify(prontuario, null, 2);
    }
    return '';
  }, []);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>({
    status: 'idle',
    progress: 0,
    message: ''
  });
  const [extractedText, setExtractedText] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle image selection
  const handleImageSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setProcessingState({
        status: 'error',
        progress: 0,
        message: '',
        error: 'Por favor, selecione um arquivo de imagem válido'
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setProcessingState({
        status: 'error',
        progress: 0,
        message: '',
        error: 'Imagem muito grande. Tamanho máximo: 10MB'
      });
      return;
    }

    setSelectedImage(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Reset states
    setProcessingState({
      status: 'idle',
      progress: 0,
      message: ''
    });
    setExtractedText('');
  }, []);

  // Process image and merge with prontuário
  const handleProcessImage = useCallback(async () => {
    if (!selectedImage) return;

    try {
      // Step 1: Upload and extract text from image
      setProcessingState({
        status: 'uploading',
        progress: 10,
        message: 'Enviando imagem...'
      });

      const formData = new FormData();
      formData.append('image', selectedImage);
      if (appointmentId) {
        formData.append('appointment_id', appointmentId);
      }

      const extractResponse = await fetch('/api/ai/extract-image', {
        method: 'POST',
        body: formData,
      });

      if (!extractResponse.ok) {
        const errorData = await extractResponse.json();
        throw new Error(errorData.error || 'Falha ao processar imagem');
      }

      setProcessingState({
        status: 'extracting',
        progress: 50,
        message: 'Extraindo informações médicas...'
      });

      const extractData = await extractResponse.json();
      const extracted = extractData.extracted_text;
      setExtractedText(extracted);

      console.log('✅ [EXAM IMAGE] Extraction completed:', {
        length: extracted.length,
        preview: extracted.substring(0, 200)
      });

      // Step 2: Merge extracted text with existing prontuário
      setProcessingState({
        status: 'merging',
        progress: 75,
        message: 'Integrando informações ao prontuário...'
      });

      // Extract text from prontuario object
      const prontuarioText = extractProntuarioText(currentProntuario);

      console.log('📝 [EXAM IMAGE] Prontuario text extracted:', {
        inputType: typeof currentProntuario,
        textLength: prontuarioText.length,
        preview: prontuarioText.substring(0, 200)
      });

      const mergeResponse = await fetch('/api/ai/merge-prontuario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          existing_prontuario: prontuarioText,
          image_content: extracted,
          appointment_id: appointmentId
        }),
      });

      if (!mergeResponse.ok) {
        const errorData = await mergeResponse.json();
        throw new Error(errorData.error || 'Falha ao integrar informações');
      }

      const mergeData = await mergeResponse.json();
      const updatedProntuario = mergeData.merged_prontuario;

      console.log('✅ [EXAM IMAGE] Merge completed:', {
        originalLength: prontuarioText.length,
        updatedLength: updatedProntuario.length,
        changesSummary: mergeData.changes_summary
      });

      // Step 3: Notify parent component
      onProntuarioUpdated(updatedProntuario);

      setProcessingState({
        status: 'completed',
        progress: 100,
        message: 'Prontuário atualizado com sucesso!'
      });

      // Reset after 3 seconds
      setTimeout(() => {
        setSelectedImage(null);
        setImagePreview(null);
        setExtractedText('');
        setProcessingState({
          status: 'idle',
          progress: 0,
          message: ''
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 3000);

    } catch (error) {
      console.error('❌ [EXAM IMAGE] Processing error:', error);
      setProcessingState({
        status: 'error',
        progress: 0,
        message: '',
        error: error instanceof Error ? error.message : 'Erro desconhecido ao processar imagem'
      });
    }
  }, [selectedImage, currentProntuario, appointmentId, onProntuarioUpdated, extractProntuarioText]);

  // Clear selection
  const handleClear = useCallback(() => {
    setSelectedImage(null);
    setImagePreview(null);
    setExtractedText('');
    setProcessingState({
      status: 'idle',
      progress: 0,
      message: ''
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const isProcessing = processingState.status === 'uploading' ||
                       processingState.status === 'extracting' ||
                       processingState.status === 'merging';

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-800">
            📋 Adicionar Exame de Imagem
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Faça upload de exames médicos, resultados de laboratório, receitas ou documentos
          </p>
        </div>
      </div>

      {/* Image Selection */}
      <div className="space-y-4">
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            disabled={disabled || isProcessing}
            className="hidden"
            id="exam-image-input"
          />
          <label
            htmlFor="exam-image-input"
            className={`flex items-center justify-center w-full px-6 py-4 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
              disabled || isProcessing
                ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                : 'border-blue-300 bg-blue-50 hover:bg-blue-100 hover:border-blue-400'
            }`}
          >
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-blue-500"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-700 font-medium">
                Clique para selecionar uma imagem
              </p>
              <p className="mt-1 text-xs text-gray-500">
                PNG, JPG, JPEG até 10MB
              </p>
            </div>
          </label>
        </div>

        {/* Image Preview */}
        {imagePreview && (
          <div className="relative">
            <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
              <Image
                src={imagePreview}
                alt="Exam preview"
                fill
                className="object-contain"
              />
            </div>
            <button
              onClick={handleClear}
              disabled={isProcessing}
              className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Processing Status */}
        {processingState.status !== 'idle' && (
          <div className="space-y-2">
            {/* Progress Bar */}
            {isProcessing && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${processingState.progress}%` }}
                />
              </div>
            )}

            {/* Status Message */}
            <div className={`p-4 rounded-lg ${
              processingState.status === 'error' ? 'bg-red-50 border border-red-200' :
              processingState.status === 'completed' ? 'bg-green-50 border border-green-200' :
              'bg-blue-50 border border-blue-200'
            }`}>
              <p className={`text-sm font-medium ${
                processingState.status === 'error' ? 'text-red-800' :
                processingState.status === 'completed' ? 'text-green-800' :
                'text-blue-800'
              }`}>
                {processingState.status === 'error' ? '❌ ' :
                 processingState.status === 'completed' ? '✅ ' : '⏳ '}
                {processingState.error || processingState.message}
              </p>
            </div>
          </div>
        )}

        {/* Extracted Text Preview */}
        {extractedText && processingState.status !== 'completed' && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              📝 Informações Extraídas:
            </h4>
            <div className="text-sm text-gray-600 whitespace-pre-wrap max-h-40 overflow-y-auto">
              {extractedText}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {selectedImage && processingState.status !== 'completed' && (
          <div className="flex gap-3">
            <button
              onClick={handleProcessImage}
              disabled={disabled || isProcessing}
              className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all ${
                disabled || isProcessing
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600 shadow-md hover:shadow-lg'
              }`}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processando...
                </span>
              ) : (
                '🚀 Processar e Integrar ao Prontuário'
              )}
            </button>
            <button
              onClick={handleClear}
              disabled={isProcessing}
              className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>💡 Dica:</strong> Você pode adicionar múltiplas imagens.
          Cada imagem será processada e integrada ao prontuário automaticamente.
        </p>
      </div>
    </div>
  );
}
