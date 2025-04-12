import { useState, useEffect } from 'react';
import { useAuth } from "../../context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import type { Database } from "@/integrations/supabase/types";

// Define a type for the profile data (if not already in global types)
interface UserProfile {
  id: string;
  // Remove bio
  // bio?: string | null;
}

// Define type for mutation variables
interface UpdateProfilePayload {
  name: string;
  // Remove bio
  // bio: string;
}

export const DashboardSettings = () => {
  const { user } = useAuth(); 
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  // Remove bio state
  // const [bio, setBio] = useState('');

  // Fetch profile data
  const { 
    data: profileData, 
    isLoading: isLoadingProfile, // Use query loading state
    isError: isProfileError,    // Use query error state
    error: profileError         // Use query error object
  } = useQuery<UserProfile | null, Error>({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        // Remove bio from select
        .select('id')
        .eq('id', user.id)
        .single();
      if (error && error.code !== 'PGRST116') {
         console.error("Error fetching profile:", error);
         throw new Error("Failed to fetch profile data.");
      }
      return data;
    },
    enabled: !!user?.id,
  });

  // Effect to set initial form state 
  useEffect(() => {
    if (user) {
      setName(user.user_metadata?.full_name || user.name || '');
    }
    // Remove bio logic
    // if (profileData) {
    //   setBio(profileData.bio || '');
    // }
    // No need to log error here, isProfileError state handles UI
  }, [user, profileData]); // Removed error/toast dependencies

  // --- Mutation for updating profile --- 
  // Update mutation type
  const mutation = useMutation<void, Error, { name: string }>({
    mutationFn: async (payload) => {
      if (!user?.id) throw new Error("User not authenticated");

      // 1. Update Auth user metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: payload.name } 
      });
      if (authError) throw authError;

      // 2. Upsert profile data
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .upsert({ 
            id: user.id,
            // Remove bio from upsert
            // bio: payload.bio,
            role: user.role, // Preserve role
            name: payload.name // Add name update here
        }, { 
           onConflict: 'id' 
        });
      if (profileUpdateError) throw profileUpdateError;
    },
    // Options object
    onSuccess: () => {
      toast({ title: "Success", description: "Profile updated successfully." });
      queryClient.invalidateQueries({ queryKey: ['userProfile', user?.id] });
      // Consider manually updating user context if needed
      // e.g., queryClient.invalidateQueries({ queryKey: ['user'] }) if you have such a query
    },
    onError: (error) => {
      console.error("Profile update failed:", error);
      toast({ 
          title: "Update Failed", 
          description: error.message || "Could not update profile.", 
          variant: "destructive" 
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Remove bio from check
    if (!name.trim()) {
        toast({ description: "No changes to save.", variant: "default" });
        return;
    }
    // Remove bio from payload
    mutation.mutate({ name: name.trim() });
  };

  // Display loading indicator while fetching initial profile
  if (isLoadingProfile) {
     return (
        <div className="flex justify-center items-center py-10">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading Settings...
        </div>
     );
  }

  return (
    <div>
      <h3 className="text-2xl font-playfair mb-6 pb-3 border-b border-lightGray">
        Cilësimet e Llogarisë
      </h3>
      
      <div className="bg-white p-6 rounded-lg border border-lightGray shadow-sm mb-6">
        <h4 className="text-xl font-playfair font-bold mb-4">
          Informacioni i Profilit
        </h4>
        
        {/* Display error message if profile fetch failed */}
        {isProfileError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
             <p className="font-semibold">Error Loading Profile</p>
             <p>{profileError?.message || "Could not load profile bio details."}</p>
             <button 
               className="mt-2 text-sm text-blue-600 hover:underline"
               onClick={() => queryClient.refetchQueries({ queryKey: ['userProfile', user?.id] })}
             >
               Retry
             </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="inst-name" className="block mb-2 font-semibold text-brown">
              Emri i Plotë:
            </label>
            <input 
              type="text" 
              id="inst-name" 
              className="w-full px-4 py-3 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown"
              value={name} 
              onChange={(e) => setName(e.target.value)}
              required
              disabled={mutation.isPending} // Use isPending for mutation loading state
            />
          </div>
          
          {/* Remove Bio Field */}
          {/* <div className="mb-6">
            <label htmlFor="inst-bio" className="block mb-2 font-semibold text-brown">
              Bio e Shkurtër:
            </label>
            <textarea 
              id="inst-bio" 
              className="w-full px-4 py-3 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown min-h-[100px]"
              value={bio} 
              onChange={(e) => setBio(e.target.value)}
              placeholder="Trego pak për veten..."
              disabled={mutation.isPending}
            />
          </div> */}
          
          <button 
            type="submit" 
            className="btn btn-primary flex items-center"
            // Remove bio from disabled check
            disabled={mutation.isPending || !name.trim()}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
            Ruaj Ndryshimet
          </button>
        </form>
      </div>
      
      <div className="bg-white p-6 rounded-lg border border-lightGray shadow-sm">
        <h4 className="text-xl font-playfair font-bold mb-4">
          Cilësimet e Njoftimeve
        </h4>
        
        <p>
          Menaxho preferencat e email-it dhe njoftimeve të platformës.
        </p>
        
        <div className="mt-4 space-y-3">
          <div className="flex items-center">
            <input 
              type="checkbox" 
              id="notification-student-joined" 
              className="mr-2 h-4 w-4" 
              defaultChecked 
            />
            <label htmlFor="notification-student-joined">
              Merr njoftim kur një student regjistrohet në kurset tuaja
            </label>
          </div>
          
          <div className="flex items-center">
            <input 
              type="checkbox" 
              id="notification-new-comment" 
              className="mr-2 h-4 w-4" 
              defaultChecked 
            />
            <label htmlFor="notification-new-comment">
              Merr njoftim për komente të reja në kurset tuaja
            </label>
          </div>
          
          <div className="flex items-center">
            <input 
              type="checkbox" 
              id="notification-platform-updates" 
              className="mr-2 h-4 w-4" 
              defaultChecked 
            />
            <label htmlFor="notification-platform-updates">
              Merr njoftim për përditësime të platformës
            </label>
          </div>
        </div>
        
        <div className="mt-6">
          <button className="btn btn-primary">
            Ruaj Preferencat
          </button>
        </div>
      </div>
    </div>
  );
};
