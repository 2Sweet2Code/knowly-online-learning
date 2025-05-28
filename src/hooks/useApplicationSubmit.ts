import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { ApplicationStatus } from '@/types/applications';
import { useAuth } from '@/hooks/useAuth';

interface SubmitApplicationParams {
  courseId: string;
  message?: string;
}

export interface UpdateStatusParams {
  status: ApplicationStatus;
  reason?: string;
}

export const useSubmitApplication = (type: 'admin' | 'instructor') => {
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ courseId, message }: SubmitApplicationParams) => {
      if (!user || !user.id) {
        throw new Error('User not authenticated');
      }

      const tableName = type === 'admin' ? 'admin_applications' : 'instructor_applications';
      
      const { data, error } = await supabase
        .from(tableName)
        .insert([
          { 
            user_id: user.id,
            course_id: courseId,
            status: 'pending' as ApplicationStatus,
            ...(message && { message })
          }
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Aplikimi u dërgua me sukses!',
        description: `Aplikimi juaj për tu bërë ${type === 'admin' ? 'administrator' : 'instruktor'} është dërguar për shqyrtim.`,
      });
    },
    onError: (error: Error) => {
      console.error('Error submitting application:', error);
      
      // Handle specific error cases
      if (error.message.includes('duplicate key value')) {
        toast({
          title: 'Gabim',
          description: 'Ju keni dërguar tashmë një aplikim për këtë kurs.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Gabim',
          description: 'Ndodhi një gabim gjatë dërgimit të aplikimit. Ju lutemi provoni përsëri më vonë.',
          variant: 'destructive',
        });
      }
    }
  });
};

export const useUpdateApplicationStatus = (type: 'admin' | 'instructor', applicationId: string) => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ status, reason }: UpdateStatusParams) => {
      const tableName = type === 'admin' ? 'admin_applications' : 'instructor_applications';
      
      const { data, error } = await supabase
        .from(tableName)
        .update({ 
          status,
          ...(reason && { rejection_reason: reason })
        })
        .eq('id', applicationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const action = data.status === 'approved' ? 'miratuar' : 'refuzuar';
      toast({
        title: `Aplikimi u ${action}!`,
        description: `Aplikimi u ${action} me sukses.`,
      });
    },
    onError: (error: Error) => {
      console.error('Error updating application status:', error);
      toast({
        title: 'Gabim',
        description: 'Ndodhi një gabim gjatë përditësimit të statusit. Ju lutemi provoni përsëri më vonë.',
        variant: 'destructive',
      });
    },
  });
};
