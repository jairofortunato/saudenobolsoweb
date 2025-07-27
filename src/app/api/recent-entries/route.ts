import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase-server';

// GET /api/recent-entries - Fetch recent medical entries for the authenticated user
export async function GET(request: NextRequest) {
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

    // Get user profile to determine patient_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // For patients, get their own entries
    // For doctors, they would need to specify patient_id (for future implementation)
    const patient_id = profile.role === 'patient' ? profile.id : profile.id;

    // Parse query parameters for limiting results
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const minutes = parseInt(url.searchParams.get('recent_minutes') || '60'); // Default: last 60 minutes

    // Calculate the timestamp for recent entries
    const recentThreshold = new Date(Date.now() - minutes * 60 * 1000).toISOString();

    // Define the tables and their structures
    const tables = [
      { name: 'medications', category: 'medications' },
      { name: 'allergies', category: 'allergies' },
      { name: 'exams', category: 'exams' },
      { name: 'diseases', category: 'diseases' },
      { name: 'consultations', category: 'consultations' }
    ];

    const allEntries: any[] = [];

    // Fetch recent entries from each table
    for (const table of tables) {
      try {
        const { data: entries, error: tableError } = await supabase
          .from(table.name)
          .select('*')
          .eq('patient_id', patient_id)
          .gte('created_at', recentThreshold)
          .order('created_at', { ascending: false })
          .limit(Math.ceil(limit / tables.length)); // Distribute limit across tables

        if (tableError) {
          console.error(`Error fetching from ${table.name}:`, tableError);
          continue; // Skip this table but continue with others
        }

        if (entries && entries.length > 0) {
          // Add category information to each entry
          const entriesWithCategory = entries.map(entry => ({
            ...entry,
            category: table.category,
            table_name: table.name
          }));
          
          allEntries.push(...entriesWithCategory);
        }
      } catch (tableError) {
        console.error(`Unexpected error fetching from ${table.name}:`, tableError);
        continue;
      }
    }

    // Sort all entries by created_at descending and limit results
    allEntries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const limitedEntries = allEntries.slice(0, limit);

    // Group entries by category for summary
    const summary = limitedEntries.reduce((acc, entry) => {
      const category = entry.category;
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category]++;
      return acc;
    }, {} as { [key: string]: number });

    return NextResponse.json({
      entries: limitedEntries,
      total: limitedEntries.length,
      summary,
      timeRange: {
        since: recentThreshold,
        minutes: minutes
      },
      patient_id: patient_id
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/recent-entries:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 