import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle, RefreshCw, Plus, BookOpen, GraduationCap } from "lucide-react";
import { AnnouncementModal } from "./AnnouncementModal";
import { useToast } from "@/hooks/use-toast";

interface DashboardOverviewProps {
  onCreateCourseClick?: () => void;
}

// Define the database course type that matches what comes from Supabase
type DatabaseCourse = {
  id: string;
  title: string;
  description: string;
  image: string;
  instructor_id: string;
  created_at: string | null;
  updated_at: string | null;
  status: string;
  category: string;
  students: number;
  instructor: string;
  isPaid: boolean | null;
  price: number;
  accessCode: string | null;
};

export const DashboardOverview = ({ onCreateCourseClick }: DashboardOverviewProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [timeoutError, setTimeoutError] = useState(false);

  // Query for instructor courses
  const {
    data: courses = [],
    isLoading,
    isError,
    error,
    refetch
  } = useQuery<DatabaseCourse[]>({
    queryKey: ['instructorCourses', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('instructor_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Error fetching courses:", error);
        throw error;
      }
      
      return data || [];
    },
    enabled: !!user?.id
  });

  // Add timeout for loading
  useEffect(() => {
    let timeoutId: number | undefined;
    
    if (isLoading) {
      timeoutId = window.setTimeout(() => {
        setTimeoutError(true);
      }, 15000);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isLoading]);

  // Handle loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-brown mb-4" />
        <p className="text-lg font-medium">Duke ngarkuar të dhënat...</p>
        
        {timeoutError && (
          <div className="mt-4 text-center">
            <p className="text-red-600 mb-2">Ngarkimi po merr shumë kohë.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-brown text-white rounded-md hover:bg-brown/80 transition-colors"
            >
              Rifresko faqen
            </button>
          </div>
        )}
      </div>
    );
  }

  // Handle error state
  if (isError && error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-lg font-medium text-red-500">Gabim gjatë ngarkimit të kurseve.</p>
        <button 
          onClick={() => refetch()} 
          className="mt-4 flex items-center px-4 py-2 bg-brown text-white rounded-md hover:bg-brown/80 transition-colors"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Provo përsëri
        </button>
      </div>
    );
  }

  const handleCreateCourse = () => {
    if (onCreateCourseClick) {
      onCreateCourseClick();
    }
  };

  const handleCreateAnnouncement = () => {
    setIsAnnouncementModalOpen(true);
  };

  return (
    <div>
      <h3 className="text-2xl font-playfair mb-6 pb-3 border-b border-lightGray">
        Paneli Kryesor (Përmbledhje)
      </h3>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-cream rounded-lg p-6 shadow-sm">
          <div className="flex items-center mb-4">
            <BookOpen className="h-6 w-6 text-brown mr-2" />
            <h4 className="font-medium">Kurset e Mia</h4>
          </div>
          <p className="text-3xl font-bold">{courses.length}</p>
          <p className="text-gray-600 text-sm mt-1">Kurse aktive</p>
        </div>
        
        <div className="bg-cream rounded-lg p-6 shadow-sm">
          <div className="flex items-center mb-4">
            <GraduationCap className="h-6 w-6 text-brown mr-2" />
            <h4 className="font-medium">Studentët</h4>
          </div>
          <p className="text-3xl font-bold">
            {courses.reduce((total, course) => total + (course.students || 0), 0)}
          </p>
          <p className="text-gray-600 text-sm mt-1">Studentë të regjistruar</p>
        </div>
        
        <div className="bg-cream rounded-lg p-6 shadow-sm">
          <div className="flex items-center mb-4">
            <BookOpen className="h-6 w-6 text-brown mr-2" />
            <h4 className="font-medium">Pyetje</h4>
          </div>
          <p className="text-3xl font-bold">0</p>
          <p className="text-gray-600 text-sm mt-1">Pyetje në pritje</p>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex flex-wrap gap-4 mb-8">
        <button 
          onClick={handleCreateCourse}
          className="flex items-center px-4 py-2 bg-brown text-white rounded-md hover:bg-brown/80 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Krijo Kurs të Ri
        </button>
        
        {courses.length > 0 && (
          <button 
            onClick={handleCreateAnnouncement}
            className="flex items-center px-4 py-2 border border-brown text-brown rounded-md hover:bg-brown/10 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Krijo Njoftim
          </button>
        )}
      </div>
      
      {/* Recent Courses */}
      <div className="mb-8">
        <h4 className="text-xl font-medium mb-4">Kurset e Fundit</h4>
        
        {courses.length === 0 ? (
          <div className="bg-cream/50 rounded-lg p-6 text-center">
            <p className="text-gray-600 mb-4">Ju ende nuk keni krijuar asnjë kurs.</p>
            <button 
              onClick={handleCreateCourse}
              className="flex items-center px-4 py-2 bg-brown text-white rounded-md hover:bg-brown/80 transition-colors mx-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Krijo Kursin e Parë
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.slice(0, 3).map((course) => (
              <div key={course.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div 
                  className="h-40 bg-cover bg-center" 
                  style={{ backgroundImage: `url(${course.image})` }}
                ></div>
                <div className="p-4">
                  <h5 className="font-medium text-lg mb-2 line-clamp-1">{course.title}</h5>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{course.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                      {course.students || 0} studentë
                    </span>
                    <button 
                      onClick={() => navigate(`/dashboard/courses/${course.id}`)}
                      className="text-brown hover:underline text-sm"
                    >
                      Menaxho
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Announcements Modal */}
      <AnnouncementModal 
        isOpen={isAnnouncementModalOpen} 
        onClose={() => setIsAnnouncementModalOpen(false)} 
        courseId={courses.length > 0 ? courses[0].id : undefined}
      />
    </div>
  );
};