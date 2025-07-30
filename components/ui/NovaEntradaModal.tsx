'use client';

import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Alert } from './Alert';
import { Input } from './Input';
import { useUser } from '../../hooks/useUser';
import { Profile } from '../../types/database';

interface NovaEntradaModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { 
    category: string; 
    content: string; 
  }) => void;
  onProcessingComplete?: (result: any) => void;
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
  onProcessingComplete,
  defaultCategory
}) => {
  const { isDoctor, isPatient } = useUser();
  
  const [selectedCategory, setSelectedCategory] = useState<string>(defaultCategory || '');
  const [content, setContent] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);

  // Doctor-specific states
  const [pin, setPin] = useState<string>('');
  const [patient, setPatient] = useState<Profile | null>(null);
  const [searchingPatient, setSearchingPatient] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string>('');

  // Search for patient by PIN (for doctors)
  const handlePatientSearch = async () => {
    if (!pin || pin.trim().length !== 6) {
      setPinError('Por favor, digite um PIN válido de 6 dígitos');
      return;
    }

    setSearchingPatient(true);
    setPinError('');

    try {
      const response = await fetch('/api/doctor/patient-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin: pin.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar paciente');
      }

      console.log('🔍 [NovaEntrada] Patient found:', data.patient);
      setPatient(data.patient);
      setPinError('');
    } catch (error) {
      console.error('Error searching patient:', error);
      setPinError(error instanceof Error ? error.message : 'Erro ao buscar paciente. Tente novamente.');
      setPatient(null);
    } finally {
      setSearchingPatient(false);
    }
  };

  const handlePinKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePatientSearch();
    }
  };

  const clearPatientSearch = () => {
    setPin('');
    setPatient(null);
    setPinError('');
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!content.trim()) {
      setError('Por favor, insira o conteúdo médico para processar.');
      return;
    }

    // For doctors, require patient selection
    if (isDoctor && !patient) {
      setError('Por favor, selecione um paciente primeiro inserindo o PIN.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccess(false);

    let rawEntryId: string | null = null;
    
    try {
      // Multi-step processing feedback
      setProcessingStep('🔍 Analisando texto médico...');
      
      // Save raw text first
      const rawTextData = {
        raw_text: content.trim(),
        category: selectedCategory || null,
        patient_id: isDoctor && patient ? patient.id : undefined
      };

      console.log('🔍 Attempting to save raw text:', rawTextData);

      try {
        const rawTextResponse = await fetch('/api/raw-medical-entries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(rawTextData)
        });

        console.log('📡 Raw text API response status:', rawTextResponse.status);

        if (rawTextResponse.ok) {
          const rawData = await rawTextResponse.json();
          rawEntryId = rawData.rawEntry?.id;
          console.log('✅ Raw text saved successfully with ID:', rawEntryId);
        } else {
          const errorData = await rawTextResponse.json().catch(() => ({}));
          console.error('❌ Failed to save raw text:', rawTextResponse.status, errorData);
        }
      } catch (rawTextError) {
        console.error('❌ Error saving raw text:', rawTextError);
      }

      // Prepare request body for web app API
      const patientId = isDoctor && patient ? patient.id : undefined;
      console.log('🔍 [NovaEntrada] Doctor mode:', isDoctor, 'Patient:', patient, 'Patient ID:', patientId);
      
      const requestBody = {
        text: content.trim(),
        category: selectedCategory || null, // null for auto-detection
        submitDirectly: true,
        patientId: patientId // Include patientId for doctors
      };

      // Add slight delay to show analysis step
      await new Promise(resolve => setTimeout(resolve, 800));
      setProcessingStep('🤖 Processando com IA multi-agente...');

      const response = await fetch('/api/ai/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        // Try to get error details from response
        const errorResult = await response.json().catch(() => ({}));
        throw new Error(errorResult.error || `Erro HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Full success - AI extraction + database storage
        setProcessingStep('✅ Dados médicos processados e armazenados!');
        setSuccess(true);
        
        const entriesCreated = result.data?.entries_created || 0;
        const categories = result.data?.categories || [];
        
        if (entriesCreated > 0) {
          const patientName = isDoctor && patient ? ` para ${patient.full_name}` : '';
          setProcessingStep(`✅ ${entriesCreated} entrada(s) médica(s) criada(s)${patientName} em: ${categories.join(', ')}`);
        }
        
        // Update raw entry with success status
        if (rawEntryId) {
          await fetch('/api/raw-medical-entries', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: rawEntryId,
              ai_processed: true,
              processing_success: true,
              entries_created: entriesCreated
            })
          });
        }

        // Call the original onSubmit callback for compatibility
        onSubmit({ 
          category: selectedCategory || 'auto-detected', 
          content: content.trim()
        });
        
        // Wait a moment to show the final step, then close modal and show results
        setTimeout(() => {
          setIsProcessing(false);
          resetForm();
          onClose();
          // Call the processing complete callback to show results modal
          if (onProcessingComplete) {
            onProcessingComplete(result);
          }
        }, 2000);
        
      } else if (result.data && (result.data.classification || result.data.extractions)) {
        // Partial success - AI extraction worked, but database storage failed
        setProcessingStep('🤖 IA processou com sucesso! (Dados não salvos temporariamente)');
        setSuccess(true);
        
        const classification = result.data.classification;
        const extractions = result.data.extractions;
        
        if (classification) {
          const categoriesFound = classification.categories?.map((cat: any) => 
            cat.category.replace('allergies', 'Alergias')
                       .replace('medications', 'Medicamentos')
                       .replace('diseases', 'Doenças')
                       .replace('exams', 'Exames')
                       .replace('consultations', 'Consultas')
          ) || [];
          
          setProcessingStep(`🎯 IA identificou: ${categoriesFound.join(', ')} (Confiança: ${Math.round(classification.overall_confidence * 100)}%)`);
        }
        
        // Show what was extracted
        if (extractions) {
          const extractedItems = Object.keys(extractions).reduce((total, category) => {
            return total + (extractions[category]?.items?.length || 0);
          }, 0);
          
          if (extractedItems > 0) {
            setTimeout(() => {
              setProcessingStep(`✨ ${extractedItems} item(s) médico(s) extraído(s) pela IA com sucesso!`);
            }, 1000);
          }
        }
        
        // Update raw entry with partial success status
        if (rawEntryId) {
          await fetch('/api/raw-medical-entries', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: rawEntryId,
              ai_processed: true,
              processing_success: false, // Partial success
              entries_created: 0 // No entries were created in database
            })
          });
        }

        // Call the original onSubmit callback for compatibility
        onSubmit({ 
          category: selectedCategory || 'auto-detected', 
          content: content.trim()
        });
        
        // Wait a moment to show the final step, then close modal and show results
        setTimeout(() => {
          setIsProcessing(false);
          resetForm();
          onClose();
          // Call the processing complete callback to show results modal
          if (onProcessingComplete) {
            onProcessingComplete(result);
          }
        }, 2000);
        
      } else {
        throw new Error(result.error || 'Falha no processamento da IA');
      }

    } catch (error) {
      console.error('Error processing medical entry:', error);
      
      let errorMessage = 'Erro inesperado ao processar entrada médica';
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage = '❌ Não foi possível conectar ao processador de IA. Verifique se o serviço está rodando em localhost:8000';
        } else {
          errorMessage = error.message;
        }
      }
      
      // Update raw entry with error status
      if (rawEntryId) {
        try {
          await fetch('/api/raw-medical-entries', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: rawEntryId,
              ai_processed: true,
              processing_success: false,
              processing_error: errorMessage,
              entries_created: 0
            })
          });
        } catch (updateError) {
          console.error('Error updating raw entry with error status:', updateError);
        }
      }
      
      setError(errorMessage);
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
    
    // Reset doctor-specific fields
    if (isDoctor) {
      setPin('');
      setPatient(null);
      setPinError('');
    }
  };

  const handleClose = () => {
    if (isProcessing || searchingPatient) return; // Don't allow closing while processing
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
        {/* Doctor Patient Search Section */}
        {isDoctor && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">
              🔍 Buscar Paciente por PIN
            </h3>
            
            {!patient ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Input
                    type="text"
                    value={pin}
                    onChange={(e) => {
                      // Only allow numbers and limit to 6 digits
                      const value = e.target.value.replace(/\D/g, '').substring(0, 6);
                      setPin(value);
                      if (pinError) setPinError(''); // Clear error when user types
                    }}
                    placeholder="123456"
                    maxLength={6}
                    className="w-48 text-center text-lg font-mono"
                    onKeyDown={handlePinKeyDown}
                    disabled={searchingPatient}
                  />
                  
                  <Button 
                    variant="primary" 
                    onClick={handlePatientSearch}
                    loading={searchingPatient}
                    disabled={pin.length !== 6}
                    className="w-32"
                  >
                    {searchingPatient ? 'Buscando...' : 'Buscar'}
                  </Button>
                </div>
                
                {pinError && (
                  <Alert variant="error" className="text-sm">
                    {pinError}
                  </Alert>
                )}
                
                <p className="text-sm text-blue-600">
                  💡 Digite o PIN de 6 dígitos do paciente e pressione Enter ou clique em Buscar
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-green-800">
                        ✅ Paciente Encontrado
                      </h4>
                                             <p className="text-green-700">
                         <strong>Nome:</strong> {patient.full_name}
                       </p>
                      <p className="text-green-700">
                        <strong>CPF:</strong> {patient.cpf}
                      </p>
                      <p className="text-green-700">
                        <strong>PIN:</strong> {patient.pin}
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={clearPatientSearch}
                      disabled={isProcessing}
                      className="text-sm"
                    >
                      Buscar Outro
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Content Input - only show if patient is selected (for doctors) or if user is patient */}
        {(isPatient || (isDoctor && patient)) && (
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-3">
              {isDoctor ? `Descreva as informações médicas para ${patient?.full_name}:` : 'Descreva as informações:'}
            </h3>
            
            <div className="space-y-4">
              {/* Category Selection */}
              {!defaultCategory && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Categoria (Recomendado: deixar em "Auto-detecção"):
                  </label>
                  <select 
                    value={selectedCategory} 
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50"
                    disabled={isProcessing}
                  >
                    <option value="">🤖 Auto-detecção com IA (Recomendado)</option>
                    <option disabled>── Ou escolha manualmente ──</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-blue-600 mt-1">
                    💡 Nossa IA identifica automaticamente o tipo de informação médica
                  </p>
                </div>
              )}

              {/* Textarea */}
              <div className="relative">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={
                    isDoctor 
                      ? "Digite aqui as informações médicas do paciente que você gostaria de adicionar..."
                      : "Digite aqui as informações médicas que você gostaria de adicionar..."
                  }
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
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-slate-200">
          <Button
            variant="outline"
            size="lg"
            onClick={handleClose}
            className="flex-1"
            disabled={isProcessing || searchingPatient}
          >
            {(isProcessing || searchingPatient) ? 'Processando...' : 'Cancelar'}
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={handleSubmit}
            disabled={
              isProcessing || 
              searchingPatient || 
              !content.trim() || 
              (isDoctor && !patient)
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