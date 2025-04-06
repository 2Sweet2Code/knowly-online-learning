
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToSignup: () => void;
}

export const LoginModal = ({ isOpen, onClose, onSwitchToSignup }: LoginModalProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localLoading, setLocalLoading] = useState(false);
  const { login, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  // Close modal if user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && isOpen) {
      onClose();
    }
  }, [isAuthenticated, isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Gabim!",
        description: "Ju lutemi plotësoni të gjitha fushat.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setLocalLoading(true);
      await login(email, password);
      // No need to show toast here as it's handled in the AuthContext
      // The modal will close automatically via the useEffect when isAuthenticated changes
    } catch (error) {
      console.error(error);
      // No need to show toast here as it's handled in the AuthContext
    } finally {
      setLocalLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Determine if we should show loading state
  const showLoading = localLoading || isLoading;

  return (
    <div 
      className="fixed inset-0 z-50 flex justify-center items-center bg-black bg-opacity-60"
      onClick={handleBackdropClick}
    >
      <div className="bg-white w-full max-w-md rounded-lg shadow-lg p-8 relative animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <button 
          className="absolute top-4 right-4 text-gray-500 hover:text-brown"
          onClick={onClose}
          disabled={showLoading}
          type="button"
        >
          <X size={20} />
        </button>
        
        <h3 className="text-2xl font-playfair text-center mb-6">Kyçu në Llogari</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="login-email" className="block mb-2 font-semibold text-brown">
              Email:
            </label>
            <input
              type="email"
              id="login-email"
              className="w-full px-4 py-3 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={showLoading}
              required
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="login-password" className="block mb-2 font-semibold text-brown">
              Fjalëkalimi:
            </label>
            <input
              type="password"
              id="login-password"
              className="w-full px-4 py-3 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={showLoading}
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary btn-block flex justify-center items-center"
            disabled={showLoading}
          >
            {showLoading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            ) : null}
            Kyçu
          </button>
        </form>
        
        <div className="text-center mt-5 text-sm">
          Nuk keni llogari? <button 
            className="text-gold font-semibold hover:underline" 
            onClick={onSwitchToSignup}
            disabled={showLoading}
            type="button"
          >
            Regjistrohu
          </button>
        </div>
        
        <div className="text-center mt-3">
          <button 
            className="text-sm text-gray-500 hover:text-brown"
            disabled={showLoading}
            type="button"
          >
            Keni harruar fjalëkalimin?
          </button>
        </div>
      </div>
    </div>
  );
};
