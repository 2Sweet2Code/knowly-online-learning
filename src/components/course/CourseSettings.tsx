import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';

interface CourseSettingsProps {
  courseId: string;
  initialPreviewContent?: string;
  onUpdate?: () => void;
}

export const CourseSettings: React.FC<CourseSettingsProps> = ({
  courseId,
  initialPreviewContent = '',
  onUpdate,
}) => {
  const [previewContent, setPreviewContent] = useState(initialPreviewContent);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Update local state when initialPreviewContent changes
  useEffect(() => {
    setPreviewContent(initialPreviewContent);
  }, [initialPreviewContent]);

  const handleSave = async () => {
    if (!courseId) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('courses')
        .update({ 
          preview_content: previewContent || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', courseId);

      if (error) throw error;

      toast({
        title: 'Settings saved',
        description: 'Course preview content has been updated.',
      });

      // Call the onUpdate callback if provided
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating course settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update course settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Course Preview Settings</h3>
        <p className="text-sm text-gray-500 mt-1">
          This content will be shown to users who are not enrolled in the course.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="preview-content" className="block text-sm font-medium text-gray-700">
          Preview Content
        </label>
        <div className="mt-1">
          <textarea
            id="preview-content"
            value={previewContent || ''}
            onChange={(e) => setPreviewContent(e.target.value)}
            placeholder="Enter preview content that will be shown to non-enrolled users..."
            className="min-h-[200px] w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            rows={8}
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          You can use markdown formatting in this field.
        </p>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default CourseSettings;
