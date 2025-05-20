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
  const [user, setUser] = React.useState<User | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [authInitialized, setAuthInitialized] = React.useState<boolean>(false);
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
  const fetchAndSetUser = React.useCallback(async (userId: string | undefined) => {
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
    
    try {
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      clearTimeout(timeoutId);

      if (userError) throw userError;

      if (userData) {
        setUser({
          id: userData.id,
          name: userData.name || '',
          email: userData.email || '',
          role: userData.role as 'student' | 'instructor' | 'admin',
          user_metadata: {
            name: userData.name || '',
            role: userData.role,
            avatar_url: userData.avatar_url || undefined,
          },
        });
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      toast({
        title: 'Gabim',
        description: 'Ndodhi një gabim gjatë ngarkimit të të dhënave të përdoruesit.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Handle auth state changes
  React.useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      
      if (session?.user) {
        await fetchAndSetUser(session.user.id);
      } else {
        setUser(null);
        setIsLoading(false);
      }
      
      if (!authInitialized) {
        setAuthInitialized(true);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [authInitialized, fetchAndSetUser]);

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
