interface Course {
  id: string;
  // Add other course properties as needed
  [key: string]: unknown;
}

/**
 * Safely fetches all courses from the database
 * This function is designed to never throw errors and always return an array
 * @returns {Promise<Course[]>} Array of courses or empty array if any error occurs
 */
export async function checkCourses(): Promise<Course[]> {
  // Use a try-catch at the top level to ensure no errors escape
  try {
    // Dynamic import to prevent circular dependencies and ensure Supabase is initialized
    const { supabase } = await import('@/integrations/supabase/client');
    
    if (!supabase) {
      console.warn('Supabase client is not available');
      return [];
    }

    console.log('Checking courses in the database...');
    
    try {
      // Get session with error handling
      const { data: session, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.warn('Session error (non-critical):', sessionError.message);
        // Continue even if session check fails
      } else {
        console.log('Session status:', session?.session ? 'Authenticated' : 'Not authenticated');
      }
      
      // Query courses with error handling
      const { data: courses, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.warn('Database query warning:', error.message);
        return [];
      }
      
      const courseCount = Array.isArray(courses) ? courses.length : 0;
      console.log(`Successfully loaded ${courseCount} courses from the database`);
      
      return courses || [];
      
    } catch (dbError) {
      console.warn('Database operation warning:', dbError instanceof Error ? dbError.message : 'Unknown database error');
      return [];
    }
    
  } catch (error) {
    // This should theoretically never be reached due to inner try-catch
    console.warn('Unexpected error in checkCourses (outer):', error instanceof Error ? error.message : 'Unknown error');
    return [];
  }
}

// Export a safer version of the function that can't throw
export const safeCheckCourses = async (): Promise<Course[]> => {
  try {
    return await checkCourses();
  } catch (e) {
    return [];
  }
};
