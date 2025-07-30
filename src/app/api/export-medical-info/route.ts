import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase-server';
import { openai, isOpenAIConfigured } from '../../../../lib/openai';

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

    // Get user profile to determine patient_id
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

    // For patients, get their own data
    // For doctors, they would get their own data (could be extended later)
    const patient_id = profile.role === 'patient' ? (profile.profile_id || profile.id) : (profile.profile_id || profile.id);

    // Fetch all medical data in parallel
    const [
      medicationsRes,
      allergiesRes,
      examsRes,
      diseasesRes,
      consultationsRes
    ] = await Promise.all([
      supabase
        .from('medications')
        .select('*')
        .eq('patient_id', patient_id)
        .order('created_at', { ascending: false }),
      supabase
        .from('allergies')
        .select('*')
        .eq('patient_id', patient_id)
        .order('created_at', { ascending: false }),
      supabase
        .from('exams')
        .select('*')
        .eq('patient_id', patient_id)
        .order('created_at', { ascending: false }),
      supabase
        .from('diseases')
        .select('*')
        .eq('patient_id', patient_id)
        .order('created_at', { ascending: false }),
      supabase
        .from('consultations')
        .select('*')
        .eq('patient_id', patient_id)
        .order('created_at', { ascending: false })
    ]);

    // Check for errors in any of the queries
    if (medicationsRes.error || allergiesRes.error || examsRes.error || 
        diseasesRes.error || consultationsRes.error) {
      console.error('Error fetching medical data:', {
        medications: medicationsRes.error,
        allergies: allergiesRes.error,
        exams: examsRes.error,
        diseases: diseasesRes.error,
        consultations: consultationsRes.error
      });
      return NextResponse.json(
        { error: 'Failed to fetch medical data' },
        { status: 500 }
      );
    }

    const medicalData = {
      medications: medicationsRes.data || [],
      allergies: allergiesRes.data || [],
      exams: examsRes.data || [],
      diseases: diseasesRes.data || [],
      consultations: consultationsRes.data || []
    };

    // Check if OpenAI is configured
    if (!isOpenAIConfigured()) {
      return NextResponse.json(
        { error: 'OpenAI not configured' },
        { status: 500 }
      );
    }

    // Format data with GPT-4o
    const medicationsText = medicalData.medications.length > 0 
      ? medicalData.medications.map(med => 
          `${med.name}${med.dosage ? `, dosagem: ${med.dosage}` : ''}${med.frequency ? `, frequência: ${med.frequency}` : ''}${med.notes ? `, observações: ${med.notes}` : ''} (registrado em ${new Date(med.created_at).toLocaleDateString('pt-BR')})`
        ).join('. ') + '.'
      : 'Nenhum medicamento registrado.';

    const allergiesText = medicalData.allergies.length > 0 
      ? medicalData.allergies.map(allergy => 
          `${allergy.name}${allergy.severity ? `, severidade: ${allergy.severity}` : ''}${allergy.notes ? `, observações: ${allergy.notes}` : ''} (registrado em ${new Date(allergy.created_at).toLocaleDateString('pt-BR')})`
        ).join('. ') + '.'
      : 'Nenhuma alergia registrada.';

    const examsText = medicalData.exams.length > 0 
      ? medicalData.exams.map(exam => 
          `${exam.name}${exam.date ? `, realizado em ${new Date(exam.date).toLocaleDateString('pt-BR')}` : ''}${exam.result ? `, resultado: ${exam.result}` : ''}${exam.notes ? `, observações: ${exam.notes}` : ''} (registrado em ${new Date(exam.created_at).toLocaleDateString('pt-BR')})`
        ).join('. ') + '.'
      : 'Nenhum exame registrado.';

    const diseasesText = medicalData.diseases.length > 0 
      ? medicalData.diseases.map(disease => 
          `${disease.name}${disease.diagnosed_on ? `, diagnosticada em ${new Date(disease.diagnosed_on).toLocaleDateString('pt-BR')}` : ''}${disease.chronic ? ', doença crônica' : ''}${disease.notes ? `, observações: ${disease.notes}` : ''} (registrado em ${new Date(disease.created_at).toLocaleDateString('pt-BR')})`
        ).join('. ') + '.'
      : 'Nenhuma doença registrada.';

    const consultationsText = medicalData.consultations.length > 0 
      ? medicalData.consultations.map(consultation => 
          `${consultation.doctor_name ? `Dr. ${consultation.doctor_name}` : 'Médico não informado'}${consultation.specialty ? `, especialidade: ${consultation.specialty}` : ''}${consultation.date ? `, consulta realizada em ${new Date(consultation.date).toLocaleDateString('pt-BR')}` : ''}${consultation.notes ? `, observações: ${consultation.notes}` : ''} (registrado em ${new Date(consultation.created_at).toLocaleDateString('pt-BR')})`
        ).join('. ') + '.'
      : 'Nenhuma consulta registrada.';

    const prompt = `
Por favor, formate as seguintes informações médicas do paciente em texto corrido, sem tópicos ou marcadores. Use apenas quebras de linha para separar as categorias:

Informações do Paciente:
Nome: ${profile.name || 'Não informado'}
CPF: ${profile.cpf || 'Não informado'}
Email: ${profile.email || 'Não informado'}

Medicamentos: ${medicationsText}

Alergias: ${allergiesText}

Exames: ${examsText}

Doenças: ${diseasesText}

Consultas: ${consultationsText}

Por favor, organize essas informações em texto corrido e natural, adequado para ser compartilhado com profissionais de saúde ou para uso pessoal do paciente. Use apenas quebras de linha para separar as categorias, sem marcadores ou tópicos.
`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente especializado em organizar informações médicas de forma clara e profissional. Formate as informações de maneira estruturada e fácil de compreender.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      });

      const formattedText = completion.choices[0]?.message?.content;

      if (!formattedText) {
        throw new Error('No response from OpenAI');
      }

      return NextResponse.json({
        formattedText,
        rawData: medicalData,
        message: 'Medical information exported successfully'
      });

    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError);
      return NextResponse.json(
        { error: 'Failed to format medical information with AI' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Unexpected error in GET /api/export-medical-info:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 