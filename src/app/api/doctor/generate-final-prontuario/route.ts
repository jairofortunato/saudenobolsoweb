import { NextRequest, NextResponse } from 'next/server';

/**
 * =====================================
 * FINAL PRONTUÁRIO GENERATION API ROUTE
 * =====================================
 * 
 * This API route generates the final comprehensive medical record by combining
 * all transcription chunks from a long consultation. It maintains chronological
 * order and context continuity across multiple 4-minute segments.
 * 
 * WORKFLOW:
 * 1. Receives all transcription chunks from session
 * 2. Combines chunks in chronological order
 * 3. Generates comprehensive medical record using GPT-4o
 * 4. Maintains consultation context and references
 * 5. Returns final prontuário (memory-based, no database writes)
 * 
 * FINAL PRONTUÁRIO FEATURES:
 * - Comprehensive medical record from all chunks
 * - Chronological consultation flow preservation
 * - Cross-reference handling between chunks
 * - Complete SOAP format generation
 * - Context continuity maintenance
 * - Memory-based processing only
 * 
 * REQUEST FORMAT:
 * {
 *   transcription_chunks: {
 *     chunk_number: number,
 *     transcript: string,
 *     timestamp: string,
 *     confidence: number
 *   }[],
 *   session_id: string,
 *   patient_context?: {
 *     name?: string,
 *     age?: number,
 *     gender?: string
 *   },
 *   template?: {
 *     name: string,
 *     specialty: string,
 *     ai_prompt_template: string
 *   }
 * }
 * 
 * RESPONSE FORMAT:
 * {
 *   success: boolean,
 *   final_prontuario: string,
 *   session_id: string,
 *   total_chunks: number,
 *   total_transcript_length: number,
 *   processing_time: number,
 *   template_used: object
 * }
 */

interface TranscriptionChunk {
  chunk_number: number;
  transcript: string;
  timestamp: string;
  confidence: number;
}

interface GenerateFinalProntuarioRequest {
  transcription_chunks: TranscriptionChunk[];
  session_id: string;
  patient_context?: {
    name?: string;
    age?: number;
    gender?: string;
  };
  template?: {
    name: string;
    specialty: string;
    ai_prompt_template: string;
  };
}

