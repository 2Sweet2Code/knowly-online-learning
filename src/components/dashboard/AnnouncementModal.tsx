import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import type { Database } from '@/integrations/supabase/types';

interface AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId?: string | null;
}

interface FormErrors {
  title?: string;
  content?: string;
}

export const AnnouncementModal = ({ isOpen, onClose, courseId }: AnnouncementModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!title.trim()) {
      newErrors.title = 'Titulli është i detyrueshëm';
    } else if (title.trim().length < 5) {
      newErrors.title = 'Titulli duhet të jetë të paktën 5 karaktere';
    }
    
    if (!content.trim()) {
      newErrors.content = 'Përmbajtja është e detyrueshme';
    } else if (content.trim().length < 10) {
      newErrors.content = 'Përmbajtja duhet të jetë të paktën 10 karaktere';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: 'Gabim',
        description: 'Ju duhet të jeni të kyçur për të publikuar një njoftim.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const announcementData: Database['public']['Tables']['announcements']['Insert'] = {
        title: title.trim(),
        content: content.trim(),
        instructor_id: user.id,
        created_at: new Date().toISOString(),
        course_id: courseId || null
      };
      
      // --- DEBUG: Isolate the insert operation --- 
      console.log("Attempting to insert announcement data:", announcementData);
      // Remove .select().single()
      const { error: insertError } = await supabase
        .from('announcements')
        .insert(announcementData);
        // .select()
        // .single();
      
      // Log the result of the plain insert
      console.log("Insert Result:", { insertError });

      if (insertError) {
        console.error('Error during announcement insert operation:', insertError);
        if (insertError.message.includes('violates foreign key constraint') && insertError.message.includes('announcements_course_id_fkey')) {
           toast({
             title: 'Gabim Lidhjeje',
             description: 'Kursi i specifikuar nuk ekziston. Njoftimi nuk u ruajt.',
             variant: 'destructive',
           });
        } else {
           throw insertError; // Re-throw the actual insert error
        }
      } else {
          // Insert succeeded
          console.log("Announcement insert reported success.");
          queryClient.invalidateQueries({ queryKey: ['announcements'] });
          if (courseId) {
            queryClient.invalidateQueries({ queryKey: ['courseAnnouncements', courseId] });
          }
          
          toast({
            title: 'Sukses!',
            description: 'Njoftimi u publikua me sukses.',
          });
          
          setTitle('');
          setContent('');
          setErrors({});
          onClose();
      }

    } catch (error) {
      console.error('Failed to create announcement:', error);
      
      toast({
          title: 'Gabim',
          description: 'Ndodhi një gabim gjatë publikimit të njoftimit. Ju lutemi provoni përsëri.',
          variant: 'destructive',
        });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleClose = () => {
    setTitle('');
    setContent('');
    setErrors({});
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-playfair">Publiko Njoftim të Ri</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="mb-4">
            <label htmlFor="announcement-title" className="block mb-2 font-semibold text-brown">
              Titulli i Njoftimit:
            </label>
            <input
              type="text"
              id="announcement-title"
              placeholder="p.sh., Materiale të reja të ngarkuara"
              className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-1 ${
                errors.title 
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                  : 'border-lightGray focus:border-brown focus:ring-brown'
              }`}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) {
                  setErrors(prev => ({ ...prev, title: undefined }));
                }
              }}
              required
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-500 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.title}
              </p>
            )}
          </div>
          
          <div className="mb-4">
            <label htmlFor="announcement-content" className="block mb-2 font-semibold text-brown">
              Përmbajtja:
            </label>
            <textarea
              id="announcement-content"
              placeholder="Shkruani përmbajtjen e njoftimit tuaj këtu..."
              className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-1 min-h-[150px] ${
                errors.content 
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                  : 'border-lightGray focus:border-brown focus:ring-brown'
              }`}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (errors.content) {
                  setErrors(prev => ({ ...prev, content: undefined }));
                }
              }}
              required
            />
            {errors.content && (
              <p className="mt-1 text-sm text-red-500 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.content}
              </p>
            )}
          </div>
          
          <DialogFooter>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={handleClose}
              disabled={isLoading}
            >
              Anulo
            </button>
            <button 
              type="submit" 
              className="btn btn-primary flex justify-center items-center"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Duke publikuar...
                </>
              ) : (
                "Publiko Njoftimin"
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
