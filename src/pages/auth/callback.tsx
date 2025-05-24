import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AuthContext } from '../../context/auth-context';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the URL hash which contains the access token
        const { data, error: authError } = await supabase.auth.getSession();
        
        if (authError) {
          console.error('Error getting session:', authError);
          setError('Failed to authenticate. Please try again.');
          return;
        }

        if (data?.session?.user) {
          // The auth context will handle updating the user
          // Just navigate to dashboard as the auth state will be updated by the AuthProvider
          navigate('/dashboard');
        } else {
          // No session found, redirect to login
          navigate('/login');
        }
      } catch (err) {
        console.error('Error in auth callback:', err);
        setError('An unexpected error occurred. Please try again.');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          <h1 className="text-2xl font-bold text-gray-900">
            {error ? 'Authentication Error' : 'Completing Authentication...'}
          </h1>
          {error ? (
            <p className="text-red-600 text-center">{error}</p>
          ) : (
            <p className="text-gray-600 text-center">
              Please wait while we log you in...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
