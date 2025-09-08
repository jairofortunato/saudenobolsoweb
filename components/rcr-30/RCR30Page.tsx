'use client';

/**
 * =====================================
 * RCR-30 MAIN PAGE COMPONENT
 * =====================================
 * 
 * Complete RCR-30 interface integrating all components into a cohesive workflow.
 * Handles the entire appointment lifecycle from recording to final prontuário.
 * 
 * WORKFLOW:
 * 1. Patient selection and consultation setup
 * 2. Audio recording with 30s chunking (with wake lock to prevent phone sleep)
 * 3. IndexedDB storage for resilience
 * 4. Upload to Supabase Storage
 * 5. Backend processing and status polling
 * 6. Final prontuário display
 */

// Wake Lock API - Using native DOM types

import { useState, useCallback, useEffect, useRef } from 'react';
import { useResilientRecording } from './ResilientRecordingManager';
import { useUploadManager } from './UploadManager';
import { useStatusPolling } from './StatusPollingManager';
import { indexedDBManager } from './IndexedDBManager';
import { RecordingControls } from './RecordingControls';
import { UploadProgress } from './UploadProgress';
import { ProcessingStatus } from './ProcessingStatus';
import { SimpleProntuario } from './SimpleProntuario';
import { ErrorRecovery } from './ErrorRecovery';
import { ConsultationTemplateSelector } from '../doctor/ConsultationTemplateSelector';
import { PatientSearchAndDisplay } from './PatientSearchAndDisplay';
import { PatientDisplay } from './PatientDisplay';
import { 
  RCR30Error, 
  DEFAULT_RCR30_CONFIG 
} from '../../types/rcr30';

// Workflow states
type WorkflowState = 
  | 'setup'           // Patient selection and setup
  | 'recording'       // Active recording
  | 'processing_upload' // Uploading and processing
  | 'completed'       // Prontuário ready
  | 'error';          // Error state

// Patient interface (simplified for demo)
interface Patient {
  id: string;
  name: string;
  cpf?: string;
  pin?: string;
}

// Extended patient interface matching PatientSearchAndDisplay
interface PatientProfile {
  id: string;
  name: string;
  cpf: string;
  pin: string;
  isExisting: boolean;
}

// Consultation template interface - matching the full template structure
interface ConsultationTemplate {
  id: string;
  name: string;
  specialty: string;
  template_structure: {
    sections: Array<{
      name: string;
      required: boolean;
    }>;
  };
  ai_prompt_template: string;
  is_default: boolean;
  is_public: boolean;
  created_by?: string;
}

