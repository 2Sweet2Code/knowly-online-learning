import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Course } from '@/types'; 
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom'; 

// Define the type to match exactly what we're selecting from the database
type DbCourseRow = {
  id: string;
  title: string;
  description: string;
  image: string;
  category: 'programim' | 'dizajn' | 'marketing' | 'other';
  instructor_id: string;
  status: 'active' | 'draft';
  created_at?: string;
  updated_at?: string;
  // This field might not exist in the database yet, but is part of the requirements
  allow_admin_applications?: boolean;
};

const AdminApplyCoursesPage = () => {
  const { user, isLoading: isLoadingUser } = useAuth(); 
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { 
    data: availableCourses, 
    isLoading: isLoadingCourses, 
    error: coursesError,
    isError: isCoursesError 
  } = useQuery<Course[], Error>({
    queryKey: ['appliableCourses', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Only select columns that exist in the courses table according to the schema
      // Note: We're selecting active courses for now, as allow_admin_applications might not be implemented yet
      const { data: coursesData, error: coursesFetchError } = await supabase
        .from('courses')
        .select('id,title,description,image,category,instructor_id,status,created_at,updated_at')
        .eq('status', 'active');
      console.log('coursesData:', coursesData);

      if (coursesFetchError) {
        console.error('Error fetching courses:', coursesFetchError);
        throw coursesFetchError;
      }
      // If coursesData is not an array or is null/undefined, throw an error
      if (!coursesData || !Array.isArray(coursesData)) {
        throw new Error("Unexpected response from Supabase: coursesData is not an array");
      }

      const { data: existingApplications, error: appsError } = await supabase
        .from('course_admins')
        .select('course_id, status') 
        .eq('user_id', user.id);
      console.log('existingApplications:', existingApplications);

      if (appsError) {
        console.error('Error fetching existing applications:', appsError);
        throw appsError; 
      }

      const appliedOrManagedCourseIds = new Set(
        existingApplications?.map(app => app.course_id) || []
      );

      // We're using the DbCourseRow type defined at the top of the file
      // At this point, we know coursesData is an array (we checked above)
      // Cast it to our DbCourseRow type
      const validCourses = coursesData as DbCourseRow[];
      // Get instructor profiles to display instructor names
      // Filter out any undefined instructor_ids to avoid errors
      const instructorIds = validCourses
        .map(course => course.instructor_id)
        .filter(id => id !== undefined && id !== null);
      const { data: instructors } = await supabase
        .from('profiles')
        .select('id,name')
        .in('id', instructorIds);
      console.log('instructors:', instructors);

      // Create a map of instructor IDs to names for quick lookup
      const instructorMap = new Map();
      if (Array.isArray(instructors)) {
        instructors.forEach(instructor => {
          instructorMap.set(instructor.id, instructor.name);
        });
      }

      // Map database course rows to the Course type expected by the component
      return validCourses
        .filter(dbCourse => !appliedOrManagedCourseIds.has(dbCourse.id))
        .map((dbCourse): Course => ({
          id: dbCourse.id,
          title: dbCourse.title,
          description: dbCourse.description,
          image: dbCourse.image,
          category: dbCourse.category,
          instructor: instructorMap.get(dbCourse.instructor_id) || 'Unknown Instructor',
          instructorId: dbCourse.instructor_id,
          students: 0, // This field might not exist in the database, default to 0
          status: dbCourse.status,
          created_at: dbCourse.created_at,
          updated_at: dbCourse.updated_at,
          allow_admin_applications: true, // Default to true for now since we're only showing active courses
        }));
    },
    enabled: !!user && user.role === 'admin', 
  });

  const applyMutation = useMutation<string, Error, string>({
    mutationFn: async (courseId: string) => {
      if (!user) throw new Error('User not authenticated.');

      // Try inserting with minimal required fields first
      // This will work even if status and reason columns don't exist yet
      const { error, data } = await supabase.from('course_admins').insert({
        course_id: courseId,
        user_id: user.id
      }).select('course_id').single(); 

      if (error) {
        console.error('Error applying for course:', error);
        throw error;
      }
      return data?.course_id || courseId; 
    },
    onSuccess: (appliedCourseId) => {
      toast({
        title: 'Aplikimi u dërgua!',
        description: 'Aplikimi juaj për kursin është dërguar me sukses.',
      });
      queryClient.invalidateQueries({ queryKey: ['appliableCourses', user?.id] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Gabim në Aplikim',
        description: error.message || 'Ndodhi një problem gjatë dërgimit të aplikimit.',
        variant: 'destructive',
      });
    },
  });

  if (isLoadingUser) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <p>Duke ngarkuar të dhënat e përdoruesit...</p>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Akses i Ndaluar</h1>
        <p className="text-lg text-gray-700">Ju nuk keni autorizimin për të parë këtë faqe ose duhet të identifikoheni.</p>
        <Link to={user ? "/dashboard" : "/login"} className="mt-6 inline-block bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600">
          {user ? "Kthehu në Panel" : "Identifikohu"}
        </Link>
      </div>
    );
  }

  if (isLoadingCourses) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <p>Duke ngarkuar kurset...</p>
      </div>
    );
  }

  if (isCoursesError) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <p className="text-red-500">Gabim gjatë ngarkimit të kurseve: {coursesError?.message}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4">
      <h1 className="text-4xl font-bold text-center text-gray-800 mb-12">Apliko për Menaxhim Kursi</h1>
      
      {availableCourses && availableCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {availableCourses.map((course) => (
            <div key={course.id} className="bg-white rounded-lg shadow-lg overflow-hidden transition-transform duration-300 hover:scale-105">
              <img src={course.image || `https://placehold.co/600x400?text=${encodeURIComponent(course.title)}`} alt={course.title} className="w-full h-56 object-cover" />
              <div className="p-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-2 truncate" title={course.title}>{course.title.replace(/ \[.*\]$/, '')}</h2>
                <p className="text-gray-600 mb-1 text-sm">Kategoria: {course.category}</p>
                <p className="text-gray-600 mb-4 text-sm">Instruktori: {course.instructor}</p>
                
                <button
                  onClick={() => applyMutation.mutate(course.id)}
                  disabled={applyMutation.isPending && applyMutation.variables === course.id} 
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-md transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {(applyMutation.isPending && applyMutation.variables === course.id) ? 'Duke Aplikuar...' : 'Apliko Tani'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-xl text-gray-600">Nuk ka kurse të disponueshme për aplikim për momentin ose ju keni aplikuar tashmë për të gjitha kurset e disponueshme.</p>
        </div>
      )}
    </div>
  );
};

export default AdminApplyCoursesPage;
