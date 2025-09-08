'use client';

/**
 * =====================================
 * RCR-30 INDEXEDDB STORAGE MANAGER
 * =====================================
 * 
 * Provides resilient local storage for audio blobs using IndexedDB.
 * Handles blob storage, metadata management, and cleanup operations.
 * Ensures data persistence during network failures and browser crashes.
 * 
 * FEATURES:
 * - Store final aggregated audio blobs with metadata
 * - Cross-browser IndexedDB compatibility
 * - Automatic cleanup of old/stale blobs
 * - Upload failure retry mechanisms
 * - Storage quota monitoring
 * 
 * BROWSER SUPPORT:
 * - Chrome/Edge: Full support
 * - Firefox: Full support  
 * - Safari: Full support with polyfills
 */

import { 
  AppointmentBlobInfo, 
  StoredAudioBlob, 
  StorageStats, 
  RCR30Error,
  DEFAULT_RCR30_CONFIG 
} from '../../types/rcr30';

// IndexedDB database configuration
const DB_NAME = 'RCR30AudioStorage';
const DB_VERSION = 1;
const BLOB_STORE_NAME = 'audioBlobs';
const METADATA_STORE_NAME = 'blobMetadata';

// IndexedDB connection interface
interface RCR30Database extends IDBDatabase {
  // Type-safe database interface
}

