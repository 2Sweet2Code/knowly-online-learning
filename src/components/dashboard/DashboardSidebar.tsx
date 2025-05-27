import { useAuth } from "@/hooks/useAuth";
import { NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  const [isCourseAdmin, setIsCourseAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const isAdmin = user?.user_metadata?.role === 'admin';
  const isInstructor = user?.user_metadata?.role === 'instructor';
  const canViewApplications = isAdmin || isInstructor;
  
  // Check if user is a course admin
  useEffect(() => {
    const checkCourseAdmin = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('course_admins')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'approved')
          .maybeSingle();

        if (error) throw error;
        
        setIsCourseAdmin(!!data);
      } catch (error) {
        console.error('Error checking course admin status:', error);
        setIsCourseAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkCourseAdmin();
  }, [user]);
  
  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="animate-pulse h-8 bg-gray-200 rounded-md"></div>
        <div className="animate-pulse h-8 bg-gray-200 rounded-md"></div>
      </div>
    );
  }
  
  const canManageUsers = isAdmin || isCourseAdmin;

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
        
        {(isAdmin || isInstructor || isCourseAdmin) && (
          <>
            <li>
              <NavLink 
                to="courses" 
                className={getNavLinkClass}
              >
                Kurset e Mia
              </NavLink>
            </li>
            
            {(isAdmin || isInstructor) && (
              <li>
                <button 
                  className={`${baseLinkClasses} ${inactiveLinkClasses}`}
                  onClick={onCreateCourseClick}
                >
                  Krijo Kurs
                </button>
              </li>
            )}
            
            <li>
              <NavLink 
                to="students" 
                className={getNavLinkClass}
              >
                Studentët
              </NavLink>
            </li>
          </>
        )}
        
        {canViewApplications && (
          <li>
            <NavLink 
              to="applications" 
              className={getNavLinkClass}
            >
              Aplikimet e Kursit
            </NavLink>
          </li>
        )}

        <li>
          <NavLink 
            to="settings" 
            className={getNavLinkClass}
          >
            Cilësimet
          </NavLink>
        </li>
        
        {(isAdmin || isCourseAdmin) && (
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
            {isAdmin && (
              <li>
                <NavLink 
                  to="content-moderation" 
                  className={getNavLinkClass}
                >
                  Modero Përmbajtjen
                </NavLink>
              </li>
            )}
          </>
        )}
      </ul>
    </aside>
  );
};
