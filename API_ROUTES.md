# API Routes Documentation

## Overview
This document describes the API routes available for managing medical data in the Saude no Bolso application.

## Authentication
All API routes require authentication. Make sure the user is authenticated before making API calls.

## Base URL
All routes are prefixed with `/api/`

## Available Endpoints

### Test Endpoint
**GET /api/test**
- Tests API connection and authentication
- Returns authentication status and available endpoints
- No parameters required

**POST /api/test**
- Tests API with sample data
- Requires authentication
- Returns request body and success message

### Diseases
**GET /api/diseases**
- Fetches all diseases for the authenticated user
- Returns: `{ diseases: Disease[], count: number }`

**POST /api/diseases**
- Creates a new disease entry
- Required fields: `name`
- Optional fields: `diagnosed_date`, `is_chronic`, `status`, `description`, `notes`
- For doctors: `patient_id` is required
- Returns: `{ disease: Disease, message: string }`

### Medications
**GET /api/medications**
- Fetches all medications for the authenticated user
- Returns: `{ medications: Medication[], count: number }`

**POST /api/medications**
- Creates a new medication entry
- Required fields: `name`
- Optional fields: `dosage`, `frequency`, `start_date`, `end_date`, `is_active`, `notes`
- For doctors: `patient_id` is required
- Returns: `{ medication: Medication, message: string }`

### Allergies
**GET /api/allergies**
- Fetches all allergies for the authenticated user
- Returns: `{ allergies: Allergy[], count: number }`

**POST /api/allergies**
- Creates a new allergy entry
- Required fields: `name`
- Optional fields: `severity`, `reaction`, `notes`
- Valid severity values: `mild`, `moderate`, `severe`, `life-threatening`
- For doctors: `patient_id` is required
- Returns: `{ allergy: Allergy, message: string }`

### Exams
**GET /api/exams**
- Fetches all exams for the authenticated user
- Returns: `{ exams: Exam[], count: number }`

**POST /api/exams**
- Creates a new exam entry
- Required fields: `name`, `exam_date`
- Optional fields: `result`, `file_url`, `doctor_name`, `notes`
- For doctors: `patient_id` is required
- Returns: `{ exam: Exam, message: string }`

### Consultations
**GET /api/consultations**
- Fetches all consultations for the authenticated user
- Returns: `{ consultations: Consultation[], count: number }`

**POST /api/consultations**
- Creates a new consultation entry
- Required fields: `doctor_name`, `consultation_date`
- Optional fields: `specialty`, `reason`, `diagnosis`, `treatment`, `follow_up_date`, `notes`
- For doctors: `patient_id` is required
- Returns: `{ consultation: Consultation, message: string }`

## Usage Examples

### JavaScript/TypeScript
```javascript
// GET request example
const response = await fetch('/api/diseases', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
});
const data = await response.json();

// POST request example
const response = await fetch('/api/diseases', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Diabetes Type 2',
    diagnosed_date: '2024-01-15',
    is_chronic: true,
    status: 'active',
    description: 'Type 2 diabetes mellitus',
    notes: 'Currently managed with diet and exercise'
  }),
});
const data = await response.json();
```

### cURL Examples
```bash
# Test API connection
curl -X GET http://localhost:3000/api/test

# Get diseases
curl -X GET http://localhost:3000/api/diseases \
  -H "Content-Type: application/json"

# Create new disease
curl -X POST http://localhost:3000/api/diseases \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Hypertension",
    "diagnosed_date": "2024-01-01",
    "is_chronic": true,
    "status": "active",
    "notes": "Under treatment with medication"
  }'
```

## Error Handling
All endpoints return appropriate HTTP status codes:
- **200**: Success
- **201**: Created (POST requests)
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (authentication required)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found (profile not found)
- **500**: Internal Server Error

Error responses include:
```json
{
  "error": "Error message describing what went wrong"
}
```

## Role-Based Access
- **Patients**: Can only access their own data
- **Doctors**: Can access patient data by providing `patient_id` in POST requests
- Future: GET requests for doctors will support patient_id parameter

## Data Types
Refer to `types/database.ts` for complete type definitions of all entities.

## Notes
- All dates should be in ISO 8601 format (`YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss.sssZ`)
- Text fields are automatically trimmed
- Created and updated timestamps are automatically managed
- All routes handle soft deletion (entries are marked as deleted, not physically removed) 