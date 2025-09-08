'use client';

/**
 * =====================================
 * RCR-30 STATUS POLLING MANAGER
 * =====================================
 * 
 * Handles real-time appointment status tracking throughout the 6-state progression.
 * Polls the backend API at configurable intervals and provides status updates to UI.
 * 
 * STATUS PROGRESSION (PRD Compliant):
 * recording → uploading → processing → transcribed → prontuario_ready → [failed]
 * 
 * FEATURES:
 * - Configurable polling intervals (3s default)
 * - Automatic stop on final states (prontuario_ready, failed)
 * - Connection error handling with exponential backoff
 * - Status change notifications for UI updates
 * - Polling timeout protection (30 minutes max)
 * - Network resilience with retry logic
 * 
 * INTEGRATION:
 * - Works with /api/appointments/[id]/status API route
 * - Provides structured status updates to UI components
 * - Handles backend processing completion detection
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AppointmentData,
  StatusChangeCallback,
  RCR30Error,
  DEFAULT_RCR30_CONFIG
} from '../../types/rcr30';

// Polling state management
type PollingState = 'idle' | 'active' | 'stopped' | 'error';

// Final states that should stop polling
const FINAL_STATES: AppointmentData['status'][] = ['prontuario_ready', 'failed'];

// Error states that may recover with retry (for future use)
// const RECOVERABLE_STATES: AppointmentData['status'][] = ['processing', 'transcribed'];

interface PollingOptions {
  interval?: number;              // Polling interval in milliseconds
  maxDuration?: number;           // Maximum polling duration
  maxRetries?: number;            // Maximum consecutive failures
  backoffMultiplier?: number;     // Exponential backoff multiplier
}

export class StatusPollingManager {
  private appointmentId: string | null = null;
  private pollingState: PollingState = 'idle';
  private intervalId: NodeJS.Timeout | null = null;
  private currentStatus: AppointmentData | null = null;
  private callbacks: StatusChangeCallback[] = [];
  private options: Required<PollingOptions>;
  
  // Error handling
  private consecutiveErrors: number = 0;
  private totalPollingTime: number = 0;
  private pollingStartTime: number = 0;

  constructor(options?: PollingOptions) {
    this.options = {
      interval: options?.interval || DEFAULT_RCR30_CONFIG.pollingInterval,
      maxDuration: options?.maxDuration || DEFAULT_RCR30_CONFIG.maxPollingDuration,
      maxRetries: options?.maxRetries || 5,
      backoffMultiplier: options?.backoffMultiplier || 2
    };
  }

  /**
   * Start polling for appointment status
   */
  startPolling(appointmentId: string, customInterval?: number): void {
    console.log('🔄 [POLLING] Starting status polling for appointment:', appointmentId);
    if (this.pollingState === 'active') {
      console.warn('⚠️  [POLLING] Already active, stopping previous session');
      this.stopPolling();
    }

    this.appointmentId = appointmentId;
    this.pollingState = 'active';
    this.consecutiveErrors = 0;
    this.totalPollingTime = 0;
    this.pollingStartTime = Date.now();

    const interval = customInterval || this.options.interval;

    console.log(`🚀 [POLLING] Starting status polling for appointment ${appointmentId}`, {
      interval,
      maxDuration: this.options.maxDuration,
      hasCallbacks: this.callbacks.length > 0,
      callbacks: this.callbacks.length
    });

    // CRITICAL: Reset current status to null to ensure status changes are detected
    console.log(`🔄 [POLLING] Resetting currentStatus from ${this.currentStatus?.status} to null`);
    this.currentStatus = null;

    // Start immediate first poll
    console.log(`📡 [POLLING] Starting immediate first poll...`);
    this.pollStatus();

    // Set up recurring polling
    this.intervalId = setInterval(() => {
      console.log(`🔄 [POLLING] Recurring poll triggered`);
      this.pollStatus();
    }, interval);
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    // Prevent multiple stop calls
    if (this.pollingState === 'stopped') {
      console.log('ℹ️ [POLLING] Already stopped, ignoring stop request');
      return;
    }
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.pollingState = 'stopped';
    
    console.log(`🛑 [POLLING] Status polling stopped for appointment ${this.appointmentId}`, {
      totalPollingTime: this.totalPollingTime,
      finalStatus: this.currentStatus?.status
    });
  }

  /**
   * Get current appointment status
   */
  getCurrentStatus(): AppointmentData | null {
    return this.currentStatus ? { ...this.currentStatus } : null;
  }

  /**
   * Add status change callback
   */
  onStatusChange(callback: StatusChangeCallback): () => void {
    this.callbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get current polling state
   */
  getPollingState(): PollingState {
    return this.pollingState;
  }

  /**
   * Get polling statistics
   */
  getPollingStats(): {
    isActive: boolean;
    appointmentId: string | null;
    totalTime: number;
    consecutiveErrors: number;
    currentStatus: string | null;
  } {
    return {
      isActive: this.pollingState === 'active',
      appointmentId: this.appointmentId,
      totalTime: this.totalPollingTime,
      consecutiveErrors: this.consecutiveErrors,
      currentStatus: this.currentStatus?.status || null
    };
  }

  /**
   * Core polling logic
   */
  private async pollStatus(): Promise<void> {
    if (!this.appointmentId || this.pollingState !== 'active') {
      console.log('⏹️ [POLLING] Skipping poll - not active or no appointment ID');
      return;
    }

    console.log(`🔍 [POLLING] Checking status for appointment ${this.appointmentId}...`);

    // Check maximum polling duration
    this.totalPollingTime = Date.now() - this.pollingStartTime;
    if (this.totalPollingTime > this.options.maxDuration) {
      console.warn(`⏰ [POLLING] Timeout reached for appointment ${this.appointmentId}`);
      this.handlePollingTimeout();
      return;
    }

    try {
      // Create timeout controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        // Double check if polling is still active before making request
        if (this.pollingState !== 'active') {
          console.log('⏹️ [POLLING] Stopping mid-request - polling no longer active');
          clearTimeout(timeoutId);
          return;
        }
        
        console.log(`📡 [POLLING] Fetching /api/appointments/${this.appointmentId}/status`);
        const response = await fetch(`/api/appointments/${this.appointmentId}/status`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log(`📡 [POLLING] Response received: ${response.status} ${response.statusText}`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const statusData: AppointmentData = await response.json();
        console.log(`📊 [POLLING] Current status: ${statusData.status}`, {
          hasTranscript: !!statusData.transcript,
          hasProntuario: !!statusData.prontuario,
          message: statusData.message
        });

        // Reset error counter on successful poll
        this.consecutiveErrors = 0;

        // Check for status change
        const oldStatus = this.currentStatus?.status;
        const statusChanged = !this.currentStatus || 
          this.currentStatus.status !== statusData.status;

        // CRITICAL: Check if this is the first poll
        const isFirstPoll = this.currentStatus === null;

        console.log(`🔍 [POLLING] Status comparison:`, {
          oldStatus,
          newStatus: statusData.status,
          statusChanged,
          isFirstPoll,
          hasTranscript: !!statusData.transcript,
          hasProntuario: !!statusData.prontuario,
          callbackCount: this.callbacks.length
        });

        this.currentStatus = statusData;

        // Only notify on first poll OR actual status change (no repeated notifications for same state)
        const shouldNotify = isFirstPoll || statusChanged;

        if (shouldNotify) {
          const reason = isFirstPoll ? 'FIRST POLL' : 'STATUS CHANGED';
          
          console.log(`🔄 [POLLING] ${reason} for appointment ${this.appointmentId}:`, {
            oldStatus,
            newStatus: statusData.status,
            message: statusData.message,
            hasTranscript: !!statusData.transcript,
            hasProntuario: !!statusData.prontuario
          });

          // Notify all callbacks
          console.log(`📢 [POLLING] Notifying ${this.callbacks.length} callbacks (reason: ${reason})`);
          this.notifyStatusChange(statusData);
        } else {
          console.log(`⏸️  [POLLING] No notification needed - still ${statusData.status}`);
        }

        // IMPORTANT: Stop polling BEFORE notifying callbacks to prevent race conditions
        if (FINAL_STATES.includes(statusData.status)) {
          console.log(`🏁 [POLLING] Final state reached: ${statusData.status}, stopping polling BEFORE notification`);
          
          // Stop polling immediately to prevent any more requests
          if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
          }
          this.pollingState = 'stopped';
          
          // Now notify callbacks with the final status
          if (shouldNotify) {
            const reason = isFirstPoll ? 'FIRST POLL' : 'FINAL STATUS';
            console.log(`📢 [POLLING] Notifying ${this.callbacks.length} callbacks with final status: ${statusData.status}`);
            this.notifyStatusChange(statusData);
          }
          
          if (statusData.status === 'prontuario_ready') {
            console.log('🎉 [POLLING] TRANSCRIPTION COMPLETED! UI should display the prontuário now.');
          }
          
          console.log(`🛑 [POLLING] Final cleanup - appointment ${this.appointmentId} polling stopped`);
          return;
        }

      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }

    } catch (error) {
      await this.handlePollingError(error);
    }
  }

  /**
   * Handle polling errors with retry logic
   */
  private async handlePollingError(error: unknown): Promise<void> {
    this.consecutiveErrors++;

    const errorMessage = error instanceof Error ? error.message : 'Unknown polling error';
    
    console.error(`Polling error (attempt ${this.consecutiveErrors}):`, errorMessage);

    // Check if we've exceeded max retries
    if (this.consecutiveErrors >= this.options.maxRetries) {
      console.error(`Max polling retries exceeded for appointment ${this.appointmentId}`);
      this.handlePollingFailure(errorMessage);
      return;
    }

    // Apply exponential backoff
    const backoffDelay = Math.min(
      this.options.interval * Math.pow(this.options.backoffMultiplier, this.consecutiveErrors - 1),
      30000 // Max 30 seconds
    );

    console.log(`Retrying in ${backoffDelay}ms...`);

    // Clear current interval and restart with backoff
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    setTimeout(() => {
      if (this.pollingState === 'active') {
        // Resume normal polling interval after backoff
        this.intervalId = setInterval(() => {
          this.pollStatus();
        }, this.options.interval);
      }
    }, backoffDelay);
  }

  /**
   * Handle polling timeout
   */
  private handlePollingTimeout(): void {
    this.pollingState = 'error';
    this.stopPolling();

    const error: RCR30Error = {
      type: 'processing',
      code: 'POLLING_TIMEOUT',
      message: `Status polling timed out after ${Math.round(this.totalPollingTime / 1000)}s`,
      appointmentId: this.appointmentId || undefined,
      retryable: true,
      details: {
        totalTime: this.totalPollingTime,
        maxDuration: this.options.maxDuration,
        lastStatus: this.currentStatus?.status
      }
    };

    this.notifyError(error);
  }

  /**
   * Handle polling failure (max retries exceeded)
   */
  private handlePollingFailure(errorMessage: string): void {
    this.pollingState = 'error';
    this.stopPolling();

    const error: RCR30Error = {
      type: 'network',
      code: 'POLLING_FAILED',
      message: `Status polling failed after ${this.consecutiveErrors} attempts: ${errorMessage}`,
      appointmentId: this.appointmentId || undefined,
      retryable: true,
      details: {
        consecutiveErrors: this.consecutiveErrors,
        totalTime: this.totalPollingTime,
        lastError: errorMessage
      }
    };

    this.notifyError(error);
  }

  /**
   * Notify status change to all callbacks
   */
  private notifyStatusChange(status: AppointmentData): void {
    this.callbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error in status change callback:', error);
      }
    });
  }

  /**
   * Notify error to callbacks (if they handle errors)
   */
  private notifyError(error: RCR30Error): void {
    // Create error status data
    const errorStatus: AppointmentData = {
      id: this.appointmentId || '',
      status: 'failed',
      createdAt: new Date().toISOString(),
      language: 'pt-BR',
      durationSeconds: 0,
      message: error.message,
      error: error.message
    };

    this.currentStatus = errorStatus;
    this.notifyStatusChange(errorStatus);
  }

  /**
   * Reset manager to initial state
   */
  reset(): void {
    this.stopPolling();
    this.appointmentId = null;
    this.currentStatus = null;
    this.callbacks = [];
    this.consecutiveErrors = 0;
    this.totalPollingTime = 0;
    this.pollingStartTime = 0;
    this.pollingState = 'idle';
  }

  /**
   * Update polling options
   */
  updateOptions(newOptions: Partial<PollingOptions>): void {
    this.options = { ...this.options, ...newOptions };
    
    console.log('Polling options updated:', this.options);
  }
}

