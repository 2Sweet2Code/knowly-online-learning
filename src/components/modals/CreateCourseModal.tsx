
import { useState } from "react";
import { X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface CreateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateCourseModal = ({ isOpen, onClose, onSuccess }: CreateCourseModalProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"programim" | "dizajn" | "marketing" | "other" | "">("");
  const [imageUrl, setImageUrl] = useState("");
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
        description: "Ju duhet të jeni të kyçur për të krijuar një kurs.",
        variant: "destructive",
      });
      return;
    }

    if (!category) {
      toast({
        title: "Gabim!",
        description: "Ju lutemi zgjidhni një kategori për kursin.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Generate a placeholder image if none provided
      const image = imageUrl || `https://placehold.co/600x360/${encodeURIComponent("#5C4B3A")}/${encodeURIComponent("#F5F0E6")}?text=${encodeURIComponent(title)}`;
      
      const { data, error } = await supabase
        .from('courses')
        .insert({
          title,
          description,
          category,
          image,
          instructor: user.name,
          instructor_id: user.id,
          status: 'draft',
          students: 0
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Invalidate queries to refetch courses
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['instructorCourses', user.id] });
      
      toast({
        title: "Sukses!",
        description: "Kursi u krijua me sukses.",
      });
      
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Gabim!",
        description: "Ndodhi një problem gjatë krijimit të kursit. Ju lutemi provoni përsëri.",
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
        
        <h3 className="text-2xl font-playfair text-center mb-6">Krijo Kurs të Ri</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="course-title" className="block mb-2 font-semibold text-brown">
              Titulli i Kursit:
            </label>
            <input
              type="text"
              id="course-title"
              placeholder="p.sh., Hyrje në JavaScript"
              className="w-full px-4 py-3 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="course-category" className="block mb-2 font-semibold text-brown">
              Kategoria:
            </label>
            <select
              id="course-category"
              className="w-full px-4 py-3 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown"
              value={category}
              onChange={(e) => setCategory(e.target.value as "programim" | "dizajn" | "marketing" | "other" | "")}
              required
            >
              <option value="">Zgjidhni Kategorinë...</option>
              <option value="programim">Programim</option>
              <option value="dizajn">Dizajn</option>
              <option value="marketing">Marketing</option>
              <option value="other">Tjetër</option>
            </select>
          </div>
          
          <div className="mb-4">
            <label htmlFor="course-description" className="block mb-2 font-semibold text-brown">
              Përshkrimi i Kursit:
            </label>
            <textarea
              id="course-description"
              placeholder="Përshkruani shkurtimisht kursin..."
              className="w-full px-4 py-3 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown min-h-[100px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            ></textarea>
          </div>
          
          <div className="mb-6">
            <label htmlFor="course-image" className="block mb-2 font-semibold text-brown">
              URL i Imazhit të Kopertinës (Opsional):
            </label>
            <input
              type="text"
              id="course-image"
              placeholder="https://example.com/image.jpg"
              className="w-full px-4 py-3 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary btn-block flex justify-center items-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            ) : null}
            Krijo Kursin
          </button>
        </form>
      </div>
    </div>
  );
};
