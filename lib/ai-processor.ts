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

// Classification prompt to determine the appropriate medical category
const CLASSIFICATION_PROMPT = `
You are a medical assistant that helps classify medical text into appropriate categories.

Analyze the following medical text and determine which category it belongs to:

CATEGORIES:
- diseases: Medical conditions, diagnoses, chronic diseases, symptoms, health problems
- medications: Drugs, pills, prescriptions, dosages, medication schedules
- allergies: Allergic reactions, food allergies, drug allergies, environmental allergies
- exams: Medical tests, lab results, imaging, diagnostic procedures, test results
- consultations: Doctor visits, medical appointments, specialist consultations

Return a JSON object with:
{
  "category": "One of: diseases, medications, allergies, exams, consultations",
  "confidence": "High, Medium, or Low confidence level",
  "reasoning": "Brief explanation of why this category was chosen"
}

IMPORTANT:
- Choose the MOST appropriate category based on the primary focus of the text
- If text mentions multiple categories, choose the one that is the main focus
- If text is ambiguous, choose the most likely category and set confidence to "Medium" or "Low"
- Return ONLY the JSON object, no additional text

Examples:

Input: "I take Metformin 500mg twice daily for diabetes"
Output: {"category": "medications", "confidence": "High", "reasoning": "Text primarily describes medication usage and dosage"}

Input: "I was diagnosed with type 2 diabetes last year"
Output: {"category": "diseases", "confidence": "High", "reasoning": "Text focuses on medical condition diagnosis"}

Input: "I'm allergic to peanuts and get hives when I eat them"
Output: {"category": "allergies", "confidence": "High", "reasoning": "Text describes allergic reaction to specific allergen"}

Input: "Had blood work done last week, cholesterol was 180"
Output: {"category": "exams", "confidence": "High", "reasoning": "Text describes medical test results"}

Input: "Saw Dr. Smith yesterday for chest pain"
Output: {"category": "consultations", "confidence": "High", "reasoning": "Text describes medical consultation visit"}
`;

// Multi-category classification prompt to identify all relevant medical categories
const MULTI_CATEGORY_CLASSIFICATION_PROMPT = `
You are a medical assistant that helps identify ALL relevant medical categories in a text.

Analyze the following medical text and identify ALL categories that contain relevant information:

CATEGORIES:
- diseases: Medical conditions, diagnoses, chronic diseases, symptoms, health problems
- medications: Drugs, pills, prescriptions, dosages, medication schedules
- allergies: Allergic reactions, food allergies, drug allergies, environmental allergies
- exams: Medical tests, lab results, imaging, diagnostic procedures, test results
- consultations: Doctor visits, medical appointments, specialist consultations

Return a JSON object with:
{
  "categories": [
    {
      "category": "One of: diseases, medications, allergies, exams, consultations",
      "confidence": "High, Medium, or Low confidence level",
      "reasoning": "Brief explanation of what information was found for this category",
      "relevantText": "The specific part of the text related to this category"
    }
  ],
  "primaryCategory": "The most prominent/important category in the text",
  "overallConfidence": "High, Medium, or Low - overall confidence in the analysis"
}

IMPORTANT RULES:
- Include ALL categories that have meaningful information in the text
- Don't include categories that only have vague or indirect mentions
- Each category should have substantial, actionable information
- The primaryCategory should be the most detailed or important one
- Order categories by importance/detail level
- Return ONLY the JSON object, no additional text

Examples:

Input: "I went to Dr. Smith yesterday for my diabetes consultation. He prescribed Metformin 500mg twice daily and ordered a blood test to check my glucose levels."

Output: {
  "categories": [
    {
      "category": "consultations",
      "confidence": "High",
      "reasoning": "Clear mention of doctor visit with specific doctor and reason",
      "relevantText": "went to Dr. Smith yesterday for my diabetes consultation"
    },
    {
      "category": "medications",
      "confidence": "High", 
      "reasoning": "Specific medication name, dosage, and frequency provided",
      "relevantText": "prescribed Metformin 500mg twice daily"
    },
    {
      "category": "exams",
      "confidence": "Medium",
      "reasoning": "Blood test mentioned but no results provided yet",
      "relevantText": "ordered a blood test to check my glucose levels"
    },
    {
      "category": "diseases",
      "confidence": "Medium",
      "reasoning": "Diabetes mentioned as existing condition",
      "relevantText": "my diabetes"
    }
  ],
  "primaryCategory": "consultations",
  "overallConfidence": "High"
}

Input: "I take Losartan 50mg once daily for high blood pressure"

Output: {
  "categories": [
    {
      "category": "medications",
      "confidence": "High",
      "reasoning": "Complete medication information with dosage and frequency",
      "relevantText": "take Losartan 50mg once daily"
    },
    {
      "category": "diseases",
      "confidence": "Medium",
      "reasoning": "Medical condition mentioned as reason for medication",
      "relevantText": "high blood pressure"
    }
  ],
  "primaryCategory": "medications",
  "overallConfidence": "High"
}

Input: "I'm allergic to penicillin and get severe rash when exposed"

Output: {
  "categories": [
    {
      "category": "allergies",
      "confidence": "High",
      "reasoning": "Clear allergy information with specific allergen and reaction",
      "relevantText": "allergic to penicillin and get severe rash when exposed"
    }
  ],
  "primaryCategory": "allergies",
  "overallConfidence": "High"
}
`;

