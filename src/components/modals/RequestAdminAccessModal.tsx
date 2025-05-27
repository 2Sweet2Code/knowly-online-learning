import { useState } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Course, CourseAdmin } from "@/types";
import { Database } from "@/integrations/supabase/types";

// Define the type for admin applications since it's not in the Database type yet
type AdminApplication = {
  id: string;
  user_id: string;
  course_id: string;
  status: 'pending' | 'approved' | 'rejected';
  message: string | null;
  created_at: string;
  updated_at: string;
};

interface RequestAdminAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course;
}

export const RequestAdminAccessModal = ({ isOpen, onClose, course }: RequestAdminAccessModalProps) => {
  const [reason, setReason] = useState("");
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
        description: "Ju duhet të jeni të kyçur për të kërkuar qasje si administrator.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Check if the user already has a request for this course
      const { data: existingRequest, error: fetchError } = await supabase
        .from('admin_applications')
        .select('*')
        .eq('course_id', course.id)
        .eq('user_id', user.id)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
        console.error("Error checking for existing request:", fetchError);
        toast({
          title: "Gabim!",
          description: "Ndodhi një problem gjatë kontrollit për kërkesa ekzistuese. Ju lutemi provoni përsëri.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      if (existingRequest) {
        // Show message that application already exists
        const status = existingRequest.status === 'pending' ? 'në pritje' : 'e aprovuar';
        toast({
          title: "Informacion",
          description: `Ju tashmë keni një kërkesë ${status} për këtë kurs.`,
        });
        onClose();
        return;
      }
      
      // Log the user data for debugging
      console.log('Current user:', user);
      
      if (!user || !user.id) {
        throw new Error('User not authenticated or missing user ID');
      }
      
      // Prepare the admin request data
      const adminRequestData = {
        course_id: course.id,
        user_id: user.id, // This should be the user's UUID
        status: 'pending',
        message: reason || null
      };
      
      console.log('Submitting admin application:', adminRequestData);
      
      // Insert the new admin request into the database
      const { data, error: insertError } = await supabase
        .from('admin_applications')
        .insert([adminRequestData])
        .select();
        
      console.log('Insert result:', { data, error: insertError });
      
      if (insertError) {
        console.error("Error submitting admin request:", insertError);
        toast({
          title: "Gabim!",
          description: "Ndodhi një problem gjatë dërgimit të kërkesës. Ju lutemi provoni përsëri.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      toast({
        title: "Sukses!",
        description: "Kërkesa juaj për qasje si administrator u dërgua me sukses. Do të njoftoheni kur të merret një vendim.",
      });
      
      onClose();
    } catch (error) {
      console.error(error);
      toast({
        title: "Gabim!",
        description: "Ndodhi një problem gjatë dërgimit të kërkesës. Ju lutemi provoni përsëri.",
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
        
        <h3 className="text-2xl font-playfair text-center mb-6">Kërko Qasje si Administrator</h3>
        
        <div className="mb-6">
          <p className="text-gray-600">
            Ju po kërkoni qasje si administrator për kursin:
          </p>
          <p className="font-semibold text-brown mt-2">{course.title}</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="reason" className="block mb-2 font-semibold text-brown">
              Arsyeja e Kërkesës:
            </label>
            <textarea
              id="reason"
              placeholder="Shpjegoni pse dëshironi të jeni administrator i këtij kursi..."
              className="w-full px-4 py-3 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown min-h-[100px]"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            ></textarea>
            <p className="mt-2 text-sm text-gray-600">
              Kërkesa juaj do të shqyrtohet nga krijuesi i kursit.
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
            Dërgo Kërkesën
          </button>
        </form>
      </div>
    </div>
  );
};
