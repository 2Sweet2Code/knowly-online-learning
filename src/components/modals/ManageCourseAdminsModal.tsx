import { useState } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Database } from "@/types/database.types";

type Profile = Database['public']['Tables']['profiles']['Row'];
type CourseAdmin = Database['public']['Tables']['course_admins']['Row'];

type ApiResponse = {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  reason: string | null;
  course_id: string;
  profiles: {
    id: string;
    name: string | null;
    role: string | null;
  }[]; // Note: profiles is an array, not a single object
};

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
  course_id: string;
}

interface UpdateAdminStatusPayload {
  adminId: string;
  newStatus: 'approved' | 'rejected';
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

      // First, get the course to check if the current user is the instructor
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('instructor_id')
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;
      if (!courseData) throw new Error('Course not found');

      // Then get the current user's role
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single();

      // Build the base query
      const query = supabase
        .from('course_admins')
        .select(`
          id, 
          user_id, 
          status, 
          created_at, 
          reason,
          course_id,
          profiles!inner(id, name, role)
        `)
        .eq('course_id', courseId);

      // If user is not an admin and not the course instructor, they shouldn't see anything
      if (profile?.role !== 'admin' && courseData.instructor_id !== user?.id) {
        return [];
      }

      // Execute the query
      const { data, error: queryError } = await query
        .order('created_at', { ascending: false });

      console.log('Admin applications data:', data); // Debug log

      if (queryError) {
        console.error("Error fetching admin requests:", queryError);
        if (queryError.code === '42P01') { 
          console.warn("'course_admins' table not found.");
          toast({ 
            title: "Warning", 
            description: "Admin requests feature not fully set up (table missing).", 
            variant: "default" 
          });
          return [];
        } else {
          throw new Error("Failed to fetch admin requests: " + queryError.message);
        }
      }

      if (!data) return [];

      // Map the data to the expected format
      const formattedData: AdminRequest[] = data.map((req) => {
        // Get the first profile if available
        const profile = Array.isArray(req.profiles) ? req.profiles[0] : null;
        
        // Ensure we have all required fields with proper fallbacks
        const status = (req.status || 'pending') as 'pending' | 'approved' | 'rejected';
        const userName = profile?.name || 'Unknown User';
        
        return {
          id: req.id,
          user_id: req.user_id,
          userName,
          status,
          created_at: req.created_at || new Date().toISOString(),
          reason: req.reason || null,
          course_id: req.course_id
        };
      });

      console.log('Formatted admin applications:', formattedData); // Debug log

      return formattedData;
    },
    enabled: isOpen && !!courseId, 
  });

  const updateStatusMutation = useMutation<void, Error, UpdateAdminStatusPayload>({ 
    mutationFn: async ({ adminId, newStatus }) => {
      // Ensure the status is one of the allowed values
      const validStatuses = ['pending', 'approved', 'rejected'] as const;
      if (!validStatuses.includes(newStatus)) {
        throw new Error(`Invalid status: ${newStatus}. Must be one of: ${validStatuses.join(', ')}`);
      }

      const { error } = await supabase
        .from('course_admins')
        .update({ 
          status: newStatus, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', adminId);
        
      if (error) {
        console.error("Error updating admin status:", error);
        throw new Error(`Failed to update admin status: ${error.message}`);
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
      console.error("Mutation error:", error);
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