// Define the possible extracted data types
export type ExtractedMedicalData = {
  diseases: { items: Partial<DiseaseInsert>[] };
  medications: { items: Partial<MedicationInsert>[] };
  allergies: { items: Partial<AllergyInsert>[] };
  exams: { items: Partial<ExamInsert>[] };
  consultations: { items: Partial<ConsultationInsert>[] };
};

export type AIProcessingResult<T extends MedicalCategory> = {
  success: boolean;
  data?: ExtractedMedicalData[T];
  error?: string;
  originalText: string;
  category: T;
  needsMoreInfo?: boolean;
  missingInfoMessage?: string;
  itemsProcessed?: number;
};

export type ClassificationResult = {
  success: boolean;
  category?: MedicalCategory;
  confidence?: 'High' | 'Medium' | 'Low';
  reasoning?: string;
  error?: string;
  originalText: string;
};

export type CategoryMatch = {
  category: MedicalCategory;
  confidence: 'High' | 'Medium' | 'Low';
  reasoning: string;
  relevantText: string;
};

export type MultiCategoryClassificationResult = {
  success: boolean;
  categories: CategoryMatch[];
  primaryCategory?: MedicalCategory;
  overallConfidence?: 'High' | 'Medium' | 'Low';
  error?: string;
  originalText: string;
};

export type MultiCategoryProcessingResult = {
  success: boolean;
  results: Record<MedicalCategory, AIProcessingResult<MedicalCategory>>;
  successfulCategories: MedicalCategory[];
  failedCategories: MedicalCategory[];
  classification: MultiCategoryClassificationResult;
  originalText: string;
};

/**
 * Classify medical text to identify all relevant categories
 */
