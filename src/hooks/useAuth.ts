import { useContext } from 'react';
import { AuthContext, type AuthContextType } from '../context/auth-context';

/**
 * Custom hook to access the auth context
 * @returns The auth context with user and auth methods
 * @throws Error if used outside of an AuthProvider
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
