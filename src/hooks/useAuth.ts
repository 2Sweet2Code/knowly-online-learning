import { useContext } from 'react';
import { AuthContext, type AuthContextType } from '../context/auth-context';
import { Session } from '@supabase/supabase-js';

/**
 * Custom hook to access the auth context
 * @returns The auth context with user and auth methods
 * @throws Error if used outside of an AuthProvider
 */
export const useAuth = (): AuthContextType => {
  return useContext(AuthContext);
};

/**
 * Hook to check if the user is authenticated
 * @returns {boolean} True if the user is authenticated
 */
export const useIsAuthenticated = (): boolean => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
};

/**
 * Hook to get the current user
 * @returns The current user or null if not authenticated
 */
export const useCurrentUser = (): AuthContextType['user'] => {
  const { user, isAuthenticated } = useAuth();
  return isAuthenticated ? user : null;
};

/**
 * Hook to get the current session
 * @returns The current session or null if not authenticated
 */
export const useSession = (): Session | null => {
  const { session, isAuthenticated } = useAuth();
  return isAuthenticated ? session : null;
};
