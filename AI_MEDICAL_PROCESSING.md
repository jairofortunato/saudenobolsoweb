# AI-Powered Medical Text Processing System

## Overview
This system uses OpenAI's GPT-4o to automatically extract structured medical data from free-text input in the NovaEntradaModal. Users can describe their medical information in natural language, and the AI will organize it into the appropriate database fields and submit it to the correct API endpoint.

## Features

### 🤖 AI Text Processing
- **Natural Language Processing**: Users can describe medical information in plain Portuguese
- **Intelligent Data Extraction**: AI identifies and extracts specific medical fields
- **Category-Specific Prompts**: Tailored AI prompts for each medical category
- **Data Validation**: Ensures extracted data meets minimum requirements

### 📊 Supported Medical Categories
1. **Diseases/Conditions** (`diseases`)
   - Extracts: name, diagnosed_date, is_chronic, status, description, notes
   - Example: "Fui diagnosticado com diabetes tipo 2 em janeiro de 2023"

2. **Medications** (`medications`)
   - Extracts: name, dosage, frequency, start_date, end_date, is_active, notes
   - Example: "Tomo Metformina 500mg duas vezes ao dia desde março de 2023"

3. **Allergies** (`allergies`)
   - Extracts: name, severity, reaction, notes
   - Example: "Sou alérgico a amendoim, me dá urticária e inchaço na garganta"

4. **Exams** (`exams`)
   - Extracts: name, exam_date, result, doctor_name, notes
   - Example: "Fiz exame de sangue na segunda-feira com Dr. Silva, colesterol 180"

5. **Consultations** (`consultations`)
   - Extracts: doctor_name, specialty, consultation_date, reason, diagnosis, treatment, notes
   - Example: "Consultei Dr. João cardiologista em 15 de dezembro por dor no peito"

## System Architecture

### Components
1. **OpenAI Integration** (`lib/openai.ts`)
   - Configures OpenAI client with GPT-4o
   - Handles API key validation and connection testing

2. **AI Prompts** (`lib/ai-prompts.ts`)
   - Category-specific prompts for data extraction
   - Detailed instructions for JSON output formatting
   - Examples for each medical category

3. **AI Processor** (`lib/ai-processor.ts`)
   - Main processing logic for text-to-structured-data conversion
   - Validation and error handling
   - Direct API submission functionality

4. **API Endpoint** (`/api/ai/process`)
   - Handles AI processing requests
   - Supports both extraction-only and direct submission modes
   - Authentication and role-based access control

5. **Enhanced Modal** (`NovaEntradaModal.tsx`)
   - AI-powered user interface
   - Real-time processing feedback
   - Error handling and success messages

## Usage Flow

### 1. User Input
```
User writes: "Comecei a tomar Losartan 50mg uma vez ao dia 
em novembro de 2023 para pressão alta. Ainda estou tomando."
```

### 2. AI Processing
```json
{
  "name": "Losartan",
  "dosage": "50mg",
  "frequency": "once daily",
  "start_date": "2023-11-01",
  "end_date": null,
  "is_active": true,
  "notes": "For hypertension management"
}
```

### 3. Automatic Submission
- Data is automatically submitted to `/api/medications`
- Entry is created in the database
- User receives success confirmation

## API Endpoints

### POST /api/ai/process
Process medical text with AI

**Request Body:**
```json
{
  "text": "Medical text in Portuguese",
  "category": "diseases|medications|allergies|exams|consultations",
  "submitDirectly": true,
  "patientId": "optional-for-doctors"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Medical entry created successfully",
  "data": { /* Created entry data */ },
  "processing": {
    "category": "medications",
    "originalText": "User input text",
    "processed": true
  }
}
```

### GET /api/ai/process
Test AI processing capabilities

**Query Parameters:**
- `test=true` - Run comprehensive AI tests

## Configuration

