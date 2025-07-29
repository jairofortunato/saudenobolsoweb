/**
 * AI Processor Client - Connects Next.js Web App to AI Processor Backend
 * Handles communication with the Railway-deployed AI processor service
 */

import { MedicalCategory } from './ai-prompts';

export interface AIProcessorRequest {
  text: string;
  patient_id: string;
  created_by: string;
  submit_to_db?: boolean;
  category?: MedicalCategory;
}

export interface AIProcessorResponse {
  success: boolean;
  data?: {
    message?: string;
    category?: string;
    entries_created?: number;
    entries?: Array<Record<string, any>>;
    classification?: {
      primary_category: string;
      confidence: number;
      reasoning: string;
    };
    // Legacy fields for backward compatibility
    extractions?: Record<MedicalCategory, {
      items: Array<Record<string, any>>;
      extraction_confidence: number;
      completeness_score: number;
    }>;
    validation_results?: Record<MedicalCategory, {
      validation: {
        is_valid: boolean;
        completeness_score: number;
        accuracy_score: number;
        missing_fields: string[];
        validation_errors: string[];
      };
      quality_assurance: {
        quality_score: number;
        confidence_level: 'high' | 'medium' | 'low';
        anomalies_detected: string[];
        requires_human_review: boolean;
        safety_concerns: string[];
        recommendations: string[];
      };
      final_approval: boolean;
      overall_score: number;
    }>;
  };
  error?: string;
  processing_time?: number;
  metadata?: {
    pipeline_steps: number;
    categories_processed: number;
    entries_stored?: number;
    storage_location?: string;
  };
}

export interface AIProcessorHealthResponse {
  status: string;
  service: string;
  version?: string;
}

export class AIProcessorClient {
  private baseURL: string;
  private apiKey: string;
  private timeout: number;

  constructor() {
    // Remove trailing slash from baseURL to prevent double slashes
    const rawBaseURL = process.env.AI_PROCESSOR_URL || process.env.NEXT_PUBLIC_AI_PROCESSOR_URL || 'http://localhost:8000';
    this.baseURL = rawBaseURL.replace(/\/+$/, ''); // Remove trailing slashes
    this.apiKey = process.env.AI_PROCESSOR_API_KEY || process.env.NEXT_PUBLIC_AI_PROCESSOR_API_KEY || '';
    this.timeout = parseInt(process.env.AI_PROCESSOR_TIMEOUT || '30000');

    console.log('🤖 [AI Client] Initializing AI Processor Client:', {
      baseURL: this.baseURL,
      hasApiKey: !!this.apiKey,
      timeout: this.timeout
    });

    if (!this.apiKey) {
      console.warn('⚠️ [AI Client] AI_PROCESSOR_API_KEY not configured - AI processing may fail');
    }
  }

  /**
   * Process medical text using the AI processor backend
   */
  async processText(request: AIProcessorRequest): Promise<AIProcessorResponse> {
    console.log('📤 [AI Client] Processing text request:', {
      url: `${this.baseURL}/api/ai/process`,
      textLength: request.text.length,
      patient_id: request.patient_id,
      created_by: request.created_by,
      submit_to_db: request.submit_to_db,
      category: request.category,
      hasApiKey: !!this.apiKey
    });

    try {
      // Prepare headers - only include Authorization if we have a valid API key
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Only add Authorization header if we have a valid API key
      if (this.apiKey && this.apiKey.trim() !== '') {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
        console.log('🔑 [AI Client] Including Authorization header');
      } else {
        console.log('⚠️ [AI Client] No API key - sending request without Authorization header');
      }

      const response = await fetch(`${this.baseURL}/api/ai/process`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.timeout),
      });

