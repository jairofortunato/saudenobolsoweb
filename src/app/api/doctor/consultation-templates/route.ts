import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase-server';

/**
 * =====================================
 * CONSULTATION TEMPLATES API ROUTES
 * =====================================
 * 
 * This API handles consultation template management for doctors.
 * Templates define the structure and AI prompts for different consultation types.
 * 
 * DATABASE TABLE: consultation_templates
 * - id: UUID primary key
 * - created_by: doctor who created template (references profiles.profile_id)
 * - name: template name (e.g., "Consulta Geral", "Cardiologia")
 * - specialty: medical specialty
 * - template_structure: JSONB defining expected sections
 * - ai_prompt_template: custom AI prompt for this consultation type
 * - is_default: boolean for default template
 * - is_public: boolean for sharing with other doctors
 * - created_at: timestamp
 * - updated_at: timestamp
 * - is_deleted: boolean for soft delete
 * 
 * ENDPOINTS:
 * - GET: Fetch available templates (own + public)
 * - POST: Create new custom template
 * 
 * RLS POLICIES:
 * Templates are accessible to:
 * - Creator (own templates)
 * - All doctors (public templates)
 * - Default templates (always visible)
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

interface ConsultationTemplate {
  name: string;
  specialty: string;
  template_structure: {
    sections: Array<{
      name: string;
      required: boolean;
    }>;
  };
  ai_prompt_template: string;
  is_default?: boolean;
  is_public?: boolean;
}

/**
 * GET /api/doctor/consultation-templates
 * Fetches available consultation templates for the doctor
 */
