import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Test database connection
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Unauthorized', 
        details: 'User not authenticated' 
      }, { status: 401 });
    }

    // Test if table exists
    const { data: testQuery, error: tableError } = await supabase
      .from('raw_medical_entries')
      .select('id')
      .limit(1);

    if (tableError) {
      return NextResponse.json({ 
        error: 'Table not found or accessible',
        details: tableError.message,
        hint: 'Make sure to run the SQL schema first'
      }, { status: 500 });
    }

    // Test user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ 
        error: 'Profile not found',
        details: profileError.message
      }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'API working correctly',
      user_id: user.id,
      profile: profile,
      table_accessible: true
    });

  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Test insert with minimal data
    const testData = {
      patient_id: user.id,
      created_by: user.id,
      raw_text: 'Test entry from API test endpoint',
      category: null,
      ai_processed: false,
      processing_success: false,
      entries_created: 0
    };

    const { data: rawEntry, error } = await supabase
      .from('raw_medical_entries')
      .insert(testData)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ 
        error: 'Failed to insert test entry',
        details: error.message,
        hint: 'Check RLS policies and table permissions'
      }, { status: 500 });
    }

    // Clean up test entry
    await supabase
      .from('raw_medical_entries')
      .delete()
      .eq('id', rawEntry.id);

    return NextResponse.json({ 
      message: 'Insert test successful',
      test_entry_id: rawEntry.id
    });

  } catch (error) {
    console.error('Test POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 