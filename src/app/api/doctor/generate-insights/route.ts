import { NextRequest, NextResponse } from 'next/server';

/**
 * =====================================
 * REAL-TIME MEDICAL INSIGHTS API ROUTE
 * =====================================
 * 
 * This API route generates real-time medical insights from partial transcriptions
 * during long consultations. It provides live diagnostic suggestions and analysis
 * to assist doctors during ongoing consultations.
 * 
 * WORKFLOW:
 * 1. Receives partial transcription from completed chunks
 * 2. Analyzes content for medical insights using GPT-4o
 * 3. Generates diagnostic suggestions and recommendations
 * 4. Returns insights for real-time display (no database writes)
 * 
 * REAL-TIME INSIGHTS FEATURES:
 * - Live medical analysis during consultation
 * - Diagnostic hypothesis generation
 * - Symptom pattern recognition
 * - Treatment suggestion prompts
 * - Risk factor identification
 * - Memory-based processing only
 * 
 * REQUEST FORMAT:
 * {
 *   partial_transcript: string,
 *   session_id: string,
 *   chunk_number: number,
 *   patient_context?: {
 *     name?: string,
 *     age?: number,
 *     gender?: string
 *   },
 *   previous_insights?: string[]
 * }
 * 
 * RESPONSE FORMAT:
 * {
 *   success: boolean,
 *   insights: {
 *     diagnostic_hypotheses: string[],
 *     key_symptoms: string[],
 *     risk_factors: string[],
 *     suggested_questions: string[],
 *     treatment_considerations: string[],
 *     urgency_level: 'low' | 'medium' | 'high' | 'urgent'
 *   },
 *   session_id: string,
 *   chunk_number: number,
 *   processing_time: number
 * }
 */

interface GenerateInsightsRequest {
  partial_transcript: string;
  session_id: string;
  chunk_number: number;
  patient_context?: {
    name?: string;
    age?: number;
    gender?: string;
  };
  previous_insights?: string[];
}

interface MedicalInsights {
  diagnostic_hypotheses: string[];
  key_symptoms: string[];
  risk_factors: string[];
  suggested_questions: string[];
  treatment_considerations: string[];
  urgency_level: 'low' | 'medium' | 'high' | 'urgent';
}

