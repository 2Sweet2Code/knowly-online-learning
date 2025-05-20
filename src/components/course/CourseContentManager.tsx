import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { courseContentService } from '@/services/courseContentService';
import { CourseContent } from '@/types/course-content';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ContentTabs } from './ContentTabs';
import { ContentForm } from './ContentForm';
import { ContentList } from './ContentList';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';

interface CourseContentManagerProps {
  isInstructor: boolean;
  courseId: string;
}

export const CourseContentManager: React.FC<CourseContentManagerProps> = ({ 
  isInstructor, 
  courseId 
}) => {
  const { user } = useAuth();
  const [contents, setContents] = useState<CourseContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'assignments'>('content');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter contents based on active tab
  const filteredContents = useMemo(() => {
    return contents.filter(content => 
      activeTab === 'assignments' 
        ? content.content_type === 'assignment'
        : content.content_type !== 'assignment'
    );
  }, [contents, activeTab]);

  // Counts for tabs
  const contentCount = useMemo(() => 
    contents.filter(c => c.content_type !== 'assignment').length, 
    [contents]
  );
  
  const assignmentCount = useMemo(() => 
    contents.filter(c => c.content_type === 'assignment').length, 
    [contents]
  );

  // Fetch course content
  const fetchContent = useCallback(async () => {
    if (!courseId) return;
    
    try {
      setIsLoading(true);
      const data = await courseContentService.getCourseContent(courseId);
      setContents(data);
    } catch (error) {
      console.error('Failed to fetch course content:', error);
      toast({
        title: 'Error',
        description: 'Failed to load course content',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const handleSubmit = async (data: {
    title: string;
    description: string;
    contentType: 'file' | 'link' | 'text' | 'assignment';
    file?: File | null;
    contentUrl?: string;
    dueDate?: string;
    resources?: string;
  }) => {
    if (!user?.id) return;

    setIsSubmitting(true);

    try {
      if (data.contentType === 'file' && data.file) {
        // Upload file and get the public URL
        const { path, publicUrl } = await courseContentService.uploadFile(data.file, courseId);
        
        // Create content with file
        await courseContentService.createContent({
          course_id: courseId,
          title: data.title,
          description: data.description,
          content_type: 'file',
          content_url: publicUrl,
          file_path: path,
          file_name: data.file.name,
          file_size: data.file.size,
          file_type: data.file.type,
          created_by: user.id,
        });
      } else if (data.contentType === 'link') {
        // Create link content
        await courseContentService.createContent({
          course_id: courseId,
          title: data.title,
          description: data.description,
          content_type: 'link',
          content_url: data.contentUrl || '',
          created_by: user.id,
        });
      } else if (data.contentType === 'text') {
        // Create text content
        await courseContentService.createContent({
          course_id: courseId,
          title: data.title,
          description: data.description,
          content_type: 'text',
          created_by: user.id,
        });
      } else if (data.contentType === 'assignment' && data.dueDate) {
        // First create the assignment
        const assignment = await courseContentService.createAssignment({
          course_id: courseId,
          title: data.title,
          description: data.description,
          due_date: data.dueDate,
          resources: data.resources || '',
        });

        // Then create content item linked to the assignment
        await courseContentService.createContent({
          course_id: courseId,
          title: data.title,
          description: data.description,
          content_type: 'assignment',
          content_url: assignment.id, // Store assignment ID in content_url
          created_by: user.id,
        });
      }
      
      // Refresh content and close form
      await fetchContent();
      setShowAddForm(false);
      
      toast({
        title: 'Success',
        description: 'Content added successfully',
      });
    } catch (error) {
      console.error('Error adding content:', error);
      toast({
        title: 'Error',
        description: 'Failed to add content',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteContent = async (contentId: string) => {
    if (!confirm('Are you sure you want to delete this content?')) return;
    
    try {
      await courseContentService.deleteContent(contentId);
      await fetchContent();
      toast({
        title: 'Success',
        description: 'Content deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting content:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete content',
        variant: 'destructive',
      });
    }
  };

  const togglePublishStatus = async (content: CourseContent) => {
    try {
      await courseContentService.togglePublishStatus(content.id, !content.is_published);
      await fetchContent();
      toast({
        title: 'Success',
        description: `Content ${!content.is_published ? 'published' : 'unpublished'} successfully`,
      });
    } catch (error) {
      console.error('Error toggling publish status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update content status',
        variant: 'destructive',
      });
    }
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(filteredContents);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Update local state immediately for better UX
    setContents(prev => {
      const otherContents = prev.filter(c => 
        activeTab === 'assignments' 
          ? c.content_type !== 'assignment' 
          : c.content_type === 'assignment'
      );
      return [...otherContents, ...items];
    });
    
    // Update positions in the database
    try {
      const updatePromises = items.map((item, index) => 
        courseContentService.updateContentPosition(item.id, index)
      );
      
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error updating content positions:', error);
      // Revert to previous state if there's an error
      fetchContent();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <ContentTabs 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        contentCount={contentCount}
        assignmentCount={assignmentCount}
      />

      {/* Add Content Button */}
      {isInstructor && !showAddForm && (
        <div className="flex justify-end">
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add {activeTab === 'content' ? 'Content' : 'Assignment'}
          </Button>
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm && isInstructor && (
        <ContentForm
          onSubmit={handleSubmit}
          onCancel={() => setShowAddForm(false)}
          isSubmitting={isSubmitting}
          initialData={{
            title: '',
            description: '',
            contentType: activeTab === 'assignments' ? 'assignment' : 'text',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
          }}
        />
      )}

      {/* Content List */}
      <DragDropContext onDragEnd={onDragEnd}>
        <ContentList
          contents={filteredContents}
          isInstructor={isInstructor}
          onDragEnd={onDragEnd}
          onTogglePublish={togglePublishStatus}
          onDelete={handleDeleteContent}
        />
      </DragDropContext>
    </div>
  );
};
