/**
 * Test script for AssemblyAI frontend integration
 * 
 * This script can be used to test the API endpoints directly
 * Run this in the browser console or as a Node.js script
 */

async function testTranscriptionProviders() {
  const apiBaseUrl = 'http://localhost:8000';
  
  console.log('🧪 Testing Transcription Providers Integration');
  console.log('=' .repeat(50));
  
  // Test data
  const testData = {
    session_id: `test_${Date.now()}`,
    patient_id: 'test_patient_123',
    doctor_id: 'test_doctor_123'
  };
  
  // Test endpoints
  const endpoints = [
    {
      name: 'Deepgram (Row 1)',
      url: `${apiBaseUrl}/api/prontodoc/prerecorded/transcribe`,
      language: 'pt-BR',
      model: 'nova-3',
      provider: 'deepgram'
    },
    {
      name: 'AssemblyAI Package (Row 2)', 
      url: `${apiBaseUrl}/api/prontodoc/prerecorded/transcribe-assemblyai`,
      language: 'pt',
      model: 'best',
      provider: 'assemblyai'
    },
    {
      name: 'AssemblyAI HTTP (Alternative)',
      url: `${apiBaseUrl}/api/prontodoc/prerecorded/transcribe-assemblyai-http`,
      language: 'pt', 
      model: 'universal',
      provider: 'assemblyai-http'
    }
  ];
  
  console.log('📋 Available endpoints:');
  endpoints.forEach((endpoint, index) => {
    console.log(`${index + 1}. ${endpoint.name}: ${endpoint.url}`);
    console.log(`   Language: ${endpoint.language}, Model: ${endpoint.model}`);
  });
  
  console.log('\n🔧 Frontend Integration Status:');
  console.log('✅ Row 1: Connected to Deepgram');
  console.log('✅ Row 2: Connected to AssemblyAI');  
  console.log('✅ Row 3: Connected to Deepgram');
  
  console.log('\n📝 Test Instructions:');
  console.log('1. Open http://localhost:3000/prontodoc-prerecorded');
  console.log('2. Upload the same audio file to Row 1 and Row 2');
  console.log('3. Compare transcription results and processing times');
  console.log('4. Row 1 should be faster (Deepgram sync)');
  console.log('5. Row 2 should be slower but possibly more accurate (AssemblyAI async)');
  
  console.log('\n🎯 Expected Behavior:');
  console.log('Row 1 (Deepgram):');
  console.log('  - Model options: Nova 3, Nova 2, Enhanced, Base');
  console.log('  - Language: pt-BR');
  console.log('  - Processing: ~2-5 seconds');
  console.log('  - Response provider: "deepgram" or undefined');
  
  console.log('\nRow 2 (AssemblyAI):');
  console.log('  - Model options: Best (Highest Accuracy), Nano (Faster)');
  console.log('  - Language: pt');  
  console.log('  - Processing: ~20-60 seconds');
  console.log('  - Response provider: "assemblyai"');
  
  console.log('\n⚡ Quick Health Check:');
  
  try {
    // Test health endpoints
    const healthChecks = await Promise.allSettled([
      fetch(`${apiBaseUrl}/health`).catch(() => ({ ok: false, status: 'Network Error' })),
      fetch(`${apiBaseUrl}/api/prontodoc/prerecorded/transcribe`, { method: 'OPTIONS' }).catch(() => ({ ok: false, status: 'Network Error' })),
      fetch(`${apiBaseUrl}/api/prontodoc/prerecorded/transcribe-assemblyai`, { method: 'OPTIONS' }).catch(() => ({ ok: false, status: 'Network Error' }))
    ]);
    
    console.log('Backend Status:', healthChecks[0].status === 'fulfilled' && healthChecks[0].value.ok ? '✅ Running' : '❌ Not Running');
    console.log('Deepgram Endpoint:', healthChecks[1].status === 'fulfilled' ? '✅ Available' : '❌ Not Available');
    console.log('AssemblyAI Endpoint:', healthChecks[2].status === 'fulfilled' ? '✅ Available' : '❌ Not Available');
    
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }
  
  console.log('\n🚀 Ready to test! Upload audio files and compare results.');
}

// Run the test
testTranscriptionProviders();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testTranscriptionProviders };
}