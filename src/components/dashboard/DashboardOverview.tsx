import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Course, Announcement } from "../../types";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle } from "lucide-react";
import { AnnouncementModal } from "./AnnouncementModal";
import { formatDistanceToNow } from "date-fns";
import { sq } from "date-fns/locale";
import type { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

export const DashboardOverview = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  
  // Type alias for Question Row needed here
  type QuestionRow = Database['public']['Tables']['questions']['Row'];
  // Define type for the joined data needed for questions
  type QuestionWithCourseTitle = QuestionRow & {
    courses: { title: string } | null; 
  };

  const { 
    data: courses = [], 
    isLoading: isLoadingCourses, 
    isError: isCoursesError, 
    error: coursesError 
  } = useQuery<Course[], Error>({
    queryKey: ['instructorCourses', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('instructor_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Error fetching instructor courses for overview:", error);
        throw error;
      }
      return data?.map(course => ({
        id: course.id,
        title: course.title,
        description: course.description,
        image: course.image,
        category: course.category as 'programim' | 'dizajn' | 'marketing' | 'other',
        instructor: course.instructor,
        instructorId: course.instructor_id,
        students: course.students || 0,
        status: course.status as 'active' | 'draft',
        price: course.price || 0,
        isPaid: !!course.isPaid,
        accessCode: course.accessCode,
        created_at: course.created_at,
        updated_at: course.updated_at
      })) || [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  const { data: announcements = [], isLoading: isLoadingAnnouncements, error: announcementsError } = useQuery({
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

  if (isLoading) {
    return (
      <div className="text-center py-10">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-brown mb-2" />
        <p className="mt-2 text-brown">Po ngarkohen të dhënat...</p>
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
