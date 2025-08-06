import { NextRequest, NextResponse } from 'next/server';

/**
 * =====================================
 * PRONTUÁRIO GENERATION API ROUTE
 * =====================================
 * 
 * This API route handles SOAP prontuário generation using GPT-4o.
 * It takes a medical transcription and converts it into a structured 
 * medical record in Portuguese following SOAP methodology.
 * 
 * WORKFLOW:
 * 1. Receives transcription text from RecordingAndTranscription component
 * 2. Sends to OpenAI GPT-4o with specialized medical prompt
 * 3. Returns structured SOAP prontuário in Portuguese
 * 
 * OPENAI INTEGRATION:
 * - Model: GPT-4o (most capable model for medical analysis)
 * - Temperature: 0.3 (balanced creativity with medical accuracy)
 * - Max tokens: 2000 (sufficient for comprehensive prontuário)
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
      aiPromptTemplate = `Você é um assistente médico especializado em organizar transcrições de consultas médicas em prontuários estruturados seguindo a metodologia SOAP.

Sua tarefa é analisar a transcrição fornecida e organizá-la em um prontuário médico estruturado em português brasileiro, seguindo rigorosamente este formato:

## PRONTUÁRIO MÉDICO

**PACIENTE:** ${patient_name || '[Nome do paciente]'}
**DATA:** ${new Date().toLocaleDateString('pt-BR')}
**TIPO:** Consulta médica

---

### S - SUBJETIVO
[Queixa principal e história relatada pelo paciente]
- Sintomas descritos pelo paciente
- Duração e características dos sintomas
- Fatores de melhora ou piora
- História médica relevante mencionada

### O - OBJETIVO  
[Achados do exame físico e dados objetivos]
- Sinais vitais (se mencionados)
- Exame físico realizado
- Achados clínicos observados
- Resultados de exames (se disponíveis)

### A - AVALIAÇÃO
[Impressão diagnóstica e análise clínica]
- Hipótese(s) diagnóstica(s)
- Diagnóstico diferencial (se aplicável)
- Gravidade do quadro clínico

### P - PLANO
[Conduta terapêutica e orientações]
- Medicamentos prescritos
- Exames solicitados
- Orientações gerais
- Retorno e seguimento

---

**OBSERVAÇÕES IMPORTANTES:**
- Use apenas informações presentes na transcrição
- Mantenha linguagem médica apropriada
- Se alguma informação não foi mencionada, escreva "Não referido" ou "Não avaliado"
- Seja preciso e objetivo
- Organize as informações de forma clara e profissional`;
      console.log('📋 [GENERATE-PRONTUARIO] Using legacy instruction parameter');
    } else {
      console.error('❌ [GENERATE-PRONTUARIO] No template or instruction provided');
      return NextResponse.json(
        { success: false, error: 'Template or instruction is required' },
        { status: 400 }
      );
    }

    // Check OpenAI API key
    const openaiApiKey = process.env.OPENAI_API_KEY;
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

    console.log('🤖 [GENERATE-PRONTUARIO] Sending request to OpenAI...');
    console.log('  - Model: gpt-4o');
    console.log('  - System prompt length:', systemPrompt.length);
    console.log('  - User prompt length:', userPrompt.length);

    const startTime = Date.now();

    // Send request to OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
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
        max_tokens: 2000,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      })
    });

    const processingTime = Date.now() - startTime;

    console.log('📥 [GENERATE-PRONTUARIO] OpenAI response:');
    console.log('  - Status:', openaiResponse.status);
    console.log('  - Processing time:', processingTime, 'ms');

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