import { supabase } from '@/integrations/supabase/client';

export async function debugCourses() {
  try {
    console.log('Fetching courses...');
    const { data: courses, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching courses:', error);
      return [];
    }

    console.log('Fetched courses:', courses);
    return courses || [];
  } catch (error) {
    console.error('Unexpected error in debugCourses:', error);
    return [];
  }
}
