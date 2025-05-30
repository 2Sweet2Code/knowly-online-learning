
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export const SignupModal = ({ isOpen, onClose, onSwitchToLogin }: SignupModalProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"student" | "instructor" | "admin" | "">("");
  const [localLoading, setLocalLoading] = useState(false);
  const { signup, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  // Close modal if user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && isOpen) {
      onClose();
    }
  }, [isAuthenticated, isOpen, onClose]);

  if (!isOpen) return null;

  // Helper function to validate email format
  const isValidEmail = (email: string): boolean => {
    // More permissive email validation that allows most common email formats
    const emailRegex = /^[^\s@]+@[^\s@.]+\.[^\s@.]+\.[^\s@]+$|^[^\s@]+@[^\s@.]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate all required fields are filled
    if (!name || !email || !password || !confirmPassword || !role) {
      toast({
        title: "Gabim!",
        description: "Ju lutemi plotësoni të gjitha fushat.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate email format
    if (!isValidEmail(email)) {
      toast({
        title: "Gabim!",
        description: "Ju lutemi shkruani një email të vlefshëm.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate password match
    if (password !== confirmPassword) {
      toast({
        title: "Gabim!",
        description: "Fjalëkalimet nuk përputhen. Ju lutemi provoni përsëri.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate password strength (at least 6 characters)
    if (password.length < 6) {
      toast({
        title: "Gabim!",
        description: "Fjalëkalimi duhet të ketë të paktën 6 karaktere.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLocalLoading(true);
      await signup(name, email, password, role);
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
        
        <h3 className="text-2xl font-playfair text-center mb-6">Krijo Llogari të Re</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="signup-name" className="block mb-2 font-semibold text-brown">
              Emri i plotë:
            </label>
            <input
              type="text"
              id="signup-name"
              className="w-full px-4 py-3 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={showLoading}
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="signup-email" className="block mb-2 font-semibold text-brown">
              Email:
            </label>
            <input
              type="email"
              id="signup-email"
              className="w-full px-4 py-3 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={showLoading}
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="signup-password" className="block mb-2 font-semibold text-brown">
              Fjalëkalimi:
            </label>
            <input
              type="password"
              id="signup-password"
              className="w-full px-4 py-3 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={showLoading}
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="signup-confirm-password" className="block mb-2 font-semibold text-brown">
              Konfirmo Fjalëkalimin:
            </label>
            <input
              type="password"
              id="signup-confirm-password"
              className="w-full px-4 py-3 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={showLoading}
              required
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="signup-role" className="block mb-2 font-semibold text-brown">
              Regjistrohu si:
            </label>
            <select
              id="signup-role"
              className="w-full px-4 py-3 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown"
              value={role}
              onChange={(e) => setRole(e.target.value as "student" | "instructor" | "admin" | "")}
              disabled={showLoading}
              required
            >
              <option value="">Zgjidhni Rolin...</option>
              <option value="student">Student</option>
              <option value="instructor">Instruktor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary btn-block flex justify-center items-center"
            disabled={showLoading}
          >
            {showLoading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            ) : null}
            Regjistrohu
          </button>
        </form>
        
        <div className="text-center mt-5 text-sm">
          Keni tashmë llogari? <button 
            className="text-gold font-semibold hover:underline" 
            onClick={onSwitchToLogin}
            disabled={showLoading}
            type="button"
          >
            Kyçu
          </button>
        </div>
      </div>
    </div>
  );
};
