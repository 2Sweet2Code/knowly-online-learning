import { useAuth } from "../../context/AuthContext";
import { NavLink } from "react-router-dom";

interface DashboardSidebarProps {
  onCreateCourseClick: () => void;
}

const baseLinkClasses = "w-full text-left py-2 px-4 rounded-md transition-colors text-brown";
const activeLinkClasses = "bg-cream text-brown-dark font-semibold";
const inactiveLinkClasses = "hover:bg-cream";

const getNavLinkClass = ({ isActive }: { isActive: boolean }) => 
  `${baseLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`;

export const DashboardSidebar = ({ 
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
          <NavLink 
            to="." 
            end
            className={getNavLinkClass}
          >
            Paneli Kryesor
          </NavLink>
        </li>
        <li>
          <NavLink 
            to="courses" 
            className={getNavLinkClass}
          >
            Kurset e Mia
          </NavLink>
        </li>
        <li>
          <button 
            className={`${baseLinkClasses} ${inactiveLinkClasses}`}
            onClick={onCreateCourseClick}
          >
            Krijo Kurs
          </button>
        </li>
        <li>
          <NavLink 
            to="students" 
            className={getNavLinkClass}
          >
            Studentët
          </NavLink>
        </li>
        <li>
          <NavLink 
            to="questions" 
            className={getNavLinkClass}
          >
            Pyetjet
          </NavLink>
        </li>
        <li>
          <NavLink 
            to="settings" 
            className={getNavLinkClass}
          >
            Cilësimet
          </NavLink>
        </li>
        
        {isAdmin && (
          <>
            <li className="pt-2">
              <hr className="border-t border-lightGray my-3" />
            </li>
            <li>
              <NavLink 
                to="user-management" 
                className={getNavLinkClass}
              >
                Menaxho Përdoruesit
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="content-moderation" 
                className={getNavLinkClass}
              >
                Modero Përmbajtjen
              </NavLink>
            </li>
          </>
        )}
      </ul>
    </aside>
  );
};
