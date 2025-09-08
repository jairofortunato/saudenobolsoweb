'use client';

/**
 * =====================================
 * RCR-30 UPLOAD MANAGER
 * =====================================
 * 
 * Handles secure audio file uploads to Supabase Storage with progress tracking.
 * Implements resilient upload logic with retry mechanisms and IndexedDB cleanup.
 * 
 * FEATURES:
 * - Signed URL requests from Next.js API
 * - Progress tracking for upload operations  
 * - Automatic retry logic with exponential backoff
 * - Upload cancellation support
 * - IndexedDB cleanup after successful uploads
 * - Error handling with detailed logging
 * 
 * WORKFLOW:
 * 1. Request signed URL from /api/appointments/[id]/upload-url
 * 2. Upload blob to Supabase Storage via signed URL
 * 3. Call /api/appointments/[id]/upload-complete
 * 4. Clean up IndexedDB after confirmation
 */

import { useState, useCallback, useRef } from 'react';
import {
  UploadProgress,
  UploadResult,
  RCR30Error,
  DEFAULT_RCR30_CONFIG
} from '../../types/rcr30';
import { indexedDBManager } from './IndexedDBManager';

// Upload state management
interface UploadState {
  appointmentId: string;
  progress: UploadProgress;
  abortController?: AbortController;
  retryCount: number;
  lastError?: RCR30Error;
}

// Signed URL response from API
interface SignedUrlResponse {
  signedUrl: string;
  uploadPath: string;
  token: string;
  expiresAt: string;
  maxFileSize: number;
  allowedMimeTypes: string[];
}

// Upload completion response
interface UploadCompleteResponse {
  success: boolean;
  appointmentId: string;
  status: string;
  processingTriggered: boolean;
  audioInfo: {
    path: string;
    mimeType: string;
    sizeBytes: number;
    durationSeconds?: number;
  };
  message: string;
}

export class UploadManager {
  private activeUploads = new Map<string, UploadState>();
  private callbacks: {
    onProgressUpdate?: (appointmentId: string, progress: UploadProgress) => void;
    onUploadComplete?: (result: UploadResult) => void;
    onError?: (error: RCR30Error) => void;
  } = {};

  constructor(callbacks?: typeof this.callbacks) {
    this.callbacks = callbacks || {};
  }

  /**
   * Upload blob with full workflow (signed URL + upload + completion)
   */
  async uploadBlob(appointmentId: string, blob: Blob, durationSeconds?: number): Promise<UploadResult> {
    try {
      // Initialize upload state
      const abortController = new AbortController();
      const uploadState: UploadState = {
        appointmentId,
        progress: {
          appointmentId,
          loaded: 0,
          total: blob.size,
          percentage: 0,
          status: 'preparing'
        },
        abortController,
        retryCount: 0
      };

      this.activeUploads.set(appointmentId, uploadState);
      this.notifyProgress(uploadState.progress);

      // Step 1: Request signed URL
      const signedUrlData = await this.requestSignedUrl(appointmentId);
      
      // Step 2: Upload to Supabase Storage
      uploadState.progress.status = 'uploading';
      this.notifyProgress(uploadState.progress);

      const uploadSuccess = await this.uploadToStorage(
        signedUrlData.signedUrl,
        blob,
        uploadState
      );

      if (!uploadSuccess) {
        throw this.createError('upload', 'STORAGE_UPLOAD_FAILED', 
          'Failed to upload to Supabase Storage');
      }

      // Step 3: Complete upload and trigger processing
      uploadState.progress.status = 'completing';
      this.notifyProgress(uploadState.progress);

      const completionResult = await this.completeUpload(
        appointmentId,
        signedUrlData.uploadPath,
        blob.type,
        blob.size,
        durationSeconds
      );

      // Step 4: Cleanup IndexedDB
      await this.cleanupAfterUpload(appointmentId);

      // Final success state
      uploadState.progress.status = 'completed';
      uploadState.progress.percentage = 100;
      this.notifyProgress(uploadState.progress);

      const result: UploadResult = {
        success: true,
        appointmentId,
        audioPath: signedUrlData.uploadPath,
        retryable: false
      };

      console.log('🚀 [UPLOAD MANAGER] Upload completed successfully! Triggering onUploadComplete callback...', {
        appointmentId,
        hasCallback: !!this.callbacks.onUploadComplete
      });

      this.activeUploads.delete(appointmentId);
      this.callbacks.onUploadComplete?.(result);

      console.log('✅ [UPLOAD MANAGER] onUploadComplete callback triggered');
      return result;

    } catch (error) {
      const uploadState = this.activeUploads.get(appointmentId);
      if (uploadState) {
        uploadState.progress.status = 'failed';
        uploadState.lastError = error as RCR30Error;
        this.notifyProgress(uploadState.progress);
      }

      const result: UploadResult = {
        success: false,
        appointmentId,
        error: error instanceof Error ? error.message : 'Upload failed',
        retryable: this.isRetryableError(error as RCR30Error)
      };

      console.error('Upload failed:', result);
      this.callbacks.onError?.(error as RCR30Error);
      
      return result;
    }
  }