export async function POST(request: NextRequest) {
  console.log('🚀 [GENERATE-FINAL-PRONTUARIO] Starting final prontuário generation for long consultation');
  
  try {
    // Parse request body
    const body: GenerateFinalProntuarioRequest = await request.json();
    const { 
      transcription_chunks, 
      session_id, 
      patient_context,
      template 
    } = body;

    console.log('📋 [GENERATE-FINAL-PRONTUARIO] Request parameters:');
    console.log('  - session_id:', session_id);
    console.log('  - total_chunks:', transcription_chunks?.length || 0);
    console.log('  - patient_context:', patient_context || 'Not provided');
    console.log('  - template:', template?.name || 'Default');

    // Validate required fields
    if (!transcription_chunks || !Array.isArray(transcription_chunks) || transcription_chunks.length === 0) {
      console.error('❌ [GENERATE-FINAL-PRONTUARIO] No transcription chunks provided');
      return NextResponse.json(
        { success: false, error: 'Transcription chunks are required' },
        { status: 400 }
      );
    }

    if (!session_id) {
      console.error('❌ [GENERATE-FINAL-PRONTUARIO] No session ID provided');
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Sort chunks by chunk_number to ensure chronological order
    const sortedChunks = transcription_chunks.sort((a, b) => a.chunk_number - b.chunk_number);

    // Combine all transcriptions with chunk markers for context
    let combinedTranscript = '';
    let totalTranscriptLength = 0;
    let lowestConfidence = 1.0;

    sortedChunks.forEach((chunk, index) => {
      if (chunk.transcript && chunk.transcript.trim()) {
        const chunkHeader = `\n\n=== SEGMENTO ${chunk.chunk_number + 1} DA CONSULTA ===\n`;
        combinedTranscript += chunkHeader + chunk.transcript.trim();
        totalTranscriptLength += chunk.transcript.length;
        
        if (chunk.confidence < lowestConfidence) {
          lowestConfidence = chunk.confidence;
        }
      }
    });

    console.log('📝 [GENERATE-FINAL-PRONTUARIO] Combined transcript statistics:');
    console.log('  - Total chunks processed:', sortedChunks.length);
    console.log('  - Combined transcript length:', combinedTranscript.length);
    console.log('  - Total original transcript length:', totalTranscriptLength);
    console.log('  - Combined word count:', combinedTranscript.split(' ').length);
    console.log('  - Lowest chunk confidence:', lowestConfidence);

    if (!combinedTranscript.trim()) {
      console.error('❌ [GENERATE-FINAL-PRONTUARIO] Combined transcript is empty');
      return NextResponse.json(
        { success: false, error: 'Combined transcript is empty' },
        { status: 400 }
      );
    }

    // Check OpenAI API key
    const openaiApiKey = process.env.OPENAI_API_KEY;
    console.log('🔑 [GENERATE-FINAL-PRONTUARIO] OpenAI API configuration:', {
      hasApiKey: !!openaiApiKey,
      keyLength: openaiApiKey ? openaiApiKey.length : 0,
      keyPrefix: openaiApiKey ? openaiApiKey.substring(0, 7) + '...' : 'None'
    });
    
    if (!openaiApiKey) {
      console.error('❌ [GENERATE-FINAL-PRONTUARIO] OpenAI API key not configured');
      return NextResponse.json(
        { success: false, error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Prepare template for AI prompt
    let aiPromptTemplate: string;
    let templateName = 'Consulta Geral (SOAP)';
    let templateSpecialty = 'Clínica Geral';

    if (template && template.ai_prompt_template) {
      aiPromptTemplate = template.ai_prompt_template;
      templateName = template.name;
      templateSpecialty = template.specialty;
      console.log('📋 [GENERATE-FINAL-PRONTUARIO] Using provided template:', templateName);
    } else {
      // Use default comprehensive template for long consultations
      aiPromptTemplate = `Você é um assistente médico especializado em registros clínicos. A seguir, você receberá a transcrição COMPLETA de uma consulta médica longa que foi dividida em múltiplos segmentos de 4 minutos cada. Sua tarefa é transformar essa transcrição em um prontuário clínico estruturado e abrangente no seguinte formato:

🧾 Prontuário:

Alergias:
Liste aqui as alergias mencionadas durante toda a consulta. Se o paciente não relatar nenhuma, escreva "Não referidas".

MUC:
Liste as medicações que o paciente faz uso contínuo, mencionadas em qualquer momento da consulta. Se não houver, escreva "Não referidas".

Comorbidades:
Liste as condições clínicas prévias relatadas durante toda a consulta. Se não houver, escreva "Não referidas".

S:
Descreva TUDO que o paciente relatou espontaneamente sobre seus sintomas, queixas, histórico do problema, e impacto nas atividades diárias. Inclua informações de todos os segmentos da consulta de forma cronológica e coerente.

O:
Descreva todos os achados clínicos observados pelo médico durante toda a consulta: inspeção, palpação, ausculta, sinais clínicos, exames físicos. Organize por sistemas ou áreas examinadas. Quebre linhas para cada campo.

A:
Informe as hipóteses diagnósticas do médico com base em todas as informações coletadas durante a consulta completa. Seja objetivo, utilize termos clínicos apropriados. Quando houver dúvida diagnóstica, use ponto de interrogação (exemplo: insuficiência cardíaca?).

P:
Descreva toda a conduta proposta pelo médico durante a consulta: exames solicitados, medicamentos prescritos, orientações, encaminhamentos, retornos agendados. Inclua tudo que foi discutido sobre o plano terapêutico.

INSTRUÇÕES ESPECIAIS PARA CONSULTAS LONGAS:
- Esta transcrição foi dividida em segmentos de ~4 minutos cada
- Mantenha a cronologia dos eventos durante a consulta
- Combine informações relacionadas de diferentes segmentos
- Se informações contraditórias aparecerem, priorize as mais recentes ou esclarecimentos posteriores
- Tire todos asteriscos na formatação do prontuário
- Palavras estranhas ou incompletas provavelmente são erros de transcrição - corrija quando possível
- Resuma com linguagem clínica e objetiva
- Organize em formato limpo e fácil de ler
- Se uma informação não for mencionada na transcrição, use "Não referido(a)" no campo correspondente
- Não invente dados. Apenas use o que está presente na transcrição completa`;
      
      templateName = 'Consulta Longa (SOAP Abrangente)';
      templateSpecialty = 'Clínica Geral';
      console.log('📋 [GENERATE-FINAL-PRONTUARIO] Using default long consultation template');
    }

    // Prepare context for final prontuário generation
    const patientInfo = patient_context ? 
      `${patient_context.name || '[Nome não fornecido]'}, ${patient_context.age || 'Idade não informada'} anos, ${patient_context.gender || 'Gênero não informado'}` : 
      '[Informações do paciente não disponíveis]';

    const systemPrompt = `Você é um assistente médico especializado em organizar transcrições longas de consultas médicas em prontuários estruturados e abrangentes.

INFORMAÇÕES DA CONSULTA:
- Paciente: ${patientInfo}
- Data: ${new Date().toLocaleDateString('pt-BR')}
- Template: ${templateName}
- Especialidade: ${templateSpecialty}
- Sessão: ${session_id}
- Total de segmentos: ${sortedChunks.length}
- Duração estimada: ${sortedChunks.length * 4} minutos

CONTEXTO ESPECIAL:
Esta é uma consulta longa que foi dividida em ${sortedChunks.length} segmentos de aproximadamente 4 minutos cada. Você deve:
1. Manter a cronologia dos eventos
2. Combinar informações relacionadas de diferentes segmentos
3. Criar um prontuário coeso e abrangente
4. Priorizar clareza e completude
5. Preservar nuances clínicas importantes

Sua tarefa é analisar toda a transcrição e organizá-la conforme as instruções específicas do template.`;

    const userPrompt = `${aiPromptTemplate}

TRANSCRIÇÃO COMPLETA DA CONSULTA LONGA:
"""
${combinedTranscript}
"""

INFORMAÇÕES ADICIONAIS:
- Total de segmentos processados: ${sortedChunks.length}
- Confiança média das transcrições: ${(lowestConfidence * 100).toFixed(1)}%
- Duração total estimada: ${sortedChunks.length * 4} minutos

Por favor, organize esta transcrição completa em um prontuário estruturado e abrangente conforme as instruções do template.`;

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
      temperature: 0.3,
      max_completion_tokens: 6000, // Increased for comprehensive long consultation records
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    };

    // Estimate token count
    const totalCharacters = systemPrompt.length + userPrompt.length;
    const estimatedInputTokens = Math.ceil(totalCharacters / 4);
    const estimatedTotalTokens = estimatedInputTokens + requestPayload.max_completion_tokens;

    console.log('🤖 [GENERATE-FINAL-PRONTUARIO] Sending final prontuário request to OpenAI...');
    console.log('  - Model: gpt-4o');
    console.log('  - Template:', templateName);
    console.log('  - Total chunks:', sortedChunks.length);
    console.log('  - Combined transcript length:', combinedTranscript.length);
    console.log('  - Estimated consultation duration:', sortedChunks.length * 4, 'minutes');
    console.log('  - Estimated input tokens:', estimatedInputTokens);
    console.log('  - Max completion tokens:', requestPayload.max_completion_tokens);

    const startTime = Date.now();

    // Send request to OpenAI with extended timeout for long consultations
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn('⏰ [GENERATE-FINAL-PRONTUARIO] OpenAI request timeout after 10 minutes');
      abortController.abort();
    }, 10 * 60 * 1000); // 10 minute timeout for long consultations

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

    console.log('📥 [GENERATE-FINAL-PRONTUARIO] OpenAI response:');
    console.log('  - Status:', openaiResponse.status);
    console.log('  - Status Text:', openaiResponse.statusText);
    console.log('  - Processing time:', processingTime, 'ms');

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({}));
      console.error('❌ [GENERATE-FINAL-PRONTUARIO] OpenAI API error:');
      console.error('  - Status:', openaiResponse.status);
      console.error('  - Error data:', errorData);
      
      return NextResponse.json(
        { 
          success: false, 
          error: `OpenAI API error: ${openaiResponse.status} ${errorData.error?.message || 'Unknown error'}`,
          session_id
        },
        { status: openaiResponse.status }
      );
    }

    // Parse OpenAI response
    const openaiResult = await openaiResponse.json();
    
    if (!openaiResult.choices || openaiResult.choices.length === 0) {
      console.error('❌ [GENERATE-FINAL-PRONTUARIO] No choices in OpenAI response');
      return NextResponse.json(
        { success: false, error: 'No final prontuário generated from OpenAI', session_id },
        { status: 500 }
      );
    }

    const finalProntuario = openaiResult.choices[0].message.content;
    
    console.log('✅ [GENERATE-FINAL-PRONTUARIO] Final prontuário generated successfully:');
    console.log('  - Session ID:', session_id);
    console.log('  - Total chunks processed:', sortedChunks.length);
    console.log('  - Final prontuário length:', finalProntuario?.length || 0);
    console.log('  - Processing time:', processingTime, 'ms');
    console.log('  - Tokens used:', openaiResult.usage?.total_tokens || 'Unknown');
    console.log('  - Template used:', templateName);

    // Return successful response
    return NextResponse.json({
      success: true,
      final_prontuario: finalProntuario,
      session_id,
      total_chunks: sortedChunks.length,
      total_transcript_length: totalTranscriptLength,
      combined_transcript_length: combinedTranscript.length,
      estimated_duration_minutes: sortedChunks.length * 4,
      lowest_confidence: lowestConfidence,
      processing_time: processingTime,
      usage: openaiResult.usage,
      template_used: {
        name: templateName,
        specialty: templateSpecialty
      }
    });

  } catch (error) {
    console.error('❌ [GENERATE-FINAL-PRONTUARIO] Unexpected error:', error);
    console.error('❌ [GENERATE-FINAL-PRONTUARIO] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    // Handle timeout errors specifically
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('⏰ [GENERATE-FINAL-PRONTUARIO] Request was aborted due to timeout');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Final prontuário generation timeout - the consultation may be too long. Please contact support.',
          session_id: 'unknown'
        },
        { status: 408 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error',
        session_id: 'unknown'
      },
      { status: 500 }
    );
  }
}