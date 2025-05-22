
import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Settings, LogOut } from 'lucide-react';
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
        return 'bg-purple-100 text-purple-800';
      case 'agency_admin':
        return 'bg-blue-100 text-blue-800';
      case 'marketing':
        return 'bg-green-100 text-green-800';
      case 'hr_admin':
        return 'bg-orange-100 text-orange-800';
      case 'carer':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  return (
    <header className="border-b h-16 px-6 flex items-center justify-between bg-white">
      <div className="flex items-center">
        <h1 className="text-xl font-semibold text-gray-800">CareGrowthAI</h1>
        
        {userRole && (
          <div className={`ml-4 px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeClass(userRole)}`}>
            {getRoleDisplayName(userRole)}
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </Button>
        <Button variant="ghost" size="icon">
          <Settings size={20} />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="h-9 w-9 cursor-pointer">
              <AvatarFallback>{getInitials(userName)}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
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