      console.log('📥 [AI Client] Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log('❌ [AI Client] Error response data:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ [AI Client] Success response:', {
        success: result.success,
        hasData: !!result.data,
        processing_time: result.processing_time,
        dataKeys: result.data ? Object.keys(result.data) : []
      });
      
      return result;
    } catch (error) {
      console.error('💥 [AI Client] Connection error:', error);
      
      if (error instanceof Error) {
        console.log('🔍 [AI Client] Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack?.substring(0, 300)
        });

        if (error.name === 'AbortError') {
          console.log('⏰ [AI Client] Request timeout detected');
          throw new Error('AI processing timeout - please try again with shorter text');
        }
        if (error.message.includes('fetch')) {
          console.log('🔌 [AI Client] Fetch error detected');
          throw new Error('Unable to connect to AI processor service - please try again later');
        }
        throw new Error(`AI Processor error: ${error.message}`);
      }
      
      throw new Error('Unknown AI Processor error occurred');
    }
  }

  /**
   * Check if the AI processor service is healthy and available
   */
  async healthCheck(): Promise<boolean> {
    const healthUrl = `${this.baseURL}/health`;
    console.log('🏥 [AI Client] Starting health check:', {
      url: healthUrl,
      hasApiKey: !!this.apiKey,
      timeout: 10000
    });

    try {
      // Don't send Authorization header for health check since it's a public endpoint
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {}, // Remove authorization header for public health endpoint
        signal: AbortSignal.timeout(10000), // Increased to 10 seconds
      });

      console.log('🏥 [AI Client] Health check response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (response.ok) {
        try {
          const healthData = await response.json();
          console.log('✅ [AI Client] Health check data:', healthData);
        } catch (jsonError) {
          console.log('⚠️ [AI Client] Health check response not JSON, but status OK');
        }
      }

      return response.ok;
    } catch (error) {
      console.warn('❌ [AI Client] Health check failed:', error);
      
      if (error instanceof Error) {
        console.log('🔍 [AI Client] Health check error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack?.substring(0, 300)
        });
      }
      
      return false;
    }
  }

  /**
   * Get detailed health information from the AI processor
   */
  async getHealthInfo(): Promise<AIProcessorHealthResponse | null> {
    const healthUrl = `${this.baseURL}/health`;
    console.log('🏥 [AI Client] Getting health info:', {
      url: healthUrl,
      hasApiKey: !!this.apiKey
    });

    try {
      // Don't send Authorization header for health check since it's a public endpoint
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {}, // Remove authorization header for public health endpoint
        signal: AbortSignal.timeout(5000),
      });

      console.log('🏥 [AI Client] Health info response:', {
        status: response.status,
        ok: response.ok
      });

      if (response.ok) {
        const healthData = await response.json();
        console.log('✅ [AI Client] Health info data:', healthData);
        return healthData;
      }
      
      console.log('❌ [AI Client] Health info request failed with status:', response.status);
      return null;
    } catch (error) {
      console.warn('❌ [AI Client] Failed to get AI Processor health info:', error);
      return null;
    }
  }

  /**
   * Test the AI processor with sample data
   */
  async testProcessing(): Promise<{ success: boolean; message: string; details?: any }> {
    console.log('🧪 [AI Client] Starting test processing');
    
    try {
      const testRequest: AIProcessorRequest = {
        text: 'Tomo Losartan 50mg uma vez ao dia para pressão alta desde novembro de 2023',
        patient_id: 'test-patient-id',
        created_by: 'test-user-id',
        submit_to_db: false,
        category: 'medications'
      };

      console.log('🧪 [AI Client] Test request prepared:', testRequest);

      const result = await this.processText(testRequest);
      
      console.log('🧪 [AI Client] Test result:', {
        success: result.success,
        hasData: !!result.data,
        processing_time: result.processing_time
      });
      
      if (result.success) {
        return {
          success: true,
          message: 'AI Processor test successful',
          details: {
            processing_time: result.processing_time,
            categories_processed: result.metadata?.categories_processed,
            extractions_found: Object.keys(result.data?.extractions || {}).length
          }
        };
      } else {
        return {
          success: false,
          message: `AI Processor test failed: ${result.error}`,
          details: result
        };
      }
    } catch (error) {
      console.error('💥 [AI Client] Test processing failed:', error);
      return {
        success: false,
        message: `AI Processor test error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error }
      };
    }
  }

  /**
   * Get connection configuration info (for debugging)
   */
  getConfig(): { baseURL: string; hasApiKey: boolean; timeout: number } {
    return {
      baseURL: this.baseURL,
      hasApiKey: !!this.apiKey,
      timeout: this.timeout
    };
  }
}

// Export a singleton instance for easy use
export const aiProcessorClient = new AIProcessorClient(); 