
import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Shield } from 'lucide-react';
import { useUser, UserRole } from '../../contexts/UserContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DashboardHeaderProps {
  userRole?: UserRole;
  userName?: string;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ userRole, userName }) => {
  const { signOut } = useAuth();
  
  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(part => part[0]).join('').toUpperCase();
  };
  
  const getRoleDisplayName = (role?: UserRole) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'agency_admin': return 'Agency Admin';
      case 'admin': return 'Admin';
      case 'collaborator': return 'Collaborator';
      case 'content_writer': return 'Content Writer';
      default: return 'User';
    }
  };

  const isSuperAdmin = userRole === 'super_admin';

  return (
    <header className="border-b border-[hsl(var(--sidebar-border))] h-16 px-6 flex items-center justify-between bg-[hsl(var(--header-bg))]">
      <div className="flex items-center gap-4">
        <h1 className="text-sm font-medium tracking-[0.2em] uppercase text-[hsl(var(--header-muted))]">CareGrowth</h1>
        
        {userRole && (
          <div className="px-3 py-1 rounded-none text-[10px] font-medium tracking-[0.15em] uppercase border border-caregrowth-green/30 text-caregrowth-green bg-caregrowth-green/10 flex items-center gap-1.5">
            {isSuperAdmin && <Shield size={12} />}
            {getRoleDisplayName(userRole)}
          </div>
        )}
      </div>
      
      <div className="flex items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="h-9 w-9 cursor-pointer ring-1 ring-border hover:ring-caregrowth-green/40 transition-all">
              <AvatarFallback className="bg-muted text-muted-foreground text-xs tracking-wider">{getInitials(userName)}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="flex items-center gap-2 text-muted-foreground text-xs tracking-wider uppercase">
              {isSuperAdmin && <Shield size={14} className="text-caregrowth-green" />}
              <span>{getRoleDisplayName(userRole)}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default DashboardHeader;
