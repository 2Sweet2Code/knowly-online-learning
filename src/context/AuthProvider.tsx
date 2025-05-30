import * as React from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Session, AuthError, User as SupabaseUser } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';
import { AuthContext, type AuthContextType } from './auth-context';

// Import User type from the shared types
import { User } from '@/types';

// Interface for the profile data returned by the RPC call
interface ProfileData {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at?: string;
  updated_at?: string;
  error?: string;
}

// Function to create or update user profile in profiles table with retry logic
const createUserProfile = async (userId: string, name: string, email: string, role: 'student' | 'instructor' | 'admin' = 'student'): Promise<User | null> => {
  const maxRetries = 5; // Increased from 3 to 5
  let retryCount = 0;
  const baseDelay = 1000; // Start with 1 second delay

  const attemptCreateProfile = async (): Promise<User> => {
    const now = new Date().toISOString();
    
    // Prepare the base profile data
    const baseProfileData = {
      id: userId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: role,
      full_name: name.trim(),
      updated_at: now,
      created_at: now
    };

    try {
      // First, try to get the existing profile
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      let result;
      
      if (!existingProfile) {
        // If profile doesn't exist, try to insert it
        const { data, error } = await supabase
          .from('profiles')
          .insert(baseProfileData)
          .select()
          .single();
          
        if (error) throw error;
        result = data;
      } else {
        // If profile exists, update it
        const { data, error } = await supabase
          .from('profiles')
          .update(baseProfileData)
          .eq('id', userId)
          .select()
          .single();
          
        if (error) throw error;
        result = data;
      }

      // Get the full profile data
      const { data: fullProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError || !fullProfile) {
        throw new Error(fetchError?.message || 'Failed to fetch profile after creation');
      }

      // Return the user object with safe defaults
      return {
        id: fullProfile.id || userId,
        name: fullProfile.name || name,
        email: fullProfile.email || email,
        role: (fullProfile.role as 'student' | 'instructor' | 'admin') || role,
        user_metadata: {
          name: fullProfile.name || name,
          role: fullProfile.role || role,
          full_name: fullProfile.full_name || fullProfile.name || name,
          avatar_url: fullProfile.avatar_url || ''
        }
      };
      
    } catch (error) {
      // If it's a foreign key violation or user doesn't exist in auth.users yet
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = typeof error === 'object' && error !== null && 'code' in error 
        ? String((error as { code: unknown }).code) 
        : '';
        
      if (errorCode === '23503' || errorMessage.includes('violates foreign key constraint')) {
        throw new Error('USER_NOT_READY');
      }
      throw error;
    }
  };

  // Retry with exponential backoff
  while (retryCount < maxRetries) {
    try {
      return await attemptCreateProfile();
    } catch (error) {
      retryCount++;
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage === 'USER_NOT_READY' && retryCount < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s
        const delay = baseDelay * Math.pow(2, retryCount - 1);
        console.log(`User not ready, retrying in ${delay}ms (${retryCount}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // For any other error or max retries reached
      console.error('Error in createUserProfile:', error);
      if (retryCount >= maxRetries) {
        throw new Error('Failed to create or update user profile after multiple attempts. The user account might not be ready yet. Please try again in a moment.');
      }
      throw error;
    }
  }
  
  // This should never be reached due to the throw in the loop
  throw new Error('An unexpected error occurred while creating the user profile.');
};

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  authInitialized: boolean;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    authInitialized: false,
  });
  
  const { user, session, isLoading, authInitialized } = state;
  
  // State updaters
  const setUser = React.useCallback((user: User | null) => {
    setState(prev => ({ ...prev, user }));
  }, []);
  
  const setSession = React.useCallback((session: Session | null) => {
    setState(prev => ({ ...prev, session }));
  }, []);
  
  const setIsLoading = React.useCallback((isLoading: boolean) => {
    setState(prev => ({ ...prev, isLoading }));
  }, []);
  
  const setAuthInitialized = React.useCallback((authInitialized: boolean) => {
    setState(prev => ({ ...prev, authInitialized }));
  }, []);

  // Helper function to get error message
  const getErrorMessage = React.useCallback((error: unknown): string => {
    if (error instanceof Error) return error.message;
    return String(error);
  }, []);

  // Helper function to format error messages
  const formatErrorMessage = React.useCallback((error: unknown): string => {
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
  }, []);

  // Function to fetch and set user data with retry mechanism
  const fetchAndSetUser = React.useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 3;
    let timeoutId: NodeJS.Timeout | null = null;

    const attemptFetch = async () => {
      if (!isMounted) return;

      try {
        console.log(`[Auth] Fetching user data (attempt ${retryCount + 1}/${maxRetries + 1})`);
        
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('[Auth] Error fetching user profile:', error);
          throw error;
        }


        if (!profile) {
          console.warn('[Auth] No profile found for user:', userId);
          setUser(null);
          return;
        }


setUser({
          id: profile.id,
          name: profile.name || '',
          email: profile.email || '',
          role: profile.role as 'student' | 'instructor' | 'admin',
          user_metadata: {
            name: profile.name,
            role: profile.role,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url
          }
        });
        setIsLoading(false);
        console.log('[Auth] User data set successfully');
      } catch (error) {
        console.error('[Auth] Error in attemptFetch:', error);
        
        if (retryCount < maxRetries) {
          retryCount++;
          const delay = 1000 * retryCount; // 1s, 2s, etc.
          console.log(`[Auth] Retrying user fetch in ${delay}ms (${retryCount}/${maxRetries})`);
          
          timeoutId = setTimeout(() => {
            void attemptFetch();
          }, delay);
          return;
        }
        
        console.error('[Auth] Max retries reached for user fetch');
        setUser(null);
        setIsLoading(false);
      }
    };

    // Start the initial fetch
    attemptFetch();

    // Cleanup function
    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [setUser, setIsLoading]);

  // Handle auth state changes
  React.useEffect(() => {
    let isMounted = true;
    const maxRetries = 5;
    let retryCount = 0;
    let retryTimeout: NodeJS.Timeout | null = null;
    
    const handleAuthChange = async (event: string, session: Session | null) => {
      if (!isMounted) return;
      
      console.log('Auth state changed:', event, session?.user?.email);
      setSession(session);
      
      if (session?.user) {
        try {
          // First, try to fetch the user profile
          await fetchAndSetUser(session.user.id);
          
          // Set a timeout to check if the profile was created by the trigger
          // This handles cases where the auth state changes before the trigger runs
          const checkProfile = async () => {
            if (!isMounted) return;
            
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
                
              if (profile) {
                console.log('Profile found after retry:', profile);
                // Update the user state with the new profile
                await fetchAndSetUser(session.user.id);
              } else {
                console.warn('Profile not found after signup. Will retry in 1s...');
                // Retry after a delay if profile is still not found
                setTimeout(checkProfile, 1000);
              }
            } catch (error) {
              console.error('Error checking profile:', error);
              // If there's an error, it might be because the profile doesn't exist yet
              setTimeout(checkProfile, 1000);
            }
          };
          
          // Start checking for the profile
          setTimeout(checkProfile, 500);
          
        } catch (error) {
          console.error('Error in auth state change:', error);
          setUser(null);
        }
      } else {
        // User signed out
        setUser(null);
      }
      
      if (isMounted) {
        setAuthInitialized(true);
        setIsLoading(false);
      }
    };
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    const checkAuth = async () => {
      try {
        const { data: { session: currentSession }, error } = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Auth check timeout')), 5000);
          })
        ]);

        if (error) throw error;

        if (currentSession?.user) {
          await fetchAndSetUser(currentSession.user.id);
        } else {
          setUser(null);
          setSession(null);
        }

        if (isMounted) {
          setAuthInitialized(true);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('[Auth] Error during auth check:', error);
        
        if (isMounted && retryCount < maxRetries) {
          // Retry with exponential backoff
          const delay = 1000 * Math.pow(2, retryCount);
          retryCount++;
          console.log(`[Auth] Retrying auth check (${retryCount}/${maxRetries}) in ${delay}ms`);
          
          // Clear any existing timeout
          if (retryTimeout) clearTimeout(retryTimeout);
          
          // Set a new timeout for the retry
          retryTimeout = setTimeout(() => {
            if (isMounted) void checkAuth();
          }, delay);
          
          return;
        }
        
        // If we've exhausted retries, continue with unauthenticated state
        if (isMounted) {
          console.warn('[Auth] Max retries reached, continuing without authentication');
          setUser(null);
          setAuthInitialized(true);
          setIsLoading(false);
        }
      }
    };

    // Initial check
    void checkAuth();
    
    // Global timeout to prevent infinite loading
    const globalTimeout = setTimeout(() => {
      if (isMounted && !authInitialized) {
        console.warn('Auth initialization timeout - forcing state update');
        setUser(null);
        setAuthInitialized(true);
        setIsLoading(false);
      }
    }, 8000); // 8 second timeout
    
    // Cleanup function
    return () => {
      isMounted = false;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (globalTimeout) clearTimeout(globalTimeout);
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [fetchAndSetUser, authInitialized, getErrorMessage, setIsLoading, setAuthInitialized, setSession, setUser]);

  // Login function
  const signIn = React.useCallback(async (email: string, password: string): Promise<void> => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      // If we have a session, update the user state immediately
      if (data?.session?.user) {
        const user = data.session.user;
        
        // Ensure the user has a profile, create one if not
        const userProfile = await createUserProfile(
          user.id, 
          user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          user.email || '',
          user.user_metadata?.role || 'student'
        );
        
        if (!userProfile) {
          throw new Error('Failed to load user profile');
        }
        
        // Update the auth state with the user's profile
        setState(prev => ({
          ...prev,
          user: userProfile,
          session: data.session,
          isLoading: false,
          authInitialized: true
        }));
      }
    } catch (error) {
      console.error('Login error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      throw new Error(getErrorMessage(error));
    }
  }, [getErrorMessage, setState]);

  // Helper function to validate email format
  const isValidEmail = (email: string): boolean => {
    // More permissive email validation that allows most common email formats
    const emailRegex = /^[^\s@]+@[^\s@.]+\.[^\s@.]+\.[^\s@]+$|^[^\s@]+@[^\s@.]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // Signup function
  const signUp = React.useCallback(async (email: string, password: string, name: string, role: 'student' | 'instructor' | 'admin' = 'student'): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Trim and validate input
      const trimmedEmail = email.trim();
      const trimmedName = name.trim();
      
      // Validate input
      if (!trimmedEmail || !password || !trimmedName) {
        throw new Error('Ju lutemi plotësoni të gjitha fushat e detyrueshme.');
      }
      
      // Validate email format
      if (!isValidEmail(trimmedEmail)) {
        throw new Error('Ju lutemi shkruani një email të vlefshëm.');
      }
      
      // Validate password strength
      if (password.length < 6) {
        throw new Error('Fjalëkalimi duhet të ketë të paktën 6 karaktere.');
      }
      
      // Sign up the user with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            name: trimmedName,
            full_name: trimmedName,
            role
          },
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) {
        console.error('Signup error:', error);
        // Provide more user-friendly error messages
        let errorMessage = 'Regjistrimi dështoi. Ju lutemi provoni përsëri.';
        
        if (error.message.includes('already registered')) {
          errorMessage = 'Ky email është i regjistruar tashmë. Ju lutemi përdorni një email tjetër ose bëni hyrjen në llogari.';
        } else if (error.message.includes('email')) {
          errorMessage = 'Ju lutemi shkruani një email të vlefshëm.';
        } else if (error.message.includes('password')) {
          errorMessage = 'Fjalëkalimi duhet të ketë të paktën 6 karaktere.';
        }
        
        throw new Error(errorMessage);
      }

      // Debug log to see what was returned
      console.log('Signup response:', {
        user: data.user,
        session: data.session,
        // Check if email was sent (if user has identities, email was sent)
        emailSent: !!(data.user?.identities && data.user.identities.length > 0),
        // Check if email is confirmed
        emailConfirmed: data.user?.email_confirmed_at !== null,
        // Check if user is active
        userActive: data.user?.last_sign_in_at !== null
      });

      // Log more details if email wasn't sent
      if (!data.user?.identities || data.user.identities.length === 0) {
        console.warn('Email may not have been sent. User has no identities.');
        console.log('Available user data:', {
          id: data.user?.id,
          email: data.user?.email,
          created_at: data.user?.created_at,
          last_sign_in_at: data.user?.last_sign_in_at,
          email_confirmed_at: data.user?.email_confirmed_at
        });
      }

      // Show success message
      toast({
        title: 'Success!',
        description: 'Please check your email to confirm your account. You will be redirected after confirmation.',
        variant: 'default',
      });
      
      // Check if email confirmation is required
      if (data.user?.identities?.length === 0) {
        toast({
          title: 'Email already registered',
          description: 'This email is already registered. Please sign in or reset your password.',
          variant: 'destructive',
        });
      }
      
    } catch (error) {
      console.error('Signup error:', error);
      toast({
        title: 'Regjistrimi dështoi',
        description: formatErrorMessage(error),
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [formatErrorMessage, setIsLoading]);

  // Logout function
  const signOut = React.useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setState(prev => ({
        ...prev,
        user: null,
        session: null,
        isLoading: false
      }));
      
      // Redirect to home page after successful logout
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      toast({
        title: 'Gabim gjatë çkyçjes',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  }, [getErrorMessage, setState]);

  // Alias for backward compatibility
  const login = React.useCallback((email: string, password: string) => {
    return signIn(email, password);
  }, [signIn]);

  const logout = React.useCallback(() => {
    return signOut();
  }, [signOut]);

  const signup = React.useCallback(async (email: string, password: string, name: string, role: 'student' | 'instructor' | 'admin' = 'student'): Promise<void> => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      // Validate input
      if (!name || !email || !password) {
        throw new Error('Please fill in all required fields');
      }
      
      // Call the signUp function which handles the actual signup process
      await signUp(email, password, name, role);
      
      // Show success message (handled in signUp function)
      
    } catch (error) {
      console.error('Signup error:', error);
      toast({
        title: 'Signup Failed',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
      throw error;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [signUp, getErrorMessage, setState]);

  // Only render children when auth is initialized to prevent race conditions
  const contextValue = React.useMemo<AuthContextType>(() => ({
    user,
    session,
    isLoading,
    authInitialized,
    isAuthenticated: !!user && !!session,
    
    // Authentication methods (new naming)
    signIn: login,
    signUp: signup,
    signOut: logout,
    
    // Authentication methods (old naming for backward compatibility)
    login,
    signup,
    logout,
    
    // User management
    updateUser: async (updates) => {
      if (!user) return;
      try {
        const { data: updatedUser, error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id)
          .select()
          .single();
        
        if (error) throw error;
        if (updatedUser) {
          setUser({
            ...user,
            ...updatedUser,
            user_metadata: {
              ...user.user_metadata,
              ...(updatedUser.user_metadata || {})
            }
          });
        }
      } catch (error) {
        console.error('Failed to update user:', error);
        throw error;
      }
    },
    
    // State setters
    setUser,
    setSession,
    setIsLoading,
    setAuthInitialized,
    formatErrorMessage
  }), [
    user,
    session,
    isLoading,
    authInitialized,
    login,
    signup,
    logout,
    setUser,
    setSession,
    setIsLoading,
    setAuthInitialized,
    formatErrorMessage
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {authInitialized ? children : (
        <div className="flex flex-col justify-center items-center min-h-screen">
          <div className="animate-spin h-10 w-10 border-4 border-brown border-t-transparent rounded-full"></div>
          <p className="mt-4 text-brown">Duke inicializuar...</p>
        </div>
      )}
    </AuthContext.Provider>
  );
};
