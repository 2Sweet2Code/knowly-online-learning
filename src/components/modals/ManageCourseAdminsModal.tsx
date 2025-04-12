import { useState } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Profile } from "@/types";

interface ManageCourseAdminsModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
}

interface AdminRequest {
  id: string;
  user_id: string;
  userName: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reason?: string | null;
}

interface UpdateAdminStatusPayload {
  adminId: string;
  newStatus: 'approved' | 'rejected';
}

type CourseAdminWithProfile = {
    id: string;
    user_id: string;
    status: string;
    created_at: string;
    reason: string | null;
    profiles: Pick<Profile, 'name'> | null;
};

export const ManageCourseAdminsModal = ({ isOpen, onClose, courseId }: ManageCourseAdminsModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { 
    data: adminRequests = [], 
    isLoading, 
    isError, 
    error 
  } = useQuery<AdminRequest[], Error>({
    queryKey: ['courseAdminRequests', courseId],
    queryFn: async () => {
      if (!courseId) return [];

      const { data, error: queryError } = await supabase
        .from('course_admins')
        .select(`
          id, 
          user_id, 
          status, 
          created_at, 
          reason,
          profiles ( name ) 
        `)
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (queryError) {
        console.error("Error fetching admin requests:", queryError);
        if (queryError.code === '42P01') { 
             console.warn("'course_admins' table not found.");
             toast({ title: "Warning", description: "Admin requests feature not fully set up (table missing).", variant: "default" });
             return [];
        } else {
            throw new Error("Failed to fetch admin requests.");
        }
      }

      if (!data) return [];

      const formattedData: AdminRequest[] = data.map((req: CourseAdminWithProfile) => ({
          id: req.id,
          user_id: req.user_id,
          userName: req.profiles?.name || 'Unknown User',
          status: req.status as 'pending' | 'approved' | 'rejected',
          created_at: req.created_at,
          reason: req.reason
      }));

      return formattedData;
    },
    enabled: isOpen && !!courseId, 
  });

  const updateStatusMutation = useMutation<void, Error, UpdateAdminStatusPayload>({ 
    mutationFn: async ({ adminId, newStatus }) => {
      const { error } = await supabase
        .from('course_admins')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', adminId);
        
      if (error) {
        console.error("Error updating admin status:", error);
        throw new Error("Failed to update admin status.");
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['courseAdminRequests', courseId] });
      toast({
        title: "Success!",
        description: `Request status updated to ${variables.newStatus}.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error!",
        description: error.message || "Could not update status.",
        variant: "destructive",
      });
    },
  });

  const handleUpdateAdminStatus = (adminId: string, newStatus: 'approved' | 'rejected') => {
      updateStatusMutation.mutate({ adminId, newStatus });
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex justify-center items-center bg-black bg-opacity-60"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-2xl rounded-lg shadow-lg p-8 relative animate-fade-in">
        <button 
          className="absolute top-4 right-4 text-gray-500 hover:text-brown"
          onClick={onClose}
          aria-label="Close Modal"
        >
          <X size={20} />
        </button>
        
        <h3 className="text-2xl font-playfair text-center mb-6">Menaxho Administratorët e Kursit</h3>
        
        {isLoading && (
          <div className="text-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-brown mx-auto mb-2" />
            <p className="mt-2 text-brown">Po ngarkohen kërkesat...</p>
          </div>
        )}

        {isError && (
           <div className="text-center py-10 bg-red-50 border border-red-200 rounded-lg p-6">
             <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
             <h4 className="text-lg font-semibold text-red-700 mb-2">Gabim në Ngarkim</h4>
             <p className="text-red-600 mb-4">
               {error?.message || "Ndodhi një gabim duke ngarkuar kërkesat."} 
             </p>
             <button 
               className="btn btn-secondary btn-sm"
               onClick={() => queryClient.refetchQueries({ queryKey: ['courseAdminRequests', courseId] })}
             >
               Provo Përsëri
             </button>
           </div>
        )}

        {!isLoading && !isError && (
          <>
            {adminRequests.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-cream">
                    <tr>
                      <th className="border border-lightGray p-3 text-left">Përdoruesi</th>
                      <th className="border border-lightGray p-3 text-left">Data e Kërkesës</th>
                      <th className="border border-lightGray p-3 text-left">Statusi</th>
                      <th className="border border-lightGray p-3 text-left">Veprime</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminRequests.map(request => (
                      <tr key={request.id}>
                        <td className="border border-lightGray p-3">{request.userName}</td>
                        <td className="border border-lightGray p-3">
                          {new Date(request.created_at).toLocaleDateString('sq-AL')}
                        </td>
                        <td className="border border-lightGray p-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            request.status === 'approved' 
                              ? 'bg-green-100 text-green-800' 
                              : request.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {request.status === 'approved' 
                              ? 'Aprovuar' 
                              : request.status === 'rejected'
                                ? 'Refuzuar'
                                : 'Në pritje'}
                          </span>
                        </td>
                        <td className="border border-lightGray p-3">
                          {request.status === 'pending' && (
                            <div className="flex space-x-2">
                              <button 
                                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50"
                                onClick={() => handleUpdateAdminStatus(request.id, 'approved')}
                                disabled={updateStatusMutation.isPending}
                              >
                                {updateStatusMutation.isPending && updateStatusMutation.variables?.adminId === request.id && updateStatusMutation.variables?.newStatus === 'approved' ? <Loader2 className="h-4 w-4 animate-spin"/> : "Aprovo"}
                              </button>
                              <button 
                                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50"
                                onClick={() => handleUpdateAdminStatus(request.id, 'rejected')}
                                disabled={updateStatusMutation.isPending}
                              >
                                {updateStatusMutation.isPending && updateStatusMutation.variables?.adminId === request.id && updateStatusMutation.variables?.newStatus === 'rejected' ? <Loader2 className="h-4 w-4 animate-spin"/> : "Refuzo"}
                              </button>
                            </div>
                          )}
                          {request.status !== 'pending' && (
                            <span className="text-gray-500">Vendimi u mor</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-gray-600 py-6">
                Nuk ka kërkesa për administratorë për këtë kurs.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};