export async function classifyMedicalTextMultiCategory(text: string): Promise<MultiCategoryClassificationResult> {
  try {
    // Check if OpenAI is configured
    if (!isOpenAIConfigured()) {
      return {
        success: false,
        error: 'OpenAI API key not configured',
        originalText: text,
        categories: []
      };
    }

    // Call OpenAI API for multi-category classification
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: MULTI_CATEGORY_CLASSIFICATION_PROMPT
        },
        {
          role: 'user',
          content: text
        }
      ],
      max_tokens: 800,
      temperature: 0.1, // Low temperature for consistent classification
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return {
        success: false,
        error: 'No response from OpenAI',
        originalText: text,
        categories: []
      };
    }

    // Parse the JSON response
    try {
      const classificationData = JSON.parse(content);
      
      // Validate the response structure
      if (!classificationData.categories || !Array.isArray(classificationData.categories)) {
        return {
          success: false,
          error: 'Invalid classification response format: missing categories array',
          originalText: text,
          categories: []
        };
      }

      // Validate each category
      const validCategories: MedicalCategory[] = ['diseases', 'medications', 'allergies', 'exams', 'consultations'];
      const validConfidences = ['High', 'Medium', 'Low'];
      
      const validatedCategories: CategoryMatch[] = [];
      
      for (const categoryMatch of classificationData.categories) {
        // Validate category
        if (!validCategories.includes(categoryMatch.category)) {
          console.warn(`Invalid category: ${categoryMatch.category}`);
          continue;
        }
        
        // Validate confidence
        if (!validConfidences.includes(categoryMatch.confidence)) {
          console.warn(`Invalid confidence: ${categoryMatch.confidence}`);
          continue;
        }
        
        // Validate required fields
        if (!categoryMatch.reasoning || !categoryMatch.relevantText) {
          console.warn(`Missing required fields for category: ${categoryMatch.category}`);
          continue;
        }
        
        validatedCategories.push({
          category: categoryMatch.category as MedicalCategory,
          confidence: categoryMatch.confidence as 'High' | 'Medium' | 'Low',
          reasoning: categoryMatch.reasoning,
          relevantText: categoryMatch.relevantText
        });
      }

      // Validate primary category
      let primaryCategory: MedicalCategory | undefined;
      if (classificationData.primaryCategory) {
        if (validCategories.includes(classificationData.primaryCategory)) {
          primaryCategory = classificationData.primaryCategory as MedicalCategory;
        }
      }

      // Validate overall confidence
      let overallConfidence: 'High' | 'Medium' | 'Low' | undefined;
      if (classificationData.overallConfidence) {
        if (validConfidences.includes(classificationData.overallConfidence)) {
          overallConfidence = classificationData.overallConfidence as 'High' | 'Medium' | 'Low';
        }
      }

      return {
        success: true,
        categories: validatedCategories,
        primaryCategory,
        overallConfidence,
        originalText: text
      };

    } catch (parseError) {
      return {
        success: false,
        error: `Failed to parse classification response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
        originalText: text,
        categories: []
      };
    }

  } catch (error) {
    console.error('Multi-category classification error:', error);
    return {
      success: false,
      error: `Multi-category classification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      originalText: text,
      categories: []
    };
  }
}

/**
 * Process medical text for multiple categories simultaneously
 */
