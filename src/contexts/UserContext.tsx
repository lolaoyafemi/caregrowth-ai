
import React, { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'super_admin' | 'agency_admin' | 'admin' | 'collaborator' | 'content_writer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  agencyId?: string; // Only for agency users
}

interface UserContextType {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
  hasPermission: (requiredRoles: UserRole[]) => boolean;
  canAccessTool: (tool: 'social_media' | 'document_search' | 'qa_assistant' | 'team_management') => boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const logout = () => {
    setUser(null);
  };

  const hasPermission = (requiredRoles: UserRole[]) => {
    if (!user) return false;
    return requiredRoles.includes(user.role);
  };

  const canAccessTool = (tool: 'social_media' | 'document_search' | 'qa_assistant' | 'team_management') => {
    if (!user) return false;
    
    switch (user.role) {
      case 'super_admin':
      case 'agency_admin':
      case 'admin':
        return true; // Admin roles have access to everything
      case 'collaborator':
        return tool === 'document_search' || tool === 'qa_assistant';
      case 'content_writer':
        return tool === 'social_media';
      default:
        return false;
    }
  };

  return (
    <UserContext.Provider 
      value={{ 
        user, 
        isAuthenticated: !!user, 
        setUser, 
        logout,
        hasPermission,
        canAccessTool
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
