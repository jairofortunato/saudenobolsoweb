import { openai, isOpenAIConfigured } from './openai';
import { MEDICAL_PROMPTS, type MedicalCategory } from './ai-prompts';
import { 
  type DiseaseInsert, 
  type MedicationInsert, 
  type AllergyInsert, 
  type ExamInsert, 
  type ConsultationInsert 
} from '../types/database';
import { type SupabaseClient } from '@supabase/supabase-js';

// Define the possible extracted data types
export type ExtractedMedicalData = {
  diseases: Partial<DiseaseInsert>;
  medications: Partial<MedicationInsert>;
  allergies: Partial<AllergyInsert>;
  exams: Partial<ExamInsert>;
  consultations: Partial<ConsultationInsert>;
};

export type AIProcessingResult<T extends MedicalCategory> = {
  success: boolean;
  data?: ExtractedMedicalData[T];
  error?: string;
  originalText: string;
  category: T;
  needsMoreInfo?: boolean;
  missingInfoMessage?: string;
};

/**
 * Process free text medical input using AI to extract structured data
 */
export async function processTextWithAI<T extends MedicalCategory>(
  text: string,
  category: T
): Promise<AIProcessingResult<T>> {
  try {
    // Check if OpenAI is configured
    if (!isOpenAIConfigured()) {
      return {
        success: false,
        error: 'OpenAI API key not configured',
        originalText: text,
        category
      };
    }

    // Get the appropriate prompt for the category
    const prompt = MEDICAL_PROMPTS[category];
    if (!prompt) {
      return {
        success: false,
        error: `No prompt found for category: ${category}`,
        originalText: text,
        category
      };
    }

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: prompt
        },
        {
          role: 'user',
          content: text
        }
      ],
      max_tokens: 500,
      temperature: 0.1, // Low temperature for more consistent/accurate extraction
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return {
        success: false,
        error: 'No response from OpenAI',
        originalText: text,
        category
      };
    }

    // Parse the JSON response
    try {
      const extractedData = JSON.parse(content);
      
      // Validate that we have the minimum required fields
      const validationResult = validateExtractedData(extractedData, category);
      if (!validationResult.isValid) {
        // Check if this is a case where we need more information
        const missingInfoResult = checkForMissingInfo(extractedData, category, text);
        
        if (missingInfoResult.needsMoreInfo) {
          return {
            success: false,
            error: `Validation failed: ${validationResult.error}`,
            originalText: text,
            category,
            needsMoreInfo: true,
            missingInfoMessage: missingInfoResult.message
          };
        }
        
        return {
          success: false,
          error: `Validation failed: ${validationResult.error}`,
          originalText: text,
          category
        };
      }

      return {
        success: true,
        data: extractedData as ExtractedMedicalData[T],
        originalText: text,
        category
      };

    } catch (parseError) {
      return {
        success: false,
        error: `Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
        originalText: text,
        category
      };
    }

  } catch (error) {
    console.error('AI processing error:', error);
    return {
      success: false,
      error: `AI processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      originalText: text,
      category
    };
  }
}

/**
 * Check if we need more information and provide helpful messages
 * This function should match the same validation logic as validateExtractedData
 */
