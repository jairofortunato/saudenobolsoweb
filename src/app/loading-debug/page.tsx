'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '../../../components';

export default function LoadingDebugPage() {
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-pink-50 p-4">
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">
            Loading Debug Page
          </h1>
          <p className="text-slate-600">
            Bypass authentication loading to test the app
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-slate-700 mb-2">Environment Check</h3>
                <div className="bg-slate-50 p-3 rounded-lg space-y-1 text-sm">
                  <div>
                    <strong>Supabase URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}
                  </div>
                  <div>
                    <strong>Supabase Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}
                  </div>
                  <div>
                    <strong>Node Environment:</strong> {process.env.NODE_ENV}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-700 mb-2">Console Logs</h3>
                <p className="text-sm text-slate-600 mb-2">
                  Open your browser's developer console (F12) to see detailed authentication logs.
                  Look for messages starting with:
                </p>
                <div className="bg-slate-50 p-3 rounded-lg text-sm font-mono">
                  <div>🔧 Supabase config: ...</div>
                  <div>🔧 useAuthState: Initializing</div>
                  <div>🔧 AuthProvider: Rendering</div>
                  <div>🏠 Home: Render state: ...</div>
                </div>
              </div>

              <Button 
                onClick={() => setShowDetails(!showDetails)}
                variant="outline"
                className="w-full"
              >
                {showDetails ? 'Hide' : 'Show'} Detailed Environment
              </Button>

              {showDetails && (
                <div className="bg-slate-50 p-3 rounded-lg text-xs">
                  <div><strong>URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL}</div>
                  <div><strong>Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 50)}...</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Navigation Options</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link href="/">
                <Button variant="primary" className="w-full">
                  Go to Home Page (with auth)
                </Button>
              </Link>
              
              <Link href="/auth-demo">
                <Button variant="secondary" className="w-full">
                  Auth Demo Page
                </Button>
              </Link>
              
              <Link href="/form-components-demo">
                <Button variant="outline" className="w-full">
                  Form Components Demo (no auth)
                </Button>
              </Link>
              
              <Link href="/components-demo">
                <Button variant="outline" className="w-full">
                  UI Components Demo (no auth)
                </Button>
              </Link>

              <Link href="/test-supabase">
                <Button variant="success" className="w-full">
                  Test Supabase Connection
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-yellow-50 border-yellow-200">
          <CardHeader>
            <CardTitle className="text-yellow-800">Troubleshooting Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-yellow-700">
              <li>Check browser console for detailed logs</li>
              <li>Verify Supabase environment variables are loaded</li>
              <li>Test if non-auth pages load properly</li>
              <li>Check if the issue is with auth state or Supabase connection</li>
              <li>Try accessing the test pages above to isolate the issue</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 