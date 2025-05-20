import { createContext } from 'react';
import { User } from '../types';
import { Session } from '@supabase/supabase-js';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, role: 'student' | 'instructor' | 'admin') => Promise<void>;
  logout: () => Promise<void>;
  createUserProfile: (userId: string, name: string, role: string) => Promise<unknown>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
