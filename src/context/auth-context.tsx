import { createContext, useContext } from 'react';
import { User } from '../types';
import { Session } from '@supabase/supabase-js';

export interface AuthContextType {
  // User data
  user: User | null;
  session: Session | null;
  
  // Loading states
  isLoading: boolean;
  authInitialized: boolean;
  isAuthenticated: boolean;
  
  // Authentication methods
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string, 
    password: string, 
    name: string, 
    role?: 'student' | 'instructor' | 'admin'
  ) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  
  // For backward compatibility
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string, 
    password: string, 
    name: string, 
    role?: 'student' | 'instructor' | 'admin'
  ) => Promise<void>;
  logout: () => Promise<void>;
  
  // State setters
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setAuthInitialized: (authInitialized: boolean) => void;
}

// Create the context with a default value that throws errors when used outside of a provider
export const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  authInitialized: false,
  isAuthenticated: false,
  signIn: async () => {
    throw new Error('AuthProvider not found');
  },
  signUp: async () => {
    throw new Error('AuthProvider not found');
  },
  signOut: async () => {
    throw new Error('AuthProvider not found');
  },
  updateUser: async () => {
    throw new Error('AuthProvider not found');
  },
  login: async () => {
    throw new Error('AuthProvider not found');
  },
  signup: async () => {
    throw new Error('AuthProvider not found');
  },
  logout: async () => {
    throw new Error('AuthProvider not found');
  },
  setUser: () => {
    throw new Error('AuthProvider not found');
  },
  setSession: () => {
    throw new Error('AuthProvider not found');
  },
  setIsLoading: () => {
    throw new Error('AuthProvider not found');
  },
  setAuthInitialized: () => {
    throw new Error('AuthProvider not found');
  },
});

/**
 * Hook to access the auth context
 * @returns The auth context
 * @throws Error if used outside of an AuthProvider
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
