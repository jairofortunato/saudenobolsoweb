import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase-server';
import { processTextWithAI, processAndSubmitMedicalEntry, testAIProcessing } from '../../../../../lib/ai-processor';
import { type MedicalCategory } from '../../../../../lib/ai-prompts';

// POST /api/ai/process - Process medical text with AI
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
    const { text, category, submitDirectly, patientId } = body;

    // Validate required fields
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return NextResponse.json(
        { error: 'Text input is required' },
        { status: 400 }
      );
    }

    if (!category || typeof category !== 'string') {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories: MedicalCategory[] = ['diseases', 'medications', 'allergies', 'exams', 'consultations'];
    if (!validCategories.includes(category as MedicalCategory)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      );
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

    // Process the text with AI
    if (submitDirectly) {
      // Process and submit directly to the database
      const result = await processAndSubmitMedicalEntry(
        text.trim(),
        category as MedicalCategory,
        targetPatientId,
        profile.id,
        supabase
      );

      if (result.success) {
        return NextResponse.json({
          success: true,
          message: 'Medical entry created successfully',
          data: result.data,
          processing: {
            category,
            originalText: text.trim(),
            processed: true
          }
        }, { status: 201 });
      } else {
        // Check if AI needs more information
        if (result.needsMoreInfo && result.missingInfoMessage) {
          return NextResponse.json({
            success: false,
            error: result.error || 'Incomplete information provided',
            needsMoreInfo: true,
            missingInfoMessage: result.missingInfoMessage,
            processing: {
              category,
              originalText: text.trim(),
              processed: false
            }
          }, { status: 400 });
        }
        
        return NextResponse.json(
          { error: result.error || 'Failed to process and submit medical entry' },
          { status: 500 }
        );
      }
    } else {
      // Just extract structured data without submitting
      const aiResult = await processTextWithAI(text.trim(), category as MedicalCategory);

      if (aiResult.success) {
        return NextResponse.json({
          success: true,
          extractedData: aiResult.data,
          processing: {
            category: aiResult.category,
            originalText: aiResult.originalText,
            processed: true
          }
        });
      } else {
        return NextResponse.json(
          { error: aiResult.error || 'Failed to process text with AI' },
          { status: 500 }
        );
      }
    }

  } catch (error) {
    console.error('Unexpected error in POST /api/ai/process:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/ai/process - Test AI processing capabilities
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

    if (testMode) {
      // Run comprehensive AI testing
      const testResults = await testAIProcessing();
      
      return NextResponse.json({
        timestamp: new Date().toISOString(),
        testMode: true,
        ...testResults
      });
    } else {
      // Return API information
      return NextResponse.json({
        timestamp: new Date().toISOString(),
        endpoint: '/api/ai/process',
        methods: ['GET', 'POST'],
        description: 'Process medical text using AI to extract structured data',
        usage: {
          POST: {
            description: 'Process medical text with AI',
            body: {
              text: 'Medical text to process (required)',
              category: 'Medical category: diseases, medications, allergies, exams, consultations (required)',
              submitDirectly: 'Boolean - if true, submits directly to medical endpoint (optional)',
              patientId: 'Patient ID for doctors (optional)'
            }
          },
          GET: {
            description: 'Get API information or run tests',
            query: {
              test: 'Set to "true" to run AI processing tests'
            }
          }
        },
        supportedCategories: ['diseases', 'medications', 'allergies', 'exams', 'consultations']
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