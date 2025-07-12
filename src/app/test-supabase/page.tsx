'use client';

import React, { useState } from 'react';
import { createClient } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { 
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Alert
} from '../../../components';

export default function TestSupabasePage() {
  const { user, profile, loading, error } = useAuth();
  const [testResults, setTestResults] = useState<any>(null);
  const [testingProfile, setTestingProfile] = useState(false);

  const testSupabaseConnection = async () => {
    const supabase = createClient();
    const results: any = { timestamp: new Date().toISOString() };

    try {
      // Test 1: Basic connection
      console.log('Testing basic connection...');
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      results.connection = {
        status: 'SUCCESS',
        user: currentUser ? { id: currentUser.id, email: currentUser.email } : null
      };

      // Test 2: Test profile fetch if user exists
      if (currentUser) {
        console.log('Testing profile fetch...');
        try {
          const startTime = Date.now();
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();
          
          const fetchTime = Date.now() - startTime;
          
          results.profileFetch = {
            status: profileError ? 'ERROR' : 'SUCCESS',
            fetchTime: `${fetchTime}ms`,
            error: profileError?.message,
            errorCode: profileError?.code,
            data: profileData ? {
              id: profileData.id,
              email: profileData.email,
              role: profileData.role,
              full_name: profileData.full_name
            } : null
          };
        } catch (profileFetchError) {
          results.profileFetch = {
            status: 'TIMEOUT',
            error: profileFetchError instanceof Error ? profileFetchError.message : 'Unknown error'
          };
        }

        // Test 3: Test if profile exists at all
        console.log('Testing if any profile exists...');
        try {
          const { data: anyProfile, error: anyError } = await supabase
            .from('profiles')
            .select('count')
            .eq('user_id', currentUser.id);
          
          results.profileExists = {
            status: anyError ? 'ERROR' : 'SUCCESS',
            error: anyError?.message,
            exists: anyProfile && anyProfile.length > 0
          };
        } catch (error) {
          results.profileExists = {
            status: 'ERROR',
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }

      // Test 4: Test RLS policies
      console.log('Testing RLS policies...');
      try {
        const { data: testQuery, error: rlsError } = await supabase
          .from('profiles')
          .select('count');
        
        results.rlsPolicies = {
          status: rlsError ? 'ERROR' : 'SUCCESS',
          error: rlsError?.message,
          canQuery: !rlsError
        };
      } catch (error) {
        results.rlsPolicies = {
          status: 'ERROR',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }

      // Test 5: Check environment variables
      results.environment = {
        supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        nodeEnv: process.env.NODE_ENV
      };

      setTestResults(results);
    } catch (error) {
      console.error('Test error:', error);
      setTestResults({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  };

  const testDirectProfileFetch = async () => {
    if (!user) return;
    
    setTestingProfile(true);
    const supabase = createClient();
    
    try {
      console.log('Testing direct profile fetch with timeout...');
      const startTime = Date.now();
      
      // Test with shorter timeout
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('5-second timeout')), 5000);
      });
      
      const result = await Promise.race([profilePromise, timeoutPromise]);
      const fetchTime = Date.now() - startTime;
      
      console.log('Direct profile fetch result:', result);
      alert(`Profile fetch successful in ${fetchTime}ms`);
    } catch (error) {
      console.error('Direct profile fetch failed:', error);
      alert(`Profile fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTestingProfile(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-pink-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">
            Test Supabase Connection
          </h1>
          <p className="text-slate-600">
            Debug authentication and database issues
          </p>
        </div>

        {/* Auth Status */}
        <Card>
          <CardHeader>
            <CardTitle>Current Auth Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${loading ? 'bg-yellow-500' : user ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>Loading: {loading ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${user ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>User: {user ? user.email : 'Not authenticated'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${profile ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>Profile: {profile ? `${profile.full_name} (${profile.role})` : 'Not loaded'}</span>
              </div>
              {error && (
                <Alert variant="error">
                  <strong>Error:</strong> {error}
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Test Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Connection Tests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  onClick={testSupabaseConnection}
                  variant="primary"
                  className="w-full"
                >
                  Run Full Connection Test
                </Button>
                
                {user && (
                  <Button 
                    onClick={testDirectProfileFetch}
                    variant="secondary"
                    className="w-full"
                    loading={testingProfile}
                    disabled={testingProfile}
                  >
                    Test Direct Profile Fetch
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Environment Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div><strong>Supabase URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</div>
                <div><strong>Supabase Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</div>
                <div><strong>Environment:</strong> {process.env.NODE_ENV}</div>
                <div><strong>Auth State:</strong> {loading ? 'Loading...' : user ? 'Authenticated' : 'Not authenticated'}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Test Results */}
        {testResults && (
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-slate-50 p-4 rounded-lg text-sm overflow-auto">
                {JSON.stringify(testResults, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <Button 
                onClick={() => window.location.href = '/'}
                variant="outline"
              >
                Back to Home
              </Button>
              <Button 
                onClick={() => window.location.href = '/loading-debug'}
                variant="outline"
              >
                Loading Debug Page
              </Button>
              <Button 
                onClick={() => window.location.reload()}
                variant="outline"
              >
                Reload Page
              </Button>
              <Button 
                onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.href = '/';
                }}
                variant="outline"
              >
                Clear Storage & Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 