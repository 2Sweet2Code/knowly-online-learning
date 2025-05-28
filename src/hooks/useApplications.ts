import { 
  useQuery, 
  useInfiniteQuery, 
  UseQueryResult, 
  UseInfiniteQueryResult,
  QueryFunctionContext,
  InfiniteData,
  QueryKey
} from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { ApplicationStatus } from '@/types/applications';
import { Database } from '@/types/database.types';
import { User as AuthUser } from '@/types';

type User = AuthUser & {
  user_metadata?: {
    role?: string;
    [key: string]: string | number | boolean | null | undefined;
  };
  coursesAsInstructor?: Array<{ id: string }>;
};

type ApplicationView = Database['public']['Views']['course_applications_view']['Row'];

type QueryResponse = {
  data: ApplicationView[] | null;
  count: number | null;
  error: Error | null;
};

type InfiniteQueryResponse = {
  pages: Array<{
    data: ApplicationView[];
    nextPage?: number;
    count: number | null;
  }>;
  pageParams: (number | undefined)[];
};

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
  const { user } = useAuth() as unknown as { user: User | null };

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

    if (user?.user_metadata?.role !== 'admin') {
      query = query.or(
        `user_id.eq.${user?.id},course_id.in.(${
          user?.coursesAsInstructor?.map((c: { id: string }) => `'${c.id}'`).join(',') || ''
        })`
      );
    }

    return query.order('created_at', { ascending: false });
  };

  const query = useQuery<{ data: ApplicationView[] | null; count: number | null }, Error>({
    queryKey: ['applications', { courseId, status, type, userId: user?.id }] as const,
    queryFn: async () => {
      const { data, error, count } = await buildQuery(0, pageSize - 1);
      if (error) throw error;
      return { data, count };
    },
    enabled: !!user,
    placeholderData: (previousData) => previousData,
  });

  const infiniteQuery = useInfiniteQuery<{
    data: ApplicationView[];
    nextPage?: number;
    count: number | null;
  }, Error>({
    queryKey: ['applications-infinite', { courseId, status, type, userId: user?.id }] as const,
    queryFn: async ({ pageParam = 0 }) => {
      const from = Number(pageParam) * pageSize;
      const to = from + pageSize - 1;
      
      const { data, error, count } = await buildQuery(from, to);
      if (error) throw error;
      
      return {
        data: data || [],
        nextPage: (data?.length || 0) >= pageSize ? Number(pageParam) + 1 : undefined,
        count,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!user,
  });

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

export const useApplication = (id: string, type: 'admin' | 'instructor') => {
  const { user } = useAuth() as unknown as { user: User | null };
  const tableName = `${type}_applications`;

  interface ApplicationData {
    id: string;
    user_id: string;
    course_id: string;
    [key: string]: unknown;
  }

  return useQuery<ApplicationData, Error>({
    queryKey: ['application', id, type] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName)
        .select('*, user:user_id(*), course:course_id(*)')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      const canView = 
        user?.id === data.user_id ||
        user?.coursesAsInstructor?.some((c: { id: string }) => c.id === data.course_id) ||
        user?.user_metadata?.role === 'admin';
      
      if (!canView) {
        throw new Error('Nuk keni leje për të parë këtë aplikim');
      }

      return data as ApplicationData;
    },
    enabled: !!user && !!id,
  });
};
