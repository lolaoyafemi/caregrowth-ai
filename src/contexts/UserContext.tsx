
import React, { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'super_admin' | 'agency_admin' | 'carer' | 'marketing' | 'hr_admin';

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

  return (
    <UserContext.Provider 
      value={{ 
        user, 
        isAuthenticated: !!user, 
        setUser, 
        logout,
        hasPermission
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
