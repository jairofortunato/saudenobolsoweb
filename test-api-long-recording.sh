#!/bin/bash

# Test script for long recording API endpoints
# Usage: ./test-api-long-recording.sh

BASE_URL="http://localhost:3000"
if [ ! -z "$1" ]; then
    BASE_URL="$1"
fi

echo "🧪 Testing Long Recording APIs at $BASE_URL"
echo "============================================"

# Test 1: Generate a large audio file for testing
echo "📁 Creating test audio file..."
# You can create a long audio file using ffmpeg:
# ffmpeg -f lavfi -i "sine=frequency=1000:duration=1800" -ar 44100 -ac 1 test-30min-audio.wav

# Test 2: Test chunked transcription
echo "🔤 Testing chunked transcription endpoint..."

# Create sample form data
SESSION_ID="test-session-$(date +%s)"
PATIENT_ID="test-patient-001"
DOCTOR_ID="temp_doctor_id"

# If you have a test audio file, uncomment and modify:
# curl -X POST "$BASE_URL/api/doctor/transcribe-audio-chunk" \
#   -F "audio_file=@test-audio-chunk.webm" \
#   -F "session_id=$SESSION_ID" \
#   -F "chunk_number=0" \
#   -F "is_final_chunk=false" \
#   -F "patient_id=$PATIENT_ID" \
#   -F "doctor_id=$DOCTOR_ID" \
#   -F "language=pt" \
#   -F "model=whisper-1" \
#   -F "file_format=webm"

# Test 3: Test final prontuário generation
echo "📋 Testing final prontuário generation..."

curl -X POST "$BASE_URL/api/doctor/generate-final-prontuario" \
  -H "Content-Type: application/json" \
  -d '{
    "transcription_chunks": [
      {
        "chunk_number": 0,
        "transcript": "Paciente apresenta dor abdominal há 2 dias, localizada em região epigástrica...",
        "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'",
        "confidence": 0.95
      },
      {
        "chunk_number": 1,
        "transcript": "Exame físico revela abdomen distendido, ruídos hidroaéreos presentes...",
        "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'",
        "confidence": 0.92
      },
      {
        "chunk_number": 2,
        "transcript": "Solicitados exames complementares: hemograma, bioquímica sérica...",
        "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'",
        "confidence": 0.94
      }
    ],
    "session_id": "'$SESSION_ID'",
    "patient_context": {
      "name": "João Silva",
      "age": 45,
      "gender": "M"
    },
    "template": {
      "name": "Consulta Clínica Geral",
      "specialty": "Clínica Médica",
      "ai_prompt_template": "Gere um prontuário médico estruturado baseado na transcrição..."
    }
  }'

echo ""
echo "✅ API Testing Complete"
echo ""
echo "🎯 For comprehensive testing:"
echo "1. Use the HTML simulator: open test-long-recording.html"
echo "2. Test real 30-min recordings in production environment"
echo "3. Monitor server logs for chunking behavior"
echo "4. Check memory usage during long recordings"