import { createClient } from '@/lib/supabase-server';
import Link from 'next/link';

export default async function TestSupabasePage() {
  let connectionStatus = 'Unknown';
  let error = null;

  try {
    const supabase = await createClient();
    const { error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      connectionStatus = 'Connected with auth error';
      error = authError.message;
    } else {
      connectionStatus = 'Connected successfully';
    }
  } catch (e) {
    connectionStatus = 'Connection failed';
    error = e instanceof Error ? e.message : 'Unknown error';
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
      
      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Connection Status:</h2>
        <p className={`text-lg ${connectionStatus.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>
          {connectionStatus}
        </p>
        
        {error && (
          <div className="mt-4">
            <h3 className="text-md font-semibold text-red-600">Error Details:</h3>
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Environment Check:</h2>
        <div className="bg-gray-100 p-4 rounded-lg">
          <p>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Not set'}</p>
          <p>Supabase Anon Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not set'}</p>
        </div>
      </div>

      <div className="mt-6">
        <Link
          href="/"
          className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
} 