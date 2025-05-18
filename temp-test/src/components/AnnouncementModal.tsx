import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

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
      // Create announcement data object
      const announcementData = {
        title: title.trim(),
        content: content.trim(),
        instructor_id: user.id,
        created_at: new Date().toISOString(),
        course_id: courseId || null,
        instructor_name: user.name || 'Instructor'
      };

      const { error } = await supabase
        .from('announcements')
        .insert(announcementData);

      if (error) throw error;

      // Reset form and close modal
      setTitle('');
      setContent('');
      onClose();

      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      if (courseId) {
        queryClient.invalidateQueries({ queryKey: ['courseAnnouncements', courseId] });
      }

      toast({
        title: 'Sukses',
        description: 'Njoftimi u publikua me sukses!',
      });

    } catch (error) {
      console.error('Error creating announcement:', error);
      toast({
        title: 'Gabim',
        description: 'Ndodhi një gabim gjatë publikimit të njoftimit.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Krijo Njoftim të Ri</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Titulli <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full px-3 py-2 border ${
                errors.title ? 'border-red-300' : 'border-gray-300'
              } rounded-md shadow-sm focus:ring-brown-500 focus:border-brown-500`}
              placeholder="Shkruaj titullin e njoftimit"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
              Përmbajtja <span className="text-red-500">*</span>
            </label>
            <textarea
              id="content"
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={`w-full px-3 py-2 border ${
                errors.content ? 'border-red-300' : 'border-gray-300'
              } rounded-md shadow-sm focus:ring-brown-500 focus:border-brown-500`}
              placeholder="Shkruaj përmbajtjen e njoftimit"
            />
            {errors.content && (
              <p className="mt-1 text-sm text-red-600">{errors.content}</p>
            )}
          </div>

          <DialogFooter className="mt-6">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brown-500"
              disabled={isLoading}
            >
              Anulo
            </button>
            <button
              type="submit"
              className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brown hover:bg-brown-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brown-500 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Po publikoj...
                </>
              ) : (
                'Publiko Njoftim'
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
