
import { useAuth } from "../../context/AuthContext";

interface DashboardSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  onCreateCourseClick: () => void;
}

export const DashboardSidebar = ({ 
  activeView, 
  onViewChange,
  onCreateCourseClick
}: DashboardSidebarProps) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <aside className="w-full md:w-64 flex-shrink-0 bg-white rounded-lg p-6 border border-lightGray shadow-sm h-fit">
      <h4 className="text-xl font-playfair text-brown-dark mb-5 pb-3 border-b border-lightGray">
        Navigimi
      </h4>
      <ul className="space-y-2">
        <li>
          <button 
            className={`w-full text-left py-2 px-4 rounded-md transition-colors ${
              activeView === 'dashboard' 
                ? 'bg-cream text-brown-dark font-semibold' 
                : 'hover:bg-cream text-brown'
            }`}
            onClick={() => onViewChange('dashboard')}
          >
            Paneli Kryesor
          </button>
        </li>
        <li>
          <button 
            className={`w-full text-left py-2 px-4 rounded-md transition-colors ${
              activeView === 'my-courses' 
                ? 'bg-cream text-brown-dark font-semibold' 
                : 'hover:bg-cream text-brown'
            }`}
            onClick={() => onViewChange('my-courses')}
          >
            Kurset e Mia
          </button>
        </li>
        <li>
          <button 
            className="w-full text-left py-2 px-4 rounded-md transition-colors hover:bg-cream text-brown"
            onClick={onCreateCourseClick}
          >
            Krijo Kurs
          </button>
        </li>
        <li>
          <button 
            className={`w-full text-left py-2 px-4 rounded-md transition-colors ${
              activeView === 'students' 
                ? 'bg-cream text-brown-dark font-semibold' 
                : 'hover:bg-cream text-brown'
            }`}
            onClick={() => onViewChange('students')}
          >
            Studentët
          </button>
        </li>
        <li>
          <button 
            className={`w-full text-left py-2 px-4 rounded-md transition-colors ${
              activeView === 'analytics' 
                ? 'bg-cream text-brown-dark font-semibold' 
                : 'hover:bg-cream text-brown'
            }`}
            onClick={() => onViewChange('analytics')}
          >
            Analitika
          </button>
        </li>
        <li>
          <button 
            className={`w-full text-left py-2 px-4 rounded-md transition-colors ${
              activeView === 'settings' 
                ? 'bg-cream text-brown-dark font-semibold' 
                : 'hover:bg-cream text-brown'
            }`}
            onClick={() => onViewChange('settings')}
          >
            Cilësimet
          </button>
        </li>
        
        {isAdmin && (
          <>
            <li className="pt-2">
              <hr className="border-t border-lightGray my-3" />
            </li>
            <li>
              <button 
                className={`w-full text-left py-2 px-4 rounded-md transition-colors ${
                  activeView === 'user-management' 
                    ? 'bg-cream text-brown-dark font-semibold' 
                    : 'hover:bg-cream text-brown'
                }`}
                onClick={() => onViewChange('user-management')}
              >
                Menaxho Përdoruesit
              </button>
            </li>
            <li>
              <button 
                className={`w-full text-left py-2 px-4 rounded-md transition-colors ${
                  activeView === 'content-moderation' 
                    ? 'bg-cream text-brown-dark font-semibold' 
                    : 'hover:bg-cream text-brown'
                }`}
                onClick={() => onViewChange('content-moderation')}
              >
                Modero Përmbajtjen
              </button>
            </li>
          </>
        )}
      </ul>
    </aside>
  );
};
