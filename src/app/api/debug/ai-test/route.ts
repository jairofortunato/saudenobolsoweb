import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase-server';
import { processTextWithAI } from '../../../../../lib/ai-processor';
import { isOpenAIConfigured, testOpenAIConnection } from '../../../../../lib/openai';

// GET /api/debug/ai-test - Test AI processing with sample data
export async function GET(_request: NextRequest) {
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

    // Check OpenAI configuration
    if (!isOpenAIConfigured()) {
      return NextResponse.json({
        error: 'OpenAI API key not configured',
        configured: false
      });
    }

    // Test OpenAI connection
    const connectionTest = await testOpenAIConnection();
    if (!connectionTest) {
      return NextResponse.json({
        error: 'OpenAI connection failed',
        configured: true,
        connected: false
      });
    }

    // Test AI processing with sample text
    const sampleTexts = {
      diseases: 'Fui diagnosticado com diabetes tipo 2 em janeiro de 2023. É uma condição crônica que preciso controlar.',
      medications: 'Estou tomando Metformina 500mg duas vezes ao dia desde março de 2023 para diabetes.',
      allergies: 'Sou alérgico a amendoim. Me dá urticária e inchaço na garganta, é bem sério.',
      exams: 'Fiz exame de sangue na segunda-feira passada com Dr. Silva. Meu colesterol deu 180.',
      consultations: 'Consultei Dr. João cardiologista dia 15 de dezembro por dor no peito. Ele disse que é ansiedade.'
    };

    const results: Record<string, unknown> = {};
    const errors: string[] = [];

    for (const [category, text] of Object.entries(sampleTexts)) {
      try {
        const result = await processTextWithAI(text, category as 'diseases' | 'medications' | 'allergies' | 'exams' | 'consultations');
        results[category] = result;
        
        if (!result.success) {
          errors.push(`${category}: ${result.error}`);
        }
      } catch (error) {
        const errorMsg = `${category}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        results[category] = { success: false, error: errorMsg };
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      openai_configured: true,
      openai_connected: true,
      test_results: results,
      overall_success: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Debug AI test error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/debug/ai-test - Test specific text and category
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

    const body = await request.json();
    const { text, category } = body;

    if (!text || !category) {
      return NextResponse.json(
        { error: 'Text and category are required' },
        { status: 400 }
      );
    }

    // Test AI processing with provided text
    const result = await processTextWithAI(text, category);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      input: { text, category },
      result: result
    });

  } catch (error) {
    console.error('Debug AI test error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 