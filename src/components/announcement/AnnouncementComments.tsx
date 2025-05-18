import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { enUS as en, sq } from 'date-fns/locale';
import { Loader2, MessageSquare, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import type { AnnouncementComment } from '@/types/database.types';

// Using the AnnouncementComment type from database.types

interface AnnouncementCommentsProps {
  announcementId: string;
}

export const AnnouncementComments = ({ announcementId }: AnnouncementCommentsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch comments for this announcement
  const { data: comments = [], isLoading, isError, refetch } = useQuery<AnnouncementComment[]>({
    queryKey: ['announcementComments', announcementId],
    queryFn: async () => {
      console.log('Fetching comments for announcement:', announcementId);
      
      // First, get the comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('announcement_comments')
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
      const combinedComments = commentsData.map(comment => ({
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
  const addComment = useMutation({
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
        } as { content: string; announcement_id: string; user_id: string })
        .select()
        .single();
      
      if (commentError) {
        console.error('Error adding comment:', commentError);
        throw commentError;
      }
      
      console.log('Comment added successfully:', commentData);
      
      // Get the user's profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        // Return comment without profile data if we can't fetch it
        return {
          ...commentData,
          profiles: null
        } as AnnouncementComment;
      }
      
      // Return comment with profile data
      const commentWithProfile = {
        ...commentData,
        profiles: {
          name: profileData.name,
          avatar_url: profileData.avatar_url
        }
      } as AnnouncementComment;
      
      console.log('Returning comment with profile:', commentWithProfile);
      return commentWithProfile;
    },
    onSuccess: (newComment) => {
      console.log('Comment added successfully, updating UI');
      setCommentText('');
      
      // Update the query data with the new comment
      queryClient.setQueryData<AnnouncementComment[]>(
        ['announcementComments', announcementId],
        (oldData = []) => [...oldData, newComment]
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
  const deleteComment = useMutation({
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
      queryClient.setQueryData<AnnouncementComment[]>(
        ['announcementComments', announcementId],
        (oldData = []) => oldData.filter(comment => comment.id !== deletedCommentId)
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

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { 
      addSuffix: true,
      locale: document.documentElement.lang === 'sq' ? sq : en,
    });
  };

  if (!isExpanded) {
    return (
      <div className="mt-4 pt-2 border-t border-gray-100">
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <MessageSquare className="h-4 w-4 mr-1" />
          {comments.length > 0 ? `View ${comments.length} ${comments.length === 1 ? 'comment' : 'comments'}` : 'Add a comment'}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium">Comments</h3>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Hide comments
        </button>
      </div>

      {/* Comment form */}
      {user && (
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage src={user.user_metadata?.avatar_url || ''} />
              <AvatarFallback>
                {user.user_metadata?.full_name?.[0]?.toUpperCase() || 
                 user.user_metadata?.name?.[0]?.toUpperCase() || 
                 user.name?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                rows={2}
                className="resize-none"
              />
              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  size="sm"
                  disabled={!commentText.trim() || addComment.isPending}
                >
                  {addComment.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Post Comment
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Comments list */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : isError ? (
          <div className="text-center py-4 text-sm text-red-500">
            Failed to load comments. Please try again.
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => refetch()}
              className="ml-2"
            >
              Retry
            </Button>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-4 text-sm text-gray-500">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 group">
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarImage src={comment.profiles?.avatar_url || ''} />
                <AvatarFallback>
                  {comment.profiles?.name?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-medium text-sm">
                        {comment.profiles?.name || 'User'}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        {formatDate(comment.created_at)}
                      </span>
                    </div>
                    {user?.id === comment.user_id && (
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this comment?')) {
                            deleteComment.mutate(comment.id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                        aria-label="Delete comment"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