export async function GET(request: NextRequest) {
  console.log('🚀 [GET-TEMPLATES] Starting template fetch request');

  try {
    // Initialize Supabase client
    let supabase;
    try {
      supabase = await getSupabaseClient();
    } catch (envError) {
      console.error('❌ [GET-TEMPLATES] Environment configuration error:', envError);
      // Return fallback template when Supabase is not configured
      const fallbackTemplate = {
        id: 'default-soap-fallback',
        name: 'Consulta Geral (SOAP)',
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
        templates: [fallbackTemplate],
        count: 1,
        fallback: true,
        message: 'Using fallback template due to database configuration issues'
      });
    }
    
    // Try to get authenticated user (optional for GET)
    let doctorProfileId = null;
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (!authError && user) {
        // Get user profile to get profile_id (if authenticated)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('profile_id, role')
          .eq('user_id', user.id)
          .single();

        if (!profileError && profile && profile.role === 'doctor') {
          doctorProfileId = profile.profile_id;
          console.log('👨‍⚕️ [GET-TEMPLATES] Authenticated doctor:', profile.profile_id);
        }
      }
    } catch (authError) {
      console.log('ℹ️ [GET-TEMPLATES] No authentication provided, showing public templates only');
    }

    console.log('📋 [GET-TEMPLATES] Fetching consultation templates...');

    // Query consultation_templates table
    // Always include public and default templates
    // Include doctor's own templates if authenticated
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
      .eq('is_deleted', false);

    if (doctorProfileId) {
      // If authenticated, include public, default, and doctor's own templates
      templateQuery = templateQuery.or(`is_public.eq.true,is_default.eq.true,created_by.eq.${doctorProfileId}`);
    } else {
      // If not authenticated, only public and default templates
      templateQuery = templateQuery.or('is_public.eq.true,is_default.eq.true');
    }

    const { data: templates, error: templatesError } = await templateQuery
      .order('is_default', { ascending: false }) // Default templates first
      .order('name', { ascending: true });

    // Ensure SOAP template is always first if it exists
    if (templates && templates.length > 0) {
      const soapTemplate = templates.find(t => t.name.includes('SOAP') && t.is_default);
      if (soapTemplate) {
        // Remove SOAP template from current position and add it to the beginning
        const otherTemplates = templates.filter(t => !(t.name.includes('SOAP') && t.is_default));
        templates.length = 0; // Clear array
        templates.push(soapTemplate, ...otherTemplates);
      }
    }

    if (templatesError) {
      console.error('❌ [GET-TEMPLATES] Database error:', templatesError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch templates from database' },
        { status: 500 }
      );
    }

    console.log('✅ [GET-TEMPLATES] Templates fetched successfully:');
    console.log('  - Total templates:', templates?.length || 0);
    console.log('  - Default templates:', templates?.filter(t => t.is_default).length || 0);
    console.log('  - Public templates:', templates?.filter(t => t.is_public && !t.is_default).length || 0);
    if (doctorProfileId) {
      console.log('  - Doctor created templates:', templates?.filter(t => t.created_by === doctorProfileId).length || 0);
    } else {
      console.log('  - Doctor created templates: 0 (not authenticated)');
    }

    // If no templates found, return default template
    if (!templates || templates.length === 0) {
      console.log('📝 [GET-TEMPLATES] No templates found in database, returning hardcoded default SOAP template');
      
      const defaultTemplate = {
        id: 'default-soap-hardcoded',
        name: 'Consulta Geral (SOAP)',
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
        templates: [defaultTemplate],
        count: 1,
        fallback: false, // This is a database fallback, not environment fallback
        message: 'No templates found in database, using hardcoded default template'
      });
    }

    return NextResponse.json({
      success: true,
      templates: templates,
      count: templates.length
    });

  } catch (error) {
    console.error('❌ [GET-TEMPLATES] Unexpected error:', error);
    console.error('❌ [GET-TEMPLATES] Error details:', {
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

/**
 * POST /api/doctor/consultation-templates
 * Creates a new consultation template
 */
export async function POST(request: NextRequest) {
  console.log('🚀 [CREATE-TEMPLATE] Starting template creation request');

  try {
    // Initialize Supabase client
    let supabase;
    try {
      supabase = await getSupabaseClient();
    } catch (envError) {
      console.error('❌ [CREATE-TEMPLATE] Environment configuration error:', envError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database not configured. Template creation is not available in development mode without proper Supabase configuration.' 
        },
        { status: 503 }
      );
    }
    
    // Get authenticated user
    console.log('🔍 [CREATE-TEMPLATE] Attempting to get authenticated user...');
    
    // Check for Authorization header
    const authHeader = request.headers.get('Authorization');
    console.log('🔍 [CREATE-TEMPLATE] Authorization header present:', !!authHeader);
    
    let user, authError;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Extract JWT token from Authorization header
      const token = authHeader.substring(7);
      console.log('🔍 [CREATE-TEMPLATE] Using JWT token from header');
      
      const result = await supabase.auth.getUser(token);
      user = result.data.user;
      authError = result.error;
    } else {
      // Fall back to session-based auth
      console.log('🔍 [CREATE-TEMPLATE] Using session-based auth');
      const result = await supabase.auth.getUser();
      user = result.data.user;
      authError = result.error;
    }
    
    console.log('🔍 [CREATE-TEMPLATE] Auth result:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      authError: authError?.message,
      authErrorCode: authError?.status
    });
    
    if (authError || !user) {
      console.error('❌ [CREATE-TEMPLATE] Authentication failed:', {
        error: authError,
        hasUser: !!user,
        errorMessage: authError?.message,
        errorStatus: authError?.status
      });
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile to verify doctor role and get profile_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('profile_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('❌ [CREATE-TEMPLATE] Profile error:', profileError);
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    if (profile.role !== 'doctor') {
      console.error('❌ [CREATE-TEMPLATE] Access denied for role:', profile.role);
      return NextResponse.json(
        { success: false, error: 'Access denied. Only doctors can create templates.' },
        { status: 403 }
      );
    }

    console.log('👨‍⚕️ [CREATE-TEMPLATE] Authenticated doctor:', profile.profile_id);

    // Parse request body
    const body: ConsultationTemplate = await request.json();
    const { name, specialty, template_structure, ai_prompt_template, is_default = false, is_public = false } = body;

    console.log('📋 [CREATE-TEMPLATE] Request parameters:');
    console.log('  - name:', name);
    console.log('  - specialty:', specialty);
    console.log('  - template_structure sections:', template_structure?.sections?.length || 0);
    console.log('  - ai_prompt_template length:', ai_prompt_template?.length || 0);
    console.log('  - is_default:', is_default);
    console.log('  - is_public:', is_public);

    // Validate required fields
    if (!name || !name.trim()) {
      console.error('❌ [CREATE-TEMPLATE] Template name is required');
      return NextResponse.json(
        { success: false, error: 'Template name is required' },
        { status: 400 }
      );
    }

    if (!specialty || !specialty.trim()) {
      console.error('❌ [CREATE-TEMPLATE] Specialty is required');
      return NextResponse.json(
        { success: false, error: 'Specialty is required' },
        { status: 400 }
      );
    }

    if (!ai_prompt_template || !ai_prompt_template.trim()) {
      console.error('❌ [CREATE-TEMPLATE] AI prompt template is required');
      return NextResponse.json(
        { success: false, error: 'AI prompt template is required' },
        { status: 400 }
      );
    }

    if (!template_structure || !template_structure.sections || template_structure.sections.length === 0) {
      console.error('❌ [CREATE-TEMPLATE] Template structure is required');
      return NextResponse.json(
        { success: false, error: 'Template structure with sections is required' },
        { status: 400 }
      );
    }

    // Use authenticated doctor's profile_id
    const doctorProfileId = profile.profile_id;

    // Insert new template into database
    console.log('💾 [CREATE-TEMPLATE] Inserting template into database...');
    
    const { data: newTemplate, error: insertError } = await supabase
      .from('consultation_templates')
      .insert([
        {
          created_by: doctorProfileId,
          name: name.trim(),
          specialty: specialty.trim(),
          template_structure: template_structure,
          ai_prompt_template: ai_prompt_template.trim(),
          is_default: is_default,
          is_public: is_public,
          is_deleted: false
        }
      ])
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
      .single();

    if (insertError) {
      console.error('❌ [CREATE-TEMPLATE] Database insert error:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to create template in database' },
        { status: 500 }
      );
    }

    console.log('✅ [CREATE-TEMPLATE] Template created successfully:');
    console.log('  - Template ID:', newTemplate.id);
    console.log('  - Name:', newTemplate.name);
    console.log('  - Specialty:', newTemplate.specialty);

    return NextResponse.json({
      success: true,
      template: newTemplate,
      message: 'Template created successfully'
    });

  } catch (error) {
    console.error('❌ [CREATE-TEMPLATE] Unexpected error:', error);
    console.error('❌ [CREATE-TEMPLATE] Error details:', {
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