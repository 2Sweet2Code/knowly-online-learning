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

// Import the service role client for admin operations
import { createClient } from '@supabase/supabase-js';

// Create a service role client (only for server-side use)
const serviceRoleKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

// Function to create or update user profile in profiles table
const createUserProfile = async (userId: string, name: string, email: string, role: 'student' | 'instructor' | 'admin'): Promise<User | null> => {
  try {
    // For client-side operations, we'll use the regular supabase client
    // The actual profile creation is now handled by the database trigger
    // This function will just verify the profile exists and return it
    
    // Wait a short time for the trigger to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Now try to fetch the profile
    const { data: profileData, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (fetchError || !profileData) {
      console.error('Failed to fetch user profile after creation:', fetchError);
      
      // If we're in development and have the service role key, try to create the profile directly
      if (process.env.NODE_ENV === 'development' && serviceRoleKey) {
        console.log('Attempting to create profile using service role...');
        const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        });
        
        const { data: serviceData, error: serviceError } = await serviceClient
          .from('profiles')
          .upsert({
            id: userId,
            name: name,
            email: email,
            role: role,
            full_name: name,
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
          
        if (serviceError) throw serviceError;
        if (!serviceData) throw new Error('Failed to create user profile with service role');
        
        return {
          id: serviceData.id,
          name: serviceData.name || name,
          email: serviceData.email || email,
          role: (serviceData.role as 'student' | 'instructor' | 'admin') || role
        };
      }
      
      throw new Error('Failed to create user profile. Please try again.');
    }
    
    // If we get here, the profile exists
    return {
      id: profileData.id,
      name: profileData.name || name,
      email: profileData.email || email,
      role: (profileData.role as 'student' | 'instructor' | 'admin') || role
    };
  } catch (error) {
    console.error('Error in createUserProfile:', error);
    throw new Error('Failed to create user profile. Please try again.');
  }
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
    let retryCount = 0;
    const maxRetries = 3;
    let retryTimeout: NodeJS.Timeout | null = null;
    
    // Set up auth state change listener first
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        console.log('Auth state changed:', event);
        setSession(session);
        
        if (session?.user) {
          try {
            await fetchAndSetUser(session.user.id);
          } catch (error) {
            console.error('Error in auth state change handler:', error);
            setUser(null);
          }
        } else {
          setUser(null);
        }
        
        if (isMounted) {
          setAuthInitialized(true);
          setIsLoading(false);
        }
      }
    );

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
      authListener?.subscription.unsubscribe();
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
        // Fetch and set the user profile
        await fetchAndSetUser(data.session.user.id);
        
        // Get the updated user data from the profiles table
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.session.user.id)
          .single();
          
        if (profileError) throw profileError;
        
        if (profile) {
          const userData = {
            id: profile.id,
            name: profile.name || '',
            email: profile.email || '',
            role: (profile.role as 'student' | 'instructor' | 'admin') || 'student',
            user_metadata: {
              name: profile.name,
              role: profile.role,
              full_name: profile.full_name || profile.name,
              avatar_url: profile.avatar_url || ''
            }
          };
          
          setState({
            user: userData,
            session: data.session,
            isLoading: false,
            authInitialized: true
          });
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      throw new Error(getErrorMessage(error));
    }
  }, [getErrorMessage, fetchAndSetUser]);

  // Signup function
  const signUp = React.useCallback(async (email: string, password: string, name: string, role: 'student' | 'instructor' | 'admin' = 'student'): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Validate input
      if (!email || !password || !name) {
        throw new Error('Please fill in all required fields');
      }
      
      // Check if a user with this name already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('name')
        .eq('name', name)
        .maybeSingle();
      
      if (existingUser) {
        throw new Error('A user with this name already exists');
      }
      
      // Sign up the user with Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (signUpError) {
        console.error('Auth signup error:', signUpError);
        throw new Error(signUpError.message || 'Failed to create user account');
      }
      
      if (!signUpData.user) {
        throw new Error('Failed to create user account');
      }
      
      // Create user profile in the database
      const profile = await createUserProfile(signUpData.user.id, name, email, role);
      
      if (!profile) {
        // If profile creation fails, try to delete the auth user to keep things clean
        await supabase.auth.admin.deleteUser(signUpData.user.id).catch(console.error);
        throw new Error('Failed to create user profile. Please try again.');
      }
      
      // Set the user in the auth context
      setUser({
        id: signUpData.user.id,
        name: name,
        email: email,
        role: role
      });
      
      // Show success message
      toast({
        title: 'Sukses!',
        description: 'Llogaria juaj u krijua me sukses. Ju lutem kontrolloni email-in tuaj për të konfirmuar llogarinë.',
        variant: 'default',
      });
      
      // Automatically sign in the user if email confirmation is not required
      if (signUpData.session) {
        setSession(signUpData.session);
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
  }, [formatErrorMessage, setIsLoading, setUser, setSession]);

  // Logout function
  const signOut = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setSession(null);
      
      // Redirect to home page after successful logout
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
      toast({
        title: 'Gabim gjatë çkyçjes',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [setUser, setSession, setIsLoading, getErrorMessage]);

  // Alias for backward compatibility
  const login = React.useCallback(signIn, [signIn]);
  const logout = React.useCallback(signOut, [signOut]);
  const signup = React.useCallback(async (name: string, email: string, password: string, role: 'student' | 'instructor' | 'admin' = 'student') => {
    try {
      await signUp(email, password, name, role);
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  }, [signUp]);

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