  /**
   * Retry failed upload from IndexedDB
   */
  async retryFailedUpload(appointmentId: string): Promise<UploadResult> {
    try {
      // Get blob from IndexedDB
      const blob = await indexedDBManager.getAudioBlob(appointmentId);
      
      if (!blob) {
        throw this.createError('storage', 'BLOB_NOT_FOUND', 
          `No stored blob found for appointment ${appointmentId}`);
      }

      // Update retry count in metadata
      const blobList = await indexedDBManager.listStoredBlobs();
      const blobInfo = blobList.find(b => b.appointmentId === appointmentId);
      
      if (blobInfo) {
        await indexedDBManager.updateBlobMetadata(appointmentId, {
          uploadAttempts: (blobInfo.uploadAttempts || 0) + 1,
          lastUploadAttempt: new Date().toISOString()
        });
      }

      // Retry upload with exponential backoff delay
      const retryCount = blobInfo?.uploadAttempts || 0;
      const delay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Max 30s delay
      
      if (delay > 0) {
        console.log(`Retrying upload after ${delay}ms delay (attempt ${retryCount + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      return await this.uploadBlob(appointmentId, blob);

    } catch (error) {
      const result: UploadResult = {
        success: false,
        appointmentId,
        error: error instanceof Error ? error.message : 'Retry failed',
        retryable: false
      };

      this.callbacks.onError?.(error as RCR30Error);
      return result;
    }
  }

  /**
   * Get current upload progress
   */
  getUploadProgress(appointmentId: string): UploadProgress | null {
    const uploadState = this.activeUploads.get(appointmentId);
    return uploadState ? { ...uploadState.progress } : null;
  }

  /**
   * Cancel ongoing upload
   */
  cancelUpload(appointmentId: string): void {
    const uploadState = this.activeUploads.get(appointmentId);
    
    if (uploadState?.abortController) {
      uploadState.abortController.abort();
      uploadState.progress.status = 'failed';
      uploadState.progress.error = 'Upload cancelled by user';
      
      this.notifyProgress(uploadState.progress);
      this.activeUploads.delete(appointmentId);
      
      console.log(`Upload cancelled for appointment ${appointmentId}`);
    }
  }

  /**
   * Request signed URL from Next.js API
   */
  private async requestSignedUrl(appointmentId: string): Promise<SignedUrlResponse> {
    const response = await fetch(`/api/appointments/${appointmentId}/upload-url`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw this.createError('network', 'SIGNED_URL_REQUEST_FAILED',
        `Failed to get signed URL: ${response.status} ${errorData.error || response.statusText}`);
    }

    const data: SignedUrlResponse = await response.json();
    console.log('Signed URL obtained:', { 
      uploadPath: data.uploadPath,
      expiresAt: data.expiresAt,
      maxFileSize: data.maxFileSize
    });

    return data;
  }

  /**
   * Upload blob to Supabase Storage via signed URL
   */
  private async uploadToStorage(
    signedUrl: string,
    blob: Blob,
    uploadState: UploadState
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Set up progress tracking
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          uploadState.progress.loaded = event.loaded;
          uploadState.progress.total = event.total;
          uploadState.progress.percentage = Math.round((event.loaded / event.total) * 100);
          this.notifyProgress(uploadState.progress);
        }
      };

      // Handle completion
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          console.log('Storage upload completed:', xhr.status);
          resolve(true);
        } else {
          console.error('Storage upload failed:', xhr.status, xhr.statusText);
          reject(this.createError('upload', 'STORAGE_UPLOAD_FAILED',
            `Storage upload failed: ${xhr.status} ${xhr.statusText}`));
        }
      };

      // Handle errors
      xhr.onerror = () => {
        reject(this.createError('network', 'STORAGE_UPLOAD_ERROR',
          'Network error during storage upload'));
      };

      // Handle timeout
      xhr.timeout = DEFAULT_RCR30_CONFIG.uploadTimeout;
      xhr.ontimeout = () => {
        reject(this.createError('network', 'STORAGE_UPLOAD_TIMEOUT',
          'Storage upload timed out'));
      };

      // Handle abort
      xhr.onabort = () => {
        reject(this.createError('upload', 'STORAGE_UPLOAD_CANCELLED',
          'Storage upload was cancelled'));
      };

      // Set up abort signal
      if (uploadState.abortController) {
        uploadState.abortController.signal.addEventListener('abort', () => {
          xhr.abort();
        });
      }

      // Start upload
      xhr.open('PUT', signedUrl);
      xhr.setRequestHeader('Content-Type', blob.type);
      xhr.send(blob);
    });
  }

  /**
   * Complete upload and trigger backend processing
   */
  private async completeUpload(
    appointmentId: string,
    audioPath: string,
    mimeType: string,
    sizeBytes: number,
    durationSeconds?: number
  ): Promise<UploadCompleteResponse> {
    const response = await fetch(`/api/appointments/${appointmentId}/upload-complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audioPath,
        audioMimeType: mimeType,
        audioSizeBytes: sizeBytes,
        durationSeconds
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw this.createError('network', 'UPLOAD_COMPLETE_FAILED',
        `Failed to complete upload: ${response.status} ${errorData.error || response.statusText}`);
    }

    const data: UploadCompleteResponse = await response.json();
    console.log('Upload completion successful:', data);

    return data;
  }

  /**
   * Clean up IndexedDB after successful upload
   */
  private async cleanupAfterUpload(appointmentId: string): Promise<void> {
    try {
      await indexedDBManager.removeAudioBlob(appointmentId);
      console.log(`IndexedDB cleanup completed for appointment ${appointmentId}`);
    } catch (error) {
      console.warn(`IndexedDB cleanup failed for appointment ${appointmentId}:`, error);
      // Don't fail the upload for cleanup errors
    }
  }

  /**
   * Notify progress update
   */
  private notifyProgress(progress: UploadProgress): void {
    this.callbacks.onProgressUpdate?.(progress.appointmentId, progress);
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: RCR30Error): boolean {
    if (!error) return false;
    
    // Network errors are generally retryable
    if (error.type === 'network') return true;
    
    // Some upload errors are retryable
    if (error.type === 'upload') {
      return ['STORAGE_UPLOAD_TIMEOUT', 'STORAGE_UPLOAD_ERROR'].includes(error.code);
    }
    
    return error.retryable || false;
  }

  /**
   * Create standardized RCR30Error
   */
  private createError(type: RCR30Error['type'], code: string, message: string): RCR30Error {
    return {
      type,
      code,
      message,
      retryable: type === 'network' || code.includes('TIMEOUT') || code.includes('ERROR'),
      details: {
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Get all active uploads
   */
  getActiveUploads(): string[] {
    return Array.from(this.activeUploads.keys());
  }

  /**
   * Clear all active uploads (for cleanup)
   */
  clearAllUploads(): void {
    // Cancel all active uploads
    for (const appointmentId of this.activeUploads.keys()) {
      this.cancelUpload(appointmentId);
    }
    
    this.activeUploads.clear();
  }
}

// React hook for easier component integration
export function useUploadManager(callbacks?: {
  onProgressUpdate?: (appointmentId: string, progress: UploadProgress) => void;
  onUploadComplete?: (result: UploadResult) => void;
  onError?: (error: RCR30Error) => void;
}) {
  const [uploadManager] = useState(() => new UploadManager(callbacks));
  const [uploadProgress, setUploadProgress] = useState<Map<string, UploadProgress>>(new Map());
  
  // Update progress state
  const handleProgressUpdate = useCallback((appointmentId: string, progress: UploadProgress) => {
    setUploadProgress(prev => new Map(prev.set(appointmentId, progress)));
    callbacks?.onProgressUpdate?.(appointmentId, progress);
  }, [callbacks]);

  // Update callbacks with progress handling
  const managedCallbacks = {
    ...callbacks,
    onProgressUpdate: handleProgressUpdate
  };

  // Update manager callbacks when component callbacks change
  useState(() => {
    uploadManager.callbacks = managedCallbacks;
  });

  return {
    uploadManager,
    uploadProgress,
    uploadBlob: (appointmentId: string, blob: Blob, duration?: number) => 
      uploadManager.uploadBlob(appointmentId, blob, duration),
    retryUpload: (appointmentId: string) => 
      uploadManager.retryFailedUpload(appointmentId),
    getProgress: (appointmentId: string) => 
      uploadManager.getUploadProgress(appointmentId),
    cancelUpload: (appointmentId: string) => 
      uploadManager.cancelUpload(appointmentId),
    activeUploads: uploadManager.getActiveUploads()
  };
}