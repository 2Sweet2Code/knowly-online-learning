
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Course } from "../types";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap } from "lucide-react";

interface EnrolledCourse extends Course {
  progress: number;
  completed: boolean;
  grade?: number | null;
  feedback?: string | null;
}

export const MySpaceSection = () => {
  const { user } = useAuth();
  
  const { data: enrolledCourses = [], isLoading } = useQuery({
    queryKey: ['enrollments', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // First get user enrollments
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('*')
        .eq('user_id', user.id);
      
      if (enrollmentsError) {
        console.error('Error fetching enrollments:', enrollmentsError);
        return [];
      }
      
      if (!enrollments.length) return [];
      
      // Then get course details for each enrollment
      const enrolledCourseIds = enrollments.map(e => e.course_id);
      
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .in('id', enrolledCourseIds);
      
      if (coursesError) {
        console.error('Error fetching enrolled courses:', coursesError);
        return [];
      }
      
      // Get grades if available
      let grades: Array<{course_id: string; grade: number | null; feedback: string | null}> = [];
      
      try {
        // Try direct table query first
        try {
          // Use a type assertion to handle the table that might not be in the TypeScript definitions
          const { data: directGrades, error: directError } = await supabase
            .from('student_grades' as any)
            .select('course_id, grade, feedback')
            .eq('user_id', user.id)
            .in('course_id', enrolledCourseIds);
            
          if (!directError && directGrades && Array.isArray(directGrades)) {
            grades = directGrades as any;
            console.log('Successfully fetched grades via direct query');
          }
        } catch (directQueryError) {
          console.log('Direct query failed:', directQueryError);
          // Continue to fallback approach
        }
        
        // Fallback to localStorage if no grades from direct query
        if (grades.length === 0) {
          const localGrades = localStorage.getItem(`student_grades_${user.id}`);
          if (localGrades) {
            try {
              const parsedGrades = JSON.parse(localGrades);
              if (Array.isArray(parsedGrades)) {
                grades = parsedGrades;
                console.log('Successfully fetched grades from localStorage');
              }
            } catch (e) {
              console.error('Error parsing local grades:', e);
            }
          }
        }
        
      } catch (error) {
        console.error('Error in grades fetching flow:', error);
        // Continue without grades if all approaches fail
      }
      
      // Map enrollments with courses and grades
      return courses.map(course => {
        const enrollment = enrollments.find(e => e.course_id === course.id);
        const grade = grades.find(g => g.course_id === course.id);
        
        return {
          id: course.id,
          title: course.title,
          description: course.description,
          image: course.image,
          category: course.category as 'programim' | 'dizajn' | 'marketing' | 'other',
          instructor: course.instructor,
          instructorId: course.instructor_id,
          students: course.students || 0,
          status: course.status as 'active' | 'draft',
          progress: enrollment?.progress || 0,
          completed: enrollment?.completed || false,
          grade: grade?.grade || null,
          feedback: grade?.feedback || null,
        };
      });
    },
    enabled: !!user
  });

  return (
    <section id="my-space" className="py-16 bg-white border-t border-lightGray">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-playfair font-bold text-center mb-10">
          Hapësira Ime
        </h2>

        {isLoading ? (
          <div className="text-center py-10">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brown border-r-transparent" role="status">
              <span className="sr-only">Po ngarkohet...</span>
            </div>
            <p className="mt-2 text-brown">Po ngarkohen të dhënat...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Active Courses */}
            <div className="bg-cream p-6 rounded-lg border border-lightGray">
              <h4 className="text-xl font-playfair font-bold text-brown mb-4">Kurset e Mia Aktive</h4>
              {enrolledCourses.length > 0 ? (
                <ul className="space-y-3">
                  {enrolledCourses.map((course) => (
                    <li key={course.id} className="pb-2 border-b border-lightGray last:border-0">
                      <div className="flex justify-between items-center">
                        <span>{course.title}</span>
                        <span className="text-sm text-brown">({course.progress}%)</span>
                      </div>
                      <div className="w-full bg-white rounded-full h-2 mt-1">
                        <div 
                          className="bg-gold h-2 rounded-full" 
                          style={{ width: `${course.progress}%` }}
                        ></div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-600 mb-4">Nuk jeni regjistruar në asnjë kurs ende.</p>
              )}
              <Link to="/courses" className="btn btn-secondary btn-sm mt-4 inline-block">
                Gjej Kurse të Reja
              </Link>
            </div>

            {/* Grades */}
            <div className="bg-cream p-6 rounded-lg border border-lightGray">
              <h4 className="text-xl font-playfair font-bold text-brown mb-4 flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Notat e Mia
              </h4>
              {enrolledCourses.filter(c => c.grade !== null).length > 0 ? (
                <div className="space-y-3">
                  {enrolledCourses
                    .filter(c => c.grade !== null)
                    .map((course) => (
                      <div key={course.id} className="border-b border-lightGray pb-2 last:border-0">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{course.title}</span>
                          <span className="text-lg font-bold text-brown">{course.grade}/10</span>
                        </div>
                        {course.feedback && (
                          <p className="text-sm text-gray-600 mt-1 italic">Feedback: {course.feedback}</p>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-gray-600">
                  <p>Nuk keni marrë ende nota.</p>
                  <p className="text-sm mt-2">Notat do të shfaqen këtu pasi instruktori t'i vendosë ato.</p>
                </div>
              )}
            </div>

            {/* Saved Materials */}
            <div className="bg-cream p-6 rounded-lg border border-lightGray">
              <h4 className="text-xl font-playfair font-bold text-brown mb-4">Materiale të Ruajtura</h4>
              <p className="text-gray-600">Nuk keni ruajtur asnjë material.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
