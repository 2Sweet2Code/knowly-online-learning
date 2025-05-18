import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertCircle, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { enUS as en, sq } from 'date-fns/locale';

type Profile = {
  name: string;
  avatar_url: string | null;
};

type AnnouncementComment = {
  id: string;
  announcement_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string | null;
  profiles: Profile | null;
};

type AnnouncementWithComments = {
  id: string;
  title: string;
  content: string;
  course_id: string;
  instructor_id: string;
  created_at: string;
  updated_at: string | null;
  profiles: Profile | null;
  courses: {
    id: string;
    title: string;
  } | null;
  comments: AnnouncementComment[];
};

export const DashboardQuestions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState('');
  const [expandedAnnouncements, setExpandedAnnouncements] = useState<Set<string>>(new Set());

  // Fetch announcements with comments
  const { 
    data: announcements = [], 
    isLoading, 
    isError, 
    error, 
    refetch 
  } = useQuery<AnnouncementWithComments[]>({
    queryKey: ['instructorAnnouncementsWithComments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Fetch announcements
      const { data: announcementsData, error: announcementsError } = await supabase
        .from('announcements')
        .select(`
          *,
          profiles (name, avatar_url),
          courses (id, title)
        `)
        .order('created_at', { ascending: false });
      
      if (announcementsError) throw announcementsError;
      if (!announcementsData) return [];
      
      // Fetch comments for each announcement
      const announcementsWithComments = await Promise.all(
        announcementsData.map(async (announcement) => {
          const { data: commentsData, error: commentsError } = await supabase
            .from('announcement_comments')
            .select(`
              *,
              profiles (name, avatar_url)
            `)
            .eq('announcement_id', announcement.id)
            .order('created_at', { ascending: true });
          
          if (commentsError) throw commentsError;
          
          return {
            ...announcement,
            comments: commentsData?.map(comment => ({
              ...comment,
              profiles: comment.profiles as Profile | null
            })) || []
          };
        })
      );
      
      return announcementsWithComments;
    },
    enabled: !!user?.id,
    retry: 1,
    retryDelay: 1000
  });

  // Toggle expanded state for an announcement
  const toggleAnnouncement = (id: string) => {
    setExpandedAnnouncements(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Add a new comment
  const addComment = useMutation({
    mutationFn: async ({ announcementId, content }: { announcementId: string, content: string }) => {
      if (!user?.id) throw new Error('Duhet të jeni i kyqur për të shtuar koment');
      
      const { data, error } = await supabase
        .from('announcement_comments')
        .insert([
          {
            announcement_id: announcementId,
            user_id: user.id,
            content: content.trim()
          }
        ])
        .select('*, profiles (name, avatar_url)')
        .single();
        
      if (error) throw error;
      return data as AnnouncementComment;
    },
    onSuccess: (data, { announcementId }) => {
      // Update the cache to include the new comment
      queryClient.setQueryData<AnnouncementWithComments[]>(['instructorAnnouncementsWithComments', user?.id], (old) => {
        if (!old) return [];
        return old.map(announcement => {
          if (announcement.id === announcementId) {
            return {
              ...announcement,
              comments: [
                ...announcement.comments,
                {
                  ...data,
                  profiles: data.profiles as Profile | null
                }
              ]
            };
          }
          return announcement;
        });
      });
      
      setCommentText('');
      toast({
        title: 'Sukses!',
        description: 'Komenti u shtua me sukses.',
        variant: 'default',
      });
    },
    onError: (error) => {
      console.error('Error adding comment:', error);
      toast({
        title: 'Gabim',
        description: 'Ndodhi një gabim gjatë shtimit të komentit. Ju lutem provoni përsëri.',
        variant: 'destructive',
      });
    },
  });

  // Handle comment submission
  const handleSubmitComment = (announcementId: string) => {
    if (!commentText.trim()) return;
    
    addComment.mutate({
      announcementId,
      content: commentText
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-brown" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          <strong className="font-bold">Gabim! </strong>
          <span className="block sm:inline">Ndodhi një gabim gjatë ngarkimit të njoftimeve.</span>
        </div>
        <button
          onClick={() => refetch()}
          className="mt-2 px-4 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
        >
          Provoni përsëri
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-playfair font-bold">Njoftimet dhe Komentet</h3>
      </div>

      {announcements.length === 0 ? (
        <div className="text-center py-12">
          <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Nuk ka njoftime akoma</h3>
          <p className="mt-1 text-sm text-gray-500">Njoftimet dhe komentet do të shfaqen këtu.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {announcements.map((announcement) => {
            const isExpanded = expandedAnnouncements.has(announcement.id);
            const locale = document.documentElement.lang === 'sq' ? sq : en;
            const timeAgo = formatDistanceToNow(new Date(announcement.created_at), {
              addSuffix: true,
              locale,
            });

            return (
              <div key={announcement.id} className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {announcement.title}
                        </h3>
                        <span className="text-sm text-gray-500">•</span>
                        <Link
                          to={`/courses/${announcement.courses?.id}`}
                          className="text-sm text-brown hover:underline"
                        >
                          {announcement.courses?.title || 'Kurs i panjohur'}
                        </Link>
                      </div>

                      <div className="mt-1 text-sm text-gray-500">
                        Postuar nga {announcement.profiles?.name || 'Përdorues i panjohur'} • {timeAgo}
                      </div>

                      <p className="mt-2 text-gray-700 whitespace-pre-line">
                        {announcement.content}
                      </p>

                      <div className="mt-3 flex items-center text-sm text-gray-500">
                        <MessageCircle className="h-4 w-4 mr-1" />
                        <span>{announcement.comments.length} {announcement.comments.length === 1 ? 'koment' : 'komente'}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleAnnouncement(announcement.id)}
                      className="ml-4 text-brown hover:text-brown/80 transition-colors"
                      aria-label={isExpanded ? 'Mbyll komentet' : 'Shfaq komentet'}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </button>
                  </div>

                  {/* Comments section */}
                  {isExpanded && (
                    <div className="mt-4 border-t border-gray-100 pt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Komentet</h4>

                      {/* Comments list */}
                      <div className="space-y-4 mb-4">
                        {announcement.comments.length === 0 ? (
                          <p className="text-sm text-gray-500 italic">Asnjë koment akoma. Bëhu i pari që komenton!</p>
                        ) : (
                          announcement.comments.map((comment) => (
                            <div key={comment.id} className="flex gap-3">
                              <div className="flex-shrink-0">
                                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                                  {comment.profiles?.name?.charAt(0) || '?'}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <div className="flex justify-between">
                                    <span className="text-sm font-medium text-gray-900">
                                      {comment.profiles?.name || 'Përdorues i panjohur'}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {formatDistanceToNow(new Date(comment.created_at), {
                                        addSuffix: true,
                                        locale,
                                      })}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">
                                    {comment.content}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Add comment form */}
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex gap-3">
                          <div className="flex-shrink-0">
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                              {announcement.profiles?.name?.charAt(0) || 'J'}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex rounded-md shadow-sm">
                              <input
                                type="text"
                                className="focus:ring-brown focus:border-brown block w-full rounded-l-md sm:text-sm border-gray-300"
                                placeholder="Shto një koment..."
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && commentText.trim()) {
                                    handleSubmitComment(announcement.id);
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleSubmitComment(announcement.id)}
                                disabled={!commentText.trim() || addComment.isPending}
                                className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-brown focus:border-brown"
                              >
                                {addComment.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <span>Dërgo</span>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DashboardQuestions;
