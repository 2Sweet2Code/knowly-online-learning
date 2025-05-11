import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Course } from "../../types";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle, RefreshCw, Plus, BookOpen, GraduationCap, Users } from "lucide-react";
import { AnnouncementModal } from "./AnnouncementModal";
import { formatDistanceToNow } from "date-fns";
import { sq } from "date-fns/locale";
import type { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

interface DashboardOverviewProps {
  onCreateCourseClick?: () => void;
}

export const DashboardOverview = ({ onCreateCourseClick }: DashboardOverviewProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [timeoutError, setTimeoutError] = useState(false);
  
  // Set role flags
  const isInstructor = user?.role === 'instructor';
  const isAdmin = user?.role === 'admin';

  // Fetch courses for the dashboard
  const { 
    data: courses = [], 
    isLoading: isLoadingCourses, 
    isError: isCoursesError, 
    error: coursesError,
    refetch: refetchCourses
  } = useQuery<Course[], Error>({
    queryKey: ['dashboardCourses', user?.id, user?.role],
    queryFn: async () => {
      if (!user?.id) return [];
      
      console.log('Fetching courses for user:', user.id, 'with role:', user.role);
      
      try {
        // Build the query based on user role
        let query = supabase.from('courses').select('*');
        
        if (isInstructor) {
          query = query.eq('instructor_id', user.id);
        } else if (isAdmin) {
          // Admins see all active courses
          query = query.eq('status', 'active');
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });
        
        if (error) {
          console.error("Error fetching courses:", error);
          throw new Error(`Failed to fetch courses: ${error.message}`);
        }
        
        if (!data || data.length === 0) {
          console.log('No courses found for this user');
          return [];
        }
        
        // Map the database records to our Course type
        return data.map(course => ({
          id: course.id,
          title: course.title || '',
          description: course.description || '',
          image: course.image || '',
          category: (course.category || 'other') as 'programim' | 'dizajn' | 'marketing' | 'other',
          instructor: course.instructor || '',
          instructorId: course.instructor_id || '',
          students: course.students || 0,
          status: (course.status || 'draft') as 'active' | 'draft',
          price: course.price || 0,
          isPaid: Boolean(course.isPaid),
          accessCode: course.accessCode || '',
          created_at: course.created_at,
          updated_at: course.updated_at,
          allow_admin_applications: Boolean(course.allow_admin_applications)
        }));
      } catch (err) {
        console.error('Unexpected error fetching courses:', err);
        throw err;
      }
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });

  // Fetch announcements for the instructor
  const { 
    data: announcements = [], 
    isLoading: isLoadingAnnouncements, 
    error: announcementsError 
  } = useQuery({
    queryKey: ['instructorAnnouncements', user?.id],
    queryFn: async () => {
      if (!user?.id || !isInstructor) return [];
      
      try {
        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .eq('instructor_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.error('Error fetching announcements:', err);
        return [];
      }
    },
    enabled: !!user?.id && isInstructor,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Fetch pending questions for the instructor
  const { data: pendingQuestions = [] } = useQuery({
    queryKey: ['pendingInstructorQuestions', user?.id],
    queryFn: async () => {
      if (!user?.id || !isInstructor) return [];
      
      try {
        const { data, error } = await supabase
          .from('questions')
          .select('*, courses(title)')
          .eq('instructor_id', user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.error('Error fetching pending questions:', err);
        return [];
      }
    },
    enabled: !!user?.id && isInstructor,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Add a timeout to prevent infinite loading
  useEffect(() => {
    // If loading takes more than 8 seconds, show timeout error
    let timeoutId: NodeJS.Timeout | null = null;
    
    if (isLoadingCourses) {
      setTimeoutError(false); // Reset timeout error when loading starts
      timeoutId = setTimeout(() => {
        console.log('Dashboard loading timeout reached');
        setTimeoutError(true);
      }, 8000); // 8 seconds timeout
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isLoadingCourses, setTimeoutError]);
  
  // Function to handle manual refresh when timeout occurs
  const handleManualRefresh = () => {
    setTimeoutError(false);
    refetchCourses();
    // Force window reload if needed
    if (isCoursesError) {
      window.location.reload();
    }
  };
  
  // Handle loading state and errors
  if (isLoadingCourses && !timeoutError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-brown mb-4" />
        <p className="text-lg font-medium">Duke ngarkuar panelin...</p>
      </div>
    );
  }
  
  if (timeoutError) {
    return (
      <div className="text-center py-10 bg-white rounded-lg shadow-sm p-6 border border-amber-200">
        <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">Ngarkimi po merr më shumë kohë se zakonisht</h3>
        <p className="text-gray-600 mb-4">Ju lutemi prisni ose provoni të rifreskoni faqen.</p>
        <button 
          className="btn bg-brown text-white hover:bg-brown/90 flex items-center gap-2 mx-auto"
          onClick={handleManualRefresh}
        >
          <RefreshCw className="h-4 w-4" />
          Rifresko Tani
        </button>
      </div>
    );
  }
  
  if (isCoursesError) {
    return (
      <div className="text-center py-10 bg-white rounded-lg shadow-sm p-6 border border-red-200">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">Gabim gjatë ngarkimit</h3>
        <p className="text-gray-600 mb-4">{coursesError?.message || 'Ndodhi një problem gjatë ngarkimit të të dhënave.'}</p>
        <button 
          className="btn bg-brown text-white hover:bg-brown/90 flex items-center gap-2 mx-auto"
          onClick={handleManualRefresh}
        >
          <RefreshCw className="h-4 w-4" />
          Provo Përsëri
        </button>
      </div>
    );
  }
  
  // Main dashboard content
  return (
    <div>
      <h3 className="text-2xl font-playfair mb-6 pb-3 border-b border-lightGray">
        Paneli Kryesor (Përmbledhje)
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border border-lightGray shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold">Kurset e Mia</h4>
            <span className="bg-brown/10 text-brown px-2 py-1 rounded-full text-sm font-medium">
              {courses.length}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <BookOpen className="h-5 w-5" />
            <span>{courses.filter(c => c.status === 'active').length} aktive</span>
          </div>
          {onCreateCourseClick && (
            <button 
              onClick={onCreateCourseClick}
              className="mt-4 w-full btn btn-secondary flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" /> Krijo Kurs të Ri
            </button>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-lightGray shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold">Studentët</h4>
            <span className="bg-brown/10 text-brown px-2 py-1 rounded-full text-sm font-medium">
              {courses.reduce((total, course) => total + course.students, 0)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Users className="h-5 w-5" />
            <span>Në të gjitha kurset</span>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-lightGray shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold">Pyetje në Pritje</h4>
            <span className="bg-brown/10 text-brown px-2 py-1 rounded-full text-sm font-medium">
              {pendingQuestions.length}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <GraduationCap className="h-5 w-5" />
            <span>Kërkojnë përgjigje</span>
          </div>
          {pendingQuestions.length > 0 && (
            <button 
              onClick={() => navigate('/dashboard/questions')}
              className="mt-4 w-full btn btn-secondary flex items-center justify-center gap-2"
            >
              Shiko Pyetjet
            </button>
          )}
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg border border-lightGray shadow-sm mb-6">
        <h4 className="text-xl font-playfair font-bold mb-4 flex justify-between items-center">
          <span>Kurset Aktive</span>
          {onCreateCourseClick && (
            <button 
              onClick={onCreateCourseClick}
              className="btn btn-sm btn-secondary flex items-center gap-1"
            >
              <Plus className="h-3 w-3" /> Kurs i Ri
            </button>
          )}
        </h4>
        {courses.length > 0 ? (
          <ul className="space-y-2">
            {courses.map(course => (
              <li key={course.id} className="py-2 border-b border-lightGray last:border-0 flex justify-between items-center">
                <span className="font-medium hover:text-brown cursor-pointer" onClick={() => navigate(`/dashboard/courses/${course.id}`)}>
                  {course.title} 
                  <span className="text-sm text-gray-500 ml-2">({course.students} studentë)</span>
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${course.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {course.status === 'active' ? 'Aktiv' : 'Draft'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>Nuk keni kurse aktive.</p>
            {onCreateCourseClick && (
              <button 
                onClick={onCreateCourseClick}
                className="mt-4 btn btn-primary"
              >
                Krijo Kursin e Parë
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Announcements Modal */}
      <AnnouncementModal 
        isOpen={isAnnouncementModalOpen} 
        onClose={() => setIsAnnouncementModalOpen(false)} 
        courseId={courses[0]?.id} // Use the first course ID as default
      />
    </div>
  );
}
    queryKey: ['instructorAnnouncements', user?.id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .eq('instructor_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (error) {
          console.error("Error fetching announcements:", error);
          throw error;
        }
        
        return data || [];
      } catch (err) {
        console.error("Exception fetching announcements:", err);
        
        const localAnnouncements = localStorage.getItem('announcements');
        return localAnnouncements ? JSON.parse(localAnnouncements) : [];
      }
    },
    enabled: !!user,
    retry: 1,
    retryDelay: 1000
  });

  // --- Add Query for Pending Questions --- 
  const { 
    data: pendingQuestions = [], 
    isLoading: isLoadingQuestions, 
    isError: isQuestionsError,
    error: questionsError 
  } = useQuery<QuestionRow[], Error>({
    queryKey: ['pendingInstructorQuestions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('questions')
        // Join with courses to get the title
        .select('*, courses ( title )') 
        .eq('instructor_id', user.id)
        .eq('status', 'pending') // Filter for pending questions
        .order('created_at', { ascending: true }) // Show oldest first maybe?
        .limit(5); // Limit display on overview

      if (error) {
        console.error("Error fetching pending questions:", error);
        throw error;
      }
      return data || [];
    },
    enabled: !!user?.id, 
    staleTime: 1000 * 60 * 2, // Cache for 2 mins
  });

  // Combine loading states
  const isLoading = isLoadingCourses || isLoadingAnnouncements || isLoadingQuestions;

  if (isLoading && !timeoutError) {
    return (
      <div className="text-center py-10">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-brown mb-2" />
        <p className="mt-2 text-brown">Po ngarkohen të dhënat...</p>
      </div>
    );
  }
  
  // Show timeout error if loading takes too long
  if (timeoutError && isLoading) {
    return (
      <div className="text-center py-10">
        <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-4" />
        <p className="text-amber-600 mb-2">Ngarkimi po merr më shumë kohë se zakonisht.</p>
        <button 
          className="mt-4 btn btn-secondary btn-sm"
          onClick={() => {
            setTimeoutError(false);
            queryClient.refetchQueries({ queryKey: ['dashboardCourses', user?.id, user?.role] });
            queryClient.refetchQueries({ queryKey: ['instructorAnnouncements', user?.id] });
            queryClient.refetchQueries({ queryKey: ['pendingInstructorQuestions', user?.id] });
          }}
        >
          Provo Përsëri
        </button>
      </div>
    );
  }

  if (isCoursesError) {
    return (
      <div className="text-center py-10">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
        <p className="text-red-500">Gabim në ngarkimin e kurseve: {coursesError?.message}</p>
        <button 
          className="mt-4 btn btn-secondary btn-sm"
          onClick={() => queryClient.refetchQueries({ queryKey: ['instructorCourses', user?.id] })}
        >
          Provo Përsëri
        </button>
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
              <li key={course.id} className="py-2 border-b border-lightGray last:border-0 flex justify-between items-center">
                <span>{course.title} <span className="text-sm text-gray-500">({course.students} studentë)</span></span>
                 <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    course.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {course.status === 'active' ? 'Aktiv' : 'Draft'}
                  </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600 mb-4">Nuk keni kurse (ose asnjë nuk është aktiv).</p>
        )}
        <div className="flex flex-wrap gap-3 mt-4">
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={() => navigate('/dashboard/courses')}
          >
            Menaxho Kurset
          </button>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg border border-lightGray shadow-sm mb-6">
        <h4 className="text-xl font-playfair font-bold mb-4">
          Njoftime të Fundit
        </h4>
        
        {isLoadingAnnouncements ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-brown" />
            <span className="ml-2">Po ngarkohen njoftimet...</span>
          </div>
        ) : announcementsError ? (
          <div className="text-center py-4">
            <AlertCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
            <p className="text-red-500">Dështoi të ngarkohen njoftimet.</p>
          </div>
        ) : announcements.length > 0 ? (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="p-4 border border-lightGray rounded-md">
                <h5 className="font-semibold mb-2">{announcement.title}</h5>
                <p className="mb-2">{announcement.content}</p>
                <p className="text-sm text-gray-500">
                  Publikuar {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true, locale: sq })}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-4 text-gray-600">
            Nuk ka njoftime të publikuara ende.
          </p>
        )}
        
        <div className="mt-4">
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => setIsAnnouncementModalOpen(true)}
          >
            Publiko Njoftim të Ri
          </button>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg border border-lightGray shadow-sm">
        <h4 className="text-xl font-playfair font-bold mb-4">
          Pyetje Pa Përgjigje
        </h4>
        
        {/* --- Update Questions Rendering --- */}
        {isLoadingQuestions ? (
          <div className="flex items-center py-4">
            <Loader2 className="h-5 w-5 animate-spin mr-2 text-gray-500" />
            <span>Po ngarkohen pyetjet...</span>
          </div>
        ) : isQuestionsError ? (
          <div className="text-red-500 py-4">
            <AlertCircle className="h-5 w-5 inline mr-2" />
            <span>Gabim gjatë ngarkimit: {questionsError?.message || 'Error i panjohur'}</span>
          </div>
        ) : pendingQuestions.length > 0 ? (
          <ul className="space-y-3 mb-4">
            {pendingQuestions.map((question) => (
              <li key={question.id} className="py-2 border-b border-lightGray last:border-0 text-sm">
                Pyetje nga <span className="font-semibold">{question.student_name || 'Student i panjohur'}</span> në kursin <span className="font-semibold">{(question as QuestionWithCourseTitle).courses?.title || 'Kurs i panjohur'}</span>:
                <p className="mt-1 italic">"{question.question}"</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600 mb-4">Nuk ka pyetje pa përgjigje për momentin.</p>
        )}

        <div className="mt-4">
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/dashboard/questions')}
          >
            Shiko të gjitha Pyetjet
          </button>
        </div>
      </div>
      
      <AnnouncementModal 
        isOpen={isAnnouncementModalOpen}
        onClose={() => setIsAnnouncementModalOpen(false)}
      />
    </div>
  );
};
