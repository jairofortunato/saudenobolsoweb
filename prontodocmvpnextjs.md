Complete Workflow Implementation:
Phase 1: Patient Selection
User types in search box → POST /api/doctor/patient-search-extended
User selects patient → Store in state
If patient doesn't exist → POST /api/doctor/patient-verify-create

Phase 2: Consultation Start
User clicks "Start Recording" → POST /api/prontodoc/consultation/create
Get microphone access → Browser API
Start transcription service → POST /api/prontodoc/transcription/start
Begin real-time audio visualization → Client-side

Phase 3: Real-time Processing
Audio stream → AssemblyAI WebSocket
Receive transcript chunks → Update UI
Store transcript segments → PUT /api/prontodoc/consultation/:id/transcript
Display speaker-separated dialogue → Client-side

Phase 4: Consultation End
User clicks "Stop Recording" → POST /api/prontodoc/transcription/stop
Finalize transcript → PUT /api/prontodoc/consultation/:id/complete
Trigger AI processing → POST /api/prontodoc/medical-record/generate
Display generated medical record → UI update

Phase 5: Doctor Review
Doctor reviews AI-generated record → UI interaction
Doctor makes modifications → Client-side editing
Doctor approves → PUT /api/prontodoc/medical-record/:id/review
Save final medical record → Database update
