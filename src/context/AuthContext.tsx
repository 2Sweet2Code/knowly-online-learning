import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { supabase } from "@/integrations/supabase/client";
import { Session, AuthError } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import type { Database } from "@/integrations/supabase/types";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, role: 'student' | 'instructor') => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  const fetchAndSetUser = async (userId: string | undefined) => {
    if (!userId) {
      setUser(null);
      return;
    }
    
    // Explicitly type the profile variable
    let profile: Database['public']['Tables']['profiles']['Row'] | null = null;
    
    try {
      const { data: fetchedProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id, name, role, created_at, updated_at')
        .eq('id', userId)
        .single();

      const { data: authUserData } = await supabase.auth.getUser();

      if (fetchError && fetchError.code === 'PGRST116') {
        console.log('Profile not found for user, attempting creation...');
        const creationResult = await createUserProfile(userId); // Call creation

        if (creationResult) {
          console.log('Profile creation initiated/found existing, now refetching...');
          // Refetch the profile explicitly after creation/conflict resolution
          const { data: refetchedProfile, error: refetchError } = await supabase
            .from('profiles')
            .select('id, name, role, created_at, updated_at')
            .eq('id', userId)
            .single();

          if (refetchError) {
            console.error('Error refetching profile after creation attempt:', refetchError);
            profile = null;
          } else {
            // Remove type assertion
            profile = refetchedProfile;
            console.log('Profile successfully refetched:', profile);
          }
        } else {
          // Creation failed (and wasn't just a conflict)
          console.error("Profile creation failed, setting profile to null.");
          profile = null;
        }
      } else if (fetchError) {
        console.error('Error fetching user profile:', fetchError);
        setUser(null);
        return;
      } else {
        // Assign fetched data (already includes all selected fields)
        // Remove type assertion
        profile = fetchedProfile;
      }
      
      // --- Type Check before setting User State ---
      // Ensure profile is not null and has the necessary properties of the Row type
      if (profile && profile.id && profile.created_at && authUserData?.user) { // updated_at can be null
        // Extract potential metadata safely
        const meta = authUserData.user.user_metadata;
        const userMetadataForState = {
          name: meta?.name as string | undefined, // Explicitly cast or ensure it's string/undefined
          role: (meta?.role === 'student' || meta?.role === 'instructor' || meta?.role === 'admin') ? meta.role : undefined, // Validate role
          full_name: meta?.full_name as string | undefined
        };

        // At this point, 'profile' conforms to the Row structure we need
        setUser({
          id: userId,
          name: profile.name || meta?.full_name || authUserData.user.email?.split('@')[0] || 'User',
          email: authUserData.user.email || '',
          role: profile.role || userMetadataForState.role || 'student', // Use validated role
          user_metadata: userMetadataForState // Assign the constructed, type-safe object
        });
        console.log("User state set successfully:", { userId, role: profile.role });
      } else {
        // Log details if the check fails
        console.warn("Could not set user state: Check failed.", {
             hasProfile: !!profile,
             profileId: profile?.id,
             profileCreatedAt: profile?.created_at,
             profileUpdatedAt: profile?.updated_at,
             hasAuthUser: !!authUserData?.user 
         });
        setUser(null);
      }
    } catch (error) {
      console.error('Critical Error in fetchAndSetUser:', error);
      setUser(null);
    }
  };

  const createUserProfile = async (userId: string): Promise<Database['public']['Tables']['profiles']['Row'] | null> => {
    try {
      const { data: authUserData } = await supabase.auth.getUser();
      if (!authUserData?.user) return null;
      
      const profileData = {
        id: userId,
        name: authUserData.user.user_metadata?.full_name || authUserData.user.email?.split('@')[0] || 'User',
        role: authUserData.user.user_metadata?.role || 'student',
        bio: null // Initialize bio as null
      };
      
      // --- DEBUG: Isolate the insert operation --- 
      console.log("Attempting to insert profile data:", profileData);
      // Remove .select('*').single() for now
      const { data: insertData, error: insertError } = await supabase
          .from('profiles')
          .insert(profileData);
          // .select('*') 
          // .single();
      
      // Log the result of the plain insert
      console.log("Insert Result:", { insertData, insertError });

      if (insertError) {
        console.error('Error during profile insert operation:', insertError);
        // Check for unique constraint violation (profile might already exist due to race condition)
        if (insertError.code === '23505') { // Unique violation code
            console.warn('Profile likely already exists (unique violation on insert).');
            // If insert failed due to conflict, we still need to return something? Maybe refetch?
            // For now, let's explicitly return null or attempt fetch
            return null; // Or attempt fetch like before?
        }
        return null; // Return null for other insert errors
      }
      
      // If insert succeeded, we need to refetch the data since we removed .select()
      console.log("Profile insert reported success, refetching...");
      const { data: refetchedProfile, error: refetchError } = await supabase
          .from('profiles')
          .select('*') // Select all columns to match Row type
          .eq('id', userId)
          .single();

      if (refetchError) {
          console.error('Failed to fetch profile after successful insert:', refetchError);
          return null;
      }

      console.log("Profile created or found successfully:", refetchedProfile);
      return refetchedProfile; // Return the fetched profile data
    } catch (error) {
      console.error('Exception in createUserProfile:', error);
      return null;
    }
  };

  useEffect(() => {
    // On mount: restore session and user
    setIsLoading(true);
    const getInitialSession = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      setSession(initialSession);
      await fetchAndSetUser(initialSession?.user?.id);
      setIsLoading(false);
    };
    getInitialSession();

    // Subscribe to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        setSession(currentSession);
        await fetchAndSetUser(currentSession?.user?.id);
        setIsLoading(false);
      }
    );
    return () => subscription.unsubscribe();
   }, []);

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof AuthError) {
        // Handle specific Supabase Auth errors
        switch (error.message) {
          case 'Invalid login credentials':
            return 'Email ose fjalëkalimi i pavlefshëm.';
          case 'Email not confirmed':
            return 'Ju lutemi konfirmoni emailin tuaj para se të kyçeni.';
          case 'User already registered':
            return 'Ky email është i regjistruar tashmë.';
          case 'Password should be at least 6 characters':
            return 'Fjalëkalimi duhet të jetë të paktën 6 karaktere.';
          default:
            return error.message || 'Ndodhi një gabim gjatë vërtetimit.';
        }
    } else if (error instanceof Error) {
        // Handle generic JavaScript errors
        return error.message;
    } else {
        // Handle other unknown error types
        return 'Ndodhi një gabim i papritur.';
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      toast({
        title: "Sukses!",
        description: "Jeni kyçur me sukses.",
      });
    } catch (error: unknown) {
      console.error('Login failed:', error);
      toast({
        title: "Gabim gjatë kyçjes",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const signup = async (name: string, email: string, password: string, role: 'student' | 'instructor') => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
          }
        }
      });
      if (error) throw error;
      if (data.user) {
        await createUserProfile(data.user.id);
      }
      toast({
        title: "Llogaria u krijua!",
        description: "Ju jeni regjistruar me sukses.",
      });
    } catch (error: unknown) {
      console.error('Signup failed:', error);
      toast({
        title: "Gabim gjatë regjistrimit",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setSession(null);
      toast({
        title: "Ju dolet nga sistemi",
        description: "Jeni çkyçur me sukses.",
      });
    } catch (error: unknown) {
      console.error('Logout failed:', error);
      toast({
        title: "Gabim gjatë çkyçjes",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session,
      isAuthenticated: !!user, 
      isLoading, 
      login, 
      signup, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
