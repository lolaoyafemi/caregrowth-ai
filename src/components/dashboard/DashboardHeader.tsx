
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
    <header className="border-b border-white/[0.06] h-16 px-6 flex items-center justify-between bg-caregrowth-blue/95 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <h1 className="text-sm font-medium tracking-[0.2em] uppercase text-white/70">CareGrowth</h1>
        
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
            <Avatar className="h-9 w-9 cursor-pointer ring-1 ring-white/10 hover:ring-caregrowth-green/40 transition-all">
              <AvatarFallback className="bg-white/[0.06] text-white/70 text-xs tracking-wider">{getInitials(userName)}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-caregrowth-blue border-white/10 text-white/80">
            <DropdownMenuLabel className="flex items-center gap-2 text-white/50 text-xs tracking-wider uppercase">
              {isSuperAdmin && <Shield size={14} className="text-caregrowth-green" />}
              <span>{getRoleDisplayName(userRole)}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/[0.06]" />
            <DropdownMenuItem onClick={handleLogout} className="text-white/70 hover:text-white hover:bg-white/[0.06] cursor-pointer">
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
