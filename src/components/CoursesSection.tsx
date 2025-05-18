import { useState } from "react";
import { CourseCard } from "./CourseCard";
import { Course } from "../types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";

type CourseCategory = 'all' | 'programim' | 'dizajn' | 'marketing' | 'other';

type DatabaseCourse = {
  id: string;
  title: string;
  description: string | null;
  image: string | null;
  category: string;
  instructor: string;
  instructor_id: string;
  students: number | null;
  status: string;
  price: number | null;
  is_paid: boolean | null;
  access_code: string | null;
  created_at: string;
  updated_at: string;
  allow_admin_applications: boolean | null;
};

// Function to check RLS policies on the courses table
const checkRLSPolicies = async () => {
  try {
    console.log('Checking RLS policies on courses table...');
    
    // Check if RLS is enabled on the courses table
    const { data: rlsData, error: rlsError } = await supabase
      .rpc('pg_tables', { 
        schemaname: 'pg_catalog',
        tablename: 'pg_policies' 
      });
    
    if (rlsError) {
      console.error('Error checking RLS policies:', rlsError);
      return false;
    }
    
    console.log('RLS policies:', rlsData);
    
    // Check policies on the courses table
    const { data: policies, error: policiesError } = await supabase
      .rpc('pg_policies', { 
        schemaname: 'public',
        tablename: 'courses' 
      });
    
    if (policiesError) {
      console.error('Error checking courses table policies:', policiesError);
      return false;
    }
    
    console.log('Courses table policies:', policies);
    return true;
  } catch (e) {
    const error = e as Error;
    console.error('Error checking RLS:', error.message);
    return false;
  }
};

// Function to check database schema
const checkDatabaseSchema = async () => {
  try {
    console.log('Checking database schema...');
    
    // Get list of all tables in the public schema
    const { data: tables, error: tablesError } = await supabase.rpc('get_tables_info');
    
    if (tablesError) {
      console.error('Error getting tables info:', tablesError);
      // Fallback to direct SQL query if the function doesn't exist
      const { data: fallbackData, error: fallbackError } = await supabase
        .rpc('pg_table_def', { 
          schema_name: 'public',
          table_name: '%' 
        });
      
      if (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        return false;
      }
      
      console.log('Tables and columns:', fallbackData);
      return true;
    }
    
    console.log('Database schema:', tables);
    return true;
  } catch (e) {
    console.error('Error checking database schema:', e);
    return false;
  }
};

// Function to check Supabase connection and list tables
const checkSupabaseConnection = async () => {
  try {
    console.log('Checking Supabase connection...');
    
    // Check if we can access the Supabase client
    if (!supabase) {
      console.error('Supabase client is not initialized');
      return false;
    }
    
    // Try to fetch server timestamp to check connection
    const { data: timeData, error: timeError } = await supabase.rpc('now');
    if (timeError) {
      console.error('Error fetching server time:', timeError);
    } else {
      console.log('Connected to Supabase. Server time:', timeData);
    }
    
    // List all tables in the public schema
    try {
      const { data: tables, error: tablesError } = await supabase
        .from('pg_catalog.pg_tables')
        .select('tablename')
        .ilike('schemaname', 'public');
      
      if (tablesError) {
        console.warn('Could not list tables, but will continue:', tablesError);
      } else {
        console.log('Available tables:', tables.map(t => t.tablename).join(', '));
      }
      
      return true;
    } catch (e) {
      console.warn('Error checking tables:', e);
      return false;
    }
  } catch (e) {
    console.error('Error checking Supabase connection:', e);
    return false;
  }
};

