/**
 * =====================================
 * RCR-30 TYPE DEFINITIONS
 * =====================================
 * 
 * Type definitions for the RCR-30 (Resilient Chunked Recording) system.
 * These types support the IndexedDB storage, recording management, and status tracking.
 */

// Appointment status progression
export type AppointmentStatus = 
  | 'recording' 
  | 'uploading' 
  | 'processing' 
  | 'transcribed' 
  | 'prontuario_ready' 
  | 'failed';

// Core appointment data structure
export interface AppointmentData {
  id: string;
  status: AppointmentStatus;
  createdAt: string;
  patientName?: string;
  language: string;
  durationSeconds: number;
  transcript?: string;
  prontuario?: any;
  template?: {
    id: string;
    name: string;
    specialty?: string;
    ai_prompt_template?: string;
  };
  audioInfo?: {
    path: string;
    mimeType: string;
    sizeBytes: number;
  };
  meta?: Record<string, any>;
  message?: string;
  error?: string;
}

// IndexedDB blob storage metadata
export interface AppointmentBlobInfo {
  appointmentId: string;
  size: number;
  createdAt: string;
  mimeType: string;
  uploaded: boolean;
  uploadAttempts: number;
  lastUploadAttempt?: string;
  failureReason?: string;
}

// IndexedDB stored blob with metadata
export interface StoredAudioBlob {
  appointmentId: string;
  blob: Blob;
  metadata: AppointmentBlobInfo;
}

// Recording status and progress
export interface RecordingStatus {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  chunks: number;
  size: number;
  currentChunkSize: number;
  averageChunkSize: number;
}

// Upload progress and result
export interface UploadProgress {
  appointmentId: string;
  loaded: number;
  total: number;
  percentage: number;
  status: 'preparing' | 'uploading' | 'completing' | 'completed' | 'failed';
  error?: string;
}

export interface UploadResult {
  success: boolean;
  appointmentId: string;
  audioPath?: string;
  error?: string;
  retryable: boolean;
}

// Status polling callback
export type StatusChangeCallback = (status: AppointmentData) => void;

// Error types for better error handling
export interface RCR30Error {
  type: 'recording' | 'storage' | 'upload' | 'network' | 'processing';
  code: string;
  message: string;
  appointmentId?: string;
  retryable: boolean;
  details?: any;
}

// Configuration options
export interface RCR30Config {
  // Recording settings
  mimeType: string;
  audioBitsPerSecond: number;
  numberOfAudioChannels: number;
  timeSlice: number; // 30 seconds in milliseconds
  
  // Storage settings
  maxStorageAge: number; // Maximum age for stored blobs in hours
  maxRetryAttempts: number;
  
  // Upload settings
  uploadTimeout: number;
  chunkSize?: number; // For large file uploads
  
  // Polling settings
  pollingInterval: number;
  maxPollingDuration: number;
}

// Default configuration
export const DEFAULT_RCR30_CONFIG: RCR30Config = {
  // MediaRecorder settings per PRD requirements
  mimeType: 'audio/webm;codecs=opus',
  audioBitsPerSecond: 16000,
  numberOfAudioChannels: 1,
  timeSlice: 30000, // 30 seconds
  
  // Storage management
  maxStorageAge: 24, // 24 hours
  maxRetryAttempts: 3,
  
  // Upload configuration
  uploadTimeout: 300000, // 5 minutes
  chunkSize: 1024 * 1024 * 5, // 5MB chunks for large uploads
  
  // Status polling
  pollingInterval: 3000, // 3 seconds
  maxPollingDuration: 1800000 // 30 minutes
};

// Browser compatibility info
export interface BrowserCapabilities {
  supportsMediaRecorder: boolean;
  supportsWebMOpus: boolean;
  supportsIndexedDB: boolean;
  recommendedMimeType: string;
  maxFileSize: number;
}

// Storage usage statistics
export interface StorageStats {
  totalBlobs: number;
  totalSize: number;
  oldestBlob?: string;
  newestBlob?: string;
  failedUploads: number;
  storageQuotaUsed?: number;
  storageQuotaAvailable?: number;
}