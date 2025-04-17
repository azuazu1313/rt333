import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import type { Database } from '../types/database';

type UserData = Database['public']['Tables']['users']['Row'];
type UserPreferences = Database['public']['Tables']['user_preferences']['Row'];

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userData: UserData | null;
  preferences: UserPreferences | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, phone?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateUserData: (updates: Partial<Omit<UserData, 'id' | 'email' | 'password_hash' | 'created_at'>>) => 
    Promise<{ error: Error | null, data: UserData | null }>;
  updatePreferences: (updates: Partial<Omit<UserPreferences, 'id' | 'user_id'>>) => 
    Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const initialStateLoadedRef = useRef(false);
  const authStateChangeSubscribed = useRef(false);

  // Function to fetch user data
  const fetchUserData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user data:', error);
        return null;
      }

      setUserData(data);
      return data;
    } catch (error) {
      console.error('Unexpected error fetching user data:', error);
      return null;
    }
  };

  // Function to fetch user preferences
  const fetchUserPreferences = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user preferences:', error);
      }

      setPreferences(data);
      return data;
    } catch (error) {
      console.error('Unexpected error fetching user preferences:', error);
      return null;
    }
  };

  // Initialize auth state with timeout
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const initializeAuth = async () => {
      try {
        // Set a timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          if (loading) {
            setLoading(false);
            console.log('Auth initialization timed out');
          }
        }, 5000); // 5 second timeout

        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          await fetchUserData(currentSession.user.id);
          await fetchUserPreferences(currentSession.user.id);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
        initialStateLoadedRef.current = true;
      }
    };

    initializeAuth();

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  // Listen for auth changes
  useEffect(() => {
    if (authStateChangeSubscribed.current) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('Auth state change:', event);
      
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        // Clear all auth state
        setSession(null);
        setUser(null);
        setUserData(null);
        setPreferences(null);
      } else if (currentSession?.user && event !== 'TOKEN_REFRESHED') {
        // Don't update state for token refreshes to avoid unnecessary re-renders
        setSession(currentSession);
        setUser(currentSession.user);
        
        // Only fetch user data for sign in events
        if (event === 'SIGNED_IN') {
          await fetchUserData(currentSession.user.id);
          await fetchUserPreferences(currentSession.user.id);
        }
      }

      // Ensure loading is false after auth state changes
      setLoading(false);
    });

    authStateChangeSubscribed.current = true;

    return () => {
      subscription.unsubscribe();
      authStateChangeSubscribed.current = false;
    };
  }, []);

  const signUp = async (email: string, password: string, name: string, phone?: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, phone }
        }
      });

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error: error as Error };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) throw error;
      
      return { error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: error as Error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear all auth state
      setSession(null);
      setUser(null);
      setUserData(null);
      setPreferences(null);
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserData = async (updates: Partial<Omit<UserData, 'id' | 'email' | 'password_hash' | 'created_at'>>) => {
    if (!user) {
      return { error: new Error('User not authenticated'), data: null };
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      setUserData(data);
      return { error: null, data };
    } catch (error) {
      console.error('Error updating user data:', error);
      return { error: error as Error, data: null };
    }
  };

  const updatePreferences = async (updates: Partial<Omit<UserPreferences, 'id' | 'user_id'>>) => {
    if (!user) {
      return { error: new Error('User not authenticated') };
    }

    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          ...updates
        });

      if (error) throw error;

      await fetchUserPreferences(user.id);
      return { error: null };
    } catch (error) {
      console.error('Error updating preferences:', error);
      return { error: error as Error };
    }
  };

  const value = {
    session,
    user,
    userData,
    preferences,
    loading,
    signUp,
    signIn,
    signOut,
    updateUserData,
    updatePreferences
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};