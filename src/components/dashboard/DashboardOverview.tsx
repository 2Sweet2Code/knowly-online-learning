import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle, RefreshCw, Plus, BookOpen, GraduationCap, Megaphone, Clock } from "lucide-react";
import { AnnouncementModal } from "./AnnouncementModal";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { enUS as en, sq } from 'date-fns/locale';

interface Profile {
  name: string;
}

interface DatabaseAnnouncement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  course_id: string;
  created_by: string;
  profiles: Profile | null;
}

interface Announcement extends Omit<DatabaseAnnouncement, 'profiles'> {
  course_title: string;
  instructor_name: string;
}

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
    isLoading: isLoadingCourses,
    isError: isCoursesError,
    error: coursesError,
    refetch: refetchCourses
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

  // Query for announcements
  const {
    data: announcements = [],
    isLoading: isLoadingAnnouncements,
    isError: isAnnouncementsError,
    error: announcementsError,
    refetch: refetchAnnouncements
  } = useQuery<Announcement[]>({
    queryKey: ['instructorAnnouncements', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // First get all course IDs for this instructor
      const { data: instructorCourses, error: coursesError } = await supabase
        .from('courses')
        .select('id, title')
        .eq('instructor_id', user.id);
      
      if (coursesError) throw coursesError;
      if (!instructorCourses?.length) return [];
      
      // Get announcements for these courses
      const courseIds = instructorCourses.map(course => course.id);
      const { data: announcementsData, error: announcementsError } = await supabase
        .from('course_announcements')
        .select(`
          *,
          profiles (name)
        `)
        .in('course_id', courseIds)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (announcementsError) throw announcementsError;
      
      // Add course titles and instructor names to announcements
      return (announcementsData || []).map(announcement => {
        const courseTitle = instructorCourses.find(c => c.id === announcement.course_id)?.title || 'General';
        const instructorName = announcement.profiles?.name || 'Instructor';
        
        return {
          ...announcement,
          course_title: courseTitle,
          instructor_name: instructorName
        } as Announcement;
      });
    },
    enabled: !!user?.id && courses.length > 0
  });
  
  const isLoading = isLoadingCourses || isLoadingAnnouncements;
  const isError = isCoursesError || isAnnouncementsError;
  const error = coursesError || announcementsError;

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
  
  const refetch = () => {
    refetchCourses();
    refetchAnnouncements();
  };
  
  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { 
      addSuffix: true,
      locale: document.documentElement.lang === 'sq' ? sq : en 
    });
  };

  return (
    <div>
      <h3 className="text-2xl font-playfair mb-6 pb-3 border-b border-lightGray">
        Paneli Kryesor (Përmbledhje)
      </h3>
      
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
                      onClick={() => navigate(`/courses/${course.id}/manage`)}
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
      
      {/* Recent Announcements */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-xl font-medium">Njoftimet e Fundit</h4>
          {courses.length > 0 && (
            <button 
              onClick={handleCreateAnnouncement}
              className="flex items-center text-sm text-brown hover:text-brown/80 transition-colors"
            >
              <Plus className="h-4 w-4 mr-1" />
              Krijo Njoftim
            </button>
          )}
        </div>
        
        {isLoadingAnnouncements ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-brown" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="bg-cream/50 rounded-lg p-6 text-center">
            <Megaphone className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-600">Nuk ka njoftime për të shfaqur.</p>
            {courses.length > 0 && (
              <button 
                onClick={handleCreateAnnouncement}
                className="mt-3 flex items-center px-4 py-2 bg-brown text-white rounded-md hover:bg-brown/80 transition-colors mx-auto text-sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Krijo Njoftimin e Parë
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div 
                key={announcement.id} 
                className="bg-white rounded-lg shadow-sm p-4 border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-medium text-lg mb-1">{announcement.title}</h5>
                    {announcement.course_title && (
                      <span className="inline-block bg-cream text-brown text-xs px-2 py-1 rounded-full mb-2">
                        {announcement.course_title}
                      </span>
                    )}
                    <p className="text-gray-600 text-sm line-clamp-2">{announcement.content}</p>
                  </div>
                  <div className="flex items-center text-xs text-gray-500 whitespace-nowrap ml-2">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatDate(announcement.created_at)}
                  </div>
                </div>
                {announcement.course_id && (
                  <button 
                    onClick={() => navigate(`/courses/${announcement.course_id}`)}
                    className="mt-2 text-sm text-brown hover:underline"
                  >
                    Shiko Kursin →
                  </button>
                )}
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