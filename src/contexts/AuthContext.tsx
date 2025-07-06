import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from './UserContext';

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

  const fetchUserFromPublicTable = async (userId: string, userEmail: string) => {
    try {
      console.log('Fetching user data from public.users for:', userId);
      
      // Fetch user data from public.users table
      const { data: userData, error } = await supabase
        .from('users')
        .select('id, name, email, role, plan, credits')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user data:', error);
        // Set basic user context with default values if fetch fails
        setUserContext({
          id: userId,
          name: userEmail.split('@')[0] || '',
          email: userEmail,
          role: 'admin',
          agencyId: undefined
        });
        return;
      }

      if (userData) {
        console.log('User data from public.users:', userData);
        // Map the role from public.users to UserContext format
        const userRole = userData.role === 'super_admin' ? 'super_admin' : 'admin';
        
        setUserContext({
          id: userData.id,
          name: userData.name || userEmail.split('@')[0] || '',
          email: userData.email || userEmail,
          role: userRole,
          agencyId: undefined // Will be added when agencies are implemented
        });
      } else {
        console.log('No user data found in public.users, user may not be created yet');
        // Set basic user context for new users
        setUserContext({
          id: userId,
          name: userEmail.split('@')[0] || '',
          email: userEmail,
          role: 'admin',
          agencyId: undefined
        });
      }
    } catch (error) {
      console.error('Error in fetchUserFromPublicTable:', error);
      // Fallback user context
      setUserContext({
        id: userId,
        name: userEmail.split('@')[0] || '',
        email: userEmail,
        role: 'admin',
        agencyId: undefined
      });
    }
  };

  useEffect(() => {
    let mounted = true;

    // Check for existing session first (synchronously if possible)
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            setLoading(false);
            setInitializing(false);
          }
          return;
        }

        console.log('Initial session check:', session?.user?.email);
        
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
        console.error('Error initializing auth:', error);
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
        
        console.log('Auth state changed:', event, session?.user?.email);
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
    console.log('Attempting sign up with:', email);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.href,
        data: {
          full_name: fullName,
        }
      }
    });
    if (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://www.googleapis.com/auth/drive.readonly',
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
