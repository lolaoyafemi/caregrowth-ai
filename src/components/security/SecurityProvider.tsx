import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { securityManager } from '@/lib/security';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SecurityContextType {
  isSecure: boolean;
  securityLevel: 'low' | 'medium' | 'high';
  checkRateLimit: (operation: string, maxAttempts?: number, windowMs?: number) => boolean;
  logSecurityEvent: (event: string, details?: Record<string, any>) => void;
  validateSession: () => boolean;
  clearSecurityData: () => void;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export const useSecurityContext = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurityContext must be used within a SecurityProvider');
  }
  return context;
};

interface SecurityProviderProps {
  children: ReactNode;
}

export const SecurityProvider: React.FC<SecurityProviderProps> = ({ children }) => {
  const [isSecure, setIsSecure] = useState(true);
  const [securityLevel, setSecurityLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const { session, user } = useAuth();

  // Monitor security events
  useEffect(() => {
    const checkSecurityStatus = () => {
      // Check session integrity
      if (session && !securityManager.validateSession(session)) {
        setIsSecure(false);
        toast.error('Security warning: Please sign in again', {
          description: 'Your session may have been compromised'
        });
        return;
      }

      // Determine security level based on user role and activity
      if (user?.role === 'super_admin') {
        setSecurityLevel('high');
      } else if (user?.role === 'admin' || user?.role === 'agency_admin') {
        setSecurityLevel('medium');
      } else {
        setSecurityLevel('low');
      }

      setIsSecure(true);
    };

    // Check security status on mount and session changes
    checkSecurityStatus();

    // Set up periodic security checks for high-privilege users
    let securityInterval: NodeJS.Timeout;
    if (user?.role === 'super_admin' || user?.role === 'admin') {
      securityInterval = setInterval(checkSecurityStatus, 60000); // Check every minute
    }

    return () => {
      if (securityInterval) {
        clearInterval(securityInterval);
      }
    };
  }, [session, user]);

  // Monitor for suspicious browser activity
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        securityManager.logSecurityEvent('tab_hidden', { 
          timestamp: Date.now(),
          userRole: user?.role 
        });
      }
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Clear sensitive data from memory
      if (securityLevel === 'high') {
        securityManager.clearSecurityEvents();
      }
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key?.includes('supabase') || event.key?.includes('auth')) {
        securityManager.logSecurityEvent('storage_modified', {
          key: event.key,
          origin: event.url
        });
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user, securityLevel]);

  const checkRateLimit = (operation: string, maxAttempts?: number, windowMs?: number): boolean => {
    const allowed = securityManager.checkRateLimit(operation, maxAttempts, windowMs);
    if (!allowed) {
      toast.error('Rate limit exceeded', {
        description: 'Please wait before trying again'
      });
    }
    return allowed;
  };

  const logSecurityEvent = (event: string, details?: Record<string, any>): void => {
    securityManager.logSecurityEvent(event, {
      ...details,
      userRole: user?.role,
      userId: user?.id
    });
  };

  const validateSession = (): boolean => {
    if (!session) {
      logSecurityEvent('session_validation_failed', { reason: 'no_session' });
      return false;
    }
    
    const isValid = securityManager.validateSession(session);
    if (!isValid) {
      setIsSecure(false);
      toast.error('Session expired', {
        description: 'Please sign in again'
      });
    }
    
    return isValid;
  };

  const clearSecurityData = (): void => {
    securityManager.clearSecurityEvents();
    setIsSecure(true);
  };

  const value: SecurityContextType = {
    isSecure,
    securityLevel,
    checkRateLimit,
    logSecurityEvent,
    validateSession,
    clearSecurityData
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
};

// Security HOC for protecting sensitive components
export function withSecurity<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredSecurityLevel: 'low' | 'medium' | 'high' = 'medium'
) {
  return function SecurityWrapper(props: P) {
    const { isSecure, securityLevel } = useSecurityContext();
    
    const securityLevels = { low: 1, medium: 2, high: 3 };
    const hasRequiredLevel = securityLevels[securityLevel] >= securityLevels[requiredSecurityLevel];
    
    if (!isSecure || !hasRequiredLevel) {
      return (
        <div className="flex items-center justify-center min-h-[200px] bg-destructive/10 rounded-lg border border-destructive/20">
          <div className="text-center space-y-2">
            <p className="text-destructive font-medium">Security Access Denied</p>
            <p className="text-sm text-muted-foreground">
              Insufficient security clearance or session invalid
            </p>
          </div>
        </div>
      );
    }
    
    return <WrappedComponent {...props} />;
  };
}