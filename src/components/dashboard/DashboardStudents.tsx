import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, AlertCircle } from "lucide-react";
import type { Course, Profile, Enrollment } from "@/types";

// Define a combined type for the fetched data
interface InstructorStudentData {
  enrollment_id: string;
  student_id: string;
  student_name: string | null;
  course_id: string;
  course_title: string | null;
  enrolled_at: string | null;
}

// Define a type that matches the expected result of the Supabase query
type EnrollmentQueryResult = {
  id: string;
  created_at: string | null;
  course_id: string;
  user_id: string; // Expect user_id from enrollments table
  courses: { title: string } | null;
  profiles: { id: string; name: string | null } | null;
};

export const DashboardStudents = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('all');

  // Query to fetch student enrollment data for instructor's courses
  const { 
    data: studentData = [], 
    isLoading, 
    isError, 
    error 
  } = useQuery<InstructorStudentData[], Error>({
    queryKey: ['instructorStudents', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // 1. Fetch IDs of courses taught by the instructor
      const { data: instructorCourses, error: coursesError } = await supabase
        .from('courses')
        .select('id')
        .eq('instructor_id', user.id);

      if (coursesError) {
        console.error("Error fetching instructor courses:", coursesError);
        throw new Error("Failed to fetch instructor's courses.");
      }
      if (!instructorCourses || instructorCourses.length === 0) {
          return []; // Instructor has no courses
      }

      const courseIds = instructorCourses.map(c => c.id);

      // 2. Fetch enrollments for those courses, joining with profiles and courses tables
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        // Use standard explicit join syntax
        .select(`
          id, 
          created_at, 
          course_id, 
          user_id, 
          courses!inner ( title ),
          profiles!inner ( id, name )
        `)
        .in('course_id', courseIds)
        // Cast the result to our expected query result type
        .returns<EnrollmentQueryResult[]>();

      if (enrollmentsError) {
        console.error("Error fetching enrollments:", enrollmentsError);
        throw new Error("Failed to fetch student enrollments.");
      }
      
      if (!enrollments) return [];

      // 3. Transform data
      // Remove EnrollmentWithJoins type definition as it's replaced by EnrollmentQueryResult

      const formattedData: InstructorStudentData[] = enrollments
           // Map over the result directly, TS should infer 'enroll' type
           .map((enroll) => {
             // Add null checks for joined tables
             if (!enroll.profiles || !enroll.courses) {
                 console.warn("Skipping enrollment due to missing profile or course join data:", enroll.id);
                 return null; // Skip this enrollment if join failed unexpectedly
             }
             return {
                 enrollment_id: enroll.id,
                 student_id: enroll.profiles.id, // Use profile id from join
                 student_name: enroll.profiles.name || 'Unnamed Student',
                 course_id: enroll.course_id,
                 course_title: enroll.courses.title || 'Unknown Course',
                 enrolled_at: enroll.created_at,
             };
           })
           // Filter out any nulls from the mapping and use type predicate
           .filter((s): s is InstructorStudentData => s !== null);

      return formattedData;
    },
    enabled: !!user?.id,
  });

  // TODO: Fetch distinct list of instructor's courses for the filter dropdown
  // const { data: filterCourses } = useQuery(...);
  const uniqueCourses = Array.from(new Map(studentData.map(s => [s.course_id, { id: s.course_id, title: s.course_title }])).values());


  const handleViewProfile = (studentId: string) => {
    // TODO: Implement navigation or modal display for student profile
    toast({
      title: "Shiko Profilin",
      description: `TODO: Implement view for student ID: ${studentId}`,
    });
  };
  
  // Filtered students based on dropdown selection
  const filteredStudents = studentData.filter(student => 
      selectedCourseFilter === 'all' || student.course_id === selectedCourseFilter
  );

  // --- Render Logic ---
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-brown" />
        <span className="ml-2 text-lg">Po ngarkohen studentët...</span>
      </div>
    );
  }

  if (isError) {
    return (
       <div className="text-center py-10 bg-red-50 border border-red-200 rounded-lg p-6">
         <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
         <h4 className="text-lg font-semibold text-red-700 mb-2">Gabim gjatë ngarkimit të studentëve</h4>
         <p className="text-red-600 mb-4">
           {error?.message || "Ndodhi një gabim i papritur."}
         </p>
         <button 
           className="btn btn-secondary btn-sm"
           onClick={() => queryClient.refetchQueries({ queryKey: ['instructorStudents', user?.id] })}
         >
           Provo Përsëri
         </button>
       </div>
    );
  }

  return (
    <div>
      <h3 className="text-2xl font-playfair mb-6 pb-3 border-b border-lightGray">
        Menaxhimi i Studentëve
      </h3>
      
      <div className="bg-white p-6 rounded-lg border border-lightGray shadow-sm">
        <h4 className="text-xl font-playfair font-bold mb-4">
          Lista e Studentëve ({filteredStudents.length})
        </h4>
        
        <div className="mb-4">
          <label htmlFor="course-filter" className="block mb-2 font-semibold text-brown">Filtro sipas kursit:</label>
          <select 
            id="course-filter" 
            className="px-4 py-2 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown"
            value={selectedCourseFilter}
            onChange={(e) => setSelectedCourseFilter(e.target.value)}
          >
            <option value="all">Të gjitha Kurset</option>
            {/* Populate with actual courses instructor teaches */}
            {uniqueCourses.map(course => (
               <option key={course.id} value={course.id}>{course.title || "Kurs pa Titull"}</option>
            ))}
          </select>
        </div>
        
        <div className="overflow-x-auto mt-4">
          <table className="w-full border-collapse">
            <thead className="bg-cream">
              <tr>
                <th className="border border-lightGray p-3 text-left">Emri Studentit</th>
                {/* Add Email if available */}
                {/* <th className="border border-lightGray p-3 text-left">Email</th> */} 
                <th className="border border-lightGray p-3 text-left">Kursi</th>
                <th className="border border-lightGray p-3 text-left">Regjistruar Më</th>
                <th className="border border-lightGray p-3 text-left">Veprime</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map(student => (
                  <tr key={student.enrollment_id}>
                    <td className="border border-lightGray p-3">{student.student_name}</td>
                    {/* <td className="border border-lightGray p-3">{student.student_email || 'N/A'}</td> */} 
                    <td className="border border-lightGray p-3">{student.course_title}</td>
                    <td className="border border-lightGray p-3">
                        {student.enrolled_at ? new Date(student.enrolled_at).toLocaleDateString('sq-AL') : 'N/A'}
                    </td>
                    <td className="border border-lightGray p-3">
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleViewProfile(student.student_id)}
                        title="Shiko Profilin e Studentit"
                      >
                        Shiko Profilin 
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                 <tr>
                   <td colSpan={4} className="text-center py-6 text-gray-500 border border-lightGray">
                      {studentData.length === 0 
                         ? "Nuk ka studentë të regjistruar në kurset tuaja."
                         : "Nuk ka studentë që përputhen me filtrin e zgjedhur."
                      }
                   </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
