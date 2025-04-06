
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { supabase } from "@/integrations/supabase/client";
import { Session, AuthError } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

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

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("Auth state changed:", event, currentSession?.user?.id);
        setSession(currentSession);
        
        if (currentSession?.user) {
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            await fetchUserProfile(currentSession.user.id);
          }
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    // Check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        
        if (currentSession?.user) {
          await fetchUserProfile(currentSession.user.id);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        setIsLoading(false);
      }
    };

    initializeAuth();
    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      // First check if profile exists
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // Profile not found, create one
          await createUserProfile(userId);
        } else {
          console.error('Error fetching user profile:', error);
          setUser(null);
          setIsLoading(false);
          return;
        }
      }
      
      // Fetch user metadata from auth.users
      const { data: authUser } = await supabase.auth.getUser();
      
      if (profile && authUser?.user) {
        setUser({
          id: userId,
          name: profile.name || authUser.user.user_metadata?.name || authUser.user.email?.split('@')[0] || 'User',
          email: authUser.user.email || '',
          role: profile.role || authUser.user.user_metadata?.role || 'student',
        });
      } else if (authUser?.user) {
        // If we still don't have a profile but have auth user, create minimal user object
        setUser({
          id: userId,
          name: authUser.user.user_metadata?.name || authUser.user.email?.split('@')[0] || 'User',
          email: authUser.user.email || '',
          role: authUser.user.user_metadata?.role || 'student',
        });
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createUserProfile = async (userId: string) => {
    try {
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser?.user) return;
      
      const { error } = await supabase.from('profiles').insert({
        id: userId,
        name: authUser.user.user_metadata?.name || authUser.user.email?.split('@')[0] || 'User',
        role: authUser.user.user_metadata?.role || 'student',
      });
      
      if (error) {
        console.error('Error creating user profile:', error);
      }
    } catch (error) {
      console.error('Error in createUserProfile:', error);
    }
  };

  const getErrorMessage = (error: AuthError): string => {
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
        return error.message || 'Provoni përsëri më vonë.';
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      
      // Authentication state will be handled by the onAuthStateChange listener
      toast({
        title: "Sukses!",
        description: "Jeni kyçur me sukses.",
      });
    } catch (error: any) {
      console.error('Login failed:', error);
      toast({
        title: "Gabim gjatë kyçjes",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name: string, email: string, password: string, role: 'student' | 'instructor') => {
    try {
      setIsLoading(true);
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
      
      // Create profile manually since we can't rely on database triggers
      if (data.user) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          name: name,
          role: role,
        });
      }
      
      toast({
        title: "Llogaria u krijua!",
        description: "Ju jeni regjistruar me sukses.",
      });
    } catch (error: any) {
      console.error('Signup failed:', error);
      toast({
        title: "Gabim gjatë regjistrimit",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setSession(null);
      
      toast({
        title: "Ju dolet nga sistemi",
        description: "Jeni çkyçur me sukses.",
      });
    } catch (error: any) {
      console.error('Logout failed:', error);
      toast({
        title: "Gabim gjatë çkyçjes",
        description: error.message || "Provoni përsëri më vonë.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
