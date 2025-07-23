import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase-server';
import { aiProcessorClient, type AIProcessorRequest } from '../../../../../lib/ai-processor-client';
import { type MedicalCategory } from '../../../../../lib/ai-prompts';

// POST /api/ai/process - Process medical text with AI Processor Backend
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { text, category, submitDirectly = true, patientId } = body;

    // Validate required fields
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return NextResponse.json(
        { error: 'Text input is required' },
        { status: 400 }
      );
    }

    // Validate category if provided
    if (category && typeof category !== 'string') {
      return NextResponse.json(
        { error: 'Category must be a string if provided' },
        { status: 400 }
      );
    }

    if (category) {
      const validCategories: MedicalCategory[] = ['diseases', 'medications', 'allergies', 'exams', 'consultations'];
      if (!validCategories.includes(category as MedicalCategory)) {
        return NextResponse.json(
          { error: 'Invalid category' },
          { status: 400 }
        );
      }
    }

    // Determine patient_id and created_by
    let targetPatientId: string;
    
    if (profile.role === 'patient') {
      // Patients can only create entries for themselves
      targetPatientId = profile.id;
    } else if (profile.role === 'doctor') {
      // Doctors can create entries for specified patients
      if (!patientId) {
        return NextResponse.json(
          { error: 'Patient ID is required for doctor entries' },
          { status: 400 }
        );
      }
      
      // Verify patient exists
      const { data: patient, error: patientError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', patientId)
        .eq('role', 'patient')
        .single();

      if (patientError || !patient) {
        return NextResponse.json(
          { error: 'Invalid patient ID' },
          { status: 400 }
        );
      }
      
      targetPatientId = patientId;
    } else {
      return NextResponse.json(
        { error: 'Invalid user role' },
        { status: 403 }
      );
    }

    // Check AI Processor health before processing
    const isHealthy = await aiProcessorClient.healthCheck();
    if (!isHealthy) {
      return NextResponse.json(
        { 
          error: 'AI Processor service is currently unavailable. Please try again later.',
          service_status: 'unavailable'
        },
        { status: 503 }
      );
    }

    // Prepare request for AI Processor Backend
    const aiRequest: AIProcessorRequest = {
      text: text.trim(),
      patient_id: targetPatientId,
      created_by: profile.id,
      submit_to_db: true, // AI processor handles database storage directly
      category: category as MedicalCategory
    };

    // Process with AI Processor Backend (it handles storage)
    const aiResult = await aiProcessorClient.processText(aiRequest);

    if (!aiResult.success) {
      return NextResponse.json(
        { 
          error: aiResult.error || 'AI processing failed',
          processing: {
            originalText: text.trim(),
            processed: false,
            aiBackend: true,
            directStorage: true
          }
        },
        { status: 500 }
      );
    }

    // If submitDirectly is false, return extracted data without storage
    if (!submitDirectly) {
      return NextResponse.json({
        success: true,
        extractedData: aiResult.data,
        processing: {
          originalText: text.trim(),
          processed: true,
          aiBackend: true,
          directStorage: false,
          processingTime: aiResult.processing_time,
          metadata: aiResult.metadata
        }
      });
    }

    // AI Processor handled storage - return confirmation
    const entriesCreated = aiResult.data?.entries_created || 0;
    const category_processed = aiResult.data?.category || 'unknown';
    
    if (entriesCreated > 0) {
      return NextResponse.json({
        success: true,
        message: aiResult.data?.message || `${entriesCreated} entrada${entriesCreated > 1 ? 's' : ''} criada${entriesCreated > 1 ? 's' : ''} com sucesso`,
        data: {
          entries_created: entriesCreated,
          category: category_processed,
          stored_entries: aiResult.data?.entries || [],
          backend_storage: true
        },
        processing: {
          originalText: text.trim(),
          processed: true,
          aiBackend: true,
          directStorage: true,
          classification: aiResult.data?.classification,
          processingTime: aiResult.processing_time,
          metadata: aiResult.metadata,
          entriesCreated: entriesCreated
        }
      }, { status: 201 });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Nenhuma entrada foi criada - dados insuficientes ou falha no processamento',
        data: {
          entries_created: 0,
          category: category_processed,
          backend_storage: true
        },
        processing: {
          originalText: text.trim(),
          processed: true,
          aiBackend: true,
          directStorage: true,
          classification: aiResult.data?.classification,
          processingTime: aiResult.processing_time,
          metadata: aiResult.metadata,
          entriesCreated: 0
        }
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Unexpected error in POST /api/ai/process:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('AI processing timeout')) {
        return NextResponse.json(
          { 
            error: 'Processamento AI expirou. Tente novamente com um texto mais curto.',
            processing: { aiBackend: true, timeout: true }
          },
          { status: 408 }
        );
      }
      
      if (error.message.includes('Unable to connect')) {
        return NextResponse.json(
          { 
            error: 'Serviço de AI temporariamente indisponível. Tente novamente em alguns minutos.',
            processing: { aiBackend: true, connectionError: true }
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        processing: { aiBackend: true, internalError: true }
      },
      { status: 500 }
    );
  }
}

// GET /api/ai/process - Test AI processing capabilities and get service info
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if this is a test request
    const { searchParams } = new URL(request.url);
    const testMode = searchParams.get('test') === 'true';
    const healthCheck = searchParams.get('health') === 'true';

    if (healthCheck) {
      // Check AI Processor health
      const isHealthy = await aiProcessorClient.healthCheck();
      const healthInfo = await aiProcessorClient.getHealthInfo();
      const config = aiProcessorClient.getConfig();

      return NextResponse.json({
        timestamp: new Date().toISOString(),
        aiProcessor: {
          healthy: isHealthy,
          info: healthInfo,
          config: {
            baseURL: config.baseURL,
            hasApiKey: config.hasApiKey,
            timeout: config.timeout
          }
        }
      });
    }

    if (testMode) {
      // Run comprehensive AI testing
      const testResult = await aiProcessorClient.testProcessing();
      const healthInfo = await aiProcessorClient.getHealthInfo();
      
      return NextResponse.json({
        timestamp: new Date().toISOString(),
        testMode: true,
        aiProcessor: {
          ...testResult,
          healthInfo,
          config: aiProcessorClient.getConfig()
        }
      });
    } else {
      // Return API information
      return NextResponse.json({
        timestamp: new Date().toISOString(),
        endpoint: '/api/ai/process',
        methods: ['GET', 'POST'],
        description: 'Process medical text using AI Processor Backend service',
        aiBackend: true,
        usage: {
          POST: {
            description: 'Process medical text with AI Processor Backend',
            body: {
              text: 'Medical text to process (required)',
              category: 'Medical category: diseases, medications, allergies, exams, consultations (optional - auto-detect if not provided)',
              submitDirectly: 'Boolean - if true, submits directly to database (default: true)',
              patientId: 'Patient ID for doctors (optional for patients)'
            }
          },
          GET: {
            description: 'Get API information or run tests',
            query: {
              test: 'Set to "true" to run AI processing tests',
              health: 'Set to "true" to check AI Processor health'
            }
          }
        },
        supportedCategories: ['diseases', 'medications', 'allergies', 'exams', 'consultations'],
        aiProcessorConfig: aiProcessorClient.getConfig()
      });
    }

  } catch (error) {
    console.error('Unexpected error in GET /api/ai/process:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 