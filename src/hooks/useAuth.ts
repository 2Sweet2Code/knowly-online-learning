import { useContext } from 'react';
import { AuthContext, type AuthContextType } from '../context/auth-context'; // Import from the correct file

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
