import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, User, UserCog, UserPlus, Check, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';

type Application = {
  id: string;
  user_id: string;
  course_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'active';
  message?: string;
  created_at: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
  course: {
    id: string;
    title: string;
  };
};

type ApplicationType = 'admin' | 'instructor';

interface CourseApplicationsProps {
  courseId?: string; // If provided, only show applications for this course
}

export const CourseApplications = ({ courseId }: CourseApplicationsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<ApplicationType>('admin');
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({});

  const fetchApplications = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Always use 'admin_applications' as the table name
      let query = supabase
        .from('admin_applications')
        .select(`
          *,
          user:user_id (*),
          course:course_id (id, title)
        `);

      // If courseId is provided, filter by course
      if (courseId) {
        query = query.eq('course_id', courseId);
      } else {
        // Otherwise, only show applications for courses where user is the instructor
        const { data: instructorCourses } = await supabase
          .from('courses')
          .select('id')
          .eq('instructor_id', user.id);

        if (instructorCourses && instructorCourses.length > 0) {
          const courseIds = instructorCourses.map(c => c.id);
          query = query.in('course_id', courseIds);
        } else {
          setApplications([]);
          return;
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error(`Error fetching ${activeTab} applications:`, error);
      toast({
        title: 'Gabim',
        description: `Ndodhi një gabim gjatë ngarkimit të aplikimeve. Ju lutemi provoni përsëri më vonë.`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, activeTab, courseId, toast]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleStatusUpdate = async (applicationId: string, status: 'approved' | 'rejected' | 'active') => {
    if (!user) return;

    setIsUpdating(prev => ({ ...prev, [applicationId]: true }));
    
    try {
      // First, get the application to find the user_id and course_id
      const { data: application, error: fetchError } = await supabase
        .from('admin_applications')
        .select('*')
        .eq('id', applicationId)
        .single();

      if (fetchError) throw fetchError;
      if (!application) throw new Error('Application not found');

      // Ensure the status is one of the allowed values
      type ValidStatus = 'pending' | 'approved' | 'rejected';
      const validStatuses: ValidStatus[] = ['pending', 'approved', 'rejected'];
      
      if (!validStatuses.includes(status as ValidStatus)) {
        throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
      }

      const targetStatus = status as ValidStatus;

      // Update the course_admins table with the application status
      const { error } = await supabase
        .from('course_admins')
        .upsert({
          user_id: application.user_id,
          course_id: application.course_id,
          status: targetStatus,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,course_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // Update the admin_applications status
      const { error: updateError } = await supabase
        .from('admin_applications')
        .update({ status })
        .eq('id', applicationId);

      if (updateError) throw updateError;

      // Update the local state to reflect the change
      setApplications(prevApplications => 
        prevApplications.map(app => 
          app.id === applicationId ? { ...app, status } : app
        )
      );

      toast({
        title: 'Sukses!',
        description: `Aplikimi u ${status === 'approved' ? 'miratua' : 'refuzua'} me sukses.`,
      });
    } catch (error) {
      console.error('Error updating application status:', error);
      toast({
        title: 'Gabim',
        description: 'Ndodhi një gabim gjatë përditësimit të statusit. Ju lutemi provoni përsëri më vonë.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(prev => ({ ...prev, [applicationId]: false }));
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClass = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    
    switch (status) {
      case 'pending':
        return (
          <span className={`${baseClass} bg-yellow-100 text-yellow-800`}>
            <Clock className="h-3 w-3 mr-1" />
            Në Pritje
          </span>
        );
      case 'approved':
        return (
          <span className={`${baseClass} bg-green-100 text-green-800`}>
            <Check className="h-3 w-3 mr-1" />
            Aprovuar
          </span>
        );
      case 'rejected':
        return (
          <span className={`${baseClass} bg-red-100 text-red-800`}>
            <X className="h-3 w-3 mr-1" />
            Refuzuar
          </span>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  const pendingApplications = applications.filter(app => app.status === 'pending');
  const processedApplications = applications.filter(app => app.status !== 'pending');

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ApplicationType)}>
        <TabsList>
          <TabsTrigger value="admin">
            <UserCog className="h-4 w-4 mr-2" />
            Aplikimet e Administratorëve
          </TabsTrigger>
          <TabsTrigger value="instructor">
            <UserPlus className="h-4 w-4 mr-2" />
            Aplikimet e Instruktorëve
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6">
          {/* Pending Applications */}
          <div>
            <h3 className="text-lg font-medium mb-4">Aplikime në Pritje</h3>
            {pendingApplications.length > 0 ? (
              <div className="space-y-4">
                {pendingApplications.map((app) => (
                  <Card key={app.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">
                            {app.user?.name || 'Përdorues i panjohur'}
                          </CardTitle>
                          <p className="text-sm text-gray-500">
                            {app.user?.email || 'Email i panjohur'}
                          </p>
                        </div>
                        {getStatusBadge(app.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Kursi:</span> {app.course?.title || 'Kurs i panjohur'}
                        </p>
                        {app.message && (
                          <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-3 rounded">
                            {app.message}
                          </p>
                        )}
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusUpdate(app.id, 'rejected')}
                          disabled={isUpdating[app.id]}
                        >
                          {isUpdating[app.id] ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <X className="h-4 w-4 mr-2" />
                          )}
                          Refuzo
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleStatusUpdate(app.id, 'approved')}
                          disabled={isUpdating[app.id]}
                        >
                          {isUpdating[app.id] ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Check className="h-4 w-4 mr-2" />
                          )}
                          Aprovo
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed">
                <User className="h-12 w-12 mx-auto text-gray-400" />
                <h4 className="mt-2 text-sm font-medium text-gray-900">Nuk ka aplikime të reja</h4>
                <p className="mt-1 text-sm text-gray-500">Nuk ka asnjë aplikim në pritje për t'u shfaqur.</p>
              </div>
            )}
          </div>

          {/* Processed Applications */}
          {processedApplications.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-4">Aplikime të Përpunuara</h3>
              <div className="space-y-4">
                {processedApplications.map((app) => (
                  <Card key={app.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">
                            {app.user?.name || 'Përdorues i panjohur'}
                          </CardTitle>
                          <p className="text-sm text-gray-500">
                            {app.user?.email || 'Email i panjohur'}
                          </p>
                        </div>
                        {getStatusBadge(app.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Kursi:</span> {app.course?.title || 'Kurs i panjohur'}
                      </p>
                      {app.message && (
                        <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-3 rounded">
                          {app.message}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CourseApplications;
