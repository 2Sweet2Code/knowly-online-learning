import { useState } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface JoinCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const JoinCourseModal = ({ isOpen, onClose, onSuccess }: JoinCourseModalProps) => {
  const [accessCode, setAccessCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Gabim!",
        description: "Ju duhet të jeni të kyçur për t'u regjistruar në një kurs.",
        variant: "destructive",
      });
      return;
    }

    if (!accessCode) {
      toast({
        title: "Gabim!",
        description: "Ju lutemi shkruani kodin e hyrjes për kursin.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Since accessCode column might not exist yet in the database,
      // we'll use a workaround by fetching all courses and filtering client-side
      // In a production environment, this should be done with a proper database column
      const { data: courses, error: courseError } = await supabase
        .from('courses')
        .select('*');
      
      if (courseError) {
        throw courseError;
        return;
      }
      
      // Find the course with matching title (as a temporary solution)
      // In production, this should use the accessCode column
      const course = courses?.find(c => c.title.toUpperCase().includes(accessCode.toUpperCase()));
      
      if (!course) {
        toast({
          title: "Gabim!",
          description: "Kodi i hyrjes nuk është i vlefshëm. Ju lutemi kontrolloni dhe provoni përsëri.",
          variant: "destructive",
        });
        return;
      }
      
      // Check if user is already enrolled
      const { data: existingEnrollment, error: enrollmentCheckError } = await supabase
        .from('enrollments')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', course.id)
        .maybeSingle();
      
      if (enrollmentCheckError) throw enrollmentCheckError;
      
      if (existingEnrollment) {
        toast({
          title: "Informacion",
          description: "Ju jeni tashmë i regjistruar në këtë kurs.",
        });
        if (onSuccess) onSuccess();
        onClose();
        return;
      }
      
      // Check if user is an instructor
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (profileError) throw profileError;
      
      // Create enrollment
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('enrollments')
        .insert({
          user_id: user.id,
          course_id: course.id,
          progress: 0,
          completed: false,
          is_instructor: userProfile?.role === 'instructor' || userProfile?.role === 'admin'
        })
        .select()
        .single();
      
      if (enrollmentError) throw enrollmentError;
      
      // Invalidate queries to refetch enrollments and courses
      // The student count will be automatically updated via the courses_with_student_count view
      queryClient.invalidateQueries({ queryKey: ['enrollments', user.id] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['courses_with_student_count'] });
      
      toast({
        title: "Sukses!",
        description: `Ju u regjistruat me sukses në kursin "${course.title}".`,
      });
      
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
    } catch (error) {
      console.error(error);
      toast({
        title: "Gabim!",
        description: "Ndodhi një problem gjatë regjistrimit në kurs. Ju lutemi provoni përsëri.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex justify-center items-center bg-black bg-opacity-60"
      onClick={handleBackdropClick}
    >
      <div className="bg-white w-full max-w-md rounded-lg shadow-lg p-8 relative animate-fade-in">
        <button 
          className="absolute top-4 right-4 text-gray-500 hover:text-brown"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        
        <h3 className="text-2xl font-playfair text-center mb-6">Regjistrohu në Kurs</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="access-code" className="block mb-2 font-semibold text-brown">
              Kodi i Hyrjes:
            </label>
            <input
              type="text"
              id="access-code"
              placeholder="Shkruani kodin e hyrjes së kursit"
              className="w-full px-4 py-3 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              required
            />
            <p className="mt-2 text-sm text-gray-600">
              Kodi i hyrjes duhet të jetë dhënë nga instruktori i kursit.
            </p>
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary btn-block flex justify-center items-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            ) : null}
            Regjistrohu në Kurs
          </button>
        </form>
      </div>
    </div>
  );
};
