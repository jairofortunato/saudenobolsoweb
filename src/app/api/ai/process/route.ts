import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase-server';
import { aiProcessorClient, type AIProcessorRequest } from '../../../../../lib/ai-processor-client';
import { type MedicalCategory } from '../../../../../lib/ai-prompts';

// POST /api/ai/process - Process medical text with AI Processor Backend
export async function POST(request: NextRequest) {
  console.log('🚀 [AI Process] POST request received');
  
  try {
    const supabase = await createClient();
    console.log('✅ [AI Process] Supabase client created');
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('🔐 [AI Process] Auth check:', { hasUser: !!user, authError: !!authError });
    
    if (authError || !user) {
      console.log('❌ [AI Process] Authentication failed:', authError);
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

    console.log('👤 [AI Process] Profile check:', { hasProfile: !!profile, profileError: !!profileError, role: profile?.role });

    if (profileError || !profile) {
      console.log('❌ [AI Process] Profile not found:', profileError);
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { text, category, submitDirectly = true, patientId } = body;
    console.log('📝 [AI Process] Request body parsed:', { 
      textLength: text?.length, 
      category, 
      submitDirectly, 
      patientId,
      hasText: !!text 
    });

    // Validate required fields
    if (!text || typeof text !== 'string' || text.trim() === '') {
      console.log('❌ [AI Process] Text validation failed');
      return NextResponse.json(
        { error: 'Text input is required' },
        { status: 400 }
      );
    }

    // Validate category if provided
    if (category && typeof category !== 'string') {
      console.log('❌ [AI Process] Category validation failed - not string');
      return NextResponse.json(
        { error: 'Category must be a string if provided' },
        { status: 400 }
      );
    }

    if (category) {
      const validCategories: MedicalCategory[] = ['diseases', 'medications', 'allergies', 'exams', 'consultations'];
      if (!validCategories.includes(category as MedicalCategory)) {
        console.log('❌ [AI Process] Category validation failed - invalid category:', category);
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
      console.log('👤 [AI Process] Patient mode - using profile ID as patient ID');
    } else if (profile.role === 'doctor') {
      // Doctors can create entries for specified patients
      if (!patientId) {
        console.log('❌ [AI Process] Doctor mode - no patient ID provided');
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

      console.log('🔍 [AI Process] Doctor mode - patient lookup:', { hasPatient: !!patient, patientError: !!patientError });

      if (patientError || !patient) {
        console.log('❌ [AI Process] Patient lookup failed:', patientError);
        return NextResponse.json(
          { error: 'Invalid patient ID' },
          { status: 400 }
        );
      }
      
      targetPatientId = patientId;
      console.log('👩‍⚕️ [AI Process] Doctor mode - using provided patient ID');
    } else {
      console.log('❌ [AI Process] Invalid user role:', profile.role);
      return NextResponse.json(
        { error: 'Invalid user role' },
        { status: 403 }
      );
    }

    // Log AI processor configuration
    const aiConfig = aiProcessorClient.getConfig();
    console.log('🤖 [AI Process] AI Processor config:', aiConfig);

    // Check AI Processor health before processing
    console.log('🏥 [AI Process] Starting health check...');
    const isHealthy = await aiProcessorClient.healthCheck();
    console.log('🏥 [AI Process] Health check result:', isHealthy);
    
    if (!isHealthy) {
      console.log('❌ [AI Process] Health check failed - service unavailable');
      
      // Try to get more detailed health info
      try {
        const healthInfo = await aiProcessorClient.getHealthInfo();
        console.log('🔍 [AI Process] Health info:', healthInfo);
      } catch (healthError) {
        console.log('❌ [AI Process] Failed to get health info:', healthError);
      }
      
      return NextResponse.json(
        { 
          error: 'AI Processor service is currently unavailable. Please try again later.',
          service_status: 'unavailable',
          debug_info: {
            ai_processor_url: aiConfig.baseURL,
            has_api_key: aiConfig.hasApiKey,
            timeout: aiConfig.timeout
          }
        },
        { status: 503 }
      );
    }

    console.log('✅ [AI Process] Health check passed - proceeding with processing');

    // Prepare request for AI Processor Backend
    const aiRequest: AIProcessorRequest = {
      text: text.trim(),
      patient_id: targetPatientId,
      created_by: profile.id,
      submit_to_db: true, // AI processor handles database storage directly
      category: category as MedicalCategory
    };

    console.log('📤 [AI Process] Sending request to AI processor:', {
      textLength: aiRequest.text.length,
      patient_id: aiRequest.patient_id,
      created_by: aiRequest.created_by,
      submit_to_db: aiRequest.submit_to_db,
      category: aiRequest.category
    });

    // Process with AI Processor Backend (it handles storage)
    const aiResult = await aiProcessorClient.processText(aiRequest);
    console.log('📥 [AI Process] AI processor response:', {
      success: aiResult.success,
      hasData: !!aiResult.data,
      error: aiResult.error,
      processing_time: aiResult.processing_time
    });

    if (!aiResult.success) {
      console.log('❌ [AI Process] AI processing failed:', aiResult.error);
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
      console.log('📋 [AI Process] Returning extracted data without storage');
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
    
    console.log('💾 [AI Process] Storage result:', {
      entriesCreated,
      category_processed,
      hasStoredEntries: !!(aiResult.data?.entries && aiResult.data.entries.length > 0)
    });
    
    if (entriesCreated > 0) {
      console.log('✅ [AI Process] Success - entries created:', entriesCreated);
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
      console.log('⚠️ [AI Process] No entries created');
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
    console.error('💥 [AI Process] Unexpected error in POST /api/ai/process:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      console.log('🔍 [AI Process] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.substring(0, 500)
      });
      
      if (error.message.includes('AI processing timeout')) {
        console.log('⏰ [AI Process] Timeout error detected');
        return NextResponse.json(
          { 
            error: 'Processamento AI expirou. Tente novamente com um texto mais curto.',
            processing: { aiBackend: true, timeout: true }
          },
          { status: 408 }
        );
      }
      
      if (error.message.includes('Unable to connect')) {
        console.log('🔌 [AI Process] Connection error detected');
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
  console.log('🚀 [AI Process] GET request received');
  
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ [AI Process] GET - Authentication failed');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if this is a test request
    const { searchParams } = new URL(request.url);
    const testMode = searchParams.get('test') === 'true';
    const healthCheck = searchParams.get('health') === 'true';

    console.log('🔍 [AI Process] GET params:', { testMode, healthCheck });

    if (healthCheck) {
      console.log('🏥 [AI Process] GET - Health check requested');
      // Check AI Processor health
      const isHealthy = await aiProcessorClient.healthCheck();
      const healthInfo = await aiProcessorClient.getHealthInfo();
      const config = aiProcessorClient.getConfig();

      console.log('🏥 [AI Process] GET - Health check results:', { isHealthy, hasHealthInfo: !!healthInfo });

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
      console.log('🧪 [AI Process] GET - Test mode requested');
      // Run comprehensive AI testing
      const testResult = await aiProcessorClient.testProcessing();
      const healthInfo = await aiProcessorClient.getHealthInfo();
      
      console.log('🧪 [AI Process] GET - Test results:', { success: testResult.success });

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
      console.log('📋 [AI Process] GET - API info requested');
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
    console.error('💥 [AI Process] Unexpected error in GET /api/ai/process:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 