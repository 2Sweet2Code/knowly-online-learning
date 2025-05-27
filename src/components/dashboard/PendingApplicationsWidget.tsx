import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useApplications } from '@/hooks/useApplications';
import { ApplicationList } from '../applications/ApplicationList';
import { Skeleton } from '../ui/skeleton';
import { AlertCircle } from 'lucide-react';

export const PendingApplicationsWidget = () => {
  const { applications, isLoading, isError } = useApplications({
    status: 'pending',
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Aplikimet në Pritje</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-red-500">
            <AlertCircle className="mr-2 h-5 w-5" />
            <span>Ndodhi një gabim gjatë ngarkimit të aplikimeve</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Only show the widget if there are pending applications
  if (applications.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex justify-between items-center">
          <span>Aplikimet në Pritje</span>
          <span className="text-sm font-normal text-muted-foreground">
            {applications.length} {applications.length === 1 ? 'aplikim' : 'aplikime'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ApplicationList 
          applications={applications.slice(0, 3)} 
          showActions={true}
          className="space-y-3"
          itemClassName="p-3 border rounded-lg hover:shadow-sm transition-shadow"
        />
        {applications.length > 3 && (
          <div className="mt-3 text-center">
            <a 
              href="/dashboard/applications" 
              className="text-sm font-medium text-primary hover:underline"
            >
              Shiko të gjitha aplikimet
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