### Environment Variables
```bash
# Required for AI processing
OPENAI_API_KEY=your_openai_api_key_here

# Existing Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Installation
```bash
# Install OpenAI package (already done)
npm install openai
```

## User Experience

### Before AI Processing
Users had to:
1. Select category manually
2. Fill structured forms with specific fields
3. Remember medical terminology
4. Format dates correctly

### After AI Processing
Users can:
1. Write naturally in Portuguese
2. Describe medical information as they remember it
3. Let AI organize and structure the data
4. Get automatic field completion and formatting

## Example Interactions

### Disease Entry
**User Input:** "Descobri que tenho hipertensão arterial em dezembro do ano passado. É uma condição crônica que preciso controlar com medicamento."

**AI Output:**
```json
{
  "name": "Hipertensão Arterial",
  "diagnosed_date": "2023-12-01",
  "is_chronic": true,
  "status": "active",
  "description": "Hypertension",
  "notes": "Chronic condition requiring medication management"
}
```

### Medication Entry
**User Input:** "Estou tomando Enalapril 10mg de manhã e à noite desde fevereiro. É para controlar a pressão."

**AI Output:**
```json
{
  "name": "Enalapril",
  "dosage": "10mg",
  "frequency": "twice daily (morning and evening)",
  "start_date": "2024-02-01",
  "end_date": null,
  "is_active": true,
  "notes": "For blood pressure control"
}
```

## Error Handling

### AI Processing Errors
- **Invalid API Key**: Clear error message for configuration issues
- **Network Issues**: Retry logic with user feedback
- **Parsing Errors**: Fallback to manual entry mode
- **Validation Failures**: Specific field-level error messages

### User Feedback
- **Processing States**: Visual indicators during AI processing
- **Success Messages**: Clear confirmation of successful entry
- **Error Recovery**: Options to retry or enter manually

## Testing

### Automated Testing
```bash
# Test AI processing with sample data
curl -X GET "http://localhost:3000/api/ai/process?test=true"
```

### Manual Testing
1. Open NovaEntradaModal
2. Select a category
3. Enter medical text in Portuguese
4. Observe AI processing and data creation

## Performance Considerations

### AI Processing Time
- Average: 2-4 seconds per entry
- Depends on: text complexity, OpenAI API response time
- Optimization: Low temperature setting for consistent results

### Cost Management
- Uses GPT-4o with optimized prompts
- Average tokens per request: ~300-500
- Estimated cost: $0.01-0.02 per medical entry

## Security & Privacy

### Data Protection
- Medical text is processed by OpenAI (review their privacy policy)
- No permanent storage of raw text in OpenAI systems
- All data stored in your Supabase database with RLS policies

### Access Control
- Same authentication as existing medical endpoints
- Role-based access (patients vs doctors)
- Audit trail through created_by fields

## Future Enhancements

### Planned Features
1. **Batch Processing**: Process multiple entries at once
2. **Voice Input**: Speech-to-text integration
3. **Image Processing**: OCR for medical documents
4. **Multi-language Support**: Support for English and Spanish
5. **Confidence Scoring**: Show AI confidence levels
6. **Manual Review**: Option to review before submission

### Integration Possibilities
1. **External Medical APIs**: Integration with medical databases
2. **Drug Interactions**: Automatic checking for medication conflicts
3. **Appointment Scheduling**: Smart scheduling based on consultation entries
4. **Health Insights**: AI-powered health trend analysis

## Troubleshooting

### Common Issues

**AI not responding:**
- Check OpenAI API key configuration
- Verify internet connection
- Check API rate limits

**Incorrect data extraction:**
- Review AI prompts for specific category
- Provide more detailed user input
- Check for Portuguese language nuances

**Submission failures:**
- Verify database connection
- Check user authentication
- Review API endpoint logs

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` to see detailed AI processing steps.

## Conclusion

This AI-powered medical text processing system transforms the user experience from structured form filling to natural language description. It leverages the power of GPT-4o to understand medical context and automatically organize information into the appropriate database structure, making medical record keeping more intuitive and efficient. 