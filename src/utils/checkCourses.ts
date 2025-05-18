import { supabase } from '@/integrations/supabase/client';

export async function checkCourses() {
  try {
    console.log('Checking courses in the database...');
    
    // First, check if we can connect to Supabase
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    console.log('Session:', session);
    
    if (sessionError) {
      console.error('Error getting session:', sessionError);
    }
    
    // Query all courses
    const { data: courses, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching courses:', error);
      return [];
    }
    
    console.log(`Found ${courses?.length || 0} courses in the database:`);
    console.log(courses);
    
    return courses || [];
  } catch (error) {
    console.error('Unexpected error in checkCourses:', error);
    return [];
  }
}

// Run the check when this module is imported
checkCourses().catch(console.error);
