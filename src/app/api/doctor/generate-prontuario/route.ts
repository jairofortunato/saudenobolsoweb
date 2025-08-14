import { NextRequest, NextResponse } from 'next/server';

/**
 * =====================================
 * PRONTUÁRIO GENERATION API ROUTE
 * =====================================
 * 
 * This API route handles clinical prontuário generation using GPT-4o.
 * It takes a medical transcription and converts it into a structured 
 * medical record in Portuguese following clinical documentation standards.
 * 
 * WORKFLOW:
 * 1. Receives transcription text from RecordingAndTranscription component
 * 2. Sends to OpenAI GPT-4o with specialized medical prompt
 * 3. Returns structured clinical prontuário in Portuguese
 * 
 * OPENAI INTEGRATION:
 * - Model: GPT-4o (advanced model for medical analysis)
 * - Temperature: 0.3 (balanced creativity with medical accuracy)
 * - Max completion tokens: 2000 (sufficient for comprehensive prontuário)
 * 
 * SOAP FORMAT:
 * - S (Subjetivo): Patient's reported symptoms and history
 * - O (Objetivo): Physical examination findings
 * - A (Avaliação): Medical assessment and diagnosis
 * - P (Plano): Treatment plan and recommendations
 * 
 * REQUEST FORMAT:
 * {
 *   transcript: string,
 *   patient_name?: string,
 *   instruction: string
 * }
 * 
 * RESPONSE FORMAT:
 * {
 *   success: boolean,
 *   prontuario: string,
 *   model: string,
 *   processing_time: number
 * }
 */

interface GenerateProntuarioRequest {
  transcript: string;
  patient_name?: string;
  instruction?: string; // Optional - will use template if provided
  template_id?: string; // Template ID from consultation_templates table
  template?: {
    name: string;
    specialty: string;
    template_structure: any;
    ai_prompt_template: string;
  };
}