// React hook for easier component integration
export function useStatusPolling(options?: PollingOptions) {
  const [pollingManager] = useState(() => new StatusPollingManager(options));
  const [currentStatus, setCurrentStatus] = useState<AppointmentData | null>(null);
  const [pollingState, setPollingState] = useState<PollingState>('idle');
  const callbackRef = useRef<StatusChangeCallback>(() => {});

  // Status change handler
  const handleStatusChange = useCallback((status: AppointmentData) => {
    console.log(`🎯 [HOOK] handleStatusChange called with status:`, {
      status: status.status,
      hasTranscript: !!status.transcript,
      hasProntuario: !!status.prontuario
    });
    
    setCurrentStatus(status);
    
    // Update polling state based on status
    if (FINAL_STATES.includes(status.status)) {
      console.log(`🏁 [HOOK] Setting polling state to stopped for final state: ${status.status}`);
      setPollingState('stopped');
    } else if (status.status === 'failed') {
      console.log(`❌ [HOOK] Setting polling state to error for failed status`);
      setPollingState('error');
    }
  }, []);

  // Set up status change callback
  useEffect(() => {
    callbackRef.current = handleStatusChange;
    const unsubscribe = pollingManager.onStatusChange(handleStatusChange);
    
    return unsubscribe;
  }, [handleStatusChange, pollingManager]);

  // Track polling state
  useEffect(() => {
    const checkPollingState = () => {
      setPollingState(pollingManager.getPollingState());
    };

    const interval = setInterval(checkPollingState, 1000);
    return () => clearInterval(interval);
  }, [pollingManager]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      pollingManager.reset();
    };
  }, [pollingManager]);

  return {
    pollingManager,
    currentStatus,
    pollingState,
    pollingStats: pollingManager.getPollingStats(),
    startPolling: (appointmentId: string, interval?: number) => {
      setPollingState('active');
      pollingManager.startPolling(appointmentId, interval);
    },
    stopPolling: () => {
      pollingManager.stopPolling();
      setPollingState('stopped');
    },
    reset: () => {
      pollingManager.reset();
      setCurrentStatus(null);
      setPollingState('idle');
    }
  };
}