import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, Send, Trash2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Profile {
  id: string;
  name: string | null;
  avatar_url: string | null;
}

interface AnnouncementCommentWithProfile {
  id: string;
  content: string;
  announcement_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  profiles: {
    name: string | null;
    avatar_url: string | null;
  } | null;
}

interface AnnouncementCommentsProps {
  announcementId: string;
}

// Define error type for Supabase errors
interface SupabaseError extends Error {
  code?: string;
}

export const AnnouncementComments = ({ announcementId }: AnnouncementCommentsProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch comments for this announcement with error handling and caching
  const { 
    data: comments = [], 
    isLoading, 
    isError, 
    error 
  } = useQuery<AnnouncementCommentWithProfile[]>({
    queryKey: ['announcementComments', announcementId],
    queryFn: async (): Promise<AnnouncementCommentWithProfile[]> => {
      console.log('Fetching comments for announcement:', announcementId);
      if (!announcementId) {
        console.log('No announcementId provided, returning empty array');
        return [];
      }
      
      try {
        // Fetch comments
        console.log('Fetching comments from database...');
        const { data: comments, error: commentsError, count } = await supabase
          .from('announcement_comments')
          .select('*', { count: 'exact' })
          .eq('announcement_id', announcementId)
          .order('created_at', { ascending: true });

        if (commentsError) {
          console.error('Error fetching comments:', commentsError);
          throw commentsError;
        }
        
        console.log(`Found ${comments?.length || 0} comments for announcement ${announcementId}`);
        if (!comments?.length) return [];

        // Get unique user IDs from comments
        const userIds = [...new Set(comments.map(comment => comment.user_id))];
        console.log('Fetching profiles for users:', userIds);
        
        if (!userIds.length) return [];

        // Fetch user profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          throw profilesError;
        }
        
        console.log('Fetched profiles:', profiles);

        // Combine comments with profile data
        const combined = comments.map(comment => ({
          ...comment,
          profiles: profiles?.find(p => p.id === comment.user_id) || null
        }));
        
        console.log('Returning combined comments:', combined);
        return combined;
      } catch (error) {
        console.error('Error in queryFn:', error);
        throw error;
      }
    },
    // Cache comments for 5 minutes
    staleTime: 5 * 60 * 1000,
    // Don't retry on 404 errors
    retry: (failureCount, error: unknown) => {
      const supabaseError = error as SupabaseError;
      if (supabaseError?.code === 'PGRST116') return false; // Not found
      return failureCount < 3;
    },
    enabled: !!announcementId
  });

  // Handle comment submission
  const { mutate: submitComment, isPending: isSubmitting } = useMutation({
    mutationFn: async (content: string) => {
      console.log('Submitting comment...', { 
        user: user?.id, 
        announcementId,
        content: content.trim() 
      });
      
      if (!user) {
        console.error('No user found');
        throw new Error('User not authenticated');
      }
      
      if (!announcementId) {
        console.error('No announcement ID provided');
        throw new Error('No announcement ID');
      }
      
      try {
        const { data, error, status, statusText } = await supabase
          .from('announcement_comments')
          .insert([
            {
              announcement_id: announcementId,
              user_id: user.id,
              content: content.trim()
            }
          ])
          .select();
        
        console.log('Comment submission response:', { 
          data, 
          error, 
          status, 
          statusText 
        });
        
        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }
        
        return data?.[0];
      } catch (err) {
        console.error('Error in mutationFn:', err);
        throw err;
      }
    },
    onSuccess: (data) => {
      console.log('Comment submitted successfully:', data);
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: ['announcementComments', announcementId] });
    },
    onError: (error) => {
      console.error('Error in onError:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to post comment. Please try again.',
        variant: 'destructive',
      });
    }
  });

  // Handle comment deletion
  const { mutate: deleteComment } = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('announcement_comments')
        .delete()
        .eq('id', commentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcementComments', announcementId] });
    },
    onError: (error) => {
      console.error('Error deleting comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete comment. Please try again.',
        variant: 'destructive',
      });
    }
  });

  // Handle comment submission
  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    const content = commentText.trim();
    if (!content) return;
    
    submitComment(content);
  };

  // Handle comment deletion
  const handleDeleteComment = (commentId: string) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      deleteComment(commentId);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  // Show error state
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error instanceof Error ? error.message : 'Failed to load comments'}
        </AlertDescription>
      </Alert>
    );
  }

  // Debug logs
  console.log('AnnouncementComments - comments:', comments);
  console.log('AnnouncementComments - isLoading:', isLoading);
  console.log('AnnouncementComments - isError:', isError);
  console.log('AnnouncementComments - error:', error);
  
  // Toggle comments section
  const toggleComments = () => {
    setIsExpanded(!isExpanded);
  };

  // Show comments toggle button
  return (
    <div className="mt-4">
      <button
        onClick={toggleComments}
        className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {isExpanded ? (
          <>
            <span>Hide comments</span>
            <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </>
        ) : (
          <>
            <span>Show comments</span>
            <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-4">
          {comments.length === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              {t('comments.noComments', 'No comments yet. Be the first to comment!')}
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 group">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage 
                      src={comment.profiles?.avatar_url || ''} 
                      alt={comment.profiles?.name || ''} 
                    />
                    <AvatarFallback>
                      {comment.profiles?.name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-medium text-sm">
                            {comment.profiles?.name || t('common.anonymous', 'Anonymous')}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        {user?.id === comment.user_id && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
                            aria-label={t('common.delete', 'Delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-foreground/90 whitespace-pre-wrap break-words">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmitComment} className="mt-4">
            <div className="flex items-end gap-2">
              <Textarea
                placeholder={t('comments.placeholder', 'Write a comment...')}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="min-h-[80px] flex-1"
                disabled={isSubmitting}
              />
              <Button 
                type="submit" 
                size="sm" 
                className="self-end"
                disabled={!commentText.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
