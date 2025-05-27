import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Check, 
  X, 
  MoreVertical, 
  Loader2,
  AlertCircle,
  Clock
} from 'lucide-react';
import { useUpdateApplicationStatus } from '@/hooks/useApplicationSubmit';
import { ApplicationView } from '@/types/applications';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';

interface ApplicationActionsProps {
  application: ApplicationView;
  onStatusChange: () => void;
}

export const ApplicationActions = ({ application, onStatusChange }: ApplicationActionsProps) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  
  const updateStatus = useUpdateApplicationStatus(
    application.application_type as 'admin' | 'instructor',
    application.id
  );

  const handleAction = async (newStatus: 'approved' | 'rejected') => {
    try {
      await updateStatus.mutateAsync({
        status: newStatus,
        ...(newStatus === 'rejected' && rejectionReason && { reason: rejectionReason })
      });
      onStatusChange();
    } catch (error) {
      console.error('Error updating application status:', error);
    } finally {
      setIsConfirmDialogOpen(false);
      setRejectionReason('');
      setIsDropdownOpen(false);
    }
  };

  const openConfirmDialog = (actionType: 'approve' | 'reject') => {
    setAction(actionType);
    setIsConfirmDialogOpen(true);
  };

  // Don't show actions if application is not pending
  if (application.status !== 'pending') {
    return (
      <div className="flex items-center">
        {getStatusIcon(application.status)}
      </div>
    );
  }

  return (
    <>
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem 
            onClick={() => openConfirmDialog('approve')}
            className="text-green-600 hover:bg-green-50"
          >
            <Check className="mr-2 h-4 w-4" />
            Aprovo
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => openConfirmDialog('reject')}
            className="text-red-600 hover:bg-red-50"
          >
            <X className="mr-2 h-4 w-4" />
            Refuzo
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {action === 'approve' 
                ? 'A jeni i sigurt që dëshironi ta aprovoni këtë aplikim?'
                : 'A jeni i sigurt që dëshironi ta refuzoni këtë aplikim?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {action === 'approve' ? (
                'Pasi ta aprovoni, përdoruesi do të ketë të drejta shtesë në këtë kurs.'
              ) : (
                <div className="space-y-4">
                  <p>Ju lutemi shkruani arsyen e refuzimit (opsionale):</p>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Arsyeja e refuzimit..."
                    rows={3}
                  />
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulo</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleAction(action === 'approve' ? 'approved' : 'rejected');
              }}
              className={action === 'reject' ? 'bg-red-600 hover:bg-red-700' : ''}
              disabled={updateStatus.isLoading}
            >
              {updateStatus.isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : action === 'approve' ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <X className="mr-2 h-4 w-4" />
              )}
              {action === 'approve' ? 'Aprovo' : 'Refuzo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

function getStatusIcon(status: string) {
  switch (status) {
    case 'approved':
      return <Check className="h-4 w-4 text-green-500" />;
    case 'rejected':
      return <X className="h-4 w-4 text-red-500" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-400" />;
  }
}