export async function POST(request: NextRequest) {
  console.log('🚀 [GENERATE-PRONTUARIO] Starting prontuário generation request');
  
  try {
    // Parse request body
    const body: GenerateProntuarioRequest = await request.json();
    const { transcript, patient_name, instruction, template_id, template } = body;

    console.log('📋 [GENERATE-PRONTUARIO] Request parameters:');
    console.log('  - transcript length:', transcript?.length || 0);
    console.log('  - patient_name:', patient_name || 'Not provided');
    console.log('  - template_id:', template_id || 'Not provided');
    console.log('  - template name:', template?.name || 'Not provided');
    console.log('  - instruction (legacy):', instruction || 'Not provided');

    // Validate required fields
    if (!transcript || !transcript.trim()) {
      console.error('❌ [GENERATE-PRONTUARIO] No transcript provided');
      return NextResponse.json(
        { success: false, error: 'Transcript is required' },
        { status: 400 }
      );
    }

    // Determine AI prompt to use (template takes precedence over instruction)
    let aiPromptTemplate: string;
    let templateName = 'Consulta Geral (SOAP)';
    let templateSpecialty = 'Clínica Geral';

    if (template && template.ai_prompt_template) {
      // Use provided template
      aiPromptTemplate = template.ai_prompt_template;
      templateName = template.name;
      templateSpecialty = template.specialty;
      console.log('📋 [GENERATE-PRONTUARIO] Using provided template:', templateName);
    } else if (instruction && instruction.trim()) {
      // Fallback to legacy instruction parameter
      aiPromptTemplate = `Você é um assistente médico especializado em registros clínicos. A seguir, você receberá a transcrição de uma conversa entre um médico e um paciente. Sua tarefa é transformar essa transcrição em um prontuário clínico estruturado no seguinte formato:

🧾 Prontuário:

Alergias:

Liste aqui as alergias mencionadas. Se o paciente não relatar nenhuma, escreva "Não referidas".

MUC:

Liste as medicações que o paciente faz uso contínuo. Se não houver, escreva "Não referidas".

Comorbidades:

Liste as condições clínicas prévias relatadas. Se não houver, escreva "Não referidas".

S:

Descreva o que o paciente relatou espontaneamente sobre seus sintomas, queixas, histórico do problema, e impacto nas atividades diárias.

O:

Descreva os achados clínicos observados pelo médico, como inspeção, palpação, ausculta, sinais clínicos, exames físicos (se mencionados). Quebre linhas para cada campo.

A:

Informe a hipótese diagnóstica do médico com base nas informações subjetivas e objetivas. seja mais objetivo, utilize apenas palavras (exemplos: HAS, bursite do ombro, fibromialgia), quando estiver com dúvida diagnóstica coloque um ponto de interrogação (exemplo: insuficiência cardíaca?)

P:

Descreva a conduta proposta pelo médico: exames solicitados, medicamentos prescritos, orientações ou encaminhamentos. Escrito em primeira pessoa do presente


Descreva a conduta proposta pelo médico: exames solicitados, medicamentos prescritos, orientações ou encaminhamentos.

Instruções adicionais:

- Tire todos asteriscos na formatacao do prontuario
- Palavras estranhas ou incompletas provavelmente são erros da transcrição passando nomes de remédios ou doencas, corrija.
- Resuma com linguagem clínica e objetiva
- Organize em formato limpo e fácil de ler
- Se uma informação não for mencionada na transcrição, use "Não referido(a)" no campo correspondente
- Não invente dados. Apenas use o que está presente na transcrição`;
      console.log('📋 [GENERATE-PRONTUARIO] Using legacy instruction parameter');
    } else {
      // Use default clinical format when no template or instruction is provided
      aiPromptTemplate = `Você é um assistente médico especializado em registros clínicos. A seguir, você receberá a transcrição de uma conversa entre um médico e um paciente. Sua tarefa é transformar essa transcrição em um prontuário clínico estruturado no seguinte formato:

🧾 Prontuário:

Alergias:

Liste aqui as alergias mencionadas. Se o paciente não relatar nenhuma, escreva "Não referidas".

MUC:

Liste as medicações que o paciente faz uso contínuo. Se não houver, escreva "Não referidas".

Comorbidades:

Liste as condições clínicas prévias relatadas. Se não houver, escreva "Não referidas".

S:

Descreva o que o paciente relatou espontaneamente sobre seus sintomas, queixas, histórico do problema, e impacto nas atividades diárias.

O:

Descreva os achados clínicos observados pelo médico, como inspeção, palpação, ausculta, sinais clínicos, exames físicos (se mencionados). Quebre linhas para cada campo.

A:

Informe a hipótese diagnóstica do médico com base nas informações subjetivas e objetivas. seja mais objetivo, utilize apenas palavras (exemplos: HAS, bursite do ombro, fibromialgia), quando estiver com dúvida diagnóstica coloque um ponto de interrogação (exemplo: insuficiência cardíaca?)

P:

Descreva a conduta proposta pelo médico: exames solicitados, medicamentos prescritos, orientações ou encaminhamentos. Escrito em primeira pessoa do presente

Instruções adicionais:

- Tire todos asteriscos na formatacao do prontuario
- Palavras estranhas ou incompletas provavelmente são erros da transcrição passando nomes de remédios ou doencas, corrija.
- Resuma com linguagem clínica e objetiva
- Organize em formato limpo e fácil de ler
- Se uma informação não for mencionada na transcrição, use "Não referido(a)" no campo correspondente
- Não invente dados. Apenas use o que está presente na transcrição`;
      templateName = 'Consulta Geral (Formato Clínico)';
      templateSpecialty = 'Clínica Geral';
      console.log('📋 [GENERATE-PRONTUARIO] Using default clinical format template');
    }

    // Check OpenAI API key
    const openaiApiKey = process.env.OPENAI_API_KEY;
    console.log('🔑 [GENERATE-PRONTUARIO] OpenAI API configuration:', {
      hasApiKey: !!openaiApiKey,
      keyLength: openaiApiKey ? openaiApiKey.length : 0,
      keyPrefix: openaiApiKey ? openaiApiKey.substring(0, 7) + '...' : 'None'
    });
    
    if (!openaiApiKey) {
      console.error('❌ [GENERATE-PRONTUARIO] OpenAI API key not configured');
      return NextResponse.json(
        { success: false, error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Prepare medical prompt using selected template
    const systemPrompt = `Você é um assistente médico especializado em organizar transcrições de consultas médicas em prontuários estruturados.

INFORMAÇÕES DA CONSULTA:
- Paciente: ${patient_name || '[Nome do paciente]'}
- Data: ${new Date().toLocaleDateString('pt-BR')}
- Template: ${templateName}
- Especialidade: ${templateSpecialty}

Sua tarefa é analisar a transcrição fornecida e organizá-la conforme as instruções específicas do template selecionado.`;

    const userPrompt = `${aiPromptTemplate}

TRANSCRIÇÃO DA CONSULTA:
"""
${transcript}
"""

Por favor, organize esta transcrição em um prontuário estruturado conforme as instruções do template.`;

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
      max_completion_tokens: 2000,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    };

    console.log('🤖 [GENERATE-PRONTUARIO] Sending request to OpenAI...');
    console.log('  - Model: gpt-4o');
    console.log('  - System prompt length:', systemPrompt.length);
    console.log('  - User prompt length:', userPrompt.length);
    console.log('  - Temperature:', requestPayload.temperature);
    console.log('  - Max completion tokens:', requestPayload.max_completion_tokens);
    console.log('  - Total characters to process:', systemPrompt.length + userPrompt.length);

    const startTime = Date.now();

    // Send request to OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify(requestPayload)
    });

    const processingTime = Date.now() - startTime;

    console.log('📥 [GENERATE-PRONTUARIO] OpenAI response:');
    console.log('  - Status:', openaiResponse.status);
    console.log('  - Status Text:', openaiResponse.statusText);
    console.log('  - Processing time:', processingTime, 'ms');
    console.log('  - Response Headers:', Object.fromEntries(openaiResponse.headers.entries()));

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({}));
      console.error('❌ [GENERATE-PRONTUARIO] OpenAI API error:');
      console.error('  - Status:', openaiResponse.status);
      console.error('  - Error data:', errorData);
      
      return NextResponse.json(
        { 
          success: false, 
          error: `OpenAI API error: ${openaiResponse.status} ${errorData.error?.message || 'Unknown error'}` 
        },
        { status: openaiResponse.status }
      );
    }

    // Parse OpenAI response
    const openaiResult = await openaiResponse.json();
    
    if (!openaiResult.choices || openaiResult.choices.length === 0) {
      console.error('❌ [GENERATE-PRONTUARIO] No choices in OpenAI response');
      return NextResponse.json(
        { success: false, error: 'No response generated from OpenAI' },
        { status: 500 }
      );
    }

    const generatedProntuario = openaiResult.choices[0].message.content;
    
    console.log('✅ [GENERATE-PRONTUARIO] Prontuário generated successfully:');
    console.log('  - Length:', generatedProntuario?.length || 0);
    console.log('  - Processing time:', processingTime, 'ms');
    console.log('  - Tokens used:', openaiResult.usage?.total_tokens || 'Unknown');

    // Return successful response
    return NextResponse.json({
      success: true,
      prontuario: generatedProntuario,
      model: 'gpt-4o',
      processing_time: processingTime,
      usage: openaiResult.usage,
      template: {
        name: templateName,
        specialty: templateSpecialty,
        id: template_id || 'default'
      }
    });

  } catch (error) {
    console.error('❌ [GENERATE-PRONTUARIO] Unexpected error:', error);
    console.error('❌ [GENERATE-PRONTUARIO] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}