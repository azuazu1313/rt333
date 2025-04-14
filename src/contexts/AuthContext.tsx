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
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialStateLoadedRef = useRef(false);

  // Clear any previous timeout and set a new loading timeout
  const resetLoadingTimeout = () => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    
    // Forcibly end loading after 5 seconds to prevent infinite loading state
    loadingTimeoutRef.current = setTimeout(() => {
      setLoading(false);
      console.log("Auth loading timeout reached - forcing end of loading state");
    }, 5000); // 5 second safety timeout
  };

  useEffect(() => {
    const getSessionAndUser = async () => {
      setLoading(true);
      resetLoadingTimeout();
      
      try {
        // Get current session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        console.log("Auth session fetched:", currentSession ? "Found" : "None");
        
        setSession(currentSession);
        
        if (currentSession?.user) {
          setUser(currentSession.user);
          
          // Fetch user data
          await fetchUserData(currentSession.user.id);
          await fetchUserPreferences(currentSession.user.id);
        } else {
          // Clear user data if no session
          setUser(null);
          setUserData(null);
          setPreferences(null);
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        initialStateLoadedRef.current = true;
        setLoading(false);
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
      }
    };

    getSessionAndUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log(`Auth state change event: ${event}`);
        setLoading(true);
        resetLoadingTimeout();
        
        if (event === 'SIGNED_OUT') {
          // Clear all user data immediately on sign out
          setSession(null);
          setUser(null);
          setUserData(null);
          setPreferences(null);
          console.log('User signed out, cleared all auth state');
        } else {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          
          if (currentSession?.user) {
            // Brief delay to allow potential DB operations to complete
            if (event === 'SIGNED_IN' || event === 'SIGNED_UP') {
              // Allow a small delay for database triggers to complete
              await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            // Always fetch the latest user data when auth state changes
            await fetchUserData(currentSession.user.id);
            await fetchUserPreferences(currentSession.user.id);
          } else {
            setUserData(null);
            setPreferences(null);
          }
        }
        
        setLoading(false);
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
      }
    );

    // Clean up subscription and timeout on unmount
    return () => {
      subscription.unsubscribe();
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      console.log('Fetching user data for:', userId);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user data:', error);
        return null;
      } else if (!data) {
        console.error('No user data found for ID:', userId);
        return null;
      } else {
        console.log('User data fetched successfully:', data);
        setUserData(data);
        return data;
      }
    } catch (error) {
      console.error('Unexpected error fetching user data:', error);
      return null;
    }
  };

  const fetchUserPreferences = async (userId: string) => {
    try {
      // Check if user_preferences table exists first
      const { data: tableExists, error: tableCheckError } = await supabase
        .from('user_preferences')
        .select('id')
        .limit(1);
        
      if (tableCheckError) {
        console.log('user_preferences table might not exist:', tableCheckError);
        return null;
      }
      
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          console.log('No preferences found for this user');
        } else {
          console.error('Error fetching user preferences:', error);
        }
        return null;
      } else {
        setPreferences(data);
        return data;
      }
    } catch (error) {
      console.error('Unexpected error fetching user preferences:', error);
      return null;
    }
  };

  const signUp = async (email: string, password: string, name: string, phone?: string) => {
    try {
      console.log('Signing up user with data:', { email, name, phone });
      
      // Create meta data object with user profile data
      const userData = {
        name,
        phone: phone || null
      };
      
      // Sign up with Supabase Auth including user metadata
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });

      if (error) {
        console.error('Signup error from Supabase:', error);
        throw error;
      }

      console.log('Auth signup successful:', data?.user?.id);
      
      // Small delay to allow database trigger to run
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return { error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting to sign in user:', email);
      setLoading(true);
      resetLoadingTimeout();
      
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) {
        console.error('Sign in error:', error);
        throw error;
      }
      
      console.log('Sign in successful, user ID:', data.user.id);
      
      // Fetch user data immediately after sign in
      if (data.user) {
        await fetchUserData(data.user.id);
        await fetchUserPreferences(data.user.id);
      }
      
      return { error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: error as Error };
    } finally {
      setLoading(false);
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    }
  };

  const signOut = async () => {
    try {
      console.log('Signing out user');
      setLoading(true);
      resetLoadingTimeout();
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Immediately clear user data in state
      setUser(null);
      setUserData(null);
      setPreferences(null);
      setSession(null);
      
      console.log('Successfully signed out');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    }
  };

  const updateUserData = async (updates: Partial<Omit<UserData, 'id' | 'email' | 'password_hash' | 'created_at'>>) => {
    if (!user) {
      return { error: new Error('User not authenticated'), data: null };
    }

    try {
      console.log('Updating user data:', updates);
      
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log('User data updated successfully');
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
      // Check if preferences exist first
      const { data: existingPrefs, error: checkError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (checkError) {
        if (checkError.code === 'PGRST116') { // No rows returned
          // Create preferences if they don't exist
          const { error: insertError } = await supabase
            .from('user_preferences')
            .insert({
              user_id: user.id,
              ...updates
            });
            
          if (insertError) throw insertError;
        } else {
          throw checkError;
        }
      } else {
        // Update existing preferences
        const { error } = await supabase
          .from('user_preferences')
          .update(updates)
          .eq('user_id', user.id);

        if (error) throw error;
      }

      // Fetch updated preferences
      await fetchUserPreferences(user.id);
      return { error: null };
    } catch (error) {
      console.error('Error updating user preferences:', error);
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