import { supabase } from '@/integrations/supabase/client';
import { CourseContent, CreateCourseContentPayload, CreateAssignmentPayload } from '@/types/course-content';

export const courseContentService = {
  // Upload a file to Supabase Storage
  async uploadFile(file: File, courseId: string, path: string = 'course-content'): Promise<{ path: string; publicUrl: string }> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${path}/${courseId}/${fileName}`;
    const bucketName = 'course-files';

    // Upload the file
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      throw new Error(uploadError.message);
    }

    // Construct the public URL manually to ensure it's correct
    const supabaseUrl = 'https://oemwaoaebmwdfrndohmh.supabase.co';
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${uploadData.path}`;

    return { 
      path: uploadData.path,
      publicUrl
    };
  },

  // Create course content
  async createContent(payload: CreateCourseContentPayload): Promise<CourseContent> {
    const { data, error } = await supabase
      .from('course_content')
      .insert({
        ...payload,
        position: payload.position || 0,
        is_published: payload.is_published !== undefined ? payload.is_published : true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating content:', error);
      throw new Error(error.message);
    }

    return data;
  },

  // Create an assignment
  async createAssignment(payload: CreateAssignmentPayload) {
    const { data, error } = await supabase
      .from('assignments')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Error creating assignment:', error);
      throw new Error(error.message);
    }

    return data;
  },

  // Get all content for a course
  async getCourseContent(courseId: string): Promise<CourseContent[]> {
    const { data, error } = await supabase
      .from('course_content')
      .select('*')
      .eq('course_id', courseId)
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching course content:', error);
      throw new Error(error.message);
    }

    return data || [];
  },

  // Delete content
  async deleteContent(contentId: string): Promise<void> {
    const { error } = await supabase
      .from('course_content')
      .delete()
      .eq('id', contentId);

    if (error) {
      console.error('Error deleting content:', error);
      throw new Error(error.message);
    }
  },

  // Update content position
  async updateContentPosition(contentId: string, position: number): Promise<void> {
    const { error } = await supabase
      .from('course_content')
      .update({ position, updated_at: new Date().toISOString() })
      .eq('id', contentId);

    if (error) {
      console.error('Error updating content position:', error);
      throw new Error(error.message);
    }
  },

  // Toggle content published status
  async togglePublishStatus(contentId: string, isPublished: boolean): Promise<void> {
    const { error } = await supabase
      .from('course_content')
      .update({ is_published: isPublished, updated_at: new Date().toISOString() })
      .eq('id', contentId);

    if (error) {
      console.error('Error updating publish status:', error);
      throw new Error(error.message);
    }
  },
};
