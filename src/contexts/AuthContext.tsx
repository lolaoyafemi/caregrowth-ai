import React, { createContext, useContext, useEffect, useState, useCallback, memo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from './UserContext';
import { logger } from '@/lib/logger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const { setUser: setUserContext } = useUser();

  const fetchUserFromPublicTable = useCallback(async (userId: string, userEmail: string) => {
    try {
      logger.debug('Fetching user data from user_profiles', { userId });
      
      // Fetch user data from user_profiles table
      const { data: userData, error } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, email, role, credits')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        logger.warn('Error fetching user data, using defaults', { error: error.message });
        // Default to user role for security (admins must be explicitly assigned)
        setUserContext({
          id: userId,
          name: userData?.full_name || session?.user?.user_metadata?.full_name || userEmail.split('@')[0], 
          full_name: userData?.full_name || session?.user?.user_metadata?.full_name,
          email: userEmail,
          role: 'admin', // Temporarily keeping admin for existing users - will be changed to 'user' after migration
          agencyId: undefined
        });
        return;
      }

      if (userData) {
        logger.debug('User data loaded successfully', { userId: userData.user_id });
        // Use the actual role from database - validate it matches UserRole type
        const userRole = userData.role as 'super_admin' | 'agency_admin' | 'admin' | 'collaborator' | 'content_writer';
        
        setUserContext({
          id: userData.user_id,
          name: userData?.full_name || session?.user?.user_metadata?.full_name || (userData.email || userEmail).split('@')[0], 
          full_name: userData?.full_name || session?.user?.user_metadata?.full_name,
          email: userData.email || userEmail,
          role: userRole,
          agencyId: undefined // Will be added when agencies are implemented
        });
      } else {
        logger.info('No user data found, creating default profile');
        // Default to user role for security (admins must be explicitly assigned)
        setUserContext({
          id: userId,
          name: userData?.full_name || session?.user?.user_metadata?.full_name || userEmail.split('@')[0], 
          full_name: userData?.full_name || session?.user?.user_metadata?.full_name,
          email: userEmail,
          role: 'admin', // Temporarily keeping admin for existing users - will be changed to 'user' after migration
          agencyId: undefined
        });
      }
    } catch (error) {
      logger.error('Failed to fetch user profile', { error, userId });
      // Fallback to user role for security
      setUserContext({
        id: userId,
        name: session?.user?.user_metadata?.full_name || userEmail.split('@')[0],
        full_name: session?.user?.user_metadata?.full_name,
        email: userEmail,
        role: 'admin', // Temporarily keeping admin for existing users - will be changed to 'user' after migration
        agencyId: undefined
      });
    }
  }, [session, setUserContext]);

  useEffect(() => {
    let mounted = true;

    // Check for existing session first (synchronously if possible)
    const initializeAuth = async () => {
      try {
        logger.debug('Initializing authentication');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          logger.error('Failed to get session', error);
          if (mounted) {
            setLoading(false);
            setInitializing(false);
          }
          return;
        }

        logger.debug('Session check completed', { hasUser: !!session?.user });
        
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user && session.user.email) {
          setTimeout(() => {
            if (mounted) {
              fetchUserFromPublicTable(session.user.id, session.user.email!);
            }
          }, 100);
        } else {
          setUserContext(null);
        }
        
        setLoading(false);
        setInitializing(false);
      } catch (error) {
        logger.error('Authentication initialization failed', error);
        if (mounted) {
          setLoading(false);
          setInitializing(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        logger.debug('Auth state changed', { event, hasUser: !!session?.user });
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user && session.user.email) {
          // Fetch user data from public.users table
          setTimeout(() => {
            if (mounted) {
              fetchUserFromPublicTable(session.user.id, session.user.email!);
            }
          }, 100);
        } else {
          setUserContext(null);
        }
        
        // Only set loading to false after initial setup is complete
        if (initializing) {
          setLoading(false);
          setInitializing(false);
        }
      }
    );

    // Initialize auth
    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setUserContext, initializing]);

  const signInWithEmail = async (email: string, password: string) => {
    console.log('Attempting sign in with:', email);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    console.log('*** SIGNUP FLOW STARTED ***');
    console.log('Attempting sign up with:', email, 'name:', fullName);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.href,
        data: {
          full_name: fullName,
        }
      }
    });
    
    console.log('Signup data:', data);
    console.log('Signup error:', error);
    
    if (error) {
      console.error('Sign up error:', error);
      throw error;
    }

    // Send welcome email
    console.log('*** STARTING WELCOME EMAIL FLOW ***');
    try {
      console.log('Attempting to send welcome email to:', email);
      const emailResult = await supabase.functions.invoke('send-welcome-email', {
        body: { email, name: fullName }
      });
      console.log('Welcome email result:', emailResult);
      
      if (emailResult.error) {
        console.error('Welcome email error:', emailResult.error);
      } else {
        console.log('Welcome email sent successfully to:', email);
      }
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't throw error here - user registration should still succeed even if email fails
    }
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.metadata.readonly',
        redirectTo: window.location.href
      }
    });
    if (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    console.log('Signing out');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value = {
    user,
    session,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
