import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "../context/AuthContext";
import { Loader2, MessageSquare, User, Clock, Users, AlertCircle, Home, GraduationCap, Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { sq } from "date-fns/locale";
import type { PostgrestError } from '@supabase/postgrest-js';
import { useToast } from "@/hooks/use-toast";
import { Course } from "@/types";
import type { Database } from '@/integrations/supabase/types';
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { ClassmatesList } from "../components/ClassmatesList";
import { StudentGradesList } from "../components/StudentGradesList";
import { AnnouncementModal } from "../components/dashboard/AnnouncementModal";
import { CourseComment, getCourseComments, insertCourseComment } from "@/types/course-comments";

// CourseComment type is now imported from @/types/course-comments

const CourseDetailPage = () => {
  const [tab, setTab] = useState<'stream' | 'content' | 'students' | 'grades' | 'settings'>('stream');
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [accessCode, setAccessCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isPublicComment, setIsPublicComment] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);

  // Fetch course details
  const { data: courseData, isLoading: queryLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      if (!courseId) return null;
      
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();
      
      if (error) {
        console.error('Error fetching course:', error);
        setError('Ky kurs nuk u gjet ose nuk ekziston më.');
        return null;
      }
      
      return {
        id: data.id,
        title: data.title,
        description: data.description,
        image: data.image,
        category: data.category,
        instructor: data.instructor,
        instructorId: data.instructor_id,
        students: data.students || 0,
        status: data.status,
        price: data.price,
        isPaid: data.isPaid,
        created_at: data.created_at,
        updated_at: data.updated_at,
        accessCode: data.accessCode
      } as Course;
    },
    enabled: !!courseId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Always call useEffect, but only run logic if no error
  useEffect(() => {
    if (error) return; // Don't run if there's a 404
    const checkEnrollment = async () => {
      if (!user || !courseData) return;
      const { data, error } = await supabase
        .from('enrollments')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', courseData.id)
        .maybeSingle();
      if (error) {
        console.error('Error checking enrollment:', error);
        return;
      }
      setIsEnrolled(!!data);
    };
    checkEnrollment();
  }, [user, courseData, error]);

  // Enroll handler must be a function, not floating code
  const handleEnroll = async () => {
    if (!user) {
      toast({ title: "Error", description: "Please log in to enroll.", variant: "destructive" });
      navigate('/login');
      return;
    }
    if (!courseData) return;
    setIsSubmitting(true);
    try {
      // Validate access code
      if (courseData.accessCode && accessCode.trim() !== courseData.accessCode) {
        toast({ title: "Invalid Code", description: "Access code is incorrect.", variant: "destructive" });
        return;
      }
      // Directly insert enrollment record
      const { error: enrollError } = await supabase
        .from('enrollments')
        .insert({ user_id: user.id, course_id: courseData.id, progress: 0, completed: false });
      if (enrollError) throw enrollError;
      toast({ title: "Success!", description: "You have been enrolled successfully." });
      setIsEnrolled(true);
    } catch (err) {
      let errorMessage = "An unexpected error occurred. Please try again.";
      if (err instanceof Error) { errorMessage = err.message; }
      console.error("Enrollment failed:", err);
      toast({ title: "Enrollment Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handlePaymentSuccess = async (details: unknown, data: unknown) => {
    if (!user || !courseData) {
       console.error("Payment approved but user/course undefined");
       toast({ title: "Error", description: "User or Course data missing. Cannot enroll.", variant: "destructive" });
       return;
    }
    console.log("Payment Details (unknown):", details);
    console.log("Payment Data (unknown):", data);
    setIsSubmitting(true);
    try {
      const { error: enrollError } = await supabase
        .from('enrollments')
        .insert({ user_id: user.id, course_id: courseData.id, progress: 0, completed: false });
      if (enrollError) throw enrollError;
      toast({ title: "Success!", description: "Payment successful and enrolled!" });
      setIsEnrolled(true);
    } catch (err) {
       let errorMessage = "Payment successful, but enrollment failed.";
       if (err instanceof Error) errorMessage = err.message;
       console.error("Post-payment enrollment failed:", err);
       toast({ title: "Enrollment Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch course comments
  const { 
    data: comments = [], 
    isLoading: isLoadingComments,
    refetch: refetchComments
  } = useQuery({
    queryKey: ['courseComments', courseId],
    queryFn: async () => {
      if (!courseId) return [];
      
      try {
        // Use the helper function for type-safe access to course_comments
        const { data, error } = await getCourseComments(supabase, courseId);
        
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.error('Error fetching comments:', err);
        // Try to get comments from localStorage as fallback
        const localComments = localStorage.getItem(`course_comments_${courseId}`);
        return localComments ? JSON.parse(localComments) : [];
      }
    },
    enabled: !!courseId,
  });

  // Function to handle comment submission
  const handleCommentSubmit = async () => {
    if (!user || !courseId || !commentText.trim()) return;
    
    setIsSubmittingComment(true);
    
    try {
      // Create comment data object with all required fields
      const commentData = {
        course_id: courseId,
        user_id: user.id,
        content: commentText.trim(),
        is_public: isPublicComment,
        created_at: new Date().toISOString(),
        user_name: user.name || 'Student',
        status: 'active'
      };
      
      // Use our helper function to insert the comment
      const { error } = await insertCourseComment(supabase, commentData);
      
      if (error) {
        console.error('Error submitting comment:', error);
        
        // Store in localStorage as a backup if database insert fails
        const localStorageKey = `course_comments_${courseId}`;
        const localComments = JSON.parse(localStorage.getItem(localStorageKey) || '[]');
        const newComment = {
          ...commentData,
          id: `local-${Date.now()}`
        };
        localStorage.setItem(localStorageKey, JSON.stringify([newComment, ...localComments]));
        
        toast({
          title: 'Komenti u ruajt lokalisht',
          description: 'Komenti juaj u ruajt lokalisht dhe do të sinkronizohet me serverin më vonë.',
        });
      } else {
        toast({
          title: 'Sukses!',
          description: 'Komenti juaj u dërgua me sukses.',
        });
        
        // Refresh comments list
        refetchComments();
      }
      
      // Reset form in either case
      setCommentText('');
      setIsPublicComment(false);
    } catch (error) {
      console.error('Failed to submit comment:', error);
      toast({
        title: 'Gabim!',
        description: 'Ndodhi një problem gjatë dërgimit të komentit. Ju lutemi provoni përsëri.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handlePaymentError = (err: unknown) => {
    let errorMessage = "An error occurred during payment. Please try again.";
    if (err instanceof Error) {
      errorMessage = err.message;
    } else if (typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string') {
      errorMessage = err.message;
    } else if (typeof err === 'string'){
        errorMessage = err;
    }
    console.error("PayPal Error:", err);
    toast({ title: "Payment Error", description: errorMessage, variant: "destructive" });
  };

  // Extract course code from title (temporary solution until we have a proper accessCode field)
  const codeMatch = courseData?.title?.match(/\[(.*?)\]/);
  const courseCode = codeMatch ? codeMatch[1] : null;
  const cleanTitle = courseData?.title?.replace(/\s*\[.*?\]\s*/, '') ?? '';

  const isInstructor = user?.id === courseData?.instructorId;

  // Fetch course admin status for current user
  const { data: adminStatus, isLoading: isLoadingAdminStatus } = useQuery({
    queryKey: ['courseAdminStatus', courseId, user?.id],
    queryFn: async () => {
      if (!user?.id || !courseId) return false;
      // Ensure correct import at the top:
      // import type { Database } from '@/types/supabase';
      // import { PostgrestError } from '@supabase/supabase-js';
      try {
        // Query for admin status with simpler typing
        const { data, error } = await supabase
          .from('course_admins')
          .select('id, status')
          .eq('course_id', courseId)
          .eq('user_id', user.id)
          .eq('status', 'approved')
          .maybeSingle();
          
        if (error) {
          console.error('Error checking admin status:', error.message);
          return false;
        }
        
        // Defensive: only consider as admin if row exists and has approved status
        // Use a simpler type check to avoid deep type instantiation
        if (!data) return false;
        const adminData = data as { status?: string };
        return adminData.status === 'approved';
      } catch (err) {
        console.error('Unexpected error checking admin status:', err);
        return false;
      }
    },
    enabled: !!user?.id && !!courseId,
    staleTime: 5 * 60 * 1000,
  });
  const isClassAdmin = !!adminStatus;
  const isStudent = !!user && !isInstructor && user.role !== 'admin' && !isClassAdmin;

  if (queryLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-brown" />
            <p className="text-lg text-brown">Po ngarkohet kursi...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow flex items-center justify-center bg-cream">
          <div className="bg-white p-10 rounded shadow text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">404: Kursi nuk u gjet</h1>
            <p className="mb-4">Ky kurs nuk ekziston ose është fshirë.</p>
            <button className="btn btn-primary" onClick={() => navigate('/courses')}>Kthehu te Kurset</button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-lightGray flex flex-col py-8 px-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-playfair font-bold">{cleanTitle}</h2>
          <Link to="/" className="text-brown hover:text-gold transition-colors">
            <Home className="h-5 w-5" />
          </Link>
        </div>
        <nav className="flex flex-col gap-2">
          <button className={`flex items-center gap-2 px-4 py-2 rounded transition ${tab === 'stream' ? 'bg-cream font-semibold' : 'hover:bg-cream/50'}`} onClick={() => setTab('stream')}>
            <Bell className="h-4 w-4" /> Stream
          </button>
          <button className={`flex items-center gap-2 px-4 py-2 rounded transition ${tab === 'content' ? 'bg-cream font-semibold' : 'hover:bg-cream/50'}`} onClick={() => setTab('content')}>
            <span>📚</span> Përmbajtja
          </button>
          <button className={`flex items-center gap-2 px-4 py-2 rounded transition ${tab === 'students' ? 'bg-cream font-semibold' : 'hover:bg-cream/50'}`} onClick={() => setTab('students')}>
            <Users className="h-4 w-4" /> Studentët
          </button>
          <button className={`flex items-center gap-2 px-4 py-2 rounded transition ${tab === 'grades' ? 'bg-cream font-semibold' : 'hover:bg-cream/50'}`} onClick={() => setTab('grades')}>
            <GraduationCap className="h-4 w-4" /> Notat
          </button>
          <button className={`flex items-center gap-2 px-4 py-2 rounded transition ${tab === 'settings' ? 'bg-cream font-semibold' : 'hover:bg-cream/50'}`} onClick={() => setTab('settings')}>
            <span>⚙️</span> Cilësimet
          </button>
        </nav>
      </aside>
      {/* Main Content */}
      <main className="flex-1 py-10 px-8">
        {/* Stream Tab */}
        {tab === 'stream' && (
          <section>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold font-playfair">Njoftime</h3>
              {(isInstructor || user?.role === 'admin' || isClassAdmin) ? (
                <button 
                  className="btn bg-gold text-brown font-semibold"
                  onClick={() => setIsAnnouncementModalOpen(true)}
                >
                  Publiko Njoftim
                </button>
              ) : null}
            </div>
            
            {/* Announcement Modal */}
            <AnnouncementModal 
              isOpen={isAnnouncementModalOpen} 
              onClose={() => setIsAnnouncementModalOpen(false)} 
              courseId={courseId}
            />
            {/* Announcements list placeholder */}
            <div className="space-y-4 mb-8">
              <div className="bg-white rounded shadow px-4 py-3">
                <div className="font-bold text-lg">me nerva</div>
                <div className="text-gray-700">ajo me nerva +20</div>
                <div className="text-xs text-gray-400 mt-1">Publikuar 13 ditë më parë</div>
              </div>
              <div className="bg-white rounded shadow px-4 py-3">
                <div className="font-bold text-lg">prshnd</div>
                <div className="text-gray-700">ckemiiiiiiii</div>
                <div className="text-xs text-gray-400 mt-1">Publikuar 24 ditë më parë</div>
              </div>
              {/* ... more announcements ... */}
            </div>
            {/* Comments section */}
            <div className="mb-6">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Komentet e kursit
              </h4>
              
              {/* Display existing comments */}
              {isLoadingComments ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span>Duke ngarkuar komentet...</span>
                </div>
              ) : comments.length > 0 ? (
                <div className="space-y-4 mb-6">
                  {comments.map(comment => (
                    <div key={comment.id} className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="bg-brown/10 text-brown p-1.5 rounded-full">
                            <User className="h-4 w-4" />
                          </div>
                          <span className="font-medium">{comment.user_name || 'Student'}</span>
                          {!comment.is_public && (
                            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">Privat</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: sq })}
                        </div>
                      </div>
                      <p className="mt-2 text-gray-700">{comment.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-lg mb-6">
                  <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Nuk ka komente ende. Ji i pari që komenton!</p>
                </div>
              )}
              
              {/* Student comment box */}
              {isStudent && (
                <div className="bg-white rounded shadow px-4 py-4">
                  <h4 className="font-semibold mb-2">Komento në këtë klasë</h4>
                  <textarea
                    className="w-full border border-lightGray rounded-md px-3 py-2 mb-2 focus:outline-none focus:ring-1 focus:ring-brown"
                    rows={3}
                    placeholder="Shkruani një koment... (vetëm instruktori/administratori mund ta shohë nëse e lini privat)"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    disabled={isSubmittingComment}
                  />
                  <div className="flex items-center gap-2 mb-2">
                    <input 
                      type="checkbox" 
                      id="publicComment" 
                      className="accent-gold" 
                      checked={isPublicComment}
                      onChange={(e) => setIsPublicComment(e.target.checked)}
                      disabled={isSubmittingComment}
                    />
                    <label htmlFor="publicComment" className="text-sm">Bëje publike për të gjithë klasën</label>
                  </div>
                  <button 
                    className="btn btn-primary flex items-center justify-center gap-2"
                    onClick={handleCommentSubmit}
                    disabled={isSubmittingComment || !commentText.trim()}
                  >
                    {isSubmittingComment && (
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    )}
                    Dërgo Koment
                  </button>
                </div>
              )}
            </div>
          </section>
        )}
        {/* Content Tab */}
        {tab === 'content' && (
          <section>
            <h3 className="text-2xl font-bold font-playfair mb-6">Përmbajtja e Kursit</h3>
            {/* Add your course content component here */}
            <div className="bg-white rounded shadow px-4 py-6 text-gray-500 text-center">(Përmbajtja do të shtohet këtu)</div>
          </section>
        )}
        {/* Students Tab */}
        {tab === 'students' && (
          <section>
            <h3 className="text-2xl font-bold font-playfair mb-6">Studentët</h3>
            <ClassmatesList courseId={courseData.id} />
          </section>
        )}
        {/* Grades Tab */}
        {tab === 'grades' && (
          <section>
            <h3 className="text-2xl font-bold font-playfair mb-6">Notat</h3>
            <StudentGradesList courseId={courseData.id} />
          </section>
        )}
        {/* Settings Tab */}
        {tab === 'settings' && (
          <section>
            <h3 className="text-2xl font-bold font-playfair mb-6">Cilësimet e Kursit</h3>
            {/* Settings form or info here */}
            <div className="bg-white rounded shadow px-4 py-6 text-gray-500 text-center">(Cilësimet do të shtohen këtu)</div>
          </section>
        )}
      </main>
    </div>
  );
};

export default CourseDetailPage;
