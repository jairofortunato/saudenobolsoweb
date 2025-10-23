/**
 * =====================================
 * PRONTUÁRIO MERGE API ENDPOINT
 * =====================================
 *
 * Intelligently merges extracted exam image content with existing prontuário
 * using OpenAI to create a cohesive, updated medical record.
 *
 * Based on telegram-doczap/services/consultation_session_manager.py implementation.
 *
 * ENDPOINT: POST /api/ai/merge-prontuario
 *
 * REQUEST:
 * {
 *   "existing_prontuario": "Current prontuário text...",
 *   "image_content": "Extracted exam information...",
 *   "appointment_id": "optional-appointment-id"
 * }
 *
 * RESPONSE:
 * {
 *   "success": true,
 *   "merged_prontuario": "Updated prontuário with integrated exam information...",
 *   "changes_summary": "Summary of what was added/modified"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds timeout

export async function POST(request: NextRequest) {
  console.log('🔄 [MERGE PRONTUARIO] Starting prontuário merge...');

  try {
    const body = await request.json();
    const {
      existing_prontuario,
      image_content,
      appointment_id
    } = body;

    // Validation
    if (!existing_prontuario || typeof existing_prontuario !== 'string') {
      return NextResponse.json(
        { error: 'existing_prontuario is required and must be a string' },
        { status: 400 }
      );
    }

    if (!image_content || typeof image_content !== 'string') {
      return NextResponse.json(
        { error: 'image_content is required and must be a string' },
        { status: 400 }
      );
    }

    console.log('📝 [MERGE PRONTUARIO] Input received:', {
      existingLength: existing_prontuario.length,
      imageContentLength: image_content.length,
      appointmentId: appointment_id
    });

    // Call OpenAI to intelligently merge the content
    console.log('🤖 [MERGE PRONTUARIO] Calling OpenAI to merge content...');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Você é um assistente médico especializado em organizar e estruturar prontuários médicos.

Sua tarefa é integrar informações de exames médicos em um prontuário existente de forma inteligente e coesa, INSERINDO as informações nas seções apropriadas já existentes.

INSTRUÇÕES IMPORTANTES:

1. IDENTIFIQUE a estrutura do prontuário existente:
   - Formato SOAP (Subjetivo, Objetivo, Avaliação, Plano)
   - Formato narrativo com seções específicas
   - Quais seções já existem (Exames, Diagnóstico, Medicações, etc.)

2. ANALISE o conteúdo do exame e categorize as informações:
   - Resultados laboratoriais → Objetivo/Exames
   - Diagnósticos confirmados → Avaliação/Diagnóstico
   - Medicamentos prescritos → Plano/Medicações
   - Observações médicas → Seção apropriada

3. INTEGRE as informações DO EXAME DENTRO das seções já existentes:
   ❌ NÃO apenas adicione uma nova seção "EXAMES" no final
   ✅ INSIRA os resultados na seção "Objetivo", "Exames" ou "O:" que já existe
   ✅ MESCLE diagnósticos na seção "Avaliação" ou "A:" existente
   ✅ ADICIONE medicamentos na seção "Plano" ou "P:" existente
   ✅ Se uma seção não existir, crie-a no lugar apropriado do formato

4. MANTENHA o fluxo natural do prontuário:
   - Preserve a ordem das seções (S → O → A → P ou equivalente)
   - Integre os dados de forma que pareçam parte original do documento
   - Use a mesma linguagem e estilo de escrita do prontuário original
   - Mantenha formatação consistente (bullets, numeração, parágrafos)

5. SEJA ESPECÍFICO na integração:
   - Se o exame mostra "Hemoglobina: 12.5 g/dL", adicione dentro da seção Objetivo/Exames
   - Se há um diagnóstico como "Beta-HCG positivo", integre na Avaliação
   - Se há prescrição, adicione no Plano de tratamento

6. PRESERVE TODO conteúdo existente:
   - Não delete nenhuma informação do prontuário original
   - Não modifique datas ou valores já registrados
   - Não altere o diagnóstico ou avaliação inicial

7. FORMATO DE EXEMPLO:

ANTES:
"""
S: Paciente refere mal-estar
O: PA: 120/80
A: Quadro gripal
P: Repouso
"""

DEPOIS (com exame de hemograma):
"""
S: Paciente refere mal-estar
O:
- PA: 120/80
- Hemograma (02/10/2024):
  * Hemoglobina: 12.5 g/dL
  * Leucócitos: 8.500/mm³
  * Plaquetas: 250.000/mm³
A: Quadro gripal. Hemograma dentro dos limites normais.
P: Repouso
"""

FORMATO DE SAÍDA:
Retorne APENAS o prontuário completo e atualizado, com as informações do exame INTEGRADAS nas seções apropriadas.
Não adicione comentários, explicações ou seções desnecessárias fora do prontuário.`
        },
        {
          role: 'user',
          content: `Integre as informações do exame abaixo DENTRO das seções apropriadas do prontuário existente. Não adicione apenas no final - INSIRA nas seções corretas (Objetivo, Avaliação, Plano, etc).

**PRONTUÁRIO EXISTENTE:**
${existing_prontuario}

---

**INFORMAÇÕES DO EXAME A INTEGRAR:**
${image_content}

---

IMPORTANTE: Retorne o prontuário completo com as informações do exame INSERIDAS nas seções apropriadas que já existem. Mantenha a estrutura e ordem original das seções.`
        }
      ],
      temperature: 0.3, // Low-medium temperature for consistent but natural merging
      max_tokens: 4000,
    });

    const mergedProntuario = response.choices[0]?.message?.content || '';

    if (!mergedProntuario) {
      throw new Error('No content returned from OpenAI');
    }

    console.log('✅ [MERGE PRONTUARIO] Merge completed:', {
      originalLength: existing_prontuario.length,
      mergedLength: mergedProntuario.length,
      tokensUsed: response.usage?.total_tokens,
      lengthIncrease: mergedProntuario.length - existing_prontuario.length
    });

    // Generate a summary of changes
    console.log('📊 [MERGE PRONTUARIO] Generating changes summary...');

    const summaryResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Use mini for cost efficiency on simple task
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente que resume mudanças em documentos médicos. Seja conciso e objetivo.'
        },
        {
          role: 'user',
          content: `Resuma brevemente (2-3 frases) quais informações do exame foram adicionadas ao prontuário:

INFORMAÇÕES ADICIONADAS:
${image_content}

Foque no tipo de exame e principais resultados.`
        }
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    const changesSummary = summaryResponse.choices[0]?.message?.content || 'Exame médico adicionado ao prontuário.';

    console.log('✅ [MERGE PRONTUARIO] Summary generated:', changesSummary);

    // Return merged prontuário
    return NextResponse.json({
      success: true,
      merged_prontuario: mergedProntuario,
      changes_summary: changesSummary,
      metadata: {
        original_length: existing_prontuario.length,
        merged_length: mergedProntuario.length,
        length_increase: mergedProntuario.length - existing_prontuario.length,
        tokens_used: (response.usage?.total_tokens || 0) + (summaryResponse.usage?.total_tokens || 0),
        merge_timestamp: new Date().toISOString(),
        appointment_id: appointment_id
      }
    });

  } catch (error) {
    console.error('❌ [MERGE PRONTUARIO] Error:', error);

    // Handle specific OpenAI errors
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        {
          error: 'OpenAI API error',
          details: error.message,
          status: error.status
        },
        { status: error.status || 500 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        error: 'Failed to merge prontuário',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
