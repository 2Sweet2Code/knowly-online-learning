import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { Loader2, UploadCloud } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { AssignmentSubmission, CreateAssignmentSubmissionPayload } from '@/types/course-content';

export const AssignmentSubmissionForm = () => {
  const { courseId, assignmentId } = useParams<{ courseId: string; assignmentId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [submissionText, setSubmissionText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingSubmission, setExistingSubmission] = useState<AssignmentSubmission | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  // Check for existing submission
  useEffect(() => {
    const checkExistingSubmission = async () => {
      if (!user?.id || !assignmentId) return;

      try {
        const { data, error } = await supabase
          .from('assignment_submissions')
          .select('*')
          .eq('assignment_id', assignmentId)
          .eq('user_id', user.id)
          .single();

        if (data) {
          setExistingSubmission(data);
          setSubmissionText(data.submission_text || '');
        }
      } catch (error) {
        console.error('Error checking existing submission:', error);
      }
    };

    checkExistingSubmission();
  }, [user?.id, assignmentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !courseId || !assignmentId) {
      toast({
        title: 'Gabim',
        description: 'Ju duhet të jeni të kyqur për të dorëzuar detyrën.',
        variant: 'destructive',
      });
      return;
    }
    
    // Check if either submission text or file is provided
    if (!submissionText && !file) {
      toast({
        title: 'Gabim',
        description: 'Ju duhet të jepni një përshkrim ose të ngarkoni një skedar.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let fileUrl = '';
      let fileName = '';
      let fileType = '';

      // Upload file if provided
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileNameWithExt = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `submissions/${courseId}/${assignmentId}/${user.id}/${fileNameWithExt}`;
        
        // Check file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
          throw new Error('Madhësia maksimale e skedarit është 10MB');
        }
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('assignments')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error('Gabim gjatë ngarkimit të skedarit. Ju lutemi provoni përsëri.');
        }

        // Get the public URL
        const { data: { publicUrl } } = supabase.storage
          .from('assignments')
          .getPublicUrl(filePath);

        fileUrl = publicUrl;
        fileName = file.name;
        fileType = file.type;
      }

      const submissionData: CreateAssignmentSubmissionPayload = {
        assignment_id: assignmentId,
        user_id: user.id,
        submission_text: submissionText || undefined,
        file_url: fileUrl || undefined,
        file_name: fileName || undefined,
        file_type: fileType || undefined,
        file_size: file?.size
      };

      let data, error;

      if (existingSubmission) {
        // Update existing submission
        const { data: updateData, error: updateError } = await supabase
          .from('assignment_submissions')
          .update({
            ...submissionData,
            // Only update the file fields if we have a new file
            ...(fileUrl ? {
              file_url: fileUrl,
              file_name: fileName,
              file_type: fileType,
              file_size: file?.size
            } : {})
          })
          .eq('id', existingSubmission.id)
          .select()
          .single();
        data = updateData;
        error = updateError;
      } else {
        // Create new submission
        const { data: insertData, error: insertError } = await supabase
          .from('assignment_submissions')
          .insert([submissionData])
          .select()
          .single();
        data = insertData;
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: 'Sukses',
        description: 'Detyra juaj është dorëzuar me sukses!',
      });

      // Navigate back to the assignments list
      navigate(`/app/courses/${courseId}/assignments`);
      
    } catch (error) {
      console.error('Error submitting assignment:', error);
      toast({
        title: 'Gabim',
        description: 'Ndodhi një gabim gjatë dorëzimit të detyrës. Ju lutemi provoni përsëri.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">
          {existingSubmission ? 'Përditëso Dorëzimin' : 'Dorëzo Detyrën'}
        </h3>
        
        {existingSubmission && (
          <div className="mb-4 p-4 bg-blue-50 text-blue-800 rounded-md">
            <p className="font-medium">Keni dorëzuar më parë këtë detyrë.</p>
            <p className="text-sm mt-1">
              E përditësuar më: {new Date(existingSubmission.updated_at).toLocaleString('sq-AL')}
            </p>
          </div>
        )}

        <div className="space-y-2 mb-4">
          <Label htmlFor="submission-text">Përshkrimi i dorëzimit</Label>
          <Textarea
            id="submission-text"
            value={submissionText}
            onChange={(e) => setSubmissionText(e.target.value)}
            placeholder="Shkruani përgjigjen tuaj këtu..."
            className="min-h-[150px]"
          />
          <p className="text-sm text-muted-foreground">
            Përshkrimi është opsional nëse ngarkoni një skedar.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="file-upload">Ngarko Skedarin (Opsionale)</Label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md">
          <div className="space-y-1 text-center">
            <div className="flex justify-center">
              <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
            </div>
            <div className="flex text-sm text-gray-600">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary/90 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
              >
                <span>Ngarko një skedar</span>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  onChange={handleFileChange}
                />
              </label>
              <p className="pl-1">ose lësho këtu</p>
            </div>
            <p className="text-xs text-gray-500">
              PNG, JPG, PDF, DOCX deri në 10MB
            </p>
          </div>
        </div>
        
        {file && (
          <div className="mt-2 p-3 bg-gray-50 rounded-md">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 bg-gray-200 rounded-md flex items-center justify-center">
                  <span className="text-gray-500">
                    {file.name.split('.').pop()?.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Largo skedarin</span>
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {existingSubmission?.file_url && !file && (
          <div className="mt-2 p-3 bg-gray-50 rounded-md">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 bg-gray-200 rounded-md flex items-center justify-center">
                  <span className="text-gray-500">
                    {existingSubmission.file_name?.split('.').pop()?.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {existingSubmission.file_name}
                </p>
                <a
                  href={existingSubmission.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  Shiko skedarin
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(-1)}
          disabled={isSubmitting}
        >
          Anulo
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="min-w-[120px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {existingSubmission ? 'Duke përditësuar...' : 'Duke dërguar...'}
            </>
          ) : (
            existingSubmission ? 'Përditëso Dorëzimin' : 'Dorëzo Detyrën'
          )}
        </Button>
      </div>
    </form>
  );
};

export default AssignmentSubmissionForm;
