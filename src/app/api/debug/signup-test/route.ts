import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [DEBUG] Testing signup issues...');
    
    const supabase = await createClient();
    
    // Test 1: Check profiles table structure
    console.log('\n1️⃣ Testing profiles table access...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('profile_id, user_id, cpf, role, linked, created_by')
      .limit(3);
    
    const profilesResult = { 
      success: !profilesError, 
      count: profiles?.length || 0,
      error: profilesError?.message,
      sampleData: profiles?.[0] || 'No data'
    };
    console.log('Profiles query:', profilesResult);
    
    // Test 2: Try to create a test auth user (this will show the real error)
    console.log('\n2️⃣ Testing auth signup with minimal data...');
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
    
    const authResult = { 
      success: !authError,
      error: authError?.message,
      errorCode: authError?.code,
      userId: authData?.user?.id || null
    };
    console.log('Auth signup test:', authResult);
    
    // Test 3: If user was created, check if trigger worked
    let triggerResult = null;
    if (authData?.user?.id) {
      console.log('\n3️⃣ Testing if trigger linked profile...');
      const { data: linkedProfile, error: linkError } = await supabase
        .from('profiles')
        .select('profile_id, user_id, cpf, linked')
        .eq('user_id', authData.user.id)
        .single();
      
      triggerResult = {
        success: !linkError,
        error: linkError?.message,
        profileFound: !!linkedProfile,
        profileData: linkedProfile
      };
      console.log('Trigger link test:', triggerResult);
      
      // Clean up test user
      console.log('🧹 Cleaning up test user...');
      await supabase.auth.admin.deleteUser(authData.user.id).catch((cleanupError) => {
        console.log('Cleanup error (non-critical):', cleanupError.message);
      });
    }
    
    // Return results
    return NextResponse.json({
      success: true,
      tests: {
        profiles: profilesResult,
        auth: authResult,
        trigger: triggerResult
      }
    });
    
  } catch (error) {
    console.error('❌ Debug test failed:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      stack: errorStack
    }, { status: 500 });
  }
} 