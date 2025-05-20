import { useState, useEffect, ReactNode, useCallback } from 'react';
import { User } from '../types';
import { supabase } from "@/integrations/supabase/client";
import { Session, AuthError } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import type { Database } from "@/integrations/supabase/types";
import { AuthContext } from './auth-context';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authInitialized, setAuthInitialized] = useState<boolean>(false);
  const { toast } = useToast();

  // Helper function to format error messages
  const getErrorMessage = (error: unknown): string => {
    if (error instanceof AuthError) {
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
      return error.message;
    } else {
      return 'Ndodhi një gabim i papritur.';
    }
  };

  // Function to fetch and set user data
  const fetchAndSetUser = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    
    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('Profile fetch timeout - resetting loading state');
      setIsLoading(false);
    }, 10000); // 10 second timeout
    
    let profile: Database['public']['Tables']['profiles']['Row'] | null = null;
    
    try {
      // First get auth user data to ensure we have it before proceeding
      const { data: authUserData, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUserData?.user) {
        console.error('Error fetching auth user data:', authError);
        throw authError || new Error('Auth user data not found');
      }
      
      // Then fetch the profile data
      const { data: fetchedProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id, name, role, created_at, updated_at')
        .eq('id', userId)
        .single();

      if (fetchError && fetchError.code === 'PGRST116') {
        console.log('Profile not found for user, attempting creation...');
        const creationResult = await createUserProfile(userId);

        if (creationResult) {
          console.log('Profile creation initiated/found existing, now refetching...');
          const { data: refetchedProfile, error: refetchError } = await supabase
            .from('profiles')
            .select('id, name, role, created_at, updated_at')
            .eq('id', userId)
            .single();

          if (refetchError) {
            console.error('Error refetching profile after creation attempt:', refetchError);
            profile = null;
          } else {
            profile = refetchedProfile;
            console.log('Profile successfully refetched:', profile);
          }
        } else {
          console.error("Profile creation failed, setting profile to null.");
          profile = null;
        }
      } else if (fetchError) {
        console.error('Error fetching user profile:', fetchError);
        throw fetchError;
      } else {
        profile = fetchedProfile;
      }
      
      if (profile && profile.id && profile.created_at) { 
        const meta = authUserData.user.user_metadata || {};
        const userMetadataForState = {
          name: meta?.name as string | undefined, 
          role: (meta?.role === 'student' || meta?.role === 'instructor' || meta?.role === 'admin') ? meta.role : undefined, 
          full_name: meta?.full_name as string | undefined
        };

        setUser({
          id: userId,
          name: userMetadataForState.name || profile.name || '',
          email: authUserData.user.email || '', 
          role: userMetadataForState.role || (profile.role as 'student' | 'instructor' | 'admin') || 'student',
          user_metadata: userMetadataForState 
        });
      } else {
        console.error('Profile data is incomplete or null. Cannot set user state.');
        setUser(null); 
      }
    } catch (error) {
      console.error('Supabase operation failed in fetchAndSetUser:', error);
      toast({
        title: "Gabim",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      setUser(null); 
    } finally {
      clearTimeout(timeoutId); // Clear the timeout
      setIsLoading(false); 
    }
  }, [toast]);

  // Function to create a user profile
  const createUserProfile = useCallback(async (userId: string): Promise<Database['public']['Tables']['profiles']['Row'] | null> => {
    try {
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id, name, role, created_at, updated_at')
        .eq('id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { 
        throw fetchError; 
      }

      if (existingProfile) {
        console.log('User profile already exists, skipping creation.', existingProfile);
        return existingProfile;
      }

      console.log(`Creating new profile for user ID: ${userId}`);
      const { data: authUserData } = await supabase.auth.getUser(); 
      if (!authUserData?.user) {
        console.error('Auth user not found during profile creation.');
        return null;
      }
      
      let roleToSet: 'student' | 'instructor' | 'admin' = 'student'; 
      const metaRole = authUserData.user.user_metadata?.role;
      if (metaRole === 'student' || metaRole === 'instructor' || metaRole === 'admin') {
        roleToSet = metaRole;
      }

      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({ 
          id: userId, 
          name: authUserData.user.user_metadata?.name || 'Emri i panjohur', 
          role: roleToSet, 
          created_at: new Date().toISOString(), 
          updated_at: new Date().toISOString()  
        })
        .select('id, name, role, created_at, updated_at')
        .single();

      if (insertError) {
        console.error('Error inserting new profile:', insertError);
        throw insertError; 
      }

      console.log('New profile created successfully:', newProfile);
      return newProfile;

    } catch (error) {
      console.error('Error during profile creation or check:', error);
      toast({
        title: "Gabim në krijimin e profilit",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  // Initialize authentication state
  useEffect(() => {
    // Define this variable outside the async function to ensure it's initialized properly
    let mounted = true;
    
    const getInitialSession = async () => {
      if (!mounted) return;
      
      setIsLoading(true);
      try {
        // Get the session first
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        // Check if component is still mounted before updating state
        if (!mounted) return;
        
        if (error) {
          console.error("Error fetching initial session:", error);
          setUser(null);
          setIsLoading(false);
          setAuthInitialized(true);
          return;
        }
        
        // Set the session state
        setSession(initialSession);
        
        if (initialSession?.user) {
          // Instead of setting user state directly here, call fetchAndSetUser to ensure consistency
          await fetchAndSetUser(initialSession.user.id);
        } else {
          setUser(null);
          setIsLoading(false);
        }
        
        // Mark auth as initialized
        setAuthInitialized(true);
      } catch (err) {
        console.error("Unexpected error during authentication:", err);
        if (mounted) {
          setUser(null);
          setIsLoading(false);
          setAuthInitialized(true);
        }
      }
    };
    
    // Start the auth initialization process
    getInitialSession();

    // Set up auth state change listener
    let subscription: { unsubscribe: () => void } | null = null;
    
    if (mounted) {
      const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
        if (!mounted) return;
        
        setSession(newSession);
        
        if (newSession?.user) {
          // Use fetchAndSetUser to ensure consistent user state
          fetchAndSetUser(newSession.user.id);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      });
      
      subscription = data.subscription;
    }

    // Cleanup function
    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [fetchAndSetUser, createUserProfile]); // Add fetchAndSetUser and createUserProfile as dependencies

  // Login function with improved error handling
  const login = async (email: string, password: string) => {
    setIsLoading(true);
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
      // Auth state change handler will update the loading state
    } catch (error: unknown) {
      console.error('Login failed:', error);
      toast({
        title: "Gabim gjatë kyçjes",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  // Signup function with improved error handling
  const signup = async (name: string, email: string, password: string, role: 'student' | 'instructor' | 'admin') => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
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
      
      toast({
        title: "Llogaria u krijua!",
        description: "Ju jeni regjistruar me sukses.",
      });
      // Auth state change handler will update the loading state
    } catch (error: unknown) {
      console.error('Signup failed:', error);
      toast({
        title: "Gabim gjatë regjistrimit",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  // Logout function with improved error handling
  const logout = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      // Explicitly clear user and session state
      setUser(null);
      setSession(null);
      
      toast({
        title: "Ju dolet nga sistemi",
        description: "Jeni çkyçur me sukses.",
      });
      
      // Redirect to home page after successful logout
      window.location.href = '/';
    } catch (error: unknown) {
      console.error('Logout failed:', error);
      toast({
        title: "Gabim gjatë çkyçjes",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  // Only render children when auth is initialized to prevent race conditions
  return (
    <AuthContext.Provider value={{ 
      user, 
      session,
      isAuthenticated: !!user && !!session, 
      isLoading, 
      login, 
      signup, 
      logout 
    }}>
      {authInitialized ? children : (
        <div className="flex flex-col justify-center items-center min-h-screen">
          <div className="animate-spin h-10 w-10 border-4 border-brown border-t-transparent rounded-full"></div>
          <p className="mt-4 text-brown">Duke inicializuar...</p>
        </div>
      )}
    </AuthContext.Provider>
  );
};