export async function POST(request: NextRequest) {
  console.log('🚀 [GENERATE-INSIGHTS] Starting real-time medical insights generation');
  
  try {
    // Parse request body
    const body: GenerateInsightsRequest = await request.json();
    const { 
      partial_transcript, 
      session_id, 
      chunk_number, 
      patient_context,
      previous_insights 
    } = body;

    console.log('📋 [GENERATE-INSIGHTS] Request parameters:');
    console.log('  - session_id:', session_id);
    console.log('  - chunk_number:', chunk_number);
    console.log('  - transcript length:', partial_transcript?.length || 0);
    console.log('  - transcript word count:', partial_transcript?.split(' ').length || 0);
    console.log('  - patient_context:', patient_context || 'Not provided');
    console.log('  - previous_insights count:', previous_insights?.length || 0);

    // Validate required fields
    if (!partial_transcript || !partial_transcript.trim()) {
      console.error('❌ [GENERATE-INSIGHTS] No partial transcript provided');
      return NextResponse.json(
        { success: false, error: 'Partial transcript is required' },
        { status: 400 }
      );
    }

    if (!session_id) {
      console.error('❌ [GENERATE-INSIGHTS] No session ID provided');
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Check OpenAI API key
    const openaiApiKey = process.env.OPENAI_API_KEY;
    console.log('🔑 [GENERATE-INSIGHTS] OpenAI API configuration:', {
      hasApiKey: !!openaiApiKey,
      keyLength: openaiApiKey ? openaiApiKey.length : 0,
      keyPrefix: openaiApiKey ? openaiApiKey.substring(0, 7) + '...' : 'None'
    });
    
    if (!openaiApiKey) {
      console.error('❌ [GENERATE-INSIGHTS] OpenAI API key not configured');
      return NextResponse.json(
        { success: false, error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Prepare context for insights generation
    const patientInfo = patient_context ? 
      `Paciente: ${patient_context.name || '[Nome não fornecido]'}, ${patient_context.age || 'Idade não informada'} anos, ${patient_context.gender || 'Gênero não informado'}` : 
      'Informações do paciente não disponíveis';

    const previousInsightsContext = previous_insights && previous_insights.length > 0 ?
      `\n\nINSIGHTS ANTERIORES DESTA CONSULTA:\n${previous_insights.join('\n')}` :
      '';

    // Create specialized medical insights prompt
    const systemPrompt = `Você é um assistente médico especializado em análise clínica em tempo real. Sua função é analisar transcrições parciais de consultas médicas e fornecer insights diagnósticos para auxiliar o médico durante a consulta.

INSTRUÇÕES IMPORTANTES:
1. Analise apenas o conteúdo fornecido na transcrição parcial
2. Gere hipóteses diagnósticas baseadas nos sintomas relatados
3. Identifique fatores de risco mencionados
4. Sugira perguntas adicionais que o médico pode fazer
5. Avalie o nível de urgência baseado nos sintomas
6. NÃO faça diagnósticos definitivos - apenas hipóteses para consideração
7. Mantenha linguagem técnica apropriada para profissionais médicos
8. Foque em informações acionáveis para o médico

CONTEXTO DA CONSULTA:
- ${patientInfo}
- Sessão: ${session_id}
- Chunk atual: ${chunk_number + 1}
- Status: Consulta em andamento (análise em tempo real)${previousInsightsContext}`;

    const userPrompt = `Analise esta transcrição parcial de consulta médica e gere insights em tempo real para auxiliar o médico:

TRANSCRIÇÃO PARCIAL:
"""
${partial_transcript}
"""

Por favor, forneça insights estruturados no seguinte formato JSON:

{
  "diagnostic_hypotheses": ["Hipótese 1", "Hipótese 2", "Hipótese 3"],
  "key_symptoms": ["Sintoma chave 1", "Sintoma chave 2"],
  "risk_factors": ["Fator de risco 1", "Fator de risco 2"],
  "suggested_questions": ["Pergunta sugerida 1", "Pergunta sugerida 2"],
  "treatment_considerations": ["Consideração 1", "Consideração 2"],
  "urgency_level": "low|medium|high|urgent"
}

Responda APENAS com o JSON válido, sem texto adicional.`;

    const requestPayload = {
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user', 
          content: userPrompt
        }
      ],
      temperature: 0.2, // Lower temperature for more consistent medical analysis
      max_completion_tokens: 1000, // Sufficient for structured insights
      response_format: { type: "json_object" }, // Ensure JSON response
      top_p: 0.9,
      frequency_penalty: 0,
      presence_penalty: 0
    };

    console.log('🤖 [GENERATE-INSIGHTS] Sending insights request to OpenAI...');
    console.log('  - Model: gpt-4o');
    console.log('  - Temperature:', requestPayload.temperature);
    console.log('  - Max completion tokens:', requestPayload.max_completion_tokens);
    console.log('  - Response format: JSON');

    const startTime = Date.now();

    // Send request to OpenAI with timeout handling
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn('⏰ [GENERATE-INSIGHTS] OpenAI request timeout after 30 seconds');
      abortController.abort();
    }, 30000); // 30 second timeout for real-time insights

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify(requestPayload),
      signal: abortController.signal
    });

    clearTimeout(timeoutId);

    const processingTime = Date.now() - startTime;

    console.log('📥 [GENERATE-INSIGHTS] OpenAI response:');
    console.log('  - Status:', openaiResponse.status);
    console.log('  - Status Text:', openaiResponse.statusText);
    console.log('  - Processing time:', processingTime, 'ms');

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({}));
      console.error('❌ [GENERATE-INSIGHTS] OpenAI API error:');
      console.error('  - Status:', openaiResponse.status);
      console.error('  - Error data:', errorData);
      
      return NextResponse.json(
        { 
          success: false, 
          error: `OpenAI API error: ${openaiResponse.status} ${errorData.error?.message || 'Unknown error'}`,
          session_id,
          chunk_number
        },
        { status: openaiResponse.status }
      );
    }

    // Parse OpenAI response
    const openaiResult = await openaiResponse.json();
    
    if (!openaiResult.choices || openaiResult.choices.length === 0) {
      console.error('❌ [GENERATE-INSIGHTS] No choices in OpenAI response');
      return NextResponse.json(
        { success: false, error: 'No insights generated from OpenAI', session_id, chunk_number },
        { status: 500 }
      );
    }

    const insightsContent = openaiResult.choices[0].message.content;
    
    // Parse JSON insights
    let insights: MedicalInsights;
    try {
      insights = JSON.parse(insightsContent);
    } catch (parseError) {
      console.error('❌ [GENERATE-INSIGHTS] Failed to parse insights JSON:', parseError);
      console.error('❌ [GENERATE-INSIGHTS] Raw content:', insightsContent);
      return NextResponse.json(
        { success: false, error: 'Failed to parse medical insights', session_id, chunk_number },
        { status: 500 }
      );
    }

    // Validate insights structure
    if (!insights.diagnostic_hypotheses || !Array.isArray(insights.diagnostic_hypotheses)) {
      console.error('❌ [GENERATE-INSIGHTS] Invalid insights structure');
      return NextResponse.json(
        { success: false, error: 'Invalid insights structure returned', session_id, chunk_number },
        { status: 500 }
      );
    }

    console.log('✅ [GENERATE-INSIGHTS] Insights generated successfully:');
    console.log('  - Diagnostic hypotheses:', insights.diagnostic_hypotheses.length);
    console.log('  - Key symptoms:', insights.key_symptoms?.length || 0);
    console.log('  - Risk factors:', insights.risk_factors?.length || 0);
    console.log('  - Suggested questions:', insights.suggested_questions?.length || 0);
    console.log('  - Treatment considerations:', insights.treatment_considerations?.length || 0);
    console.log('  - Urgency level:', insights.urgency_level);
    console.log('  - Processing time:', processingTime, 'ms');
    console.log('  - Tokens used:', openaiResult.usage?.total_tokens || 'Unknown');

    // Return successful response with insights
    return NextResponse.json({
      success: true,
      insights: {
        diagnostic_hypotheses: insights.diagnostic_hypotheses || [],
        key_symptoms: insights.key_symptoms || [],
        risk_factors: insights.risk_factors || [],
        suggested_questions: insights.suggested_questions || [],
        treatment_considerations: insights.treatment_considerations || [],
        urgency_level: insights.urgency_level || 'low'
      },
      session_id,
      chunk_number,
      processing_time: processingTime,
      usage: openaiResult.usage
    });

  } catch (error) {
    console.error('❌ [GENERATE-INSIGHTS] Unexpected error:', error);
    console.error('❌ [GENERATE-INSIGHTS] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    // Handle timeout errors specifically
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('⏰ [GENERATE-INSIGHTS] Request was aborted due to timeout');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Insights generation timeout - please try again',
          session_id: 'unknown',
          chunk_number: -1
        },
        { status: 408 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error',
        session_id: 'unknown',
        chunk_number: -1
      },
      { status: 500 }
    );
  }
}