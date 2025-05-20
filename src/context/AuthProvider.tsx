import * as React from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Session, AuthError } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import type { Database } from "@/integrations/supabase/types";
import { AuthContext } from './auth-context';

// Define User type based on profiles table schema
type User = {
  id: string;
  name: string;
  role: 'student' | 'instructor' | 'admin';
  created_at: string;
  updated_at: string;
};

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

    const profileData: User = {
      id: userId,
      name,
      role,
      created_at: new Date().toISOString(),
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

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  authInitialized: boolean;
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = React.useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    authInitialized: false,
  });
  
  const { toast } = useToast();
  
  const setUser = (user: User | null) => setState(prev => ({ ...prev, user }));
  const setSession = (session: Session | null) => setState(prev => ({ ...prev, session }));
  const setIsLoading = (isLoading: boolean) => setState(prev => ({ ...prev, isLoading }));
  const setAuthInitialized = (authInitialized: boolean) => 
    setState(prev => ({ ...prev, authInitialized }));
    
  const { user, session, isLoading, authInitialized } = state;

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

    let retryCount = 0;
    const maxRetries = 2;
    let timeoutId: NodeJS.Timeout | null = null;
    let isMounted = true;

    const attemptFetch = async (): Promise<void> => {
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
          if (isMounted) setUser(null);
          return;
        }


        // Set the user data
        if (isMounted) {
          setUser({
            id: profile.id,
            name: profile.name || '',
            role: profile.role as 'student' | 'instructor' | 'admin',
            created_at: profile.created_at,
            updated_at: profile.updated_at
          });
          setIsLoading(false);
          console.log('[Auth] User data set successfully');
        }
      } catch (error) {
        console.error('[Auth] Error in attemptFetch:', error);
        
        if (retryCount < maxRetries) {
          retryCount++;
          const delay = 1000 * retryCount; // 1s, 2s, etc.
          console.log(`[Auth] Retrying user fetch in ${delay}ms (${retryCount}/${maxRetries})`);
          
          return new Promise((resolve) => {
            timeoutId = setTimeout(() => {
              attemptFetch().then(resolve);
            }, delay);
          });
        }
        
        console.error('[Auth] Max retries reached for user fetch');
        if (isMounted) {
          setUser(null);
          setIsLoading(false);
        }
      }
    };

    // Start the initial fetch
    attemptFetch();

    // Cleanup function
    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
    
    // Cleanup function
    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
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

        // Use a simple promise race with a timeout
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
    
    // Initial check with timeout
    const checkAuth = async () => {
      try {
        await attemptFetch();
      } catch (error) {
        console.error('[Auth] Auth check error:', error);
        if (isMounted) {
          setUser(null);
          setAuthInitialized(true);
          setIsLoading(false);
        }
      }
    };

    // Initial check
    checkAuth();

    // Global timeout to prevent infinite loading
    const globalTimeout = setTimeout(() => {
      if (isMounted && !authInitialized) {
        console.warn('Auth initialization timeout - forcing state update');
        setUser(null);
        setAuthInitialized(true);
        setIsLoading(false);
      }
    }, 8000); // 8 second timeout
    
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
