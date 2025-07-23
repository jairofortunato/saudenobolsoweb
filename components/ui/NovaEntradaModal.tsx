'use client';

import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Alert } from './Alert';

interface NovaEntradaModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { 
    category: string; 
    content: string; 
  }) => void;
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

  const handleSubmit = async () => {
    // Validate required fields
    if (!selectedCategory || !content.trim()) {
      setError('Por favor, selecione uma categoria e insira o conteúdo.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccess(false);

    try {
      setProcessingStep('🤖 Processando com IA...');
      
      // Call the AI processing endpoint
      const requestBody = {
        text: content.trim(),
        category: selectedCategory,
        submitDirectly: true
      };

      const response = await fetch('/api/ai/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setProcessingStep('✅ Entrada médica criada com sucesso!');
        setSuccess(true);
        
        // Call the original onSubmit callback for compatibility
        onSubmit({ 
          category: selectedCategory, 
          content: content.trim()
        });
        
        // Reset form after a delay to show results
        setTimeout(() => {
          resetForm();
        }, 2000);
      } else {
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
  };

  const handleClose = () => {
    if (isProcessing) return; // Don't allow closing while processing
    resetForm();
    onClose();
  };

  // Helper function to get category label
  const getCategoryLabel = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.label : categoryId;
  };

  // Get the selected category info for display
  const selectedCategoryInfo = categories.find(cat => cat.id === selectedCategory);

  // Generate title for the modal header
  const modalTitle = defaultCategory && selectedCategoryInfo 
    ? `➕ Nova Entrada  ${selectedCategoryInfo.icon} ${selectedCategoryInfo.label}`
    : '➕ Nova Entrada';

  return (
    <Modal open={open} onClose={handleClose} size="full" title={modalTitle}>
      <div className="space-y-6">
        {/* Content Input */}
        <div>
          <h3 className="text-lg font-semibold text-slate-800 mb-3">
            Descreva as informações:
          </h3>
          
          <div className="space-y-4">
            {/* Textarea */}
            <div className="relative">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Digite aqui as informações médicas que você gostaria de adicionar..."
                className="w-full p-4 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none h-48"
                disabled={isProcessing}
              />
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
            onClick={handleSubmit}
            disabled={
              isProcessing || 
              !selectedCategory || 
              !content.trim()
            }
            className="flex-1"
          >
            {isProcessing ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Processando com IA...</span>
              </div>
            ) : (
              'Adicionar Entrada'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}; 