export async function processTextWithMultiCategory(text: string): Promise<MultiCategoryProcessingResult> {
  try {
    // First, classify the text to identify all relevant categories
    const classificationResult = await classifyMedicalTextMultiCategory(text);
    
    if (!classificationResult.success || classificationResult.categories.length === 0) {
      return {
        success: false,
        results: {} as Record<MedicalCategory, AIProcessingResult<MedicalCategory>>,
        successfulCategories: [],
        failedCategories: [],
        classification: classificationResult,
        originalText: text
      };
    }

    // Process each identified category
    const results: Record<MedicalCategory, AIProcessingResult<MedicalCategory>> = {} as Record<MedicalCategory, AIProcessingResult<MedicalCategory>>;
    const successfulCategories: MedicalCategory[] = [];
    const failedCategories: MedicalCategory[] = [];

    // Process each category in parallel for better performance
    const processingPromises = classificationResult.categories.map(async (categoryMatch) => {
      try {
        const processingResult = await processTextWithAI(text, categoryMatch.category);
        results[categoryMatch.category] = processingResult;
        
        if (processingResult.success) {
          successfulCategories.push(categoryMatch.category);
        } else {
          failedCategories.push(categoryMatch.category);
        }
      } catch (error) {
        console.error(`Error processing category ${categoryMatch.category}:`, error);
        failedCategories.push(categoryMatch.category);
        results[categoryMatch.category] = {
          success: false,
          error: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          originalText: text,
          category: categoryMatch.category
        };
      }
    });

    // Wait for all processing to complete
    await Promise.all(processingPromises);

    return {
      success: successfulCategories.length > 0,
      results,
      successfulCategories,
      failedCategories,
      classification: classificationResult,
      originalText: text
    };

  } catch (error) {
    return {
      success: false,
      results: {} as Record<MedicalCategory, AIProcessingResult<MedicalCategory>>,
      successfulCategories: [],
      failedCategories: [],
      classification: {
        success: false,
        error: `Multi-category processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        originalText: text,
        categories: []
      },
      originalText: text
    };
  }
}

/**
 * Classify medical text to determine the appropriate category
 */
export async function classifyMedicalText(text: string): Promise<ClassificationResult> {
  try {
    // Check if OpenAI is configured
    if (!isOpenAIConfigured()) {
      return {
        success: false,
        error: 'OpenAI API key not configured',
        originalText: text
      };
    }

    // Call OpenAI API for classification
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: CLASSIFICATION_PROMPT
        },
        {
          role: 'user',
          content: text
        }
      ],
      max_tokens: 200,
      temperature: 0.1, // Low temperature for consistent classification
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return {
        success: false,
        error: 'No response from OpenAI',
        originalText: text
      };
    }

    // Parse the JSON response
    try {
      const classificationData = JSON.parse(content);
      
      // Validate the response structure
      if (!classificationData.category || !classificationData.confidence || !classificationData.reasoning) {
        return {
          success: false,
          error: 'Invalid classification response format',
          originalText: text
        };
      }

      // Validate category
      const validCategories: MedicalCategory[] = ['diseases', 'medications', 'allergies', 'exams', 'consultations'];
      if (!validCategories.includes(classificationData.category)) {
        return {
          success: false,
          error: `Invalid category returned: ${classificationData.category}`,
          originalText: text
        };
      }

      // Validate confidence level
      const validConfidences = ['High', 'Medium', 'Low'];
      if (!validConfidences.includes(classificationData.confidence)) {
        return {
          success: false,
          error: `Invalid confidence level: ${classificationData.confidence}`,
          originalText: text
        };
      }

      return {
        success: true,
        category: classificationData.category as MedicalCategory,
        confidence: classificationData.confidence as 'High' | 'Medium' | 'Low',
        reasoning: classificationData.reasoning,
        originalText: text
      };

    } catch (parseError) {
      return {
        success: false,
        error: `Failed to parse classification response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
        originalText: text
      };
    }

  } catch (error) {
    console.error('Medical text classification error:', error);
    return {
      success: false,
      error: `Classification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      originalText: text
    };
  }
}

/**
 * Process medical text with automatic category detection
 */
export async function processTextWithAutoCategory(text: string): Promise<{
  success: boolean;
  classification?: ClassificationResult;
  processing?: AIProcessingResult<MedicalCategory>;
  error?: string;
}> {
  try {
    // First, classify the text
    const classificationResult = await classifyMedicalText(text);
    
    if (!classificationResult.success || !classificationResult.category) {
      return {
        success: false,
        classification: classificationResult,
        error: classificationResult.error || 'Failed to classify medical text'
      };
    }

    // Then process the text with the identified category
    const processingResult = await processTextWithAI(text, classificationResult.category);

    return {
      success: processingResult.success,
      classification: classificationResult,
      processing: processingResult,
      error: processingResult.success ? undefined : processingResult.error
    };

  } catch (error) {
    return {
      success: false,
      error: `Auto-category processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

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
function validateExtractedData(data: ExtractedMedicalData[MedicalCategory], category: MedicalCategory): { isValid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Invalid data format' };
  }

  if (!data.items || !Array.isArray(data.items)) {
    return { isValid: false, error: 'Missing items array' };
  }

  if (data.items.length === 0) {
    return { isValid: false, error: 'No items found' };
  }

  // Validate each item in the array
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    
    if (!item || typeof item !== 'object') {
      return { isValid: false, error: `Invalid item format at index ${i}` };
    }

    switch (category) {
      case 'diseases':
        const diseaseItem = item as Partial<DiseaseInsert>;
        if (!diseaseItem.name || typeof diseaseItem.name !== 'string' || diseaseItem.name.trim() === '') {
          return { isValid: false, error: `Disease name is required for item ${i + 1}` };
        }
        // Require at least name and either diagnosed_date or description for meaningful entry
        if ((!diseaseItem.diagnosed_date || diseaseItem.diagnosed_date.trim() === '') && 
            (!diseaseItem.description || diseaseItem.description.trim() === '')) {
          return { isValid: false, error: `Disease diagnosis date or description is required for item ${i + 1}` };
        }
        break;

      case 'medications':
        const medicationItem = item as Partial<MedicationInsert>;
        if (!medicationItem.name || typeof medicationItem.name !== 'string' || medicationItem.name.trim() === '') {
          return { isValid: false, error: `Medication name is required for item ${i + 1}` };
        }
        // Require dosage and frequency for meaningful medication entry
        if (!medicationItem.dosage || medicationItem.dosage.trim() === '') {
          return { isValid: false, error: `Medication dosage is required for item ${i + 1}` };
        }
        if (!medicationItem.frequency || medicationItem.frequency.trim() === '') {
          return { isValid: false, error: `Medication frequency is required for item ${i + 1}` };
        }
        break;

      case 'allergies':
        const allergyItem = item as Partial<AllergyInsert>;
        if (!allergyItem.name || typeof allergyItem.name !== 'string' || allergyItem.name.trim() === '') {
          return { isValid: false, error: `Allergen name is required for item ${i + 1}` };
        }
        // Require either severity or reaction for meaningful allergy entry
        if ((!allergyItem.severity || allergyItem.severity.trim() === '') && 
            (!allergyItem.reaction || allergyItem.reaction.trim() === '')) {
          return { isValid: false, error: `Allergy severity or reaction is required for item ${i + 1}` };
        }
        break;

      case 'exams':
        const examItem = item as Partial<ExamInsert>;
        if (!examItem.name || typeof examItem.name !== 'string' || examItem.name.trim() === '') {
          return { isValid: false, error: `Exam name is required for item ${i + 1}` };
        }
        if (!examItem.exam_date || typeof examItem.exam_date !== 'string') {
          return { isValid: false, error: `Exam date is required for item ${i + 1}` };
        }
        // Require either result or doctor name for meaningful exam entry
        if ((!examItem.result || examItem.result.trim() === '') && 
            (!examItem.doctor_name || examItem.doctor_name.trim() === '')) {
          return { isValid: false, error: `Exam result or doctor name is required for item ${i + 1}` };
        }
        break;

      case 'consultations':
        const consultationItem = item as Partial<ConsultationInsert>;
        if (!consultationItem.doctor_name || typeof consultationItem.doctor_name !== 'string' || consultationItem.doctor_name.trim() === '') {
          return { isValid: false, error: `Doctor name is required for item ${i + 1}` };
        }
        if (!consultationItem.consultation_date || typeof consultationItem.consultation_date !== 'string') {
          return { isValid: false, error: `Consultation date is required for item ${i + 1}` };
        }
        // Require reason for meaningful consultation entry
        if (!consultationItem.reason || consultationItem.reason.trim() === '') {
          return { isValid: false, error: `Consultation reason is required for item ${i + 1}` };
        }
        break;

      default:
        return { isValid: false, error: 'Unknown category' };
    }
  }

  return { isValid: true };
}

/**
 * Validate data completeness for meaningful medical entries
 * This is more strict than basic validation - ensures we have enough info for a useful entry
 */
function validateDataCompleteness(data: ExtractedMedicalData[MedicalCategory], category: MedicalCategory): { isComplete: boolean; missing: string[] } {
  if (!data || typeof data !== 'object') {
    return { isComplete: false, missing: ['valid data'] };
  }

  if (!data.items || !Array.isArray(data.items)) {
    return { isComplete: false, missing: ['items array'] };
  }

  if (data.items.length === 0) {
    return { isComplete: false, missing: ['no items found'] };
  }

  const missing: string[] = [];

  // Check completeness for each item
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    const itemPrefix = `item ${i + 1}`;

    if (!item || typeof item !== 'object') {
      missing.push(`${itemPrefix}: invalid format`);
      continue;
    }

    switch (category) {
      case 'diseases':
        const diseaseItem = item as Partial<DiseaseInsert>;
        if (!diseaseItem.name || diseaseItem.name.trim() === '') {
          missing.push(`${itemPrefix}: nome da doença`);
        }
        // For diseases, we want at least name and either diagnosed_date or description
        if ((!diseaseItem.diagnosed_date || diseaseItem.diagnosed_date.trim() === '') && 
            (!diseaseItem.description || diseaseItem.description.trim() === '')) {
          missing.push(`${itemPrefix}: data do diagnóstico ou descrição`);
        }
        break;

      case 'medications':
        const medicationItem = item as Partial<MedicationInsert>;
        if (!medicationItem.name || medicationItem.name.trim() === '') {
          missing.push(`${itemPrefix}: nome do medicamento`);
        }
        if (!medicationItem.dosage || medicationItem.dosage.trim() === '') {
          missing.push(`${itemPrefix}: dosagem`);
        }
        if (!medicationItem.frequency || medicationItem.frequency.trim() === '') {
          missing.push(`${itemPrefix}: frequência`);
        }
        break;

      case 'allergies':
        const allergyItem = item as Partial<AllergyInsert>;
        if (!allergyItem.name || allergyItem.name.trim() === '') {
          missing.push(`${itemPrefix}: nome do alérgeno`);
        }
        if ((!allergyItem.severity || allergyItem.severity.trim() === '') && 
            (!allergyItem.reaction || allergyItem.reaction.trim() === '')) {
          missing.push(`${itemPrefix}: severidade ou reação`);
        }
        break;

      case 'exams':
        const examItem = item as Partial<ExamInsert>;
        if (!examItem.name || examItem.name.trim() === '') {
          missing.push(`${itemPrefix}: nome do exame`);
        }
        if (!examItem.exam_date || examItem.exam_date.trim() === '') {
          missing.push(`${itemPrefix}: data do exame`);
        }
        if ((!examItem.result || examItem.result.trim() === '') && 
            (!examItem.doctor_name || examItem.doctor_name.trim() === '')) {
          missing.push(`${itemPrefix}: resultado ou médico`);
        }
        break;

      case 'consultations':
        const consultationItem = item as Partial<ConsultationInsert>;
        if (!consultationItem.doctor_name || consultationItem.doctor_name.trim() === '') {
          missing.push(`${itemPrefix}: nome do médico`);
        }
        if (!consultationItem.consultation_date || consultationItem.consultation_date.trim() === '') {
          missing.push(`${itemPrefix}: data da consulta`);
        }
        if (!consultationItem.reason || consultationItem.reason.trim() === '') {
          missing.push(`${itemPrefix}: motivo da consulta`);
        }
        break;

      default:
        return { isComplete: false, missing: ['categoria válida'] };
    }
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
  supabase: SupabaseClient<any, any, any>
): Promise<{ 
  success: boolean; 
  data?: Record<string, unknown>; 
  error?: string; 
  needsMoreInfo?: boolean; 
  missingInfoMessage?: string;
  itemsProcessed?: number;
  entriesCreated?: number;
}> {
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
    if (!aiResult.data || !aiResult.data.items || aiResult.data.items.length === 0) {
      return {
        success: false,
        error: 'No data extracted from AI processing',
        needsMoreInfo: true,
        missingInfoMessage: getCategorySpecificMessage(category)
      };
    }
    
    const dataValidation = validateDataCompleteness(aiResult.data as ExtractedMedicalData[MedicalCategory], category);
    if (!dataValidation.isComplete) {
      return {
        success: false,
        error: `Incomplete data: ${dataValidation.missing.join(', ')}`,
        needsMoreInfo: true,
        missingInfoMessage: generateMissingFieldsMessage(category, dataValidation.missing)
      };
    }

    // Process each item in the array
    const createdEntries: Record<string, unknown>[] = [];
    const failedEntries: string[] = [];
    
    for (let i = 0; i < aiResult.data.items.length; i++) {
      const item = aiResult.data.items[i];
      
      // Prepare the data for submission with required fields
      const submissionData = {
        ...item,
        patient_id: patientId,
        created_by: createdBy,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      try {
        // Submit directly to the database table
        const { data: newEntry, error: insertError } = await supabase
          .from(category)
          .insert(submissionData)
          .select()
          .single();

        if (insertError) {
          console.error(`Error inserting ${category} item ${i + 1}:`, insertError);
          failedEntries.push(`Item ${i + 1}: ${insertError.message}`);
        } else {
          createdEntries.push(newEntry);
        }
      } catch (dbError) {
        console.error(`Database error for ${category} item ${i + 1}:`, dbError);
        failedEntries.push(`Item ${i + 1}: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
      }
    }

    // Determine overall success
    const entriesCreated = createdEntries.length;
    const totalItems = aiResult.data.items.length;
    
    if (entriesCreated === 0) {
      return {
        success: false,
        error: `Failed to create any entries: ${failedEntries.join(', ')}`,
        itemsProcessed: totalItems,
        entriesCreated: 0
      };
    }

    // Return success with details
    return {
      success: true,
      data: {
        [category]: createdEntries,
        message: `${entriesCreated} entr${entriesCreated === 1 ? 'y' : 'ies'} created${entriesCreated < totalItems ? ` (${totalItems - entriesCreated} failed)` : ''}`,
        totalItems,
        entriesCreated,
        failedEntries: failedEntries.length > 0 ? failedEntries : undefined
      },
      itemsProcessed: totalItems,
      entriesCreated
    };

  } catch (error) {
    return {
      success: false,
      error: `Submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Process text with automatic category detection and submit to database
 * This combines classification, processing, and submission into one function
 */
export async function processAndSubmitWithAutoCategory(
  text: string,
  patientId: string,
  createdBy: string,
  supabase: SupabaseClient<any, any, any>
): Promise<{ 
  success: boolean; 
  data?: Record<string, unknown>; 
  error?: string; 
  needsMoreInfo?: boolean; 
  missingInfoMessage?: string;
  classification?: ClassificationResult;
}> {
  try {
    // First, classify the text to determine the appropriate category
    const classificationResult = await classifyMedicalText(text);
    
    if (!classificationResult.success || !classificationResult.category) {
      return {
        success: false,
        error: classificationResult.error || 'Failed to classify medical text',
        classification: classificationResult
      };
    }

    // Then process and submit using the identified category
    const submissionResult = await processAndSubmitMedicalEntry(
      text,
      classificationResult.category,
      patientId,
      createdBy,
      supabase
    );

    return {
      ...submissionResult,
      classification: classificationResult
    };

  } catch (error) {
    return {
      success: false,
      error: `Auto-category submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Process text for multiple categories and submit to appropriate database tables
 * This function handles complex medical texts that span multiple categories
 */
export async function processAndSubmitWithMultiCategory(
  text: string,
  patientId: string,
  createdBy: string,
  supabase: SupabaseClient<any, any, any>
): Promise<{
  success: boolean;
  results: Partial<Record<MedicalCategory, { success: boolean; data?: Record<string, unknown>; error?: string; itemsProcessed?: number; entriesCreated?: number; }>>;
  successfulCategories: MedicalCategory[];
  failedCategories: MedicalCategory[];
  classification: MultiCategoryClassificationResult;
  entriesCreated: number;
  totalItemsProcessed: number;
  summary: string;
}> {
  try {
    // First, process text for all relevant categories
    const multiProcessingResult = await processTextWithMultiCategory(text);
    
    if (!multiProcessingResult.success || multiProcessingResult.successfulCategories.length === 0) {
      return {
        success: false,
        results: {},
        successfulCategories: [],
        failedCategories: [],
        classification: multiProcessingResult.classification,
        entriesCreated: 0,
        totalItemsProcessed: 0,
        summary: 'No valid medical information found to process'
      };
    }

    // Submit entries to database for each successful category
    const submissionResults: Partial<Record<MedicalCategory, { success: boolean; data?: Record<string, unknown>; error?: string; itemsProcessed?: number; entriesCreated?: number; }>> = {};
    const successfulSubmissions: MedicalCategory[] = [];
    const failedSubmissions: MedicalCategory[] = [];
    let totalEntriesCreated = 0;
    let totalItemsProcessed = 0;

    // Process each category that was successfully processed
    for (const category of multiProcessingResult.successfulCategories) {
      const processingResult = multiProcessingResult.results[category];
      
      if (!processingResult.success || !processingResult.data) {
        failedSubmissions.push(category);
        submissionResults[category] = {
          success: false,
          error: 'No data available for submission'
        };
        continue;
      }

      // Double-check data completeness
      const dataValidation = validateDataCompleteness(processingResult.data as ExtractedMedicalData[MedicalCategory], category);
      if (!dataValidation.isComplete) {
        failedSubmissions.push(category);
        submissionResults[category] = {
          success: false,
          error: `Incomplete data: ${dataValidation.missing.join(', ')}`
        };
        continue;
      }

      try {
        // Submit to database using the enhanced function
        const submissionResult = await processAndSubmitMedicalEntry(
          text,
          category,
          patientId,
          createdBy,
          supabase
        );

        if (submissionResult.success) {
          successfulSubmissions.push(category);
          totalEntriesCreated += submissionResult.entriesCreated || 0;
          totalItemsProcessed += submissionResult.itemsProcessed || 0;
        } else {
          failedSubmissions.push(category);
        }

        submissionResults[category] = {
          success: submissionResult.success,
          data: submissionResult.data,
          error: submissionResult.error,
          itemsProcessed: submissionResult.itemsProcessed,
          entriesCreated: submissionResult.entriesCreated
        };

      } catch (dbError) {
        console.error(`Database error for ${category}:`, dbError);
        failedSubmissions.push(category);
        submissionResults[category] = {
          success: false,
          error: `Database error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`
        };
      }
    }

    // Create summary
    const categoryLabels = {
      'medications': 'Medicamento',
      'diseases': 'Condição Médica',
      'allergies': 'Alergia',
      'exams': 'Exame',
      'consultations': 'Consulta'
    };

    let summary = '';
    if (totalEntriesCreated > 0) {
      const createdLabels = successfulSubmissions.map(cat => categoryLabels[cat]).join(', ');
      summary = `${totalEntriesCreated} entrada${totalEntriesCreated > 1 ? 's' : ''} criada${totalEntriesCreated > 1 ? 's' : ''} (${createdLabels})`;
    }
    
    if (failedSubmissions.length > 0) {
      const failedLabels = failedSubmissions.map(cat => categoryLabels[cat]).join(', ');
      summary += summary ? ` | Falha em: ${failedLabels}` : `Falha ao criar entradas: ${failedLabels}`;
    }

    return {
      success: totalEntriesCreated > 0,
      results: submissionResults,
      successfulCategories: successfulSubmissions,
      failedCategories: failedSubmissions,
      classification: multiProcessingResult.classification,
      entriesCreated: totalEntriesCreated,
      totalItemsProcessed,
      summary: summary || 'Nenhuma entrada foi criada'
    };

  } catch (error) {
    return {
      success: false,
      results: {},
      successfulCategories: [],
      failedCategories: [],
      classification: {
        success: false,
        error: `Multi-category submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        originalText: text,
        categories: []
      },
      entriesCreated: 0,
      totalItemsProcessed: 0,
      summary: 'Erro inesperado durante o processamento'
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