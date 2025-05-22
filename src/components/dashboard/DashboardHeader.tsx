
import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Shield } from 'lucide-react';
import { useUser, UserRole } from '../../contexts/UserContext';
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
  const { logout } = useUser();
  
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(part => part[0]).join('').toUpperCase();
  };
  
  const getRoleBadgeClass = (role?: UserRole) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-100 text-purple-800 border border-purple-300';
      case 'agency_admin':
        return 'bg-blue-100 text-blue-800 border border-blue-300';
      case 'marketing':
        return 'bg-green-100 text-green-800 border border-green-300';
      case 'hr_admin':
        return 'bg-orange-100 text-orange-800 border border-orange-300';
      case 'carer':
        return 'bg-pink-100 text-pink-800 border border-pink-300';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-300';
    }
  };
  
  const getRoleDisplayName = (role?: UserRole) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'agency_admin':
        return 'Agency Admin';
      case 'marketing':
        return 'Marketing';
      case 'hr_admin':
        return 'HR Admin';
      case 'carer':
        return 'Carer';
      default:
        return 'User';
    }
  };

  const isSuperAdmin = userRole === 'super_admin';

  return (
    <header className={`border-b h-16 px-6 flex items-center justify-between ${isSuperAdmin ? 'bg-purple-50' : 'bg-white'}`}>
      <div className="flex items-center">
        <h1 className="text-xl font-semibold text-gray-800">CareGrowthAI</h1>
        
        {userRole && (
          <div className={`ml-4 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${getRoleBadgeClass(userRole)}`}>
            {isSuperAdmin && <Shield size={14} className="text-purple-800" />}
            {getRoleDisplayName(userRole)}
          </div>
        )}
        
        {isSuperAdmin && (
          <div className="ml-4 text-sm font-medium text-purple-700">System Administration</div>
        )}
      </div>
      
      <div className="flex items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className={`h-9 w-9 cursor-pointer ${isSuperAdmin ? 'ring-2 ring-purple-400' : ''}`}>
              <AvatarFallback className={isSuperAdmin ? 'bg-purple-100 text-purple-800' : ''}>{getInitials(userName)}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="flex items-center gap-2">
              {isSuperAdmin && <Shield size={14} className="text-purple-800" />}
              <span>{getRoleDisplayName(userRole)} Account</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
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
