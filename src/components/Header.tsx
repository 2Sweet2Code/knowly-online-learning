
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import { LoginModal } from "./modals/LoginModal";
import { SignupModal } from "./modals/SignupModal";

export const Header = () => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [signupModalOpen, setSignupModalOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <header className="sticky top-0 bg-white shadow-sm z-50">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="text-2xl font-playfair font-bold text-brown">
          <Link to="/">Knowly</Link>
        </div>

        <nav className={`${mobileMenuOpen ? 'flex' : 'hidden'} md:flex flex-col md:flex-row absolute md:static top-full left-0 w-full md:w-auto bg-white md:bg-transparent shadow-md md:shadow-none`}>
          <ul className="flex flex-col md:flex-row items-center md:space-x-8">
            <li className="py-2 md:py-0">
              <Link 
                to="/courses" 
                className="font-semibold relative hover:text-gold after:content-[''] after:absolute after:bottom-[-3px] after:left-0 after:w-0 after:h-0.5 after:bg-gold after:transition-all after:duration-300 hover:after:w-full"
              >
                Kurset
              </Link>
            </li>
            {user && (
              <li className="py-2 md:py-0">
                <Link 
                  to="/my-space" 
                  className="font-semibold relative hover:text-gold after:content-[''] after:absolute after:bottom-[-3px] after:left-0 after:w-0 after:h-0.5 after:bg-gold after:transition-all after:duration-300 hover:after:w-full"
                >
                  Hapësira Ime
                </Link>
              </li>
            )}
            {user && (user.role === 'instructor' || user.role === 'admin') && (
              <li className="py-2 md:py-0">
                <Link 
                  to="/dashboard" 
                  className="font-semibold relative hover:text-gold after:content-[''] after:absolute after:bottom-[-3px] after:left-0 after:w-0 after:h-0.5 after:bg-gold after:transition-all after:duration-300 hover:after:w-full"
                >
                  Paneli i Menaxhimit
                </Link>
              </li>
            )}
          </ul>

          <div className="flex flex-col md:flex-row md:ml-8 gap-3 p-4 md:p-0 border-t md:border-0 mt-3 md:mt-0">
            {!user ? (
              <>
                <button 
                  className="btn btn-secondary"
                  onClick={() => setLoginModalOpen(true)}
                >
                  Kyçu
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={() => setSignupModalOpen(true)}
                >
                  Regjistrohu
                </button>
              </>
            ) : (
              <button 
                className="btn btn-secondary"
                onClick={logout}
              >
                Dilni
              </button>
            )}
          </div>
        </nav>

        <button 
          className="md:hidden block text-brown"
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Modals */}
      <LoginModal 
        isOpen={loginModalOpen} 
        onClose={() => setLoginModalOpen(false)} 
        onSwitchToSignup={() => {
          setLoginModalOpen(false);
          setTimeout(() => setSignupModalOpen(true), 150);
        }}
      />
      
      <SignupModal 
        isOpen={signupModalOpen} 
        onClose={() => setSignupModalOpen(false)}
        onSwitchToLogin={() => {
          setSignupModalOpen(false);
          setTimeout(() => setLoginModalOpen(true), 150);
        }}
      />
    </header>
  );
};
