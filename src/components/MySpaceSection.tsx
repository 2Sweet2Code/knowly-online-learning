
import { Link } from "react-router-dom";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, BookOpen, Star, AlertCircle, Calendar, Info } from "lucide-react";
import { Button } from "./ui/button";
import { format } from "date-fns";
import { PostgrestError } from "@supabase/supabase-js";

interface Course {
  id: string;
  title: string;
  description: string | null;
  image: string | null;
  category: 'programim' | 'dizajn' | 'marketing' | 'other';
  instructor: string;
  instructor_id: string;
  status: 'active' | 'draft';
  created_at: string;
}

interface Grade {
  id: string;
  course_id: string;
  user_id: string;
  grade: number | null;
  feedback: string | null;
  created_at: string;
  updated_at: string;
}

interface Enrollment {
  id: string;
  created_at: string;
  course_id: string;
  courses: Course;
}

type EnrolledCourse = Course & {
  grade: number | null;
  feedback: string | null;
  enrollment_date: string;
}

export const MySpaceSection = () => {
  const { user } = useAuth();
  
  const { data: enrolledCourses = [], isLoading, error, refetch } = useQuery<EnrolledCourse[]>({
    queryKey: ['student-enrollments', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        console.log('Fetching enrollments for user:', user.id);
        
        // Get user enrollments with course details
        const { data: enrollments, error: enrollError } = await supabase
          .from('enrollments')
          .select('*, courses(*)')
          .eq('user_id', user.id) as { data: Array<{ id: string; created_at: string; course_id: string; courses: Course }> | null; error: PostgrestError | null };
          
        if (enrollError) {
          console.error('Error fetching enrollments:', enrollError);
          throw enrollError;
        }
        
        console.log('Found enrollments:', enrollments);
        
        if (!enrollments?.length) {
          console.log('No enrollments found for user');
          return [];
        }
        
        if (enrollError) throw enrollError;
        if (!enrollments?.length) return [];
        
        // Get grades for all enrolled courses
        const courseIds = enrollments.map(e => e.course_id);
        const { data: grades = [], error: gradesError } = await supabase
          .from('student_grades')
          .select('*')
          .eq('user_id', user.id)
          .in('course_id', courseIds);
        
        if (gradesError) console.error('Error fetching grades:', gradesError);
        
        // Map the data to the expected format
        return enrollments.map(enrollment => {
          const course = enrollment.courses;
          const grade = grades?.find(g => g.course_id === course.id);
          
          return {
            ...course,
            enrollment_date: enrollment.created_at,
            grade: grade?.grade || null,
            feedback: grade?.feedback || null,
          };
        });
      } catch (error) {
        console.error('Error in MySpaceSection:', error);
        return [];
      }
    },
    enabled: !!user,
    refetchOnWindowFocus: true
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Kurset e mia</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
              <div className="h-48 bg-gray-200"></div>
              <div className="p-4">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Ka ndodhur një gabim gjatë ngarkimit të kurseve tuaja. Ju lutemi provoni përsëri.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (enrolledCourses.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Nuk keni asnjë kurs</h3>
          <p className="mt-1 text-sm text-gray-500">Nuk jeni të regjistruar në asnjë kurs ende.</p>
          <div className="mt-6">
            <Link
              to="/courses"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brown hover:bg-brown-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brown"
            >
              Shiko Kurset
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Function to get grade color based on percentage
  const getGradeColor = (grade: number) => {
    if (grade >= 90) return 'text-green-600';
    if (grade >= 70) return 'text-blue-600';
    if (grade >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Function to get grade status
  const getGradeStatus = (grade: number) => {
    if (grade >= 90) return 'Shkëlqyeshëm';
    if (grade >= 70) return 'Mirë';
    if (grade >= 50) return 'Mjaftueshëm';
    return 'Dobët';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Kurset e mia</h1>
        <Button
          onClick={() => refetch()}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 16h5v5" />
          </svg>
          Rifresko
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {enrolledCourses.map((course) => (
          <div key={course.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow duration-200">
            <div className="h-48 bg-gray-200 relative">
              {course.image ? (
                <img
                  src={course.image}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <BookOpen className="h-16 w-16 text-gray-300" />
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                <h3 className="text-lg font-semibold text-white line-clamp-2">
                  {course.title}
                </h3>
              </div>
            </div>
            
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">Instruktor</span>
                <span className="text-sm font-medium">{course.instructor}</span>
              </div>
              
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">Data e regjistrimit</span>
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="h-4 w-4 mr-1" />
                  {format(new Date(course.enrollment_date), 'PP')}
                </div>
              </div>
              
              {course.grade !== null ? (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Nota juaj</span>
                    <div className="flex items-center">
                      <span className={`text-xl font-bold mr-2 ${getGradeColor(course.grade)}`}>
                        {course.grade.toFixed(1)}%
                      </span>
                      <span className="text-xs text-gray-500">
                        ({getGradeStatus(course.grade)})
                      </span>
                    </div>
                  </div>
                  {course.feedback && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-md text-sm text-gray-700 border border-blue-100">
                      <p className="font-medium text-blue-800 mb-1">Koment nga instruktori:</p>
                      <p className="italic">"{course.feedback}"</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center text-sm text-gray-500">
                    <Info className="h-4 w-4 mr-1 text-yellow-500" />
                    <span>Nuk keni notë për këtë kurs ende.</span>
                  </div>
                </div>
              )}
              
              <div className="mt-4">
                <Link
                  to={`/courses/${course.id}`}
                  className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brown hover:bg-brown-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brown"
                >
                  Shiko Kursin
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
