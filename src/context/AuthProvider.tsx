import * as React from 'react';
import { User } from '../types';
import { supabase } from "@/integrations/supabase/client";
import { Session, AuthError } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import type { Database } from "@/integrations/supabase/types";
import { AuthContext } from './auth-context';

// Function to create or update user profile in profiles table
const createUserProfile = async (userId: string, name: string, role: string): Promise<Database['public']['Tables']['profiles']['Row'] | null> => {
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
      role,
      updated_at: new Date().toISOString(),
    };

    if (existingProfile) {
      // Update existing profile
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', userId)
        .select()
        .single();

      if (updateError) throw updateError;
      return updatedProfile;
    } else {
      // Create new profile
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      if (createError) throw createError;
      return newProfile;
    }
  } catch (error) {
    console.error('Error creating/updating profile:', error);
    return null;
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // State management
  const [session, setSession] = React.useState<Session | null>(null);
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [authInitialized, setAuthInitialized] = React.useState<boolean>(false);
  const { toast } = useToast();

  // Helper function to get error message
  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    return String(error);
  };

  // Helper function to format error messages
  const formatErrorMessage = (error: unknown): string => {
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

  // Function to fetch and set user data with retry mechanism
  const fetchAndSetUser = React.useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    let timeoutId: NodeJS.Timeout | null = null;
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 2;
    
    const attemptFetch = async (): Promise<void> => {
      const controller = new AbortController();
      
      try {
        // Define the profile types
        type Profile = {
          id: string;
          name: string | null;
          email?: string | null;
          role: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
          full_name?: string | null;
        };
        
        type ProfileInsert = Omit<Profile, 'id'> & { id: string };

        // Create a timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            controller.abort();
            reject(new Error('Profile fetch timeout'));
          }, 5000); // 5 second timeout per attempt
        });

        // Try to fetch the profile
        const fetchPromise = supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single<Profile>();

        const { data: userData, error: fetchError } = await Promise.race([
          fetchPromise,
          timeoutPromise
        ]);

        if (!isMounted) return;

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            // No profile found, create a basic one
            console.log('No profile found, creating basic profile');
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert<ProfileInsert>({
                id: userId,
                name: '',
                role: 'student',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single();
              
            if (createError) throw createError;
            
            if (newProfile && isMounted) {
              setUser({
                id: newProfile.id,
                name: newProfile.name || '',
                email: newProfile.email || '',
                role: (newProfile.role as 'student' | 'instructor' | 'admin') || 'student',
                user_metadata: {
                  name: newProfile.name || '',
                  role: newProfile.role || 'student',
                  avatar_url: newProfile.avatar_url || undefined,
                },
              });
            }
          } else {
            throw fetchError;
          }
        } else if (userData) {
          // We have user data, update the state
          if (isMounted) {
            setUser({
              id: userData.id,
              name: userData.name || '',
              email: userData.email || '',
              role: (userData.role as 'student' | 'instructor' | 'admin') || 'student',
              user_metadata: {
                name: userData.name || '',
                role: userData.role || 'student',
                avatar_url: userData.avatar_url || undefined,
              },
            });
          }
        }
      } catch (error: unknown) {
        if (!isMounted) return;
        
        if (retryCount < maxRetries) {
          // Exponential backoff for retries
          const delay = 1000 * Math.pow(2, retryCount);
          retryCount++;
          console.log(`Retrying profile fetch (${retryCount}/${maxRetries}) in ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return attemptFetch();
        }
        
        // If we've exhausted retries, set a minimal user object
        console.warn('Max retries reached for profile fetch, using minimal user data', error);
        if (isMounted) {
          setUser({
            id: userId,
            name: '',
            email: '',
            role: 'student',
            user_metadata: { name: '', role: 'student' },
          });
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    };
    
    try {
      // Start the fetch attempt
      await attemptFetch();
    } catch (error: unknown) {
      console.error('Error in fetchAndSetUser:', getErrorMessage(error));
      // Set minimal user data on error
      if (isMounted) {
        setUser({
          id: userId,
          name: '',
          email: '',
          role: 'student',
          user_metadata: { name: '', role: 'student' },
        });
      }
    } finally {
      if (isMounted) {
        setIsLoading(false);
      }
    }

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Initial auth check with retry mechanism
  React.useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 2;
    let retryTimeout: NodeJS.Timeout | null = null;
    let globalTimeout: NodeJS.Timeout | null = null;
    
    const checkAuth = async () => {
      console.log('[Auth] Starting auth check...');
      
      // Create a promise that will reject if the fetch takes too long
      const authCheckPromise = new Promise<{ data: { session: Session | null }, error: Error | null }>((resolve, reject) => {
        // Set a timeout for the auth check
        const timeoutId = setTimeout(() => {
          reject(new Error('Auth check timeout'));
        }, 10000); // 10s timeout for auth check

        // Try to get the session
        supabase.auth.getSession()
          .then(({ data, error }) => {
            clearTimeout(timeoutId);
            if (error) {
              reject(error);
            } else {
              resolve({ data, error: null });
            }
          })
          .catch(error => {
            clearTimeout(timeoutId);
            reject(error);
          });
      });

      try {
        const { data: { session: currentSession } } = await authCheckPromise;
        
        if (!isMounted) return;
        
        console.log('[Auth] Session state:', currentSession ? 'authenticated' : 'not authenticated');
        setSession(currentSession);
        
        if (currentSession?.user) {
          console.log('[Auth] User session found, fetching user data...');
          try {
            await fetchAndSetUser(currentSession.user.id);
            console.log('[Auth] User data fetched successfully');
          } catch (userError) {
            console.error('[Auth] Error fetching user data:', userError);
            // Continue even if user fetch fails
          }
        } else {
          console.log('[Auth] No user session found');
          setUser(null);
        }
        
        if (isMounted) {
          console.log('[Auth] Auth initialization complete');
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
            if (isMounted) checkAuth();
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
    checkAuth();
    
    // Set a global timeout to prevent infinite loading (30s)
    globalTimeout = setTimeout(() => {
      if (isMounted && !authInitialized) {
        console.warn('Auth initialization timeout - forcing state update');
        setUser(null);
        setAuthInitialized(true);
        setIsLoading(false);
      }
    }, 8000); // 8 second timeout
    
    checkAuth();
    
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
  }, [fetchAndSetUser, authInitialized]);

  // Login function
  const login = React.useCallback(async (email: string, password: string) => {
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
  }, []);

  // Signup function
  const signup = React.useCallback(async (name: string, email: string, password: string, role: 'student' | 'instructor' | 'admin'): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Create user in auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('Failed to create user');

      // Create user profile
      await createUserProfile(authData.user.id, name, role);
    } catch (error) {
      console.error('Signup error:', error);
      throw new Error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout function
  const logout = React.useCallback(async () => {
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
      setIsLoading(false);
    }
  }, [toast]);

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
