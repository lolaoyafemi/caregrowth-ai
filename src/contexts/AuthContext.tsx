
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
  const { setUser: setUserContext } = useUser();

  const setUserFromProfile = async (userId: string, userEmail: string) => {
    try {
      console.log('Setting user context for:', userId, userEmail);
      
      // Try to fetch profile, but don't let it block the auth process
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, agency_id')
        .eq('id', userId)
        .maybeSingle();

      console.log('Profile data:', profile);

      // Set user context based on profile or fallback to defaults
      const userRole = profile?.role || 'admin';
      const userName = profile?.full_name || userEmail.split('@')[0] || '';
      
      setUserContext({
        id: userId,
        name: userName,
        email: userEmail,
        role: userRole,
        agencyId: profile?.agency_id || undefined
      });
      
      console.log('User context set with role:', userRole);
    } catch (error) {
      console.error('Error setting user context:', error);
      // Set a basic user context even if profile fetch fails
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

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user && session.user.email) {
          // Use setTimeout to defer the profile fetch
          setTimeout(() => {
            if (mounted) {
              setUserFromProfile(session.user.id, session.user.email!);
            }
          }, 100);
        } else {
          setUserContext(null);
        }
        setLoading(false);
      }
    );

    // Check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }

        console.log('Initial session check:', session?.user?.email);
        
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user && session.user.email) {
          setTimeout(() => {
            if (mounted) {
              setUserFromProfile(session.user.id, session.user.email!);
            }
          }, 100);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error initializing auth:', error);
        setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setUserContext]);

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
        redirectTo: `${window.location.origin}/dashboard`
      }
    });
    if (error) throw error;
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