export class IndexedDBManager {
  private db: RCR30Database | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize IndexedDB connection
   */
  private async initDB(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      // Check for IndexedDB support
      if (!window.indexedDB) {
        reject(new Error('IndexedDB not supported in this browser'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error(`IndexedDB error: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result as RCR30Database;
        
        // Handle unexpected database closures
        this.db.onclose = () => {
          console.warn('IndexedDB connection closed unexpectedly');
          this.db = null;
          this.initPromise = null;
        };

        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create blob storage object store
        if (!db.objectStoreNames.contains(BLOB_STORE_NAME)) {
          const blobStore = db.createObjectStore(BLOB_STORE_NAME, { 
            keyPath: 'appointmentId' 
          });
          
          // Create indexes for efficient queries
          blobStore.createIndex('createdAt', 'metadata.createdAt');
          blobStore.createIndex('uploaded', 'metadata.uploaded');
          blobStore.createIndex('size', 'metadata.size');
        }

        // Create metadata-only store for quick lookups
        if (!db.objectStoreNames.contains(METADATA_STORE_NAME)) {
          const metadataStore = db.createObjectStore(METADATA_STORE_NAME, { 
            keyPath: 'appointmentId' 
          });
          
          metadataStore.createIndex('createdAt', 'createdAt');
          metadataStore.createIndex('uploaded', 'uploaded');
          metadataStore.createIndex('uploadAttempts', 'uploadAttempts');
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Store audio blob with metadata
   */
  async storeAudioBlob(appointmentId: string, blob: Blob): Promise<void> {
    try {
      await this.initDB();
      
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      const metadata: AppointmentBlobInfo = {
        appointmentId,
        size: blob.size,
        createdAt: new Date().toISOString(),
        mimeType: blob.type || 'audio/webm;codecs=opus',
        uploaded: false,
        uploadAttempts: 0
      };

      const storedBlob: StoredAudioBlob = {
        appointmentId,
        blob,
        metadata
      };

      const transaction = this.db.transaction([BLOB_STORE_NAME, METADATA_STORE_NAME], 'readwrite');
      
      // Store the blob
      const blobStore = transaction.objectStore(BLOB_STORE_NAME);
      await this.promisifyRequest(blobStore.put(storedBlob));
      
      // Store metadata separately for quick access
      const metadataStore = transaction.objectStore(METADATA_STORE_NAME);
      await this.promisifyRequest(metadataStore.put(metadata));

      await this.promisifyRequest(transaction);

      console.log(`Audio blob stored for appointment ${appointmentId}`, {
        size: blob.size,
        mimeType: blob.type
      });

    } catch (error) {
      const rcr30Error: RCR30Error = {
        type: 'storage',
        code: 'STORE_BLOB_FAILED',
        message: `Failed to store audio blob: ${error instanceof Error ? error.message : 'Unknown error'}`,
        appointmentId,
        retryable: true,
        details: error
      };
      
      console.error('Store audio blob failed:', rcr30Error);
      throw rcr30Error;
    }
  }

  /**
   * Retrieve audio blob by appointment ID
   */
  async getAudioBlob(appointmentId: string): Promise<Blob | null> {
    try {
      await this.initDB();
      
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      const transaction = this.db.transaction([BLOB_STORE_NAME], 'readonly');
      const store = transaction.objectStore(BLOB_STORE_NAME);
      const request = store.get(appointmentId);
      
      const result = await this.promisifyRequest(request) as StoredAudioBlob;
      
      return result ? result.blob : null;

    } catch (error) {
      console.error(`Failed to retrieve audio blob for ${appointmentId}:`, error);
      return null;
    }
  }

  /**
   * Remove audio blob and metadata
   */
  async removeAudioBlob(appointmentId: string): Promise<void> {
    try {
      await this.initDB();
      
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      const transaction = this.db.transaction([BLOB_STORE_NAME, METADATA_STORE_NAME], 'readwrite');
      
      // Remove from both stores
      const blobStore = transaction.objectStore(BLOB_STORE_NAME);
      await this.promisifyRequest(blobStore.delete(appointmentId));
      
      const metadataStore = transaction.objectStore(METADATA_STORE_NAME);
      await this.promisifyRequest(metadataStore.delete(appointmentId));

      await this.promisifyRequest(transaction);

      console.log(`Audio blob removed for appointment ${appointmentId}`);

    } catch (error) {
      console.error(`Failed to remove audio blob for ${appointmentId}:`, error);
      throw error;
    }
  }

  /**
   * List all stored blobs metadata
   */
  async listStoredBlobs(): Promise<AppointmentBlobInfo[]> {
    try {
      await this.initDB();
      
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      const transaction = this.db.transaction([METADATA_STORE_NAME], 'readonly');
      const store = transaction.objectStore(METADATA_STORE_NAME);
      const request = store.getAll();
      
      const result = await this.promisifyRequest(request) as AppointmentBlobInfo[];
      
      // Sort by creation date (newest first)
      return result.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    } catch (error) {
      console.error('Failed to list stored blobs:', error);
      return [];
    }
  }

  /**
   * Update blob metadata (e.g., after upload attempt)
   */
  async updateBlobMetadata(appointmentId: string, updates: Partial<AppointmentBlobInfo>): Promise<void> {
    try {
      await this.initDB();
      
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      const transaction = this.db.transaction([METADATA_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(METADATA_STORE_NAME);
      
      // Get existing metadata
      const getRequest = store.get(appointmentId);
      const existing = await this.promisifyRequest(getRequest) as AppointmentBlobInfo;
      
      if (!existing) {
        throw new Error(`No metadata found for appointment ${appointmentId}`);
      }

      // Merge updates
      const updated = { ...existing, ...updates };
      
      // Store updated metadata
      await this.promisifyRequest(store.put(updated));
      await this.promisifyRequest(transaction);

    } catch (error) {
      console.error(`Failed to update metadata for ${appointmentId}:`, error);
      throw error;
    }
  }

  /**
   * Clean up old blobs based on age
   */
  async cleanupOldBlobs(maxAge: number = DEFAULT_RCR30_CONFIG.maxStorageAge): Promise<void> {
    try {
      const allBlobs = await this.listStoredBlobs();
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - maxAge);

      const oldBlobs = allBlobs.filter(blob => 
        new Date(blob.createdAt) < cutoffTime
      );

      console.log(`Cleaning up ${oldBlobs.length} old blobs (older than ${maxAge} hours)`);

      // Remove old blobs
      for (const blob of oldBlobs) {
        await this.removeAudioBlob(blob.appointmentId);
      }

    } catch (error) {
      console.error('Failed to cleanup old blobs:', error);
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<StorageStats> {
    try {
      const allBlobs = await this.listStoredBlobs();
      
      const stats: StorageStats = {
        totalBlobs: allBlobs.length,
        totalSize: allBlobs.reduce((sum, blob) => sum + blob.size, 0),
        failedUploads: allBlobs.filter(blob => blob.uploadAttempts > 0 && !blob.uploaded).length
      };

      if (allBlobs.length > 0) {
        stats.oldestBlob = allBlobs[allBlobs.length - 1].appointmentId;
        stats.newestBlob = allBlobs[0].appointmentId;
      }

      // Try to get storage quota information (if available)
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        try {
          const estimate = await navigator.storage.estimate();
          stats.storageQuotaUsed = estimate.usage;
          stats.storageQuotaAvailable = estimate.quota;
        } catch (error) {
          // Storage quota not available
        }
      }

      return stats;

    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        totalBlobs: 0,
        totalSize: 0,
        failedUploads: 0
      };
    }
  }

  /**
   * Check browser compatibility
   */
  static checkCompatibility(): { supported: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (!window.indexedDB) {
      issues.push('IndexedDB not supported');
    }
    
    if (!window.Blob) {
      issues.push('Blob constructor not supported');
    }

    return {
      supported: issues.length === 0,
      issues
    };
  }

  /**
   * Utility: Convert IDB request to Promise
   */
  private promisifyRequest<T = any>(request: IDBRequest<T> | IDBTransaction): Promise<T> {
    return new Promise((resolve, reject) => {
      if ('result' in request) {
        // IDBRequest
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } else {
        // IDBTransaction
        request.oncomplete = () => resolve(undefined as any);
        request.onerror = () => reject(request.error);
        request.onabort = () => reject(new Error('Transaction aborted'));
      }
    });
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

// Export singleton instance
export const indexedDBManager = new IndexedDBManager();