function checkForMissingInfo(
  data: Record<string, string | undefined | null>, 
  category: MedicalCategory, 
  originalText: string
): { needsMoreInfo: boolean; message?: string } {
  const isTextTooShort = originalText.trim().length < 10;
  const isDataEmpty = !data || Object.keys(data).length === 0;
  
  if (isTextTooShort || isDataEmpty) {
    return {
      needsMoreInfo: true,
      message: getCategorySpecificMessage(category)
    };
  }

  switch (category) {
    case 'diseases':
      if (!data.name || data.name.trim() === '') {
        return {
          needsMoreInfo: true,
          message: "🩺 Preciso de mais informações sobre a condição médica. Por favor, me conte:\n\n• Qual é o nome da doença ou condição?\n• Quando foi diagnosticada?\n• Quais são os sintomas principais?"
        };
      }
      // Check if missing diagnosis date AND description
      if ((!data.diagnosed_date || data.diagnosed_date.trim() === '') && 
          (!data.description || data.description.trim() === '')) {
        return {
          needsMoreInfo: true,
          message: `🩺 Entendi sobre ${data.name}. Preciso de mais detalhes:\n\n• Quando foi diagnosticada?\n• Quais são os sintomas ou descrição?\n• Qual o tratamento atual?`
        };
      }
      break;

    case 'medications':
      if (!data.name || data.name.trim() === '') {
        return {
          needsMoreInfo: true,
          message: "💊 Preciso de mais detalhes sobre o medicamento. Por favor, me informe:\n\n• Qual é o nome do medicamento?\n• Qual a dosagem (ex: 50mg, 100mg)?\n• Quantas vezes por dia você toma?\n• Para que condição é usado?"
        };
      }
      // Check if missing dosage OR frequency
      if (!data.dosage || data.dosage.trim() === '') {
        return {
          needsMoreInfo: true,
          message: `💊 Entendi sobre ${data.name}. Preciso de mais detalhes:\n\n• Qual a dosagem (ex: 50mg, 100mg)?\n• Quantas vezes por dia você toma?\n• Para que condição é usado?`
        };
      }
      if (!data.frequency || data.frequency.trim() === '') {
        return {
          needsMoreInfo: true,
          message: `💊 Entendi sobre ${data.name}${data.dosage ? ` ${data.dosage}` : ''}. Preciso de mais detalhes:\n\n• Quantas vezes por dia você toma?\n• Em que horários?\n• Para que condição é usado?`
        };
      }
      break;

    case 'allergies':
      if (!data.name || data.name.trim() === '') {
        return {
          needsMoreInfo: true,
          message: "⚠️ Preciso de mais informações sobre a alergia. Por favor, me conte:\n\n• A que você é alérgico?\n• Quais são os sintomas da reação?\n• Qual a gravidade da alergia?"
        };
      }
      // Check if missing BOTH severity AND reaction
      if ((!data.severity || data.severity.trim() === '') && 
          (!data.reaction || data.reaction.trim() === '')) {
        return {
          needsMoreInfo: true,
          message: `⚠️ Entendi que você é alérgico a ${data.name}. Preciso de mais detalhes:\n\n• Qual a gravidade da alergia? (leve, moderada, grave)\n• Quais são os sintomas da reação?\n• Como você descobriu essa alergia?`
        };
      }
      break;

    case 'exams':
      if (!data.name || data.name.trim() === '') {
        return {
          needsMoreInfo: true,
          message: "🔬 Preciso de mais detalhes sobre o exame. Por favor, me informe:\n\n• Qual tipo de exame foi realizado?\n• Quando foi feito?\n• Quais foram os resultados principais?\n• Qual médico solicitou?"
        };
      }
      if (!data.exam_date || data.exam_date.trim() === '') {
        return {
          needsMoreInfo: true,
          message: `🔬 Entendi sobre ${data.name}. Preciso de mais detalhes:\n\n• Quando foi feito o exame?\n• Quais foram os resultados principais?\n• Qual médico solicitou?`
        };
      }
      // Check if missing BOTH result AND doctor_name
      if ((!data.result || data.result.trim() === '') && 
          (!data.doctor_name || data.doctor_name.trim() === '')) {
        return {
          needsMoreInfo: true,
          message: `🔬 Entendi sobre ${data.name}${data.exam_date ? ` feito em ${data.exam_date}` : ''}. Preciso de mais detalhes:\n\n• Quais foram os resultados principais?\n• Qual médico solicitou ou fez o exame?\n• Houve alguma observação importante?`
        };
      }
      break;

    case 'consultations':
      if (!data.doctor_name || data.doctor_name.trim() === '') {
        return {
          needsMoreInfo: true,
          message: "👩‍⚕️ Preciso de mais informações sobre a consulta. Por favor, me conte:\n\n• Com qual médico foi a consulta?\n• Quando foi realizada?\n• Qual foi o motivo da consulta?\n• Quais foram as orientações recebidas?"
        };
      }
      if (!data.consultation_date || data.consultation_date.trim() === '') {
        return {
          needsMoreInfo: true,
          message: `👩‍⚕️ Entendi sobre a consulta com ${data.doctor_name}. Preciso de mais detalhes:\n\n• Quando foi realizada a consulta?\n• Qual foi o motivo da consulta?\n• Quais foram as orientações recebidas?`
        };
      }
      if (!data.reason || data.reason.trim() === '') {
        return {
          needsMoreInfo: true,
          message: `👩‍⚕️ Entendi sobre a consulta com ${data.doctor_name}${data.consultation_date ? ` em ${data.consultation_date}` : ''}. Preciso de mais detalhes:\n\n• Qual foi o motivo da consulta?\n• Quais foram as orientações recebidas?\n• Houve algum diagnóstico ou tratamento prescrito?`
        };
      }
      break;

    default:
      return {
        needsMoreInfo: true,
        message: "🤖 Preciso de mais informações para processar sua entrada médica. Por favor, seja mais específico sobre os detalhes."
      };
  }

  // If we get here, it means validation failed but we didn't catch the specific case
  // Always treat validation failures as needing more info
  return { 
    needsMoreInfo: true, 
    message: getCategorySpecificMessage(category) 
  };
}

