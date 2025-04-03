
import { useState, useEffect } from "react";
import { getInstructorCourses } from "../../api";
import { useAuth } from "../../context/AuthContext";
import { Course } from "../../types";

interface DashboardOverviewProps {
  onCreateCourseClick: () => void;
  onViewChange: (view: string) => void;
}

export const DashboardOverview = ({ onCreateCourseClick, onViewChange }: DashboardOverviewProps) => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const loadCourses = async () => {
      if (!user) return;
      
      try {
        const data = await getInstructorCourses(user.id);
        setCourses(data);
      } catch (error) {
        console.error("Failed to fetch instructor courses", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadCourses();
  }, [user]);

  if (isLoading) {
    return (
      <div className="text-center py-10">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brown border-r-transparent" role="status">
          <span className="sr-only">Po ngarkohet...</span>
        </div>
        <p className="mt-2 text-brown">Po ngarkohen të dhënat...</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-2xl font-playfair mb-6 pb-3 border-b border-lightGray">
        Paneli Kryesor (Përmbledhje)
      </h3>
      
      <div className="bg-white p-6 rounded-lg border border-lightGray shadow-sm mb-6">
        <h4 className="text-xl font-playfair font-bold mb-4">
          Kurset Aktive
        </h4>
        {courses.length > 0 ? (
          <ul className="space-y-2">
            {courses.map(course => (
              <li key={course.id} className="py-2 border-b border-lightGray last:border-0">
                {course.title} <span className="text-sm text-brown">({course.students} studentë)</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600 mb-4">Nuk keni kurse aktive.</p>
        )}
        <div className="flex flex-wrap gap-3 mt-4">
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={() => onViewChange('my-courses')}
          >
            Shiko të gjitha
          </button>
          <button 
            className="btn btn-primary btn-sm"
            onClick={onCreateCourseClick}
          >
            Krijo Kurs të Ri
          </button>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg border border-lightGray shadow-sm mb-6">
        <h4 className="text-xl font-playfair font-bold mb-4">
          Njoftime të Fundit
        </h4>
        <p className="mb-4">
          <strong>Publikuar dje:</strong> Mirësevini në kursin e ri të React.js! Materialet e javës së parë janë ngarkuar.
        </p>
        <div className="mt-4">
          <button className="btn btn-primary btn-sm">
            Publiko Njoftim të Ri
          </button>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg border border-lightGray shadow-sm">
        <h4 className="text-xl font-playfair font-bold mb-4">
          Pyetje Pa Përgjigje
        </h4>
        <ul className="space-y-2 mb-4">
          <li className="py-2 border-b border-lightGray">
            Pyetje nga Albi D. në kursin Python: "Si të instaloj librarinë 'requests'?"
          </li>
          <li className="py-2">
            Pyetje nga Lira S. në kursin Marketing: "Cili është ndryshimi mes SEO on-page dhe off-page?"
          </li>
        </ul>
        <div className="mt-4">
          <button className="btn btn-secondary btn-sm">
            Shiko të gjitha Pyetjet
          </button>
        </div>
      </div>
    </div>
  );
};
