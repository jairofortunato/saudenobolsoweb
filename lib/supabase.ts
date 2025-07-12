import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔧 Supabase config:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseKey,
  urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'missing',
  keyPreview: supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'missing'
});
 
export const createClient = () => {
  console.log('🔧 Creating Supabase browser client');
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables!');
    throw new Error('Missing Supabase environment variables');
  }
  
  const client = createBrowserClient(supabaseUrl, supabaseKey);
  console.log('✅ Supabase browser client created');
  return client;
}; 