import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "../context/AuthContext";
import type { Database } from '@/types/supabase';
import type { PostgrestError } from '@supabase/postgrest-js';
import { useToast } from "@/hooks/use-toast";
import { Course } from "@/types";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Loader2, Users, AlertCircle } from "lucide-react";
import { ClassmatesList } from "../components/ClassmatesList";

const CourseDetailPage = () => {
  const [tab, setTab] = useState<'stream' | 'content' | 'students' | 'settings'>('stream');
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [accessCode, setAccessCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);

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
      // Query for admin status using up-to-date types
      // Cast variables to their strict types from generated Supabase types
      const typedCourseId = courseId as Database['public']['Tables']['course_admins']['Row']['course_id'];
      const typedUserId = user.id as Database['public']['Tables']['course_admins']['Row']['user_id'];
      const approvedStatus = 'approved' as Database['public']['Tables']['course_admins']['Row']['status'];
      const { data, error }: {
        data: Database['public']['Tables']['course_admins']['Row'] | null;
        error: PostgrestError | null;
      } = await supabase
        .from('course_admins')
        .select('id, status')
        .eq('course_id', typedCourseId)
        .eq('user_id', typedUserId)
        .eq('status', approvedStatus)
        .maybeSingle();
      if (error) {
        console.error('Error checking admin status:', error.message);
        return false;
      }
      // Defensive: only consider as admin if row exists and status is approved
      return !!data && data.status === 'approved';
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
        <h2 className="text-xl font-playfair font-bold mb-8">{cleanTitle}</h2>
        <nav className="flex flex-col gap-2">
          <button className={`flex items-center gap-2 px-4 py-2 rounded transition ${tab === 'stream' ? 'bg-cream font-semibold' : 'hover:bg-cream/50'}`} onClick={() => setTab('stream')}>
            <span>📢</span> Stream
          </button>
          <button className={`flex items-center gap-2 px-4 py-2 rounded transition ${tab === 'content' ? 'bg-cream font-semibold' : 'hover:bg-cream/50'}`} onClick={() => setTab('content')}>
            <span>📚</span> Përmbajtja
          </button>
          <button className={`flex items-center gap-2 px-4 py-2 rounded transition ${tab === 'students' ? 'bg-cream font-semibold' : 'hover:bg-cream/50'}`} onClick={() => setTab('students')}>
            <span>👥</span> Studentët
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
                <button className="btn bg-gold text-brown font-semibold">Publiko Njoftim</button>
              ) : null}
            </div>
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
            {/* Student comment box */}
            {isStudent && (
              <div className="bg-white rounded shadow px-4 py-4">
                <h4 className="font-semibold mb-2">Komento në këtë klasë</h4>
                <textarea
                  className="w-full border border-lightGray rounded-md px-3 py-2 mb-2 focus:outline-none focus:ring-1 focus:ring-brown"
                  rows={3}
                  placeholder="Shkruani një koment... (vetëm instruktori/administratori mund ta shohë nëse e lini privat)"
                  // value and onChange stubbed for now
                />
                <div className="flex items-center gap-2 mb-2">
                  <input type="checkbox" id="publicComment" className="accent-gold" />
                  <label htmlFor="publicComment" className="text-sm">Bëje publike për të gjithë klasën</label>
                </div>
                <button className="btn btn-primary">Dërgo Koment</button>
              </div>
            )}
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
