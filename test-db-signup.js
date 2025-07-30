const { createClient } = require('./lib/supabase');

async function testDatabaseSignup() {
  try {
    console.log('🔍 Testing database for signup issues...');
    
    const supabase = createClient();
    
    // Test 1: Check profiles table structure
    console.log('\n1️⃣ Testing profiles table access...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('profile_id, user_id, cpf, role, linked, created_by')
      .limit(3);
    
    console.log('Profiles query:', { 
      success: !profilesError, 
      count: profiles?.length || 0,
      error: profilesError?.message,
      sampleData: profiles?.[0] || 'No data'
    });
    
    // Test 2: Check if trigger function exists
    console.log('\n2️⃣ Testing if trigger function exists...');
    const { data: functions, error: funcError } = await supabase
      .rpc('check_function_exists', { function_name: 'link_patient_profile' })
      .catch(() => ({ data: null, error: { message: 'RPC not available - will check differently' } }));
    
    console.log('Trigger function check:', { 
      error: funcError?.message || 'RPC method not available (normal)'
    });
    
    // Test 3: Try to create a test auth user (this will show the real error)
    console.log('\n3️⃣ Testing auth signup with minimal data...');
    const testEmail = `test-${Date.now()}@example.com`;
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'testpass123',
      options: {
        data: {
          cpf: '12345678901',
          role: 'patient',
          full_name: 'Test User'
        }
      }
    });
    
    console.log('Auth signup test:', { 
      success: !authError,
      error: authError?.message,
      errorCode: authError?.code
    });
    
    // Clean up test user if created
    if (authData?.user?.id) {
      console.log('🧹 Cleaning up test user...');
      await supabase.auth.admin.deleteUser(authData.user.id).catch(() => {});
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDatabaseSignup(); 