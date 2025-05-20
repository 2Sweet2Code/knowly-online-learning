import * as React from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Session, AuthError, User as SupabaseUser } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';
import { AuthContext, type AuthContextType } from './auth-context';

// Import User type from the shared types
import { User } from '@/types';

// Function to create or update user profile in profiles table
const createUserProfile = async (userId: string, name: string, role: 'student' | 'instructor' | 'admin'): Promise<User | null> => {
  try {
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    const profileData = {
      id: userId,
      name,
      email: '', // This will be updated from auth user
      role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_metadata: {
        name,
        role,
        full_name: name,
        avatar_url: ''
      }
    };

    if (existingProfile) {
      // Extract existing metadata if it exists
      const existingMetadata = (existingProfile as User).user_metadata || {};
      
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
          name,
          role,
          updated_at: new Date().toISOString(),
          user_metadata: {
            ...existingMetadata,
            name,
            role,
            full_name: name
          }
        })
        .eq('id', userId)
        .select()
        .single();

      if (updateError) throw updateError;
      return updatedProfile as User;
    } else {
      // Create new profile
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      if (createError) throw createError;
      return newProfile as User;
    }
  } catch (error) {
    console.error('Error creating/updating profile:', error);
    return null;
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
    
    const cleanup = () => {
      isMounted = false;
      if (retryTimeout) clearTimeout(retryTimeout);
    };

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
    
    const attemptFetch = async () => {
      try {
        const { data: { session: currentSession }, error } = await Promise.race([
          supabase.auth.getSession(),
          new Promise<{ data: { session: Session | null }, error: Error | null }>((_, reject) => {
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
            if (isMounted) void attemptFetch();
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
    void attemptFetch();
    
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
    };
    
    // Handle auth state changes after initial check
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
          }
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (globalTimeout) clearTimeout(globalTimeout);
      authListener?.subscription.unsubscribe();
    };
  }, [fetchAndSetUser, authInitialized, getErrorMessage, setIsLoading, setAuthInitialized, setSession, setUser]);

  // Login function
  const signIn = React.useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Login error:', error);
      throw new Error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [getErrorMessage, setIsLoading]);

  // Signup function
  const signUp = React.useCallback(async (email: string, password: string, name: string, role: 'student' | 'instructor' | 'admin' = 'student'): Promise<void> => {
    try {
      setIsLoading(true);
      
      // First, check if user already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      
      if (existingUser) {
        throw new Error('A user with this email already exists');
      }
      
      // Create user in the database
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([
          { 
            name, 
            email, 
            password: password, // In a real app, you should hash this password
            role 
          },
        ])
        .select()
        .single();
      
      if (createError) throw createError;
      if (!newUser) throw new Error('Failed to create user');
      
      // Create a session for the new user
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (signInError) throw signInError;
      
      // Set the user in the auth context
      setUser({
        id: newUser.id.toString(),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role as 'student' | 'instructor' | 'admin',
        user_metadata: {
          name: newUser.name,
          role: newUser.role,
          full_name: newUser.name,
          avatar_url: ''
        }
      });
      
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
  }, [formatErrorMessage, setIsLoading, setUser]);

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
  const signup = React.useCallback(signUp, [signUp]);

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
