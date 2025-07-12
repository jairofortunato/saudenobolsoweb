'use client';

import React, { useState } from 'react';
import { createClient } from '../../../lib/supabase';
import { 
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../components';

export default function AuthSettingsTestPage() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testAuthSettings = async () => {
    setLoading(true);
    const testResults: any = {};
    const supabase = createClient();

    try {
      // Test 1: Check if we can connect to Supabase
      console.log('Testing Supabase connection...');
      const { data: { user } } = await supabase.auth.getUser();
      testResults.connection = 'SUCCESS';
      testResults.currentUser = user ? { id: user.id, email: user.email } : null;

      // Test 2: Check auth settings by attempting a test signup
      console.log('Testing signup flow...');
      const testEmail = `test-${Date.now()}@example.com`;
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: 'TestPassword123!',
      });

      testResults.signupTest = {
        success: !error,
        error: error?.message,
        user: data.user ? {
          id: data.user.id,
          email: data.user.email,
          email_confirmed_at: data.user.email_confirmed_at,
          created_at: data.user.created_at
        } : null,
        session: data.session ? 'Present' : 'Null'
      };

      // Test 3: Check if the user exists in auth.users
      if (data.user) {
        console.log('Testing user existence in auth.users...');
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', data.user.id)
            .maybeSingle();
          
          testResults.userExistsTest = {
            success: !profileError,
            error: profileError?.message,
            profileExists: !!profileData
          };
        } catch (err) {
          testResults.userExistsTest = {
            success: false,
            error: 'Could not test user existence'
          };
        }

        // Note: Test user cleanup requires admin privileges
        console.log('Test user created with ID:', data.user.id);
      }

    } catch (error) {
      testResults.connection = 'ERROR';
      testResults.error = error instanceof Error ? error.message : 'Unknown error';
    }

    setResults(testResults);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-pink-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Supabase Auth Settings Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="text-sm text-slate-600">
                <p>This page tests your Supabase authentication settings to identify the signup issue.</p>
                <p className="mt-2">
                  <strong>Common issues:</strong>
                </p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Email confirmation is enabled (users need to verify email)</li>
                  <li>Row Level Security policies are too restrictive</li>
                  <li>Foreign key constraints are not properly set up</li>
                </ul>
              </div>

              <Button 
                onClick={testAuthSettings} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Testing...' : 'Run Auth Settings Test'}
              </Button>

              {results && (
                <div className="mt-8 space-y-4">
                  <h3 className="text-lg font-semibold">Test Results:</h3>
                  
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <pre className="text-sm overflow-auto">
                      {JSON.stringify(results, null, 2)}
                    </pre>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Analysis:</h4>
                    
                    {results.signupTest?.user && !results.signupTest.user.email_confirmed_at && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-yellow-800">
                          <strong>Issue Found:</strong> Email confirmation is required but not completed.
                        </p>
                        <p className="text-sm mt-1">
                          Go to your Supabase Dashboard → Authentication → Settings → Email Confirmation 
                          and disable "Enable email confirmations" for development.
                        </p>
                      </div>
                    )}

                    {results.userExistsTest?.error && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded">
                        <p className="text-red-800">
                          <strong>Issue Found:</strong> {results.userExistsTest.error}
                        </p>
                        <p className="text-sm mt-1">
                          This is likely a Row Level Security policy issue.
                        </p>
                      </div>
                    )}

                    {results.signupTest?.success && results.signupTest.user?.email_confirmed_at && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded">
                        <p className="text-green-800">
                          <strong>Good:</strong> User signup is working correctly.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 