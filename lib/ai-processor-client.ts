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
    this.baseURL = process.env.AI_PROCESSOR_URL || process.env.NEXT_PUBLIC_AI_PROCESSOR_URL || 'http://localhost:8000';
    this.apiKey = process.env.AI_PROCESSOR_API_KEY || process.env.NEXT_PUBLIC_AI_PROCESSOR_API_KEY || '';
    this.timeout = parseInt(process.env.AI_PROCESSOR_TIMEOUT || '30000');

    if (!this.apiKey) {
      console.warn('AI_PROCESSOR_API_KEY not configured - AI processing may fail');
    }
  }

  /**
   * Process medical text using the AI processor backend
   */
  async processText(request: AIProcessorRequest): Promise<AIProcessorResponse> {
    try {
      const response = await fetch(`${this.baseURL}/api/ai/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('AI Processor connection error:', error);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('AI processing timeout - please try again with shorter text');
        }
        if (error.message.includes('fetch')) {
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
    try {
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        headers: this.apiKey ? {
          'Authorization': `Bearer ${this.apiKey}`,
        } : {},
        signal: AbortSignal.timeout(5000),
      });

      return response.ok;
    } catch (error) {
      console.warn('AI Processor health check failed:', error);
      return false;
    }
  }

  /**
   * Get detailed health information from the AI processor
   */
  async getHealthInfo(): Promise<AIProcessorHealthResponse | null> {
    try {
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        headers: this.apiKey ? {
          'Authorization': `Bearer ${this.apiKey}`,
        } : {},
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.warn('Failed to get AI Processor health info:', error);
      return null;
    }
  }

  /**
   * Test the AI processor with sample data
   */
  async testProcessing(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const testRequest: AIProcessorRequest = {
        text: 'Tomo Losartan 50mg uma vez ao dia para pressão alta desde novembro de 2023',
        patient_id: 'test-patient-id',
        created_by: 'test-user-id',
        submit_to_db: false,
        category: 'medications'
      };

      const result = await this.processText(testRequest);
      
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