/**
 * Get category-specific message for empty or insufficient data
 */
function getCategorySpecificMessage(category: MedicalCategory): string {
  switch (category) {
    case 'diseases':
      return "🩺 Vou te ajudar a registrar uma condição médica. Por favor, me conte mais detalhes como:\n\n• Nome da doença ou condição\n• Quando foi diagnosticada\n• Sintomas principais\n• Tratamento atual";

    case 'medications':
      return "💊 Vou te ajudar a registrar um medicamento. Por favor, me informe:\n\n• Nome do medicamento\n• Dosagem e frequência\n• Para que condição é usado\n• Desde quando toma";

    case 'allergies':
      return "⚠️ Vou te ajudar a registrar uma alergia. Por favor, me conte:\n\n• A que você é alérgico\n• Quais são os sintomas\n• Gravidade da reação\n• Quando descobriu a alergia";

    case 'exams':
      return "🔬 Vou te ajudar a registrar um exame. Por favor, me informe:\n\n• Tipo de exame realizado\n• Data do exame\n• Principais resultados\n• Médico que solicitou";

    case 'consultations':
      return "👩‍⚕️ Vou te ajudar a registrar uma consulta. Por favor, me conte:\n\n• Nome do médico\n• Data da consulta\n• Motivo da consulta\n• Principais orientações recebidas";

    default:
      return "🤖 Por favor, me forneça mais detalhes sobre as informações médicas que você gostaria de registrar.";
  }
}

/**
 * Validate extracted data based on category requirements
 * This validation ensures we have meaningful, complete data for medical entries
 */
function validateExtractedData(data: Record<string, string | undefined | null>, category: MedicalCategory): { isValid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Invalid data format' };
  }

  switch (category) {
    case 'diseases':
      if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
        return { isValid: false, error: 'Disease name is required' };
      }
      // Require at least name and either diagnosed_date or description for meaningful entry
      if ((!data.diagnosed_date || data.diagnosed_date.trim() === '') && 
          (!data.description || data.description.trim() === '')) {
        return { isValid: false, error: 'Disease diagnosis date or description is required' };
      }
      break;

    case 'medications':
      if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
        return { isValid: false, error: 'Medication name is required' };
      }
      // Require dosage and frequency for meaningful medication entry
      if (!data.dosage || data.dosage.trim() === '') {
        return { isValid: false, error: 'Medication dosage is required' };
      }
      if (!data.frequency || data.frequency.trim() === '') {
        return { isValid: false, error: 'Medication frequency is required' };
      }
      break;

    case 'allergies':
      if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
        return { isValid: false, error: 'Allergen name is required' };
      }
      // Require either severity or reaction for meaningful allergy entry
      if ((!data.severity || data.severity.trim() === '') && 
          (!data.reaction || data.reaction.trim() === '')) {
        return { isValid: false, error: 'Allergy severity or reaction is required' };
      }
      break;

    case 'exams':
      if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
        return { isValid: false, error: 'Exam name is required' };
      }
      if (!data.exam_date || typeof data.exam_date !== 'string') {
        return { isValid: false, error: 'Exam date is required' };
      }
      // Require either result or doctor name for meaningful exam entry
      if ((!data.result || data.result.trim() === '') && 
          (!data.doctor_name || data.doctor_name.trim() === '')) {
        return { isValid: false, error: 'Exam result or doctor name is required' };
      }
      break;

    case 'consultations':
      if (!data.doctor_name || typeof data.doctor_name !== 'string' || data.doctor_name.trim() === '') {
        return { isValid: false, error: 'Doctor name is required' };
      }
      if (!data.consultation_date || typeof data.consultation_date !== 'string') {
        return { isValid: false, error: 'Consultation date is required' };
      }
      // Require reason for meaningful consultation entry
      if (!data.reason || data.reason.trim() === '') {
        return { isValid: false, error: 'Consultation reason is required' };
      }
      break;

    default:
      return { isValid: false, error: 'Unknown category' };
  }

  return { isValid: true };
}

