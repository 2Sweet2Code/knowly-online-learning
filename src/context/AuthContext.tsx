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
  signup: (name: string, email: string, password: string, role: 'student' | 'instructor' | 'admin') => Promise<void>;
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
      setIsLoading(false); 
      return;
    }
    
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
        return; 
      } else {
        profile = fetchedProfile;
      }
      
      if (profile && profile.id && profile.created_at && authUserData?.user) { 
        const meta = authUserData.user.user_metadata;
        const userMetadataForState = {
          name: meta?.name as string | undefined, 
          role: (meta?.role === 'student' || meta?.role === 'instructor' || meta?.role === 'admin') ? meta.role : undefined, 
          full_name: meta?.full_name as string | undefined
        };

        setUser({
          id: userId,
          name: userMetadataForState.name || profile.name || '',
          email: authUserData?.user?.email || '', 
          role: userMetadataForState.role || (profile.role as 'student' | 'instructor' | 'admin') || 'student',
          user_metadata: userMetadataForState 
        });
      } else {
        console.error('Profile data is incomplete or null, or auth user not found. Cannot set user state.');
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
      setIsLoading(false); 
    }
  };

  const createUserProfile = async (userId: string): Promise<Database['public']['Tables']['profiles']['Row'] | null> => {
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
  };


  useEffect(() => {
    const getInitialSession = async () => {
      setIsLoading(true); 
      const { data: { session: initialSession }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error fetching initial session:", error);
        await fetchAndSetUser(undefined); 
        setIsLoading(false); 
        return;
      }
      setSession(initialSession);
      if (initialSession?.user) {
        const meta = initialSession.user.user_metadata;
        setUser({
          id: initialSession.user.id,
          name: meta?.name || '',
          email: initialSession.user.email || '',
          role: (meta?.role as 'student' | 'instructor' | 'admin') || 'student',
          user_metadata: meta,
        });
        await fetchAndSetUser(initialSession?.user?.id); 
      } else {
        setIsLoading(false);
      }
    };
    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        setIsLoading(true); 
        setSession(currentSession);
        if (currentSession?.user) {
          const meta = currentSession.user.user_metadata;
          setUser({
            id: currentSession.user.id,
            name: meta?.name || '',
            email: currentSession.user.email || '',
            role: (meta?.role as 'student' | 'instructor' | 'admin') || 'student',
            user_metadata: meta,
          });
        } else {
          setUser(null); 
        }
        await fetchAndSetUser(currentSession?.user?.id);
      }
    );
    return () => subscription.unsubscribe();
   }, []);

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

  const signup = async (name: string, email: string, password: string, role: 'student' | 'instructor' | 'admin') => {
    setIsLoading(true);
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
      setIsLoading(false); 
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
      setIsLoading(false); 
    }
  };

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
      {children}
    </AuthContext.Provider>
  );
};
