import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import { useCallback, useMemo } from 'react';
import { AuthenticationError, AuthorizationError } from '@/lib/errors';

// Security-focused authentication hooks with role-based access control
export const useSecureAuth = () => {
  const { user: authUser, loading: authLoading } = useAuth();
  const { user: contextUser, isAuthenticated } = useUser();

  const requireAuth = useCallback(() => {
    if (!isAuthenticated || !authUser) {
      throw new AuthenticationError('Authentication required for this action');
    }
    return authUser;
  }, [isAuthenticated, authUser]);

  const requireRole = useCallback((requiredRole: string | string[]) => {
    const user = requireAuth();
    const userRole = contextUser?.role;

    if (!userRole) {
      throw new AuthorizationError('User role not found');
    }

    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    
    if (!allowedRoles.includes(userRole)) {
      throw new AuthorizationError(`This action requires one of the following roles: ${allowedRoles.join(', ')}`);
    }

    return { user, role: userRole };
  }, [requireAuth, contextUser?.role]);

  const hasRole = useCallback((role: string | string[]): boolean => {
    if (!isAuthenticated || !contextUser?.role) return false;
    
    const allowedRoles = Array.isArray(role) ? role : [role];
    return allowedRoles.includes(contextUser.role);
  }, [isAuthenticated, contextUser?.role]);

  const hasPermission = useCallback((permission: string): boolean => {
    if (!isAuthenticated || !contextUser?.role) return false;

    // Define role-based permissions
    const rolePermissions: Record<string, string[]> = {
      super_admin: ['*'], // All permissions
      agency_admin: [
        'manage_team',
        'view_analytics',
        'manage_credits',
        'access_all_tools',
        'manage_documents'
      ],
      admin: [
        'access_all_tools',
        'manage_documents',
        'view_own_analytics'
      ],
      collaborator: [
        'access_basic_tools',
        'view_documents'
      ],
      content_writer: [
        'access_social_tools',
        'view_documents'
      ]
    };

    const userPermissions = rolePermissions[contextUser.role] || [];
    return userPermissions.includes('*') || userPermissions.includes(permission);
  }, [isAuthenticated, contextUser?.role]);

  const canAccessAdminFeatures = useMemo(() => {
    return hasRole(['super_admin', 'agency_admin']);
  }, [hasRole]);

  const canManageTeam = useMemo(() => {
    return hasRole(['super_admin', 'agency_admin']);
  }, [hasRole]);

  const canAccessAnalytics = useMemo(() => {
    return hasRole(['super_admin', 'agency_admin', 'admin']);
  }, [hasRole]);

  const isSuperAdmin = useMemo(() => {
    return hasRole('super_admin');
  }, [hasRole]);

  return {
    // User data
    user: authUser,
    userContext: contextUser,
    isAuthenticated,
    loading: authLoading,

    // Security functions
    requireAuth,
    requireRole,
    hasRole,
    hasPermission,

    // Convenience flags
    canAccessAdminFeatures,
    canManageTeam,
    canAccessAnalytics,
    isSuperAdmin
  };
};

// Hook for protected routes
export const useRouteProtection = (requiredRole?: string | string[]) => {
  const { isAuthenticated, hasRole, loading } = useSecureAuth();

  const canAccess = useMemo(() => {
    if (!isAuthenticated) return false;
    if (!requiredRole) return true;
    return hasRole(requiredRole);
  }, [isAuthenticated, hasRole, requiredRole]);

  const redirectPath = useMemo(() => {
    if (!isAuthenticated) return '/login';
    if (requiredRole && !hasRole(requiredRole)) return '/unauthorized';
    return null;
  }, [isAuthenticated, hasRole, requiredRole]);

  return {
    canAccess,
    redirectPath,
    loading,
    shouldRedirect: !loading && !canAccess
  };
};

// Hook for API calls with automatic auth headers
export const useAuthenticatedFetch = () => {
  const { requireAuth } = useSecureAuth();

  const authenticatedFetch = useCallback(async (
    url: string,
    options: RequestInit = {}
  ) => {
    const user = requireAuth();
    
    // Get the current session token
    const { data: { session } } = await import('@/integrations/supabase/client')
      .then(module => module.supabase.auth.getSession());

    if (!session?.access_token) {
      throw new AuthenticationError('No valid session found');
    }

    const headers = {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      ...options.headers
    };

    return fetch(url, {
      ...options,
      headers
    });
  }, [requireAuth]);

  return { authenticatedFetch };
};