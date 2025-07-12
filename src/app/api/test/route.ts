import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase-server';

// GET /api/test - Test API connection and authentication
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    const testResults: {
      timestamp: string;
      api_status: string;
      authentication: {
        status: string;
        user_id: string | null;
        user_email: string | null;
        error: string | null;
        profile?: {
          status: string;
          profile_id: string | null;
          role: string | null;
          full_name: string | null;
          error: string | null;
        };
      };
      available_endpoints: Array<{
        endpoint: string;
        methods: string[];
        description: string;
      }>;
    } = {
      timestamp: new Date().toISOString(),
      api_status: 'OK',
      authentication: {
        status: authError ? 'ERROR' : 'SUCCESS',
        user_id: user?.id || null,
        user_email: user?.email || null,
        error: authError?.message || null
      },
      available_endpoints: [
        {
          endpoint: '/api/diseases',
          methods: ['GET', 'POST'],
          description: 'Manage disease entries'
        },
        {
          endpoint: '/api/medications',
          methods: ['GET', 'POST'],
          description: 'Manage medication entries'
        },
        {
          endpoint: '/api/allergies',
          methods: ['GET', 'POST'],
          description: 'Manage allergy entries'
        },
        {
          endpoint: '/api/exams',
          methods: ['GET', 'POST'],
          description: 'Manage exam entries'
        },
        {
          endpoint: '/api/consultations',
          methods: ['GET', 'POST'],
          description: 'Manage consultation entries'
        }
      ]
    };

    if (user) {
      // Test profile fetch
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role, full_name, email')
        .eq('user_id', user.id)
        .single();

      testResults.authentication.profile = {
        status: profileError ? 'ERROR' : 'SUCCESS',
        profile_id: profile?.id || null,
        role: profile?.role || null,
        full_name: profile?.full_name || null,
        error: profileError?.message || null
      };
    }

    return NextResponse.json(testResults);

  } catch (error) {
    console.error('Unexpected error in GET /api/test:', error);
    return NextResponse.json(
      { 
        timestamp: new Date().toISOString(),
        api_status: 'ERROR',
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/test - Test API with sample data
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    
    const testResults = {
      timestamp: new Date().toISOString(),
      api_status: 'OK',
      authentication: {
        status: 'SUCCESS',
        user_id: user.id,
        user_email: user.email
      },
      request_body: body,
      message: 'POST request received successfully'
    };

    return NextResponse.json(testResults, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in POST /api/test:', error);
    return NextResponse.json(
      { 
        timestamp: new Date().toISOString(),
        api_status: 'ERROR',
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 