/**
 * Validate data completeness for meaningful medical entries
 * This is more strict than basic validation - ensures we have enough info for a useful entry
 */
function validateDataCompleteness(data: Record<string, string | undefined | null>, category: MedicalCategory): { isComplete: boolean; missing: string[] } {
  if (!data || typeof data !== 'object') {
    return { isComplete: false, missing: ['valid data'] };
  }

  const missing: string[] = [];

  switch (category) {
    case 'diseases':
      if (!data.name || data.name.trim() === '') {
        missing.push('nome da doença');
      }
      // For diseases, we want at least name and either diagnosed_date or description
      if ((!data.diagnosed_date || data.diagnosed_date.trim() === '') && 
          (!data.description || data.description.trim() === '')) {
        missing.push('data do diagnóstico ou descrição');
      }
      break;

    case 'medications':
      if (!data.name || data.name.trim() === '') {
        missing.push('nome do medicamento');
      }
      if (!data.dosage || data.dosage.trim() === '') {
        missing.push('dosagem');
      }
      if (!data.frequency || data.frequency.trim() === '') {
        missing.push('frequência');
      }
      break;

    case 'allergies':
      if (!data.name || data.name.trim() === '') {
        missing.push('nome do alérgeno');
      }
      if ((!data.severity || data.severity.trim() === '') && 
          (!data.reaction || data.reaction.trim() === '')) {
        missing.push('severidade ou reação');
      }
      break;

    case 'exams':
      if (!data.name || data.name.trim() === '') {
        missing.push('nome do exame');
      }
      if (!data.exam_date || data.exam_date.trim() === '') {
        missing.push('data do exame');
      }
      if ((!data.result || data.result.trim() === '') && 
          (!data.doctor_name || data.doctor_name.trim() === '')) {
        missing.push('resultado ou médico');
      }
      break;

    case 'consultations':
      if (!data.doctor_name || data.doctor_name.trim() === '') {
        missing.push('nome do médico');
      }
      if (!data.consultation_date || data.consultation_date.trim() === '') {
        missing.push('data da consulta');
      }
      if (!data.reason || data.reason.trim() === '') {
        missing.push('motivo da consulta');
      }
      break;

    default:
      return { isComplete: false, missing: ['categoria válida'] };
  }

  return { isComplete: missing.length === 0, missing };
}

/**
 * Generate user-friendly message for missing fields
 */
function generateMissingFieldsMessage(category: MedicalCategory, missingFields: string[]): string {
  const categoryEmoji = {
    'diseases': '🩺',
    'medications': '💊',
    'allergies': '⚠️',
    'exams': '🔬',
    'consultations': '👩‍⚕️'
  };

  const categoryName = {
    'diseases': 'condição médica',
    'medications': 'medicamento',
    'allergies': 'alergia',
    'exams': 'exame',
    'consultations': 'consulta'
  };

  return `${categoryEmoji[category]} Preciso de mais informações sobre ${categoryName[category]}. Está faltando:\n\n${missingFields.map(field => `• ${field.charAt(0).toUpperCase() + field.slice(1)}`).join('\n')}\n\nPor favor, forneça essas informações para que eu possa registrar corretamente.`;
}

