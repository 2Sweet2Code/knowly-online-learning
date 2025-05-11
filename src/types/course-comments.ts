// Type definitions for course_comments table
export interface CourseComment {
  id: string;
  course_id: string;
  user_id: string;
  content: string;
  is_public: boolean;
  created_at: string;
  user_name?: string;
  status?: string;
}

// Type definitions for student_grades table
export interface StudentGrade {
  id: string;
  course_id: string;
  user_id: string;
  grade: number | null;
  feedback: string | null;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

import { SupabaseClient } from '@supabase/supabase-js';

// Type definitions for tables not in the schema
interface ExtendedTables {
  course_comments: {
    Row: CourseComment;
    Insert: Omit<CourseComment, 'id'>;
    Update: Partial<CourseComment>;
  };
  student_grades: {
    Row: StudentGrade;
    Insert: Omit<StudentGrade, 'id' | 'created_at' | 'updated_at'>;
    Update: Partial<StudentGrade>;
  };
}

// Extended Supabase client type that includes our custom tables
type ExtendedSupabaseClient = SupabaseClient<{
  Tables: ExtendedTables;
  Functions: {
    'get-course-comments': {
      Args: { courseId: string };
      Returns: CourseComment[];
    };
    'get-student-grades': {
      Args: { userId: string; courseIds: string[] };
      Returns: StudentGrade[];
    };
    'insert-course-comment': {
      Args: Omit<CourseComment, 'id'>;
      Returns: { id: string };
    };
  };
}>

// Helper function to insert a course comment
export const insertCourseComment = async (supabase: SupabaseClient, commentData: Omit<CourseComment, 'id'>) => {
  try {
    // Cast to ExtendedSupabaseClient to allow accessing our custom tables
    const extendedClient = supabase as unknown as ExtendedSupabaseClient;
    
    // Skip Edge Function call due to CORS issues
    // Just use direct database access
    
    // Fallback to direct insert
    return await extendedClient.from('course_comments').insert(commentData);
  } catch (err) {
    console.error('Error inserting course comment:', err);
    return { data: null, error: err };
  }
};

// Helper function to safely access course comments
export const getCourseComments = async (supabase: SupabaseClient, courseId: string) => {
  try {
    // Cast to ExtendedSupabaseClient to allow accessing our custom tables
    const extendedClient = supabase as unknown as ExtendedSupabaseClient;
    
    // Skip Edge Function call due to CORS issues
    // Just use direct database access
    
    // Fallback to direct query with our extended type
    return await extendedClient.from('course_comments')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });
  } catch (err) {
    console.error('Error fetching course comments:', err);
    return { data: [], error: err };
  }
};

// Helper function to safely access student grades
export const getStudentGrades = async (supabase: SupabaseClient, userId: string, courseIds: string[]) => {
  try {
    // Cast to ExtendedSupabaseClient to allow accessing our custom tables
    const extendedClient = supabase as unknown as ExtendedSupabaseClient;
    
    // Skip Edge Function call due to CORS issues
    // Just use direct database access
    
    // Fallback to direct query with our extended type
    return await extendedClient.from('student_grades')
      .select('*')
      .eq('user_id', userId)
      .in('course_id', courseIds);
  } catch (err) {
    console.error('Error fetching student grades:', err);
    return { data: [], error: err };
  }
};
