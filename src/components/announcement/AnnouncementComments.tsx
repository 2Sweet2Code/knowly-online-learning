import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { enUS as en, sq } from 'date-fns/locale';
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

export const AnnouncementComments = ({ announcementId }: AnnouncementCommentsProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!announcementId) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Missing announcement ID</AlertDescription>
      </Alert>
    );
  }

  // Fetch comments for this announcement with error handling and caching
  const { data: comments = [], isLoading, isError, error } = useQuery<AnnouncementCommentWithProfile[]>({
    queryKey: ['announcementComments', announcementId],
    queryFn: async (): Promise<AnnouncementCommentWithProfile[]> => {
      try {
        if (!announcementId) return [];
        
        // Fetch comments
        const { data: comments, error: commentsError } = await supabase
          .from('announcement_comments')
          .select('*')
          .eq('announcement_id', announcementId)
          .order('created_at', { ascending: true });

        if (commentsError) throw commentsError;
        if (!comments?.length) return [];

        // Get unique user IDs from comments
        const userIds = [...new Set(comments.map(comment => comment.user_id))];
        if (!userIds.length) return [];

        // Fetch user profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', userIds);

        if (profilesError) throw profilesError;

        // Combine comments with profile data
        return comments.map(comment => ({
          ...comment,
          profiles: profiles?.find(p => p.id === comment.user_id) || null
        }));
      } catch (error) {
        console.error('Error fetching comments:', error);
        throw error;
      }
    },
    // Cache comments for 5 minutes
    staleTime: 5 * 60 * 1000,
    // Don't retry on 404 errors
    retry: (failureCount, error) => {
      if ((error as any)?.code === 'PGRST116') return false; // Not found
      return failureCount < 3;
    }
  });

  // Handle comment submission
  const { mutate: submitComment, isPending: isSubmitting } = useMutation({
    mutationFn: async (content: string) => {
      if (!user || !announcementId) return;
      
      const { data, error } = await supabase
        .from('announcement_comments')
        .insert([
          {
            announcement_id: announcementId,
            user_id: user.id,
            content: content.trim()
          }
        ])
        .select();
      
      if (error) throw error;
      return data?.[0];
    },
    onSuccess: () => {
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: ['announcementComments', announcementId] });
    },
    onError: (error) => {
      console.error('Error submitting comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to post comment. Please try again.',
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

  // Show empty state
  if (!comments.length) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        No comments yet. Be the first to comment!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Comment list */}
      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={comment.profiles?.avatar_url || ''} />
              <AvatarFallback>
                {comment.profiles?.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {comment.profiles?.name || 'Unknown User'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), {
                    addSuffix: true,
                    locale: document.documentElement.lang === 'sq' ? sq : en
                  })}
                </span>
                {user?.id === comment.user_id && (
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="ml-auto text-red-500 hover:text-red-700"
                    disabled={isSubmitting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="mt-1 text-sm">{comment.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Comment form */}
      <form onSubmit={handleSubmitComment} className="mt-6">
        <div className="flex gap-2">
          <Textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment..."
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
  );
};
        .select('*')
        .eq('announcement_id', announcementId)
        .order('created_at', { ascending: true });

      if (commentsError) {
        console.error('Error fetching comments:', commentsError);
        throw commentsError;
      }
      
      if (!commentsData || commentsData.length === 0) {
        console.log('No comments found for announcement:', announcementId);
        return [];
      }

      // Get unique user IDs from comments
      const userIds = [...new Set(commentsData.map(comment => comment.user_id))];
      console.log('Fetching profiles for users:', userIds);
      
      // Get user profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      // Create a map of user IDs to profiles
      const profilesMap = new Map(profilesData?.map(profile => [profile.id, {
        name: profile.name,
        avatar_url: profile.avatar_url
      }]));

      // Combine comments with profiles
      const combinedComments: AnnouncementCommentWithProfile[] = commentsData.map(comment => ({
        ...comment,
        profiles: profilesMap.get(comment.user_id) || null
      }));
      
      console.log('Returning combined comments:', combinedComments);
      return combinedComments;
    },
    enabled: true, // Always enable the query
    refetchOnWindowFocus: true, // Refetch when window regains focus
    staleTime: 5 * 60 * 1000, // 5 minutes before data is considered stale
  });

  // Add new comment mutation
  const addComment = useMutation<AnnouncementCommentWithProfile, Error, string>({
    mutationFn: async (content: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      console.log('Adding comment to announcement:', announcementId);
      
      // Insert the new comment
      const { data: commentData, error: commentError } = await supabase
        .from('announcement_comments')
        .insert({
          content, 
          announcement_id: announcementId,
          user_id: user.id,
        })
        .select('*')
        .single();
      
      if (commentError || !commentData) {
        console.error('Error adding comment:', commentError);
        throw commentError || new Error('Failed to add comment');
      }
      
      console.log('Comment added successfully:', commentData);
      
      // Get the user's profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .eq('id', user.id)
        .single();
      
      // Create the comment with profile data
      const commentWithProfile: AnnouncementCommentWithProfile = {
        ...commentData,
        profiles: profileData ? {
          name: profileData.name,
          avatar_url: profileData.avatar_url
        } : null
      };
      
      console.log('Returning comment with profile:', commentWithProfile);
      return commentWithProfile;
    },
    onSuccess: (newComment) => {
      console.log('Comment added successfully, updating UI');
      setCommentText('');
      
      // Update the query data with the new comment
      queryClient.setQueryData<AnnouncementCommentWithProfile[]>(
        ['announcementComments', announcementId],
        (oldData = []) => [...(oldData || []), newComment]
      );
      
      // Also invalidate the query to ensure we have the latest data
      queryClient.invalidateQueries({ 
        queryKey: ['announcementComments', announcementId],
        refetchType: 'active',
      });
      
      toast({
        title: 'Success',
        description: 'Comment added successfully',
        variant: 'default',
      });
    },
    onError: (error) => {
      console.error('Error in addComment mutation:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add comment. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Delete comment mutation
  const deleteComment = useMutation<string, Error, string>({
    mutationFn: async (commentId: string) => {
      console.log('Deleting comment:', commentId);
      
      const { error } = await supabase
        .from('announcement_comments')
        .delete()
        .eq('id', commentId);
      
      if (error) {
        console.error('Error deleting comment:', error);
        throw error;
      }
      
      console.log('Comment deleted successfully:', commentId);
      return commentId;
    },
    onSuccess: (deletedCommentId) => {
      console.log('Updating UI after comment deletion');
      
      // Optimistically update the UI by removing the deleted comment
      queryClient.setQueryData<AnnouncementCommentWithProfile[]>(
        ['announcementComments', announcementId],
        (oldData = []) => (oldData || []).filter(comment => comment.id !== deletedCommentId)
      );
      
      // Also invalidate the query to ensure we have the latest data
      queryClient.invalidateQueries({ 
        queryKey: ['announcementComments', announcementId],
        refetchType: 'active',
      });
      
      toast({
        title: 'Success',
        description: 'Comment deleted successfully',
        variant: 'default',
      });
    },
    onError: (error) => {
      console.error('Error in deleteComment mutation:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete comment. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addComment.mutate(commentText.trim());
  };

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return ''; // Handle invalid dates
    
    return formatDistanceToNow(date, { 
      addSuffix: true,
      locale: typeof document !== 'undefined' && document.documentElement?.lang === 'sq' ? sq : en,
    });
  };

  if (!isExpanded) {
    return (
      <div className="mt-4 pt-2 border-t border-gray-100">
      </div>
    );
  }
  
  if (isError) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center">
          {t('comments.loadError')}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => refetch()}
            className="ml-2 h-6 px-2 text-xs"
          >
            {t('common.retry')}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  
  if (comments.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        {t('comments.noComments', 'No comments yet. Be the first to comment!')}
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : isError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center">
            {t('comments.loadError')}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => refetch()}
              className="ml-2 h-6 px-2 text-xs"
            >
              {t('common.retry')}
            </Button>
          </AlertDescription>
        </Alert>
      ) : comments.length === 0 ? (
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
                        {formatDate(comment.created_at)}
                      </span>
                    </div>
                    {user?.id === comment.user_id && (
                      <button
                        onClick={() => {
                          if (window.confirm(t('comments.deleteConfirm', 'Are you sure you want to delete this comment?'))) {
                            deleteComment.mutate(comment.id);
                          }
                        }}
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
      
      <form onSubmit={handleSubmit} className="mt-4">
        <div className="flex gap-2">
          <Textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={t('comments.placeholder', 'Write a comment...')}
            className="flex-1 min-h-[80px]"
            disabled={addComment.isPending}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!commentText.trim() || addComment.isPending}
          >
            {addComment.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

// ... (rest of the code remains the same)