const fetchCourses = async (category: CourseCategory): Promise<Course[]> => {
  try {
    console.log('Fetching courses with category:', category);
    
    // Check Supabase connection first
    const isConnected = await checkSupabaseConnection();
    if (!isConnected) {
      console.error('Not connected to Supabase');
      throw new Error('Could not connect to the database');
    }
    
    // Build the base query for active courses
    let query = supabase
      .from('courses')
      .select(`
        *,
        profiles!instructor_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    
    // Add category filter if not 'all'
    if (category !== 'all') {
      console.log('Filtering by category:', category);
      query = query.eq('category', category);
    }
    
    // Execute the query
    console.log('Executing courses query...');
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching courses:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.log('No courses found');
      return [];
    }
    
    console.log(`Found ${data.length} courses`);
    
    // Define an interface for the raw course data from the database
    interface RawCourse {
      id: string;
      title: string;
      description: string | null;
      image: string | null;
      category: Course['category'];
      instructor_id: string;
      students: number | null;
      status: Course['status'];
      price: number | null;
      is_paid: boolean | null;
      access_code: string | null;
      created_at: string;
      updated_at: string;
      allow_admin_applications: boolean | null;
      profiles: {
        full_name: string | null;
        avatar_url: string | null;
      } | null;
    }
    
    // Transform the data to match the Course type
    const courses: Course[] = data.map((course: RawCourse) => ({
      id: course.id,
      title: course.title,
      description: course.description || '',
      image: course.image || '/placeholder-course.jpg',
      category: course.category as Course['category'],
      instructor: course.profiles?.full_name || 'Instructor',
      instructorId: course.instructor_id,
      instructor_id: course.instructor_id,
      instructorAvatar: course.profiles?.avatar_url,
      students: course.students || 0,
      status: course.status as Course['status'],
      price: course.price || 0,
      isPaid: course.is_paid || false,
      is_paid: course.is_paid,
      accessCode: course.access_code,
      access_code: course.access_code,
      created_at: course.created_at,
      updated_at: course.updated_at,
      allow_admin_applications: course.allow_admin_applications || false
    }));
    
    return courses;
  } catch (e) {
    const error = e as Error;
    console.error('Unexpected error in fetchCourses:', error);
    throw new Error('Failed to fetch courses. Please try again later.');
  }
};

export const CoursesSection = () => {
  const [activeFilter, setActiveFilter] = useState<CourseCategory>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: courses = [], isLoading, error } = useQuery<Course[], Error>({
    queryKey: ['publicCourses', activeFilter],
    queryFn: () => fetchCourses(activeFilter),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  const isError = !!error;

  const handleFilterChange = (filter: CourseCategory) => {
    setActiveFilter(filter);
  };

  // Loading state
  if (isLoading) {
    return (
      <section id="courses" className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-playfair font-bold text-center mb-10">Eksploro Kurset Tona</h2>
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
            <p className="text-brown">Po ngarkohen kurset...</p>
          </div>
        </div>
      </section>
    );
  }

  // Error state
  if (isError) {
    return (
      <section id="courses" className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-playfair font-bold text-center mb-10">Eksploro Kurset Tona</h2>
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Gabim gjatë ngarkimit të kurseve</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error?.message || "Ndodhi një gabim i papritur."}</p>
                  <div className="mt-4">
                    <button
                      onClick={() => window.location.reload()}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Provo Përsëri
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // No courses found
  if (!courses || courses.length === 0) {
    return (
      <section id="courses" className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-playfair font-bold text-center mb-10">Eksploro Kurset Tona</h2>
          <div className="text-center py-12">
            <div className="mx-auto h-24 w-24 text-brown">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Nuk u gjetën kurse</h3>
            <p className="mt-2 text-gray-600">
              Nuk ka kurse të disponueshme në këtë kategori momentalisht. Ju lutemi kontrolloni më vonë.
            </p>
            <div className="mt-6">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gold hover:bg-gold-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold"
              >
                Rifresko Faqen
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Success state - show courses
  return (
    <section id="courses" className="py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-playfair font-bold text-center mb-10">Eksploro Kurset Tona</h2>
        
        <div className="text-center mb-10">
          <span className="text-brown">Filtro sipas: </span>
          {(['all', 'programim', 'dizajn', 'marketing'] as CourseCategory[]).map((filter) => (
            <span key={filter}>
              <button
                className={`mx-2 pb-1 ${activeFilter === filter ? "font-semibold border-b-2 border-gold" : "hover:text-brown-dark"}`}
                onClick={() => handleFilterChange(filter)}
              >
                {filter === 'all' ? 'Të gjitha' : 
                 filter === 'programim' ? 'Programim' :
                 filter === 'dizajn' ? 'Dizajn' : 'Marketing'}
              </button>
              {filter !== 'marketing' && <span className="text-gray-400">|</span>}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      </div>
    </section>
  );
};
