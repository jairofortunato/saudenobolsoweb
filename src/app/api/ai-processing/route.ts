import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { model, instructionPrompt, transcript, sessionId } = await request.json();

    console.log(`🚀 AI Processing Request - Session ${sessionId}:`);
    console.log(`📋 Model: ${model}`);
    console.log(`📝 Instruction prompt length: ${instructionPrompt.length}`);
    console.log(`📄 Transcript length: ${transcript.length}`);

    // Validate required fields
    if (!model || !instructionPrompt || !transcript) {
      return NextResponse.json(
        { error: 'Missing required fields: model, instructionPrompt, or transcript' },
        { status: 400 }
      );
    }

    // Validate OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI API key not configured');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Prepare the messages for OpenAI
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: instructionPrompt
      },
      {
        role: 'user',
        content: `Por favor, analise a seguinte transcrição de consulta médica e organize as informações seguindo o formato solicitado:

---TRANSCRIÇÃO---
${transcript}
---FIM DA TRANSCRIÇÃO---

Organize essas informações em um prontuário médico estruturado conforme suas instruções.`
      }
    ];

    console.log('🤖 Sending request to OpenAI...');

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: model,
      messages: messages,
      max_tokens: 2000,
      temperature: 0.3,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    const prontuario = completion.choices[0]?.message?.content;

    if (!prontuario) {
      throw new Error('No response from OpenAI');
    }

    console.log(`✅ AI Processing completed for Session ${sessionId}`);
    console.log(`📊 Tokens used: ${completion.usage?.total_tokens || 'unknown'}`);

    // Add metadata footer
    const prontuarioWithMetadata = `${prontuario}

---
*Prontuário gerado automaticamente*
*Modelo: ${model}*
*Sessão: ${sessionId}*
*Tokens utilizados: ${completion.usage?.total_tokens || 'N/A'}*
*Data de processamento: ${new Date().toLocaleString('pt-BR')}*`;

    return NextResponse.json({
      success: true,
      prontuario: prontuarioWithMetadata,
      sessionId,
      model,
      tokensUsed: completion.usage?.total_tokens || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ AI Processing Error:', error);

    // Handle specific OpenAI errors
    if (error?.error?.type === 'insufficient_quota') {
      return NextResponse.json(
        { error: 'OpenAI API quota exceeded. Please check your billing.' },
        { status: 429 }
      );
    }

    if (error?.error?.type === 'invalid_api_key') {
      return NextResponse.json(
        { error: 'Invalid OpenAI API key' },
        { status: 401 }
      );
    }

    // Generic error response
    return NextResponse.json(
      { 
        error: 'AI processing failed', 
        details: error.message || 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'AI Processing API endpoint',
    status: 'Active',
    supportedModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
    timestamp: new Date().toISOString()
  });
}