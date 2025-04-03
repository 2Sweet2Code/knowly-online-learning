
import { useState, useEffect } from "react";
import { getInstructorCourses } from "../../api";
import { useAuth } from "../../context/AuthContext";
import { Course } from "../../types";
import { useToast } from "@/hooks/use-toast";

interface DashboardCoursesProps {
  onCreateCourseClick: () => void;
}

export const DashboardCourses = ({ onCreateCourseClick }: DashboardCoursesProps) => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    loadCourses();
  }, [user]);

  const loadCourses = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const data = await getInstructorCourses(user.id);
      setCourses(data);
    } catch (error) {
      console.error("Failed to fetch instructor courses", error);
      toast({
        title: "Gabim",
        description: "Ndodhi një gabim gjatë ngarkimit të kurseve. Ju lutemi provoni përsëri.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCourse = (courseId: string) => {
    // In a real app, this would make an API call
    toast({
      title: "Jo e implementuar",
      description: "Ky funksionalitet do të implementohet në një version të ardhshëm.",
    });
  };

  const handleManageCourse = (courseId: string) => {
    // In a real app, this would navigate to course management page
    toast({
      title: "Jo e implementuar",
      description: "Ky funksionalitet do të implementohet në një version të ardhshëm.",
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-10">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brown border-r-transparent" role="status">
          <span className="sr-only">Po ngarkohet...</span>
        </div>
        <p className="mt-2 text-brown">Po ngarkohen kurset...</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-2xl font-playfair mb-6 pb-3 border-b border-lightGray">
        Kurset e Mia
      </h3>
      
      <div className="bg-white p-6 rounded-lg border border-lightGray shadow-sm">
        <h4 className="text-xl font-playfair font-bold mb-4">
          Lista e Kurseve që Menaxhoni
        </h4>
        
        {courses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-cream">
                <tr>
                  <th className="border border-lightGray p-3 text-left">Titulli i Kursit</th>
                  <th className="border border-lightGray p-3 text-left">Studentë</th>
                  <th className="border border-lightGray p-3 text-left">Statusi</th>
                  <th className="border border-lightGray p-3 text-left">Veprime</th>
                </tr>
              </thead>
              <tbody>
                {courses.map(course => (
                  <tr key={course.id}>
                    <td className="border border-lightGray p-3">{course.title}</td>
                    <td className="border border-lightGray p-3">{course.students}</td>
                    <td className="border border-lightGray p-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        course.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {course.status === 'active' ? 'Aktiv' : 'Draft'}
                      </span>
                    </td>
                    <td className="border border-lightGray p-3">
                      <div className="flex space-x-2">
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleManageCourse(course.id)}
                        >
                          Menaxho
                        </button>
                        <button 
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteCourse(course.id)}
                        >
                          Fshij
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-600 mb-4">Nuk keni krijuar asnjë kurs ende.</p>
        )}
        
        <div className="mt-6">
          <button 
            className="btn btn-primary"
            onClick={onCreateCourseClick}
          >
            Krijo Kurs të Ri
          </button>
        </div>
      </div>
    </div>
  );
};
