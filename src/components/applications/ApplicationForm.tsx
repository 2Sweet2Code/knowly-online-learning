import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSubmitApplication } from '@/hooks/useApplicationSubmit';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface ApplicationFormProps {
  type: 'admin' | 'instructor';
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const ApplicationForm = ({ type, onSuccess, onCancel }: ApplicationFormProps) => {
  const { courseId } = useParams<{ courseId: string }>();
  const [message, setMessage] = useState('');
  const submitApplication = useSubmitApplication(type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;

    try {
      await submitApplication.mutateAsync({
        courseId,
        message: message.trim() || undefined,
      });
      onSuccess?.();
    } catch (error) {
      // Error handling is done in the useSubmitApplication hook
      console.error('Error submitting application:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="message">
          {type === 'admin' 
            ? 'Pse dëshironi të jeni administrator i këtij kursi?'
            : 'Pse dëshironi të jeni instruktor i këtij kursi?'}
        </Label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Shkruani një mesazh të shkurtër për të shpjeguar pse dëshironi të aplikoni..."
          rows={4}
          className="mt-1"
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {message.length}/500 karaktere
        </p>
      </div>

      <div className="flex justify-end space-x-2 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitApplication.isLoading}
          >
            Anulo
          </Button>
        )}
        <Button type="submit" disabled={submitApplication.isLoading}>
          {submitApplication.isLoading ? (
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
  );
};
