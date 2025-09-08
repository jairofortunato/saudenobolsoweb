import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../../lib/supabase-server';

/**
 * =====================================
 * INDIVIDUAL CONSULTATION TEMPLATE API
 * =====================================
 * 
 * This API handles individual consultation template retrieval.
 * Used for template caching and preloading optimizations.
 * 
 * ENDPOINT:
 * - GET /api/doctor/consultation-templates/[id]: Fetch specific template by ID
 */

// Initialize Supabase client with proper error handling
async function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
  }
  
  if (!supabaseKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
  }
  
  return await createClient();
}

/**
 * GET /api/doctor/consultation-templates/[id]
 * Fetches a specific consultation template by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const templateId = params.id;
  
  console.log('🚀 [GET-TEMPLATE-BY-ID] Starting template fetch request for ID:', templateId);

  try {
    // Handle hardcoded default templates for preloading optimization
    if (templateId === 'default-soap' || templateId === 'default-clinical') {
      console.log('📝 [GET-TEMPLATE-BY-ID] Returning hardcoded default template for:', templateId);
      
      const defaultTemplate = {
        id: templateId,
        name: templateId === 'default-soap' ? 'Consulta Geral (SOAP)' : 'Consulta Clínica',
        specialty: 'Clínica Geral',
        template_structure: {
          sections: [
            { name: 'Queixa Principal', required: true },
            { name: 'História da Doença Atual', required: true },
            { name: 'Revisão de Sistemas', required: false },
            { name: 'Exame Físico', required: true },
            { name: 'Avaliação', required: true },
            { name: 'Plano Terapêutico', required: true }
          ]
        },
        ai_prompt_template: `Você é um assistente médico especializado em registros clínicos. A seguir, você receberá a transcrição de uma conversa entre um médico e um paciente. Sua tarefa é transformar essa transcrição em um prontuário clínico estruturado no seguinte formato:

🧾 Formato do Prontuário:

Alergias:
Liste aqui as alergias mencionadas. Se o paciente não relatar nenhuma, escreva "Não referidas".

MUC (Medicações de uso contínuo):
Liste as medicações que o paciente faz uso contínuo. Se não houver, escreva "Não referidas".

Comorbidades:
Liste as condições clínicas prévias relatadas. Se não houver, escreva "Não referidas".

SOAP (Evolução clínica):

S – Subjetivo:
Descreva o que o paciente relatou espontaneamente sobre seus sintomas, queixas, histórico do problema, e impacto nas atividades diárias.

O – Objetivo:
Descreva os achados clínicos observados pelo médico, como inspeção, palpação, ausculta, sinais clínicos, exames físicos (se mencionados).

A – Avaliação:
Informe a hipótese diagnóstica do médico com base nas informações subjetivas e objetivas.

P – Plano:
Descreva a conduta proposta pelo médico: exames solicitados, medicamentos prescritos, orientações ou encaminhamentos.

Instruções adicionais:

Resuma com linguagem clínica e objetiva.

Organize em formato limpo e fácil de ler.

Se uma informação não for mencionada na transcrição, use "Não referido(a)" no campo correspondente.

Não invente dados. Apenas use o que está presente na transcrição.`,
        is_default: true,
        is_public: true,
        created_at: new Date().toISOString()
      };

      return NextResponse.json({
        success: true,
        template: defaultTemplate
      });
    }

    // Initialize Supabase client for database templates
    let supabase;
    try {
      supabase = await getSupabaseClient();
    } catch (envError) {
      console.error('❌ [GET-TEMPLATE-BY-ID] Environment configuration error:', envError);
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      );
    }
    
    // Try to get authenticated user (optional for public templates)
    let doctorProfileId = null;
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (!authError && user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('profile_id, role')
          .eq('user_id', user.id)
          .single();

        if (!profileError && profile && profile.role === 'doctor') {
          doctorProfileId = profile.profile_id;
        }
      }
    } catch (authError) {
      // Continue without authentication for public templates
    }

    console.log('📋 [GET-TEMPLATE-BY-ID] Fetching template from database...');

    // Query specific template
    let templateQuery = supabase
      .from('consultation_templates')
      .select(`
        id,
        name,
        specialty,
        template_structure,
        ai_prompt_template,
        is_default,
        is_public,
        created_by,
        created_at
      `)
      .eq('id', templateId)
      .eq('is_deleted', false);

    // Apply visibility constraints
    if (doctorProfileId) {
      // If authenticated, include public, default, and doctor's own templates
      templateQuery = templateQuery.or(`is_public.eq.true,is_default.eq.true,created_by.eq.${doctorProfileId}`);
    } else {
      // If not authenticated, only public and default templates
      templateQuery = templateQuery.or('is_public.eq.true,is_default.eq.true');
    }

    const { data: template, error: templateError } = await templateQuery.single();

    if (templateError) {
      if (templateError.code === 'PGRST116') { // No rows found
        console.log('❌ [GET-TEMPLATE-BY-ID] Template not found:', templateId);
        return NextResponse.json(
          { success: false, error: 'Template not found' },
          { status: 404 }
        );
      }
      
      console.error('❌ [GET-TEMPLATE-BY-ID] Database error:', templateError);
      return NextResponse.json(
        { success: false, error: 'Database error' },
        { status: 500 }
      );
    }

    console.log('✅ [GET-TEMPLATE-BY-ID] Template fetched successfully:', template.name);

    return NextResponse.json({
      success: true,
      template: template
    });

  } catch (error) {
    console.error('❌ [GET-TEMPLATE-BY-ID] Unexpected error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}