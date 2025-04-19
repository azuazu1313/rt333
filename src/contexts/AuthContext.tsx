import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import type { Database } from '../types/database';

type UserData = Database['public']['Tables']['users']['Row'];

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, phone?: string, inviteCode?: string) => Promise<{ error: Error | null, data?: { user: User | null } }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null, session: Session | null }>;
  signOut: () => Promise<void>;
  updateUserData: (updates: Partial<Omit<UserData, 'id' | 'email' | 'created_at'>>) => 
    Promise<{ error: Error | null, data: UserData | null }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
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

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get session with JWT claims
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          
          // Fetch user data and update JWT claims if needed
          const userData = await fetchUserData(currentSession.user.id);
          if (userData?.user_role) {
            // Refresh session to get updated JWT claims
            const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
            if (!refreshError && newSession) {
              setSession(newSession);
            }
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
        initialStateLoadedRef.current = true;
      }
    };

    initializeAuth();
  }, []);

  // Listen for auth changes
  useEffect(() => {
    if (!initialStateLoadedRef.current || authStateChangeSubscribed.current) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('Auth state change:', event);
      
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        setSession(null);
        setUser(null);
        setUserData(null);
      } else if (currentSession?.user) {
        setSession(currentSession);
        setUser(currentSession.user);
        
        if (!userData || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          const userData = await fetchUserData(currentSession.user.id);
          if (userData?.user_role) {
            // Refresh session to get updated JWT claims
            const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
            if (!refreshError && newSession) {
              setSession(newSession);
            }
          }
        }
      }

      setLoading(false);
    });

    authStateChangeSubscribed.current = true;

    return () => {
      subscription.unsubscribe();
      authStateChangeSubscribed.current = false;
    };
  }, [userData]);

  const signUp = async (email: string, password: string, name: string, phone?: string, inviteCode?: string) => {
    try {
      setLoading(true);
      
      // Log for debugging
      console.log('Signup with invite code:', inviteCode);
      
      // Check invite code validity first if provided
      let inviteData = null;
      if (inviteCode) {
        const { data, error } = await supabase
          .from('invite_links')
          .select('*')
          .eq('code', inviteCode)
          .eq('status', 'active')
          .single();
          
        if (error) {
          console.error('Error validating invite code:', error);
          throw new Error('Invalid or expired invite code');
        }
        
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          // Mark as expired
          await supabase
            .from('invite_links')
            .update({ status: 'expired' })
            .eq('id', data.id);
            
          throw new Error('This invite link has expired');
        }
        
        inviteData = data;
        console.log('Valid invite data:', inviteData);
      }
      
      // Create metadata object
      const metadata: Record<string, string | null> = {
        name: name.trim(),
        phone: phone ? phone.trim() : null
      };
      
      // Important: Add invite code to metadata if provided
      if (inviteCode) {
        metadata.invite = inviteCode.trim();
      }
      
      console.log('Signup metadata being sent:', metadata);
      
      // Call Supabase signup with the metadata
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: metadata
        }
      });

      if (error) {
        console.error('Supabase signup error:', error);
        throw error;
      }
      
      if (!data.user) {
        throw new Error('User creation failed');
      }
      
      // Update invite link status if an invite code was used
      // NOTE: Using the authenticated user's context, not signing out
      if (inviteCode && inviteData && data.user) {
        try {
          const userId = data.user.id;
          console.log('Updating invite link status for new user:', userId);
          
          // Update the invite link status using the authenticated session
          const { error: updateError } = await supabase
            .from('invite_links')
            .update({ 
              status: 'used',
              used_at: new Date().toISOString(),
              used_by: userId
            })
            .eq('id', inviteData.id)
            .eq('status', 'active'); // Ensure we're only updating active invites
            
          if (updateError) {
            // Log the error but don't fail the signup
            console.error('Error updating invite link status:', updateError);
          } else {
            console.log('Successfully updated invite link status');
          }
          
          // If the invite specified a role, update the user's role
          if (inviteData.role) {
            console.log('Setting user role from invite:', inviteData.role);
            
            const { error: roleUpdateError } = await supabase
              .from('users')
              .update({ user_role: inviteData.role })
              .eq('id', userId);
              
            if (roleUpdateError) {
              console.error('Error updating user role:', roleUpdateError);
            } else {
              console.log('Successfully updated user role');
            }
          }
        } catch (updateError) {
          // Log the error but don't fail the signup
          console.error('Unexpected error updating invite status:', updateError);
        }
      }

      return { error: null, data };
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

      // Immediately update local state
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        
        // Fetch user data
        const userData = await fetchUserData(data.session.user.id);
        
        if (userData?.user_role) {
          // Refresh session to get updated JWT claims
          const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError && newSession) {
            // Set the new session with updated claims
            setSession(newSession);
          }
        }
      }
      
      return { error: null, session: data.session };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: error as Error, session: null };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      
      // Clear all auth state before making the signOut request
      setSession(null);
      setUser(null);
      setUserData(null);

      // Now attempt to sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn('Error during Supabase sign out:', error);
      }
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserData = async (updates: Partial<Omit<UserData, 'id' | 'email' | 'created_at'>>) => {
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
      
      // Refresh session to update JWT claims if user_role was updated
      if ('user_role' in updates) {
        const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError && newSession) {
          setSession(newSession);
        }
      }
      
      return { error: null, data };
    } catch (error) {
      console.error('Error updating user data:', error);
      return { error: error as Error, data: null };
    }
  };

  const value = {
    session,
    user,
    userData,
    loading,
    signUp,
    signIn,
    signOut,
    updateUserData
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