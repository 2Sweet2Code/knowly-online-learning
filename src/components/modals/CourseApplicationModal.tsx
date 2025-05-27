import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface CourseApplicationModalProps {
  courseId: string;
  role: 'admin' | 'instructor';
  onClose: () => void;
}

export const CourseApplicationModal = ({ courseId, role, onClose }: CourseApplicationModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    
    try {
      const tableName = role === 'admin' ? 'course_admins' : 'course_instructors';
      
      const { error } = await supabase
        .from(tableName)
        .insert([
          { 
            course_id: courseId,
            user_id: user.id,
            status: 'pending',
            message: message.trim() || null
          }
        ]);

      if (error) throw error;

      toast({
        title: 'Aplikimi u dërgua',
        description: `Aplikimi juaj për rolin e ${role === 'admin' ? 'administratorit' : 'instruktorit'} u dërgua me sukses.`,
        variant: 'default',
      });
      
      onClose();
    } catch (error) {
      console.error('Error submitting application:', error);
      toast({
        title: 'Gabim',
        description: 'Ndodhi një gabim gjatë dërgimit të aplikimit. Ju lutemi provoni përsëri më vonë.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          disabled={isSubmitting}
        >
          <X className="h-5 w-5" />
        </button>
        
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">
            Apliko si {role === 'admin' ? 'Administrator' : 'Instruktor'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="message" className="block mb-2">
                Pse dëshironi të jeni {role === 'admin' ? 'administrator' : 'instruktor'} i këtij kursi?
              </Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Shkruani një mesazh të shkurtër..."
                rows={4}
                className="w-full"
                disabled={isSubmitting}
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Anulo
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Po dërgohet...
                  </>
                ) : (
                  'Dërgo Aplikimin'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CourseApplicationModal;
