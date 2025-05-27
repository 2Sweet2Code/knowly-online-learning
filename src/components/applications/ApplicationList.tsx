import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { sq } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { ApplicationActions } from './ApplicationActions';
import { ApplicationView } from '@/types/applications';
import { cn } from '@/lib/utils';

interface ApplicationListProps {
  applications: ApplicationView[];
  showActions?: boolean;
  className?: string;
  itemClassName?: string;
  limit?: number;
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  courseId?: string;
  type?: 'admin' | 'instructor';
  status?: 'pending' | 'approved' | 'rejected';
  onStatusChange?: () => void;
}

export const ApplicationList = ({
  applications = [],
  showActions = true,
  className,
  itemClassName,
  limit,
  isLoading = false,
  isError = false,
  error = null,
  courseId,
  type,
  status = 'pending',
  onStatusChange = () => {},
}: ApplicationListProps) => {
  const loading = isLoading;
  const errorState = isError;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">Në Pritje</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">Aprovuar</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200">Refuzuar</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: limit || 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (errorState || error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">
          Ndodhi një gabim gjatë ngarkimit të aplikimeve: {error?.message}
        </p>
      </div>
    );
  }

  const displayedApplications = limit 
    ? applications.slice(0, limit) 
    : applications;

  if (displayedApplications.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Nuk ka aplikime për t'u shfaqur.</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {displayedApplications.map((app) => (
        <div key={app.id} className={cn('border rounded-lg p-4 hover:shadow-md transition-shadow', itemClassName)}>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center space-x-2">
                <Link 
                  to={`/users/${app.user_id}`}
                  className="font-medium hover:underline"
                >
                  {app.user_name}
                </Link>
                <span className="text-muted-foreground">•</span>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(app.created_at), 'PP', { locale: sq })}
                </span>
                {getStatusBadge(app.status)}
              </div>
              
              {app.reason && (
                <div className="mt-2 text-sm text-muted-foreground">
                  <p><strong>Arsyeja:</strong> {app.reason}</p>
                </div>
              )}
              
              {app.message && (
                <div className="mt-2 text-sm">
                  <p>{app.message}</p>
                </div>
              )}
            </div>
            
            {showActions && application.status === 'pending' && (
              <div className="flex-shrink-0">
                <ApplicationActions 
                  application={app} 
                  onStatusChange={onStatusChange} 
                />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
