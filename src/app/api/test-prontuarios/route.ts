import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    console.log('🔧 [TEST API] POST request received');
    
    const body = await request.json()
    console.log('📦 [TEST API] Request body:', JSON.stringify(body, null, 2));
    
    // For now, just return a success response to test the flow
    const mockResponse = {
      id: 'test-' + Date.now(),
      ...body,
      created_at: new Date().toISOString()
    };
    
    console.log('✅ [TEST API] Returning mock response:', mockResponse);
    return NextResponse.json({ prontuario: mockResponse })
    
  } catch (err) {
    console.error('❌ [TEST API] Unexpected error:', err);
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : 'Unknown error' 
    }, { status: 500 })
  }
}