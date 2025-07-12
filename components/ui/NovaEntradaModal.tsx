'use client';

import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Alert } from './Alert';

interface NovaEntradaModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { category: string; content: string }) => void;
  defaultCategory?: string;
}



const categories = [
  { id: 'medications', label: 'Medicamento', icon: '💊', color: 'text-blue-800' },
  { id: 'allergies', label: 'Alergia', icon: '⚠️', color: 'text-orange-800' },
  { id: 'exams', label: 'Exame', icon: '🔬', color: 'text-purple-800' },
  { id: 'diseases', label: 'Condição Médica', icon: '🩺', color: 'text-red-800' },
  { id: 'consultations', label: 'Consulta', icon: '👩‍⚕️', color: 'text-green-800' },
];

export const NovaEntradaModal: React.FC<NovaEntradaModalProps> = ({
  open,
  onClose,
  onSubmit,
  defaultCategory
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(defaultCategory || '');
  const [content, setContent] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);
  const [isInChatMode, setIsInChatMode] = useState<boolean>(false);
  const [aiMessage, setAiMessage] = useState<string>('');
  const [conversationHistory, setConversationHistory] = useState<string>('');

  const handleSubmit = async () => {
    if (!selectedCategory || !content.trim()) {
      setError('Por favor, selecione uma categoria e insira o conteúdo.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccess(false);

    try {
      setProcessingStep('🤖 Processando texto com IA...');
      
      // Build the full conversation text
      const fullConversationText = isInChatMode 
        ? `${conversationHistory}\n\nInformações adicionais: ${content.trim()}`
        : content.trim();
      
      // Call the AI processing endpoint
      const response = await fetch('/api/ai/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: fullConversationText,
          category: selectedCategory,
          submitDirectly: true // Submit directly to the medical endpoint
        })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setProcessingStep('✅ Entrada médica criada com sucesso!');
        setSuccess(true);
        
        // Call the original onSubmit callback for compatibility
        onSubmit({ category: selectedCategory, content: fullConversationText });
        
        // Reset form after a short delay
        setTimeout(() => {
          resetForm();
        }, 1500);
      } else {
        // Check if AI needs more information (handle both success=false and 400 status)
        if (result.needsMoreInfo && result.missingInfoMessage) {
          // Update conversation history with the current input
          const newHistory = isInChatMode 
            ? `${conversationHistory}\n\nInformações adicionais: ${content.trim()}`
            : `Informação inicial: ${content.trim()}`;
          
          setConversationHistory(newHistory);
          setIsInChatMode(true);
          setAiMessage(result.missingInfoMessage);
          setContent(''); // Clear input for next message
          setIsProcessing(false);
          setProcessingStep('');
          return;
        }
        
        throw new Error(result.error || 'Falha ao processar entrada médica');
      }

    } catch (error) {
      console.error('Error processing medical entry:', error);
      setError(error instanceof Error ? error.message : 'Erro inesperado ao processar entrada médica');
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const resetForm = () => {
    setSelectedCategory(defaultCategory || '');
    setContent('');
    setError('');
    setSuccess(false);
    setProcessingStep('');
    setIsProcessing(false);
    setIsInChatMode(false);
    setAiMessage('');
    setConversationHistory('');
  };

  const handleClose = () => {
    if (isProcessing) return; // Don't allow closing while processing
    resetForm();
    onClose();
  };

  const handleContinueConversation = () => {
    if (!content.trim()) {
      setError('Por favor, forneça mais informações.');
      return;
    }
    handleSubmit();
  };

  // Get the selected category info for display
  const selectedCategoryInfo = categories.find(cat => cat.id === selectedCategory);

  // Generate title for the modal header
  const modalTitle = defaultCategory && selectedCategoryInfo 
    ? `➕ Nova Entrada  ${selectedCategoryInfo.icon} ${selectedCategoryInfo.label}`
    : '➕ Nova Entrada';

  return (
    <Modal open={open} onClose={handleClose} size="lg" title={modalTitle}>
      <div className="space-y-6">
        {/* Description */}
      

        {/* Category Selection - Only show if no defaultCategory */}
        {!defaultCategory && (
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-3">
              Escolha a categoria:
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`
                    p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105
                    ${selectedCategory === category.id 
                      ? 'border-blue-500 bg-blue-50 shadow-md' 
                      : 'border-slate-200 hover:border-slate-300'
                    }
                  `}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">{category.icon}</div>
                    <div className={`text-sm font-medium ${category.color}`}>
                      {category.label}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}



        {/* Content Input */}
        <div>
          <h3 className="text-lg font-semibold text-slate-800 mb-3">
            {isInChatMode && aiMessage ? (
              <div className="whitespace-pre-line text-base">
                {aiMessage}
              </div>
            ) : (
              'Descreva as informações:'
            )}
          </h3>
          
          {/* Show conversation history when in chat mode */}
          {isInChatMode && conversationHistory && (
            <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-sm text-slate-600 mb-2">
                <strong>📝 Informações já fornecidas:</strong>
              </div>
              <div className="text-sm text-slate-700 whitespace-pre-line">
                {conversationHistory}
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            {/* Textarea with reduced height */}
            <div className="relative">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  isInChatMode 
                    ? "Forneça mais detalhes conforme solicitado acima..."
                    : "Digite aqui as informações médicas que você gostaria de adicionar..."
                }
                className="w-full p-4 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none h-32"
                disabled={isProcessing}
                maxLength={1000}
              />
              <div className="absolute bottom-2 right-2 text-xs text-slate-400">
                {content.length}/1000
              </div>
            </div>

            {/* AI Processing Info */}
            {isProcessing && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin h-5 w-5 border-2 border-blue-300 border-t-blue-600 rounded-full"></div>
                  <span className="text-blue-800 font-medium">{processingStep}</span>
                </div>
                <p className="text-sm text-blue-600 mt-2 text-center">
                  Nossa IA está organizando as informações médicas automaticamente...
                </p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <Alert variant="success" className="text-center">
                <span className="text-lg">🎉</span>
                <span className="ml-2">Entrada médica criada com sucesso!</span>
              </Alert>
            )}

            {/* Error Message */}
            {error && (
              <Alert variant="error">
                <span className="text-lg">⚠️</span>
                <span className="ml-2">{error}</span>
              </Alert>
            )}

            {/* Camera and Audio Buttons - Only show when not in chat mode */}
            {!isInChatMode && (
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1 max-w-[150px] h-12"
                  disabled={isProcessing}
                  onClick={() => {
                    // TODO: Implement camera functionality
                    console.log('Camera button clicked');
                  }}
                >
                  <span className="text-2xl mr-2">📷</span>
                  <span>Câmera</span>
                </Button>
                
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1 max-w-[150px] h-12"
                  disabled={isProcessing}
                  onClick={() => {
                    // TODO: Implement audio functionality
                    console.log('Audio button clicked');
                  }}
                >
                  <span className="text-2xl mr-2">🎤</span>
                  <span>Áudio</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-slate-200">
          <Button
            variant="outline"
            size="lg"
            onClick={handleClose}
            className="flex-1"
            disabled={isProcessing}
          >
            {isProcessing ? 'Processando...' : 'Cancelar'}
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={isInChatMode ? handleContinueConversation : handleSubmit}
            disabled={!selectedCategory || !content.trim() || isProcessing}
            className="flex-1"
          >
            {isProcessing ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Processando com IA...</span>
              </div>
            ) : isInChatMode ? (
              'Continuar Conversa'
            ) : (
              'Adicionar Entrada'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}; 