import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ApplicationList } from '@/components/applications/ApplicationList';
import { ApplicationStatus } from '@/types/applications';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Search, Filter } from 'lucide-react';

export default function ManageApplicationsPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'admin' | 'instructor'>('all');
  const [activeTab, setActiveTab] = useState('all');

  // Fetch courses where the user is an instructor
  const { data: instructorCourses, isLoading: isLoadingCourses } = useQuery(
    ['instructor-courses', user?.id],
    async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('courses')
        .select('id, title')
        .eq('instructor_id', user.id);
      
      if (error) throw error;
      return data || [];
    },
    { enabled: !!user }
  );

  // Fetch applications
  const { data: applications, isLoading, isError, error } = useQuery(
    ['applications', statusFilter, typeFilter, searchQuery, activeTab],
    async () => {
      let query = supabase
        .from('course_applications_view')
        .select('*');
      
      // Apply filters
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      if (typeFilter !== 'all') {
        query = query.eq('application_type', typeFilter);
      }
      
      if (searchQuery) {
        query = query.or(
          `user_name.ilike.%${searchQuery}%,course_title.ilike.%${searchQuery}%`
        );
      }
      
      // If user is an instructor, only show applications for their courses
      if (user?.user_metadata?.role === 'instructor' && instructorCourses?.length) {
        const courseIds = instructorCourses.map((c: { id: string }) => c.id);
        query = query.in('course_id', courseIds);
      } else if (activeTab === 'my-applications') {
        // Show only the current user's applications
        query = query.eq('user_id', user?.id);
      }
      
      const { data, error: queryError } = await query.order('created_at', { ascending: false });
      
      if (queryError) throw queryError;
      return data || [];
    },
    { 
      enabled: !!user,
      keepPreviousData: true 
    }
  );

  // Get counts for each status
  const pendingCount = applications?.filter((a: any) => a.status === 'pending').length || 0;
  const approvedCount = applications?.filter((a: any) => a.status === 'approved').length || 0;
  const rejectedCount = applications?.filter((a: any) => a.status === 'rejected').length || 0;

  if (isLoadingCourses) {
    return (
      <div className="container mx-auto py-8">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // If user is not an instructor and has no admin role, show unauthorized
  if ((!instructorCourses?.length && user?.user_metadata?.role !== 'admin') && activeTab !== 'my-applications') {
    return (
      <div className="container mx-auto py-12 text-center">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Nuk keni akses për të parë aplikimet e kursit. Duhet të jeni instruktor i një kursi ose administrator.
              </p>
            </div>
          </div>
        </div>
        
        <div className="mt-8">
          <Button onClick={() => setActiveTab('my-applications')} variant="outline">
            Shiko aplikimet e mia
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Menaxho Aplikimet</h1>
        
        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Kërko sipas emrit ose kursit..."
              className="pl-10 w-full sm:w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Lloji i aplikimit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Të gjitha llojet</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
                <SelectItem value="instructor">Instruktor</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="w-[150px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Statusi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Të gjitha</SelectItem>
                <SelectItem value="pending">Në Pritje ({pendingCount})</SelectItem>
                <SelectItem value="approved">Aprovuar ({approvedCount})</SelectItem>
                <SelectItem value="rejected">Refuzuar ({rejectedCount})</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="all">Të gjitha</TabsTrigger>
          <TabsTrigger value="pending">Në Pritje ({pendingCount})</TabsTrigger>
          <TabsTrigger value="my-applications">Aplikimet e mia</TabsTrigger>
          <TabsTrigger value="settings">Cilësimet</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          {isError ? (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Ndodhi një gabim gjatë ngarkimit të aplikimeve
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error?.message || 'Ju lutemi provoni përsëri më vonë.'}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <ApplicationList 
              applications={applications || []} 
              showActions={activeTab !== 'my-applications'}
            />
          )}
        </TabsContent>
        
        <TabsContent value="pending">
          <ApplicationList 
            applications={applications?.filter((a: any) => a.status === 'pending') || []} 
            showActions={true}
          />
        </TabsContent>
        
        <TabsContent value="my-applications">
          <ApplicationList 
            applications={applications?.filter((a: any) => a.user_id === user?.id) || []} 
            showActions={false}
          />
        </TabsContent>
        
        <TabsContent value="settings">
          <div className="rounded-md bg-blue-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Cilësimet e Aplikimeve
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>Këtu mund të konfiguroni cilësimet për aplikimet e kursit.</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
