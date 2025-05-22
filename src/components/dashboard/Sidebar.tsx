
import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Menu, 
  Users, 
  BarChart, 
  Key, 
  FileText,
  MessageCircle,
  Settings,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserRole } from '../../contexts/UserContext';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  userRole?: UserRole;
}

const Sidebar = ({ collapsed, setCollapsed, userRole }: SidebarProps) => {
  // Determine which menu items to show based on user role
  const showSuperAdminItems = userRole === 'super_admin';
  const showAgencyAdminItems = userRole === 'agency_admin';
  const showMarketingItems = userRole === 'marketing' || userRole === 'agency_admin' || userRole === 'super_admin';
  const showHRItems = userRole === 'hr_admin' || userRole === 'agency_admin' || userRole === 'super_admin';
  const showQAItems = userRole === 'super_admin' || userRole !== 'carer'; // Fixed this line
  
  return (
    <div className={cn(
      "flex flex-col border-r bg-white transition-all duration-300",
      collapsed ? "w-[80px]" : "w-[250px]"
    )}>
      {/* Sidebar Header */}
      <div className="p-4 flex items-center border-b h-16">
        {!collapsed && (
          <span className="text-xl font-bold text-caregrowth-blue">CareGrowthAI</span>
        )}
        {collapsed && (
          <span className="text-xl font-bold text-caregrowth-blue">CAI</span>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          className="ml-auto" 
          onClick={() => setCollapsed(!collapsed)}
        >
          <Menu size={20} />
        </Button>
      </div>

      {/* Sidebar Content */}
      <div className="flex-1 px-3 py-4 overflow-y-auto">
        <p className={cn("text-xs font-semibold text-gray-500 mb-2", 
          collapsed && "text-center"
        )}>
          {!collapsed ? "CareGrowthAI Tools" : "Tools"}
        </p>
        
        <nav className="space-y-1">
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
              isActive 
                ? "bg-caregrowth-lightblue text-caregrowth-blue" 
                : "text-gray-700 hover:bg-gray-100",
              collapsed && "justify-center"
            )}
          >
            <LayoutDashboard size={20} />
            {!collapsed && <span>Dashboard</span>}
          </NavLink>

          {/* Super Admin Tools */}
          {showSuperAdminItems && (
            <>
              <p className={cn("text-xs font-semibold text-gray-500 mt-6 mb-2", 
                collapsed && "text-center"
              )}>
                {!collapsed ? "Admin Controls" : "Admin"}
              </p>
              
              <NavLink
                to="/dashboard/user-management"
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                  isActive 
                    ? "bg-caregrowth-lightblue text-caregrowth-blue" 
                    : "text-gray-700 hover:bg-gray-100",
                  collapsed && "justify-center"
                )}
              >
                <Users size={20} />
                {!collapsed && <span>User Management</span>}
              </NavLink>
              
              <NavLink
                to="/dashboard/usage-monitoring"
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                  isActive 
                    ? "bg-caregrowth-lightblue text-caregrowth-blue" 
                    : "text-gray-700 hover:bg-gray-100",
                  collapsed && "justify-center"
                )}
              >
                <BarChart size={20} />
                {!collapsed && <span>Usage Monitoring</span>}
              </NavLink>
              
              <NavLink
                to="/dashboard/api-keys"
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                  isActive 
                    ? "bg-caregrowth-lightblue text-caregrowth-blue" 
                    : "text-gray-700 hover:bg-gray-100",
                  collapsed && "justify-center"
                )}
              >
                <Key size={20} />
                {!collapsed && <span>API Key Management</span>}
              </NavLink>
            </>
          )}
          
          {/* Agency Admin Tools */}
          {showAgencyAdminItems && (
            <>
              <p className={cn("text-xs font-semibold text-gray-500 mt-6 mb-2", 
                collapsed && "text-center"
              )}>
                {!collapsed ? "Agency Management" : "Agency"}
              </p>
              
              <NavLink
                to="/dashboard/team-management"
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                  isActive 
                    ? "bg-caregrowth-lightblue text-caregrowth-blue" 
                    : "text-gray-700 hover:bg-gray-100",
                  collapsed && "justify-center"
                )}
              >
                <Users size={20} />
                {!collapsed && <span>Team Management</span>}
              </NavLink>
              
              <NavLink
                to="/dashboard/agency-usage"
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                  isActive 
                    ? "bg-caregrowth-lightblue text-caregrowth-blue" 
                    : "text-gray-700 hover:bg-gray-100",
                  collapsed && "justify-center"
                )}
              >
                <BarChart size={20} />
                {!collapsed && <span>Usage Analytics</span>}
              </NavLink>
            </>
          )}
          
          {/* Tools - Available based on permissions */}
          <p className={cn("text-xs font-semibold text-gray-500 mt-6 mb-2", 
            collapsed && "text-center"
          )}>
            {!collapsed ? "AI Tools" : "Tools"}
          </p>
          
          {showMarketingItems && (
            <NavLink
              to="/dashboard/social-media"
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                isActive 
                  ? "bg-caregrowth-lightblue text-caregrowth-blue" 
                  : "text-gray-700 hover:bg-gray-100",
                collapsed && "justify-center"
              )}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 10H9V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 10H17L15 13.5H17V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M11 10H13V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 7H8.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {!collapsed && <span>Social Media</span>}
            </NavLink>
          )}

          {showHRItems && (
            <NavLink
              to="/dashboard/document-search"
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                isActive 
                  ? "bg-caregrowth-lightblue text-caregrowth-blue" 
                  : "text-gray-700 hover:bg-gray-100",
                collapsed && "justify-center"
              )}
            >
              <FileText size={20} />
              {!collapsed && <span>Document Search</span>}
            </NavLink>
          )}

          {showQAItems && (
            <NavLink
              to="/dashboard/qa-assistant"
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                isActive 
                  ? "bg-caregrowth-lightblue text-caregrowth-blue" 
                  : "text-gray-700 hover:bg-gray-100",
                collapsed && "justify-center"
              )}
            >
              <MessageCircle size={20} />
              {!collapsed && <span>Q&A Assistant</span>}
            </NavLink>
          )}
        </nav>
      </div>

      {/* Sidebar Footer */}
      <div className="mt-auto border-t">
        <div className="px-3 py-4">
          <NavLink
            to="/dashboard/settings"
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
              isActive 
                ? "bg-caregrowth-lightblue text-caregrowth-blue" 
                : "text-gray-700 hover:bg-gray-100",
              collapsed && "justify-center"
            )}
          >
            <Settings size={20} />
            {!collapsed && <span>Settings</span>}
          </NavLink>

          <NavLink
            to="/dashboard/help"
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
              isActive 
                ? "bg-caregrowth-lightblue text-caregrowth-blue" 
                : "text-gray-700 hover:bg-gray-100",
              collapsed && "justify-center"
            )}
          >
            <HelpCircle size={20} />
            {!collapsed && <span>Help & Support</span>}
          </NavLink>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
