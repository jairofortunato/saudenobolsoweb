import { createClient } from './supabase';

export async function testSupabaseConnection() {
  try {
    const supabase = createClient();
    
    // Test the connection by making a simple query
    const { error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    
    console.log('Supabase connection test successful');
    return true;
  } catch (error) {
    console.error('Supabase connection test error:', error);
    return false;
  }
} 