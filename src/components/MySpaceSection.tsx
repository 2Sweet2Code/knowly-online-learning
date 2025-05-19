
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, BookOpen } from "lucide-react";

interface Course {
  id: string;
  title: string;
  description: string | null;
  image: string | null;
  category: 'programim' | 'dizajn' | 'marketing' | 'other';
  instructor: string;
  instructor_id: string;
  status: 'active' | 'draft';
}

interface EnrollmentWithCourse {
  course_id: string;
  courses: Course[] | null;
}

interface Grade {
  course_id: string;
  grade: number | null;
  feedback: string | null;
}

type EnrolledCourse = Course & {
  grade: number | null;
  feedback: string | null;
}

export const MySpaceSection = () => {
  const { user } = useAuth();
  
  const { data: enrolledCourses = [], isLoading } = useQuery<EnrolledCourse[]>({
    queryKey: ['enrollments', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Get user enrollments with course details
      const { data: enrollments, error } = await supabase
        .from('enrollments')
        .select('course_id, courses(*)')
        .eq('user_id', user.id) as { 
          data: Array<{ course_id: string; courses: Course[] }> | null; 
          error: Error | null 
        };
      
      if (error) {
        console.error('Error fetching enrolled courses:', error);
        return [];
      }
      
      if (!enrollments?.length) return [];
      
      // Get grades for all enrolled courses
      const courseIds = enrollments.map(item => item.course_id);
      const { data: gradesData } = await supabase
        .from('student_grades')
        .select('course_id, grade, feedback')
        .eq('user_id', user.id)
        .in('course_id', courseIds);
      
      // Map the data to the expected format
      return enrollments.flatMap(enrollment => {
        if (!enrollment.courses || !enrollment.courses.length) return [];
        
        return enrollment.courses.map(course => ({
          ...course,
          grade: gradesData?.find(g => g.course_id === course.id)?.grade || null,
          feedback: gradesData?.find(g => g.course_id === course.id)?.feedback || null,
        }));
      });
    },
    enabled: !!user
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">My Enrolled Courses</h1>
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

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Enrolled Courses</h1>
      
      {enrolledCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrolledCourses.map((course) => (
            <div key={course.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <div className="h-48 bg-gray-100 flex items-center justify-center">
                {course.image ? (
                  <img 
                    src={course.image} 
                    alt={course.title} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <BookOpen className="w-16 h-16 text-gray-400" />
                )}
              </div>
              <div className="p-4">
                <h2 className="text-xl font-semibold mb-2 line-clamp-2">{course.title}</h2>
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {course.description || 'No description available'}
                </p>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900">
                    {course.grade !== null ? `Grade: ${course.grade}%` : 'No grade yet'}
                  </span>
                  <Link
                    to={`/courses/${course.id}`}
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                  >
                    View Course →
                  </Link>
                </div>
                
                {course.feedback && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Feedback:</span> {course.feedback}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <GraduationCap className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No enrolled courses</h3>
          <p className="mt-1 text-gray-500">You haven't enrolled in any courses yet.</p>
          <div className="mt-6">
            <Link
              to="/courses"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Browse Courses
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
