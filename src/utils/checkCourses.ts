import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches all courses from the database
 * @returns {Promise<Array>} Array of courses or empty array if error occurs
 */
export async function checkCourses() {
  try {
    console.log('Checking courses in the database...');
    
    if (!supabase) {
      console.warn('Supabase client is not initialized');
      return [];
    }
    
    // First, check if we can connect to Supabase
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Error getting session:', sessionError);
      return [];
    }
    
    console.log('Session:', session);
    
    // Query all courses
    const { data: courses, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching courses:', error);
      return [];
    }
    
    console.log(`Found ${courses?.length || 0} courses in the database`);
    
    return courses || [];
  } catch (error) {
    console.error('Unexpected error in checkCourses:', error);
    return [];
  }
}

// Export the function without immediately executing it