export function RCR30Page() {
  // Workflow state
  const [workflowState, setWorkflowState] = useState<WorkflowState>('setup');
  const [currentAppointmentId, setCurrentAppointmentId] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedPatientProfile, setSelectedPatientProfile] = useState<PatientProfile | null>(null);
  const [patientMedicalData, setPatientMedicalData] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ConsultationTemplate | null>(null);
  const [error, setError] = useState<RCR30Error | null>(null);
  
  // Completed prontuario data
  const [completedProntuario, setCompletedProntuario] = useState<any | null>(null);
  
  // Track when backend has results ready (even if upload API is still running)
  const [backendResultsReady, setBackendResultsReady] = useState<boolean>(false);
  const [pendingResults, setPendingResults] = useState<{transcript?: string, prontuario?: any} | null>(null);

  // Wake Lock functionality for mobile devices
  const [wakeLock, setWakeLock] = useState<any | null>(null);
  const [wakeLockSupported, setWakeLockSupported] = useState<boolean>(false);

  // Handle errors - declared early so it can be used in hooks
  const handleError = useCallback((error: RCR30Error) => {
    console.error('RCR-30 Error:', error);
    setError(error);
    setWorkflowState('error');
  }, []);

  // Wake Lock functionality to prevent phone from sleeping during recording
  const requestWakeLock = useCallback(async () => {
    if (!wakeLockSupported || wakeLock) return;

    try {
      console.log('📱 [WAKE LOCK] Requesting wake lock to keep screen active during recording');
      
      // Safe access to wakeLock API
      const wakeLockAPI = (navigator as any).wakeLock;
      if (!wakeLockAPI || typeof wakeLockAPI.request !== 'function') {
        console.error('❌ [WAKE LOCK] Wake Lock API not available');
        return;
      }
      
      const newWakeLock = await wakeLockAPI.request('screen');
      setWakeLock(newWakeLock);
      
      // Listen for wake lock release (user manually turns off screen, etc.)
      if (newWakeLock && typeof newWakeLock.addEventListener === 'function') {
        newWakeLock.addEventListener('release', () => {
          console.log('📱 [WAKE LOCK] Wake lock was released');
          setWakeLock(null);
        });
      }
      
      console.log('✅ [WAKE LOCK] Wake lock acquired - screen will stay active');
    } catch (error) {
      console.error('❌ [WAKE LOCK] Failed to acquire wake lock:', error);
    }
  }, [wakeLockSupported, wakeLock]);

  const releaseWakeLock = useCallback(async () => {
    if (!wakeLock) return;

    try {
      console.log('📱 [WAKE LOCK] Releasing wake lock');
      
      // Safe release
      if (wakeLock && typeof wakeLock.release === 'function') {
        await wakeLock.release();
      }
      
      setWakeLock(null);
      console.log('✅ [WAKE LOCK] Wake lock released - screen can sleep normally');
    } catch (error) {
      console.error('❌ [WAKE LOCK] Failed to release wake lock:', error);
    }
  }, [wakeLock]);

  // Check wake lock support on component mount and handle visibility changes
  useEffect(() => {
    const supported = 'wakeLock' in navigator && 
      (navigator as any).wakeLock !== undefined &&
      typeof (navigator as any).wakeLock?.request === 'function';
    setWakeLockSupported(supported);
    
    if (supported) {
      console.log('✅ [WAKE LOCK] Wake Lock API is supported');
    } else {
      console.log('⚠️ [WAKE LOCK] Wake Lock API is not supported on this device/browser');
    }

    // Re-acquire wake lock when user returns to the app during recording
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && workflowState === 'recording' && supported && !wakeLock) {
        console.log('📱 [WAKE LOCK] App became visible during recording - re-acquiring wake lock');
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cleanup on unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock && typeof wakeLock.release === 'function') {
        wakeLock.release().catch(console.error);
      }
    };
  }, [wakeLock, workflowState, requestWakeLock]);

  // Handle patient selection and fetch medical data for existing patients
  const handlePatientSelection = useCallback(async (patient: PatientProfile | null) => {
    setSelectedPatientProfile(patient);
    setPatientMedicalData(null);
    
    // Also update legacy selectedPatient for backward compatibility
    if (patient) {
      setSelectedPatient({
        id: patient.id,
        name: patient.name,
        cpf: patient.cpf,
        pin: patient.pin
      });

      // If it's an existing patient, fetch their complete medical data
      if (patient.isExisting && patient.pin) {
        try {
          const response = await fetch('/api/doctor/patient-search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ pin: patient.pin }),
          });

          if (response.ok) {
            const data = await response.json();
            setPatientMedicalData(data.medicalData);
          }
        } catch (error) {
          console.error('Error fetching patient medical data:', error);
        }
      }
    } else {
      setSelectedPatient(null);
    }
  }, []);

  // Recording management
  const {
    recordingStatus,
    capabilities,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    reset: resetRecording
  } = useResilientRecording({
    onStatusChange: (status) => {
      console.log('Recording status:', status);
    },
    onRecordingComplete: handleRecordingComplete,
    onError: handleError
  });

  // Upload management
  const {
    uploadProgress,
    uploadBlob,
    retryUpload,
    cancelUpload
  } = useUploadManager({
    onProgressUpdate: (_, progress) => {
      console.log('Upload progress:', progress);
    },
    onUploadComplete: (result) => {
      console.log(`🚀 [UPLOAD COMPLETE] Upload result:`, {
        success: result.success,
        currentAppointmentId,
        appointmentId: result.appointmentId,
        status: (result as any)?.status,
        hasTranscript: !!(result as any)?.transcript,
        hasProntuario: !!(result as any)?.prontuario
      });
      
      if (result.success && currentAppointmentId) {
        // Check if we already have results from backend polling
        if (backendResultsReady && pendingResults) {
          console.log(`🚀 [UPLOAD COMPLETE] Using results from backend polling that completed during upload!`);
          console.log(`📄 [UPLOAD COMPLETE] Transcript length: ${pendingResults.transcript?.length || 0}`);
          console.log(`📋 [UPLOAD COMPLETE] Prontuário available: ${!!pendingResults.prontuario}`);
          
          // Use the results from backend polling
          if (pendingResults.prontuario) {
            setCompletedProntuario(pendingResults.prontuario);
          }
          setWorkflowState('completed');
          
          console.log(`✅ [UPLOAD COMPLETE] Backend results displayed immediately!`);
        } else {
          // Check if upload result already contains completed data (fallback)
          const uploadResult = result as any;
          if (uploadResult.status === 'prontuario_ready' && uploadResult.transcript && uploadResult.prontuario) {
            console.log(`🎉 [UPLOAD COMPLETE] Processing completed immediately! Displaying results without polling...`);
            console.log(`📄 [UPLOAD COMPLETE] Transcript length: ${uploadResult.transcript.length}`);
            console.log(`📋 [UPLOAD COMPLETE] Prontuário available: ${!!uploadResult.prontuario}`);
            
            // Set completed data immediately
            setCompletedProntuario(uploadResult.prontuario);
            setWorkflowState('completed');
            
            console.log(`✅ [UPLOAD COMPLETE] Upload API results displayed`);
          } else {
            console.log(`⏳ [UPLOAD COMPLETE] Results not ready yet, polling should continue...`);
            // Polling was already started when workflowState changed to processing_upload
          }
        }
      } else {
        console.warn(`⚠️  [UPLOAD COMPLETE] Not processing result:`, {
          success: result.success,
          hasAppointmentId: !!currentAppointmentId
        });
      }
    },
    onError: handleError
  });

  // Status polling
  const {
    currentStatus,
    startPolling,
    stopPolling,
    reset: resetPolling
  } = useStatusPolling({
    interval: DEFAULT_RCR30_CONFIG.pollingInterval
  });

  // Handle recording completion
  async function handleRecordingComplete(finalBlob: Blob) {
    try {
      if (!currentAppointmentId) {
        throw new Error('No appointment ID available');
      }

      console.log('Recording completed, starting upload process');
      
      // Store in IndexedDB first for resilience
      await indexedDBManager.storeAudioBlob(currentAppointmentId, finalBlob);
      
      // Start upload process
      setWorkflowState('processing_upload');
      
      // Upload the blob
      const duration = recordingStatus.duration;
      await uploadBlob(currentAppointmentId, finalBlob, duration);

    } catch (error) {
      console.error('Error handling recording completion:', error);
      handleError(error as RCR30Error);
    }
  }

  // Start new appointment
  const startNewAppointment = useCallback(async (patientName?: string) => {
    try {
      setError(null);
      
      // Create appointment via API
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patient_name: patientName || selectedPatientProfile?.name || selectedPatient?.name,
          patient_id: selectedPatientProfile?.isExisting ? selectedPatientProfile.id : null, // Link to existing patient if available
          language: 'pt-BR',
          template_id: selectedTemplate?.id // Include selected template
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create appointment: ${response.statusText}`);
      }

      const data = await response.json();
      setCurrentAppointmentId(data.appointmentId);
      
      console.log('Appointment created:', data.appointmentId);
      console.log('Template selected:', selectedTemplate?.name || 'No template');

      // Start recording
      setWorkflowState('recording');
      
      // Request wake lock to keep phone awake during recording
      await requestWakeLock();
      
      await startRecording();

    } catch (error) {
      handleError({
        type: 'network',
        code: 'APPOINTMENT_CREATION_FAILED',
        message: `Failed to start appointment: ${error instanceof Error ? error.message : 'Unknown error'}`,
        retryable: true
      });
    }
  }, [selectedPatient, selectedPatientProfile, selectedTemplate, startRecording, handleError]);

  // Stop recording and start processing
  const handleStopRecording = useCallback(async () => {
    try {
      await stopRecording();
      
      // Release wake lock when recording stops
      await releaseWakeLock();
      
      // handleRecordingComplete will be called automatically
    } catch (error) {
      handleError(error as RCR30Error);
    }
  }, [stopRecording, releaseWakeLock, handleError]);

  // Retry failed operations
  const handleRetry = useCallback(async () => {
    if (!error) return;

    setError(null);

    try {
      switch (error.type) {
        case 'recording':
          // Reset and try recording again
          resetRecording();
          setWorkflowState('setup');
          break;
          
        case 'upload':
          // Retry upload from IndexedDB
          if (currentAppointmentId) {
            setWorkflowState('processing_upload');
            await retryUpload(currentAppointmentId);
          }
          break;
          
        case 'network':
          // Retry the last operation
          if (workflowState === 'setup') {
            await startNewAppointment();
          }
          break;
          
        default:
          // Reset to setup for unknown errors
          setWorkflowState('setup');
          resetAll();
          break;
      }
    } catch (retryError) {
      handleError(retryError as RCR30Error);
    }
  }, [error, workflowState, currentAppointmentId, resetRecording, retryUpload, startNewAppointment, handleError]);

  // Reset all states
  const resetAll = useCallback(async () => {
    resetRecording();
    resetPolling();
    
    // Release wake lock if active
    await releaseWakeLock();
    
    setCurrentAppointmentId(null);
    setSelectedPatient(null);
    setSelectedPatientProfile(null);
    setPatientMedicalData(null);
    setSelectedTemplate(null);
    setError(null);
    setCompletedProntuario(null);
    setBackendResultsReady(false);
    setPendingResults(null);
    processedStatusRef.current = null; // Reset processed status tracking
    setWorkflowState('setup');
  }, [resetRecording, resetPolling, releaseWakeLock]);

  // Start polling when upload begins (don't wait for upload API to complete)
  useEffect(() => {
    if (workflowState === 'processing_upload' && currentAppointmentId) {
      console.log('🚀 [EARLY POLLING] Starting status polling immediately when upload begins for appointment:', currentAppointmentId);
      console.log('🕐 [EARLY POLLING] This allows us to detect backend completion even if upload API is still running');
      
      // Reset backend results state
      setBackendResultsReady(false);
      setPendingResults(null);
      
      // Start polling immediately
      startPolling(currentAppointmentId, 3000); // Poll every 3 seconds
    }
  }, [workflowState, currentAppointmentId, startPolling]);

  // Track if we've processed this status already to prevent loops
  const processedStatusRef = useRef<string | null>(null);

  // Handle status updates with proper loop prevention
  useEffect(() => {
    // Don't process if we're already in a final state
    if (workflowState === 'completed' || workflowState === 'error') {
      return;
    }

    // Don't process the same status twice
    const statusKey = `${currentStatus?.status}-${currentStatus?.id}`;
    if (processedStatusRef.current === statusKey) {
      return;
    }

    console.log('🔍 [STATUS EFFECT] Processing new status:', {
      status: currentStatus?.status,
      workflowState,
      hasTranscript: !!currentStatus?.transcript,
      hasProntuario: !!currentStatus?.prontuario
    });

    if (currentStatus?.status === 'prontuario_ready') {
      console.log('🎉 [STATUS UPDATE] Backend completed! Results are ready!');
      console.log('📄 [STATUS UPDATE] Transcript length:', currentStatus.transcript?.length || 0);
      console.log('📋 [STATUS UPDATE] Prontuário data:', currentStatus.prontuario ? 'Available' : 'Missing');
      
      // Mark this status as processed
      processedStatusRef.current = statusKey;
      
      // Stop polling immediately
      stopPolling();
      
      // Set all state in one batch
      setBackendResultsReady(true);
      setPendingResults({
        transcript: currentStatus.transcript,
        prontuario: currentStatus.prontuario
      });
      
      if (currentStatus.prontuario) {
        setCompletedProntuario(currentStatus.prontuario);
      }
      setWorkflowState('completed');
      
      console.log('✅ [STATUS UPDATE] Results set and workflow completed');
    } else if (currentStatus?.status === 'failed') {
      console.log('❌ [STATUS UPDATE] Processing failed');
      
      // Mark this status as processed
      processedStatusRef.current = statusKey;
      
      stopPolling();
      setWorkflowState('error');
      setError({
        type: 'processing',
        code: 'PROCESSING_FAILED',
        message: currentStatus.error || 'Processing failed',
        appointmentId: currentStatus.id,
        retryable: false
      });
    } else if (currentStatus) {
      console.log(`⏸️ [STATUS UPDATE] Status is ${currentStatus.status}, waiting...`);
      processedStatusRef.current = statusKey;
    }
  }, [currentStatus?.status, currentStatus?.id, workflowState]); // Remove stopPolling from dependencies

  // Current upload progress for display
  const currentUploadProgress = currentAppointmentId ? uploadProgress.get(currentAppointmentId) : null;

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
       
        {/* Main Content - Single Column */}
        <div className="max-w-4xl mx-auto">
          <div className="space-y-6">
            {/* Patient Search and Display Component - ALWAYS VISIBLE */}
            <PatientSearchAndDisplay 
              onPatientSelected={handlePatientSelection}
              disabled={workflowState === 'recording'}
              className=""
            />

           

            {/* Template Selection - ALWAYS VISIBLE */}
            <ConsultationTemplateSelector 
              onTemplateSelected={setSelectedTemplate}
              selectedTemplate={selectedTemplate}
              disabled={workflowState === 'recording'}
              className="mb-6"
            />

            {/* Recording Section - ALWAYS VISIBLE */}
            <div className="">
              <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
                Escutar consulta
              </h2>
              
              {/* Selected Info Summary */}
              {(selectedTemplate || selectedPatientProfile) && (
                <div className="">
                 
                  {selectedPatientProfile && (
                    <p className="text-sm text-blue-700 mt-1">
                      <strong>Paciente:</strong> {selectedPatientProfile.name} 
                      <span className="ml-1">
                        {selectedPatientProfile.isExisting ? '(Existente)' : '(Novo)'}
                      </span>
                    </p>
                  )}
                </div>
              )}

              {/* Recording Controls */}
              <RecordingControls
                recordingStatus={recordingStatus}
                onStart={() => {
                  if (selectedTemplate) {
                    startNewAppointment();
                  }
                }}
                onStop={handleStopRecording}
                onPause={pauseRecording}
                onResume={resumeRecording}
                disabled={!capabilities.supportsMediaRecorder || !selectedTemplate}
                showSetupState={workflowState === 'setup'}
                workflowState={workflowState}
              />
              
              {/* Wake Lock Status - Show during recording */}
              {workflowState === 'recording' && wakeLockSupported && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-center space-x-2">
                    {wakeLock ? (
                      <>
                        <span className="text-blue-600">📱</span>
                        <p className="text-sm text-blue-700 font-medium">
                          Tela mantida ativa para gravação longa
                        </p>
                      </>
                    ) : (
                      <>
                        <span className="text-yellow-600">⚠️</span>
                        <p className="text-sm text-yellow-700">
                          Wake lock não está ativo - tela pode desligar
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Validation Messages */}
              {!selectedTemplate && (
                <p className="text-sm text-red-600 mt-4 text-center">
                  ⚠️ Selecione um modelo de consulta antes de gravar
                </p>
              )}
              {!capabilities.supportsMediaRecorder && (
                <p className="text-sm text-red-600 mt-2 text-center">
                  ⚠️ Seu navegador não suporta gravação de áudio
                </p>
              )}
              {!wakeLockSupported && (
                <p className="text-sm text-amber-600 mt-2 text-center">
                  📱 Para gravações longas, mantenha a tela ativa manualmente
                </p>
              )}
            </div>

            {/* Upload Progress - Hide when prontuario is completed */}
            {currentUploadProgress && workflowState !== 'completed' && (
              <UploadProgress
                progress={currentUploadProgress}
                onCancel={() => currentAppointmentId && cancelUpload(currentAppointmentId)}
              />
            )}

            {/* Processing Status - Hide when prontuario is completed */}
            {(workflowState === 'processing_upload' || currentStatus) && workflowState !== 'completed' && (
              <ProcessingStatus currentStatus={currentStatus} />
            )}
            
            {/* Error Recovery */}
            {error && workflowState === 'error' && (
              <ErrorRecovery
                error={error}
                onRetry={handleRetry}
                onDismiss={() => {
                  setError(null);
                  if (currentStatus?.status === 'prontuario_ready') {
                    setWorkflowState('completed');
                  } else {
                    setWorkflowState('setup');
                  }
                }}
              />
            )}

            {/* Simple Prontuário Display */}
            {(completedProntuario || currentStatus?.prontuario) && workflowState === 'completed' && (
              <SimpleProntuario
                prontuario={completedProntuario || currentStatus?.prontuario}
                appointmentId={currentAppointmentId || undefined}
                patientId={selectedPatientProfile?.id || undefined}
                patientName={selectedPatientProfile?.name || selectedPatient?.name || undefined}
                templateId={selectedTemplate?.id || undefined}
                templateName={selectedTemplate?.name || undefined}
                specialty={selectedTemplate?.specialty || undefined}
                onSaved={(prontuarioId: string) => {
                  console.log('Prontuário saved with ID:', prontuarioId);
                }}
              />
            )}

            {/* Session Info - Show only during error phases */}
            {workflowState === 'error' && (
            <div className=" rounded-2xl shadow-lg border  p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Session Info</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="font-medium capitalize">{workflowState.replace('_', ' ')}</span>
                </div>
                {(selectedPatientProfile?.name || selectedPatient?.name) && (
                  <div className="flex justify-between">
                    <span>Paciente:</span>
                    <span className="font-medium">
                      {selectedPatientProfile?.name || selectedPatient?.name}
                      {selectedPatientProfile && (
                        <span className="text-xs text-gray-500 ml-1">
                          ({selectedPatientProfile.isExisting ? 'Existing' : 'New'})
                        </span>
                      )}
                    </span>
                  </div>
                )}
                {(selectedTemplate || currentStatus?.template) && (
                  <div className="flex justify-between">
                    <span>Template:</span>
                    <span className="font-medium">
                      {currentStatus?.template?.name || selectedTemplate?.name}
                      {(currentStatus?.template?.specialty || selectedTemplate?.specialty) && (
                        <span className="text-xs text-gray-500 ml-1">
                          ({currentStatus?.template?.specialty || selectedTemplate?.specialty})
                        </span>
                      )}
                    </span>
                  </div>
                )}
                {currentAppointmentId && (
                  <div className="flex justify-between">
                    <span>Consulta ID:</span>
                    <span className="font-mono text-xs">{currentAppointmentId.slice(-8)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Browser Suporte:</span>
                  <span className={`font-medium ${capabilities.supportsMediaRecorder ? 'text-green-600' : 'text-red-600'}`}>
                    {capabilities.supportsMediaRecorder ? '✅ Compatible' : '❌ Unsupported'}
                  </span>
                </div>
                {currentStatus && (
                  <div className="flex justify-between">
                    <span>AI Status:</span>
                    <span className="font-medium">{currentStatus.status}</span>
                  </div>
                )}
              </div>
              
              {/* Debug/Manual Check Button */}
              {currentAppointmentId && (
                <button
                  onClick={async () => {
                    // If we already have results from backend polling, show them immediately
                    if (backendResultsReady && pendingResults) {
                      console.log('🚀 [MANUAL CHECK] Using cached backend results!');
                      if (pendingResults.prontuario) {
                        setCompletedProntuario(pendingResults.prontuario);
                      }
                      setWorkflowState('completed');
                      return;
                    }
                    
                    console.log('🔍 [MANUAL CHECK] Checking status manually for appointment:', currentAppointmentId);
                    try {
                      const response = await fetch(`/api/appointments/${currentAppointmentId}/status`);
                      const data = await response.json();
                      console.log('📊 [MANUAL CHECK] Status response:', data);
                      if (data.status === 'prontuario_ready') {
                        console.log('🎉 [MANUAL CHECK] FOUND COMPLETED TRANSCRIPTION!');
                        console.log('📝 [MANUAL CHECK] Transcript:', data.transcript);
                        console.log('📋 [MANUAL CHECK] Prontuário:', data.prontuario);
                        
                        // Update UI state to show the results
                        setCompletedProntuario(data.prontuario);
                        setWorkflowState('completed');
                        
                        alert('🎉 Transcription completed! Results are now displayed below.');
                      } else {
                        alert(`Status: ${data.status}. ${data.message || 'Still processing...'}`);
                      }
                    } catch (error) {
                      console.error('❌ [MANUAL CHECK] Error:', error);
                      alert('Error checking status. Check console for details.');
                    }
                  }}
                  className={`w-full mt-4 py-2 text-sm text-white rounded-lg transition-all duration-300 ${
                    backendResultsReady 
                      ? 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 shadow-lg animate-pulse'
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  {backendResultsReady ? '🎉 Results Ready - Click to View!' : '🔍 Check Status & Show Results'}
                </button>
              )}
              
              <button
                onClick={() => resetAll()}
                className="w-full mt-4 py-2 text-sm text-gray-600 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors duration-200"
              >
                🔄 Começar nova consulta
              </button>
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}