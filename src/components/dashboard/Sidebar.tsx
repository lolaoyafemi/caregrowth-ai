
import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
  HelpCircle,
  Shield,
  Coins,
  ChevronRight,
  Zap,
  BookOpen,
  CalendarDays
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserRole } from '../../contexts/UserContext';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUserCredits } from '@/hooks/useUserCredits';
import { useSupportNotifications } from '@/hooks/useSupportNotifications';
interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  userRole?: UserRole;
}

const Sidebar = ({ collapsed, setCollapsed, userRole }: SidebarProps) => {
  const navigate = useNavigate();
  const { credits, loading, refetch, usedThisMonth, getUsagePercentage } = useUserCredits();
  const [creditUpdateAnimation, setCreditUpdateAnimation] = useState(false);
  const [previousCredits, setPreviousCredits] = useState(credits);
  const { notifications, clearNotifications } = useSupportNotifications();
  const unreadSupportCount = notifications.newMessageCount;
  
  // Force refetch credits when component mounts and when credits change
  useEffect(() => {
    refetch();
    const interval = setInterval(() => {
      refetch();
    }, 2000); // Refetch every 2 seconds as backup
    
    return () => clearInterval(interval);
  }, [refetch]);

  // Add animation effect when credits change
  useEffect(() => {
    if (credits !== previousCredits && previousCredits !== 0 && !loading) {
      console.log('Credits changed in sidebar:', { previousCredits, credits });
      setCreditUpdateAnimation(true);
      setPreviousCredits(credits);
      
      // Remove animation after 2 seconds
      const timer = setTimeout(() => {
        setCreditUpdateAnimation(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    } else if (previousCredits === 0 && credits > 0) {
      // Initial load, just set previous credits without animation
      setPreviousCredits(credits);
    }
  }, [credits, previousCredits, loading]);

  // Add debugging
  useEffect(() => {
    console.log('Sidebar - Credits updated:', credits);
    console.log('Sidebar - Loading:', loading);
    console.log('Sidebar - Animation:', creditUpdateAnimation);
  }, [credits, loading, creditUpdateAnimation]);
  
  // Determine which menu items to show based on user role
  const showSuperAdminItems = userRole === 'super_admin';
  const showAgencyAdminItems = userRole === 'agency_admin';
  const showAdminItems = userRole === 'admin' || userRole === 'agency_admin' || userRole === 'super_admin';
  const showCollaboratorItems = userRole === 'collaborator' || userRole === 'admin' || userRole === 'agency_admin' || userRole === 'super_admin';
  const showContentWriterItems = userRole === 'content_writer' || userRole === 'admin' || userRole === 'agency_admin' || userRole === 'super_admin';
  
  const isSuperAdmin = userRole === 'super_admin';
  
  // Credit balance details - show for both super admins and main admins
  const creditBalance = {
    available: credits,
    usedThisMonth: usedThisMonth,
    totalAllocation: credits + usedThisMonth,
    percentUsed: getUsagePercentage(),
    // Calculate remaining percentage (inverted logic)
    percentRemaining: 100 - getUsagePercentage()
  };

  const handleBuyCredits = () => {
    window.location.href = '/stripe-payment';
  };
  
  return (
    <div className={cn(
      "flex flex-col border-r transition-all duration-300",
      collapsed ? "w-[80px]" : "w-[250px]",
      isSuperAdmin ? "bg-green-50 border-green-200" : "bg-white"
    )}>
      {/* Sidebar Header */}
      <div className={cn(
        "p-4 flex items-center border-b h-16",
        isSuperAdmin ? "border-green-200" : ""
      )}>
        {!collapsed && (
          <span className="text-xl font-bold text-caregrowth-blue flex items-center gap-2">
            {isSuperAdmin && <Shield size={18} className="text-green-700" />}
            CareGrowth Assistant
          </span>
        )}
        {collapsed && (
          <span className="text-xl font-bold text-caregrowth-blue">
            {isSuperAdmin ? "SA" : "CAI"}
          </span>
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

      {/* Credit Balance - Hidden for super admins */}
      {(showAdminItems && !isSuperAdmin) && (
        <div className={cn(
          "px-3 py-3 border-b transition-all duration-300",
          collapsed ? "items-center justify-center" : "",
          creditUpdateAnimation && "ring-2 ring-blue-400 ring-opacity-50 scale-[1.02]"
        )}>
          {!collapsed ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className={cn(
                  "text-xs font-semibold flex items-center",
                  isSuperAdmin ? "text-green-700" : "text-caregrowth-blue"
                )}>
                  <Coins size={14} className="mr-1" />
                  CREDIT BALANCE
                  {creditUpdateAnimation && (
                    <Zap size={12} className="ml-1 text-yellow-500 animate-pulse" />
                  )}
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0"
                        onClick={refetch}
                        disabled={loading}
                      >
                        <ChevronRight size={12} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Refresh credits</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Available</span>
                <span className={cn(
                  "font-medium text-sm transition-all duration-300",
                  creditUpdateAnimation && "scale-110 text-blue-600"
                )}>
                  {credits.toLocaleString()}
                </span>
              </div>
              <div className="space-y-1">
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      isSuperAdmin ? "bg-green-600" : "bg-caregrowth-blue"
                    )}
                    style={{ width: `${creditBalance.percentRemaining}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Used: {creditBalance.usedThisMonth.toLocaleString()}</span>
                  <span>{creditBalance.percentUsed}%</span>
                </div>
              </div>
              <Button 
                onClick={handleBuyCredits}
                className={cn(
                  "w-full py-1 h-8 text-xs transition-all",
                  isSuperAdmin 
                    ? "bg-green-600 hover:bg-green-700" 
                    : "bg-caregrowth-blue hover:bg-caregrowth-blue/90"
                )}
              >
                Buy More Credits
              </Button>
            </div>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    "flex flex-col items-center justify-center transition-all duration-300",
                    creditUpdateAnimation && "scale-110"
                  )}>
                    <div className="relative">
                      <Coins size={20} className={cn(
                        "mb-1",
                        isSuperAdmin ? "text-green-600" : "text-caregrowth-blue"
                      )} />
                      {creditUpdateAnimation && (
                        <Zap size={12} className="absolute -top-1 -right-1 text-yellow-500 animate-pulse" />
                      )}
                    </div>
                    <span className={cn(
                      "text-xs font-medium transition-all duration-300",
                      creditUpdateAnimation && "text-blue-600"
                    )}>
                      {credits.toLocaleString()}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <div className="space-y-2 w-48">
                    <p className="font-medium">Credit Balance</p>
                    <p className="text-sm">Available: {credits.toLocaleString()}</p>
                    <p className="text-sm">Used: {creditBalance.usedThisMonth.toLocaleString()}</p>
                    <Progress value={creditBalance.percentRemaining} className="h-2" />
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}

      {/* Sidebar Content */}
      <div className="flex-1 px-3 py-4 overflow-y-auto">
        <p className={cn("text-xs font-semibold text-gray-500 mb-2", 
          collapsed && "text-center"
        )}>
          {!collapsed ? "CareGrowth Assistant Tools" : "Tools"}
        </p>
        
        <nav className="space-y-1">
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
              isActive 
                ? (isSuperAdmin ? "bg-green-100 text-green-800" : "bg-caregrowth-lightblue text-caregrowth-blue") 
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
              <p className={cn("text-xs font-semibold text-green-600 mt-6 mb-2", 
                collapsed && "text-center"
              )}>
                {!collapsed ? "Super Admin" : "SA"}
              </p>
              
              <NavLink
                to="/dashboard/super-admin"
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                  isActive 
                    ? "bg-green-100 text-green-800" 
                    : "text-gray-700 hover:bg-gray-100",
                  collapsed && "justify-center"
                )}
              >
                <Shield size={20} />
                {!collapsed && <span>Credit Management</span>}
              </NavLink>

              <NavLink
                to="/dashboard/knowledge"
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                  isActive 
                    ? "bg-green-100 text-green-800" 
                    : "text-gray-700 hover:bg-gray-100",
                  collapsed && "justify-center"
                )}
              >
                <BookOpen size={20} />
                {!collapsed && <span>Knowledge Base</span>}
              </NavLink>
              
              <NavLink
                to="/dashboard/admin/users"
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                  isActive 
                    ? "bg-green-100 text-green-800" 
                    : "text-gray-700 hover:bg-gray-100",
                  collapsed && "justify-center"
                )}
              >
                <Users size={20} />
                {!collapsed && <span>User Management</span>}

              
              
              </NavLink>


              {/* 
              
              <NavLink
                to="/dashboard/admin/usage"
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                  isActive 
                    ? "bg-green-100 text-green-800" 
                    : "text-gray-700 hover:bg-gray-100",
                  collapsed && "justify-center"
                )}
              >
                <BarChart size={20} />
                {!collapsed && <span>Usage Monitoring</span>}
              </NavLink>

               */}
              
            </>
          )}
          
          {/* Agency Admin Tools - Only show Team Management for agency admins, not super admins */}
          {showAgencyAdminItems && (
            <>
              <p className={cn("text-xs font-semibold text-blue-600 mt-6 mb-2", 
                collapsed && "text-center"
              )}>
                {!collapsed ? "Agency Management" : "Agency"}
              </p>
              
              <NavLink
                to="/dashboard/agency/team"
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
                to="/dashboard/agency/usage"
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                  isActive 
                    ? (isSuperAdmin ? "bg-green-100 text-green-800" : "bg-caregrowth-lightblue text-caregrowth-blue") 
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
          
          {showContentWriterItems && (
            <NavLink
              to="/dashboard/social-media"
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                isActive 
                  ? (isSuperAdmin ? "bg-green-100 text-green-800" : "bg-caregrowth-lightblue text-caregrowth-blue") 
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
              {!collapsed && <span>Nora</span>}
            </NavLink>
          )}

          {/* Only show Prompts Library to super admins */}
          {showSuperAdminItems && (
            <NavLink
              to="/dashboard/prompts"
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                isActive 
                  ? "bg-green-100 text-green-800" 
                  : "text-gray-700 hover:bg-gray-100",
                collapsed && "justify-center"
              )}
            >
              <FileText size={20} />
              {!collapsed && <span>Prompts Library</span>}
            </NavLink>
          )}

          {showCollaboratorItems && (
            <NavLink
              to="/dashboard/content-calendar"
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                isActive 
                  ? (isSuperAdmin ? "bg-green-100 text-green-800" : "bg-caregrowth-lightblue text-caregrowth-blue")  
                  : "text-gray-700 hover:bg-gray-100",
                collapsed && "justify-center"
              )}
            >
              <CalendarDays size={20} />
              {!collapsed && <span>Content Calendar</span>}
            </NavLink>
          )}

          {showCollaboratorItems && (
            <NavLink
              to="/dashboard/qa-assistant"
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                isActive 
                  ? (isSuperAdmin ? "bg-green-100 text-green-800" : "bg-caregrowth-lightblue text-caregrowth-blue") 
                  : "text-gray-700 hover:bg-gray-100",
                collapsed && "justify-center"
              )}
            >
              <MessageCircle size={20} />
              {!collapsed && <span>Jared</span>}
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
                ? (isSuperAdmin ? "bg-green-100 text-green-800" : "bg-caregrowth-lightblue text-caregrowth-blue") 
                : "text-gray-700 hover:bg-gray-100",
              collapsed && "justify-center"
            )}
          >
            <Settings size={20} />
            {!collapsed && <span>Settings</span>}
          </NavLink>

          <NavLink
            to="/dashboard/help"
            onClick={clearNotifications}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
              isActive 
                ? (isSuperAdmin ? "bg-green-100 text-green-800" : "bg-caregrowth-lightblue text-caregrowth-blue") 
                : "text-gray-700 hover:bg-gray-100",
              collapsed && "justify-center"
            )}
          >
            <span className="relative inline-flex">
              <HelpCircle size={20} />
              {collapsed && unreadSupportCount > 0 && (
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-600" />
              )}
            </span>
            {!collapsed && <span>Help & Support</span>}
            {!collapsed && unreadSupportCount > 0 && (
              <span className="ml-auto inline-flex items-center justify-center rounded-full bg-red-600 text-white text-xs px-2 min-w-[20px] h-5">
                {unreadSupportCount > 99 ? '99+' : unreadSupportCount}
              </span>
            )}
          </NavLink>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
