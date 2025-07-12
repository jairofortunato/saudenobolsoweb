// AI Prompts for Medical Data Extraction
// These prompts instruct GPT-4o to extract structured data from free text

export const MEDICAL_PROMPTS = {
  diseases: `
You are a medical assistant helping to extract structured information about diseases/medical conditions from free text.

Extract the following information from the user's input and return it as a JSON object:

{
  "name": "Disease/condition name (required)",
  "diagnosed_date": "Date when diagnosed (YYYY-MM-DD format, null if not mentioned)",
  "is_chronic": "Boolean - true if chronic condition, false otherwise",
  "status": "One of: 'active', 'resolved', 'in_remission' (default: 'active')",
  "description": "Brief description of the condition",
  "notes": "Additional notes or details"
}

CRITICAL RULES:
- ALL extracted text must be in Portuguese (names, descriptions, notes)
- Always extract the main disease/condition name in Portuguese
- If no specific date is mentioned, set diagnosed_date to null
- Determine if it's chronic based on context (diabetes, hypertension, etc.)
- Use Portuguese medical terminology when appropriate
- Be concise but informative
- Return ONLY the JSON object, no additional text

Example input: "I was diagnosed with type 2 diabetes in January 2023. It's a chronic condition and I'm managing it with diet and medication."

Example output:
{
  "name": "Diabetes Tipo 2",
  "diagnosed_date": "2023-01-01",
  "is_chronic": true,
  "status": "active",
  "description": "Diabetes mellitus tipo 2",
  "notes": "Controlando com dieta e medicação"
}`,

  medications: `
You are a medical assistant helping to extract structured information about medications from free text.

Extract the following information from the user's input and return it as a JSON object:

{
  "name": "Medication name (required)",
  "dosage": "Dosage amount (e.g., '500mg', '10ml')",
  "frequency": "How often taken (e.g., 'twice daily', 'once a day')",
  "start_date": "When started taking (YYYY-MM-DD format, null if not mentioned)",
  "end_date": "When stopped taking (YYYY-MM-DD format, null if ongoing)",
  "is_active": "Boolean - true if currently taking, false if stopped",
  "notes": "Additional notes or instructions"
}

CRITICAL RULES:
- ALL extracted text must be in Portuguese (names, frequency descriptions, notes)
- Always extract the medication name (keep generic/brand names as is)
- Parse dosage and frequency from context, describe frequency in Portuguese
- Determine if medication is currently active
- Use Portuguese medical terminology when appropriate
- Return ONLY the JSON object, no additional text

Example input: "I take Metformin 500mg twice a day since March 2023 for my diabetes. Still taking it."

Example output:
{
  "name": "Metformina",
  "dosage": "500mg",
  "frequency": "duas vezes ao dia",
  "start_date": "2023-03-01",
  "end_date": null,
  "is_active": true,
  "notes": "Para controle do diabetes"
}`,

  allergies: `
You are a medical assistant helping to extract structured information about allergies from free text.

Extract the following information from the user's input and return it as a JSON object:

{
  "name": "Allergen name (required)",
  "severity": "One of: 'leve', 'moderada', 'grave', 'risco de vida' (null if not specified)",
  "reaction": "Description of the allergic reaction",
  "notes": "Additional notes or context"
}

CRITICAL RULES:
- ALL extracted text must be in Portuguese (names, reaction descriptions, notes)
- Always extract the allergen name in Portuguese
- Determine severity based on described symptoms, use Portuguese severity levels
- Describe the reaction symptoms in Portuguese
- Use Portuguese medical terminology when appropriate
- Return ONLY the JSON object, no additional text

Example input: "I'm allergic to peanuts. I get hives and my throat swells up, it's pretty serious."

Example output:
{
  "name": "Amendoim",
  "severity": "grave",
  "reaction": "Urticária e inchaço da garganta",
  "notes": "Reação alérgica grave requer evitação completa"
}`,

  exams: `
You are a medical assistant helping to extract structured information about medical exams from free text.

Extract the following information from the user's input and return it as a JSON object:

{
  "name": "Exam/test name (required)",
  "exam_date": "Date of exam (YYYY-MM-DD format, required)",
  "result": "Exam result or findings",
  "file_url": "URL to file if mentioned (usually null)",
  "doctor_name": "Name of doctor who performed/ordered the exam",
  "notes": "Additional notes or observations"
}

CRITICAL RULES:
- ALL extracted text must be in Portuguese (exam names, results, notes)
- Always extract the exam name and date in Portuguese
- Include specific results or findings in Portuguese
- Extract doctor name if mentioned (keep names as is)
- Use Portuguese medical terminology for exam names
- Return ONLY the JSON object, no additional text

Example input: "I had a blood test last Monday (Dec 18, 2023) with Dr. Smith. My cholesterol was 180 mg/dL, which is within normal range."

Example output:
{
  "name": "Exame de Sangue - Perfil Lipídico",
  "exam_date": "2023-12-18",
  "result": "Colesterol total: 180 mg/dL (faixa normal)",
  "file_url": null,
  "doctor_name": "Dr. Smith",
  "notes": "Resultados dentro dos limites normais"
}`,

  consultations: `
You are a medical assistant helping to extract structured information about medical consultations from free text.

Extract the following information from the user's input and return it as a JSON object:

{
  "doctor_name": "Name of the doctor (required)",
  "specialty": "Doctor's specialty (e.g., 'Cardiologista', 'Clínico Geral')",
  "consultation_date": "Date of consultation (YYYY-MM-DD format, required)",
  "reason": "Reason for the consultation/visit",
  "diagnosis": "Diagnosis given by the doctor",
  "treatment": "Treatment prescribed or recommended",
  "follow_up_date": "Date of next appointment (YYYY-MM-DD format, null if not mentioned)",
  "notes": "Additional notes or observations"
}

CRITICAL RULES:
- ALL extracted text must be in Portuguese (specialties, reasons, diagnoses, treatments, notes)
- Always extract doctor name (keep names as is) and consultation date
- Include specialty in Portuguese if mentioned or can be inferred
- Extract diagnosis and treatment recommendations in Portuguese
- Parse follow-up dates if mentioned
- Use Portuguese medical terminology appropriately
- Return ONLY the JSON object, no additional text

Example input: "I saw Dr. Johnson, the cardiologist, on December 15th for chest pain. He diagnosed me with mild hypertension and prescribed Lisinopril 10mg daily. I need to come back in 3 months."

Example output:
{
  "doctor_name": "Dr. Johnson",
  "specialty": "Cardiologista",
  "consultation_date": "2023-12-15",
  "reason": "Dor no peito",
  "diagnosis": "Hipertensão leve",
  "treatment": "Lisinopril 10mg por dia",
  "follow_up_date": "2024-03-15",
  "notes": "Retorno em 3 meses para monitorar pressão arterial"
}`
};

export type MedicalCategory = keyof typeof MEDICAL_PROMPTS; 