/**
 * Process text and submit to the appropriate database table
 * This version works on the server side by directly using Supabase
 */
export async function processAndSubmitMedicalEntry(
  text: string,
  category: MedicalCategory,
  patientId: string,
  createdBy: string,
  supabase: SupabaseClient
): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string; needsMoreInfo?: boolean; missingInfoMessage?: string }> {
  try {
    // First, extract structured data from the text
    const aiResult = await processTextWithAI(text, category);
    
    if (!aiResult.success) {
      // Check if AI needs more information
      if (aiResult.needsMoreInfo && aiResult.missingInfoMessage) {
        return {
          success: false,
          error: aiResult.error,
          needsMoreInfo: true,
          missingInfoMessage: aiResult.missingInfoMessage
        };
      }
      
      return {
        success: false,
        error: `AI processing failed: ${aiResult.error}`
      };
    }

    // Double-check that we have sufficient data before submitting
    if (!aiResult.data) {
      return {
        success: false,
        error: 'No data extracted from AI processing',
        needsMoreInfo: true,
        missingInfoMessage: getCategorySpecificMessage(category)
      };
    }
    
    const dataValidation = validateDataCompleteness(aiResult.data as Record<string, string | undefined | null>, category);
    if (!dataValidation.isComplete) {
      return {
        success: false,
        error: `Incomplete data: ${dataValidation.missing.join(', ')}`,
        needsMoreInfo: true,
        missingInfoMessage: generateMissingFieldsMessage(category, dataValidation.missing)
      };
    }

    // Prepare the data for submission with required fields
    const submissionData = {
      ...aiResult.data,
      patient_id: patientId,
      created_by: createdBy,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Submit directly to the database table
    const { data: newEntry, error: insertError } = await supabase
      .from(category)
      .insert(submissionData)
      .select()
      .single();

    if (insertError) {
      console.error(`Error inserting ${category}:`, insertError);
      return {
        success: false,
        error: `Failed to create ${category} entry: ${insertError.message}`
      };
    }

    return {
      success: true,
      data: {
        [category.slice(0, -1)]: newEntry, // Remove 's' from category name for response
        message: `${category.slice(0, -1).charAt(0).toUpperCase() + category.slice(1, -1)} entry created successfully`
      }
    };

  } catch (error) {
    return {
      success: false,
      error: `Submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Test the AI processing with sample text
 */
export async function testAIProcessing(): Promise<{
  success: boolean;
  results: Record<MedicalCategory, unknown>;
  errors?: string[];
}> {
  const testTexts = {
    diseases: 'I was diagnosed with type 2 diabetes in January 2023. It\'s a chronic condition.',
    medications: 'I take Metformin 500mg twice a day since March 2023 for my diabetes.',
    allergies: 'I\'m allergic to peanuts. I get hives and my throat swells up.',
    exams: 'I had a blood test last Monday with Dr. Smith. My cholesterol was 180 mg/dL.',
    consultations: 'I saw Dr. Johnson, the cardiologist, on December 15th for chest pain.'
  };

  const results: Record<MedicalCategory, unknown> = {
    diseases: null,
    medications: null,
    allergies: null,
    exams: null,
    consultations: null
  };

  const errors: string[] = [];
  let overallSuccess = true;

  for (const [category, text] of Object.entries(testTexts) as [MedicalCategory, string][]) {
    try {
      const result = await processTextWithAI(text, category);
      results[category] = result;
      
      if (!result.success) {
        errors.push(`${category}: ${result.error}`);
        overallSuccess = false;
      }
    } catch (error) {
      errors.push(`${category}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      overallSuccess = false;
    }
  }

  return {
    success: overallSuccess,
    results,
    errors: errors.length > 0 ? errors : undefined
  };
} 