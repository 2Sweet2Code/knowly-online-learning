import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { ApplicationView, ApplicationStatus } from '@/types/applications';

interface UseApplicationsOptions {
  courseId?: string;
  status?: ApplicationStatus | ApplicationStatus[];
  type?: 'admin' | 'instructor';
  pageSize?: number;
}

export const useApplications = ({
  courseId,
  status,
  type,
  pageSize = 10,
}: UseApplicationsOptions = {}) => {
  const { user } = useAuth();

  // Helper function to build the query
  const buildQuery = (from: number, to: number) => {
    let query = supabase
      .from('course_applications_view')
      .select('*', { count: 'exact' })
      .range(from, to);

    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    if (status) {
      if (Array.isArray(status)) {
        query = query.in('status', status);
      } else {
        query = query.eq('status', status);
      }
    }

    if (type) {
      query = query.eq('application_type', type);
    }

    // If user is not an admin, only show their own applications or applications for their courses
    if (user?.user_metadata?.role !== 'admin') {
      query = query.or(
        `user_id.eq.${user?.id},course_id.in.(${
          user?.coursesAsInstructor?.map((c: { id: string }) => `'${c.id}'`).join(',') || ''
        })`
      );
    }

    return query.order('created_at', { ascending: false });
  };

  // Single page query
  const query = useQuery(
    ['applications', { courseId, status, type, userId: user?.id }],
    async () => {
      const { data, error, count } = await buildQuery(0, pageSize - 1);
      if (error) throw error;
      return { data, count };
    },
    {
      enabled: !!user,
      keepPreviousData: true,
    }
  );

  // Infinite query for pagination
  const infiniteQuery = useInfiniteQuery(
    ['applications-infinite', { courseId, status, type, userId: user?.id }],
    async ({ pageParam = 0 }) => {
      const from = pageParam * pageSize;
      const to = from + pageSize - 1;
      
      const { data, error, count } = await buildQuery(from, to);
      if (error) throw error;
      
      return {
        data: data || [],
        nextPage: (data?.length || 0) >= pageSize ? pageParam + 1 : undefined,
        count,
      };
    },
    {
      enabled: !!user,
      getNextPageParam: (lastPage) => lastPage.nextPage,
      keepPreviousData: true,
    }
  );

  return {
    query,
    infiniteQuery,
    applications: query.data?.data || [],
    count: query.data?.count || 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};

// Hook to get a single application
export const useApplication = (id: string, type: 'admin' | 'instructor') => {
  const { user } = useAuth();
  const tableName = `${type}_applications`;

  return useQuery(
    ['application', id, type],
    async () => {
      const { data, error } = await supabase
        .from(tableName)
        .select('*, user:user_id(*), course:course_id(*)')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      // Check if user has permission to view this application
      const canView = 
        user?.id === data.user_id ||
        user?.coursesAsInstructor?.some((c: { id: string }) => c.id === data.course_id) ||
        user?.user_metadata?.role === 'admin';
      
      if (!canView) {
        throw new Error('Nuk keni leje për të parë këtë aplikim');
      }

      return data;
    },
    {
      enabled: !!user && !!id,
    }
  );
};
