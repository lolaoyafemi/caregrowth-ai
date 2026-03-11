
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
  CalendarDays,
  Building2,
  GraduationCap
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
  
  useEffect(() => {
    refetch();
    const interval = setInterval(() => {
      refetch();
    }, 2000);
    return () => clearInterval(interval);
  }, [refetch]);

  useEffect(() => {
    if (credits !== previousCredits && previousCredits !== 0 && !loading) {
      setCreditUpdateAnimation(true);
      setPreviousCredits(credits);
      const timer = setTimeout(() => setCreditUpdateAnimation(false), 2000);
      return () => clearTimeout(timer);
    } else if (previousCredits === 0 && credits > 0) {
      setPreviousCredits(credits);
    }
  }, [credits, previousCredits, loading]);
  
  const showSuperAdminItems = userRole === 'super_admin';
  const showAgencyAdminItems = userRole === 'agency_admin';
  const showAdminItems = userRole === 'admin' || userRole === 'agency_admin' || userRole === 'super_admin';
  const showCollaboratorItems = userRole === 'collaborator' || userRole === 'admin' || userRole === 'agency_admin' || userRole === 'super_admin';
  const showContentWriterItems = userRole === 'content_writer' || userRole === 'admin' || userRole === 'agency_admin' || userRole === 'super_admin';
  
  const isSuperAdmin = userRole === 'super_admin';
  
  const creditBalance = {
    available: credits,
    usedThisMonth: usedThisMonth,
    totalAllocation: credits + usedThisMonth,
    percentUsed: getUsagePercentage(),
    percentRemaining: 100 - getUsagePercentage()
  };

  const handleBuyCredits = () => {
    window.location.href = '/stripe-payment';
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) => cn(
    "flex items-center gap-3 px-3 py-2.5 rounded-none transition-all duration-200 text-[13px] tracking-wide",
    isActive 
      ? "bg-caregrowth-green/10 text-caregrowth-green border-l-2 border-caregrowth-green" 
      : "text-white/50 hover:text-white/80 hover:bg-white/[0.04] border-l-2 border-transparent",
    collapsed && "justify-center px-2"
  );
  
  return (
    <div className={cn(
      "flex flex-col border-r border-white/[0.06] transition-all duration-300 bg-caregrowth-blue",
      collapsed ? "w-[80px]" : "w-[250px]"
    )}>
      {/* Sidebar Header */}
      <div className="p-4 flex items-center border-b border-white/[0.06] h-16">
        {!collapsed && (
          <span className="text-[11px] font-medium tracking-[0.3em] uppercase text-white/40 flex items-center gap-2">
            {isSuperAdmin && <Shield size={14} className="text-caregrowth-green" />}
            Command Center
          </span>
        )}
        {collapsed && (
          <span className="text-xs font-bold text-caregrowth-green">
            {isSuperAdmin ? "SA" : "CG"}
          </span>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          className="ml-auto text-white/30 hover:text-white/60 hover:bg-white/[0.04]" 
          onClick={() => setCollapsed(!collapsed)}
        >
          <Menu size={18} />
        </Button>
      </div>

      {/* Credit Balance */}
      {(showAdminItems && !isSuperAdmin) && (
        <div className={cn(
          "px-3 py-3 border-b border-white/[0.06] transition-all duration-300",
          collapsed ? "items-center justify-center" : "",
          creditUpdateAnimation && "ring-1 ring-caregrowth-green/30"
        )}>
          {!collapsed ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/40 flex items-center">
                  <Coins size={12} className="mr-1.5 text-caregrowth-green/60" />
                  Credits
                  {creditUpdateAnimation && (
                    <Zap size={10} className="ml-1 text-caregrowth-green animate-pulse" />
                  )}
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-5 w-5 p-0 text-white/20 hover:text-white/50"
                        onClick={refetch}
                        disabled={loading}
                      >
                        <ChevronRight size={10} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Refresh credits</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-white/30">Available</span>
                <span className={cn(
                  "font-medium text-sm text-white/80 transition-all duration-300",
                  creditUpdateAnimation && "scale-110 text-caregrowth-green"
                )}>
                  {credits.toLocaleString()}
                </span>
              </div>
              <div className="space-y-1">
                <div className="w-full bg-white/[0.06] h-1 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-caregrowth-green/60 transition-all duration-500"
                    style={{ width: `${creditBalance.percentRemaining}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-white/25">
                  <span>Used: {creditBalance.usedThisMonth.toLocaleString()}</span>
                  <span>{creditBalance.percentUsed}%</span>
                </div>
              </div>
              <Button 
                onClick={handleBuyCredits}
                className="w-full py-1 h-7 text-[10px] tracking-[0.15em] uppercase bg-caregrowth-green/20 hover:bg-caregrowth-green/30 text-caregrowth-green border border-caregrowth-green/20 rounded-none"
              >
                Buy Credits
              </Button>
            </div>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center justify-center">
                    <Coins size={18} className="mb-1 text-caregrowth-green/50" />
                    <span className="text-[10px] font-medium text-white/50">
                      {credits.toLocaleString()}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <div className="space-y-1 w-40">
                    <p className="font-medium text-xs">Credit Balance</p>
                    <p className="text-xs">Available: {credits.toLocaleString()}</p>
                    <p className="text-xs">Used: {creditBalance.usedThisMonth.toLocaleString()}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}

      {/* Sidebar Content */}
      <div className="flex-1 px-3 py-4 overflow-y-auto">
        <p className={cn("text-[10px] font-medium tracking-[0.25em] uppercase text-white/25 mb-3", 
          collapsed && "text-center"
        )}>
          {!collapsed ? "Navigation" : "Nav"}
        </p>
        
        <nav className="space-y-0.5">
          <NavLink to="/dashboard" end className={navLinkClass}>
            <LayoutDashboard size={18} />
            {!collapsed && <span>Dashboard</span>}
          </NavLink>

          {/* Super Admin Tools */}
          {showSuperAdminItems && (
            <>
              <p className={cn("text-[10px] font-medium tracking-[0.25em] uppercase text-caregrowth-green/40 mt-6 mb-2", 
                collapsed && "text-center"
              )}>
                {!collapsed ? "Super Admin" : "SA"}
              </p>
              
              <NavLink to="/dashboard/super-admin" className={navLinkClass}>
                <Shield size={18} />
                {!collapsed && <span>Credit Management</span>}
              </NavLink>

              <NavLink to="/dashboard/knowledge" className={navLinkClass}>
                <BookOpen size={18} />
                {!collapsed && <span>Knowledge Base</span>}
              </NavLink>
              
              <NavLink to="/dashboard/admin/users" className={navLinkClass}>
                <Users size={18} />
                {!collapsed && <span>User Management</span>}
              </NavLink>
            </>
          )}
          
          {/* Agency Admin Tools */}
          {showAgencyAdminItems && (
            <>
              <p className={cn("text-[10px] font-medium tracking-[0.25em] uppercase text-white/25 mt-6 mb-2", 
                collapsed && "text-center"
              )}>
                {!collapsed ? "Agency" : "AG"}
              </p>
              
              <NavLink to="/dashboard/agency/team" className={navLinkClass}>
                <Users size={18} />
                {!collapsed && <span>Team Management</span>}
              </NavLink>
              
              <NavLink to="/dashboard/agency/usage" className={navLinkClass}>
                <BarChart size={18} />
                {!collapsed && <span>Usage Analytics</span>}
              </NavLink>
            </>
          )}
          
          {/* AI Tools */}
          <p className={cn("text-[10px] font-medium tracking-[0.25em] uppercase text-white/25 mt-6 mb-2", 
            collapsed && "text-center"
          )}>
            {!collapsed ? "AI Tools" : "AI"}
          </p>
          
          {showContentWriterItems && (
            <NavLink to="/dashboard/content-calendar" className={navLinkClass}>
              <CalendarDays size={18} />
              {!collapsed && <span>Nora</span>}
            </NavLink>
          )}

          {showSuperAdminItems && (
            <NavLink to="/dashboard/prompts" className={navLinkClass}>
              <FileText size={18} />
              {!collapsed && <span>Prompts Library</span>}
            </NavLink>
          )}

          {showAdminItems && (
            <NavLink to="/dashboard/agency-setup" className={navLinkClass}>
              <Building2 size={18} />
              {!collapsed && <span>Agency Setup</span>}
            </NavLink>
          )}

          {showAdminItems && (
            <NavLink to="/dashboard/training" className={navLinkClass}>
              <GraduationCap size={18} />
              {!collapsed && <span>Practice Gym</span>}
            </NavLink>
          )}

          {showCollaboratorItems && (
            <NavLink to="/dashboard/qa-assistant" className={navLinkClass}>
              <MessageCircle size={18} />
              {!collapsed && <span>Jared</span>}
            </NavLink>
          )}
        </nav>
      </div>

      {/* Sidebar Footer */}
      <div className="mt-auto border-t border-white/[0.06]">
        <div className="px-3 py-4 space-y-0.5">
          <NavLink to="/dashboard/settings" className={navLinkClass}>
            <Settings size={18} />
            {!collapsed && <span>Settings</span>}
          </NavLink>

          <NavLink to="/dashboard/help" onClick={clearNotifications} className={navLinkClass}>
            <span className="relative inline-flex">
              <HelpCircle size={18} />
              {collapsed && unreadSupportCount > 0 && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-caregrowth-green" />
              )}
            </span>
            {!collapsed && <span>Help & Support</span>}
            {!collapsed && unreadSupportCount > 0 && (
              <span className="ml-auto inline-flex items-center justify-center rounded-none bg-caregrowth-green/20 text-caregrowth-green text-[10px] px-1.5 min-w-[18px] h-4 tracking-wider">
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
