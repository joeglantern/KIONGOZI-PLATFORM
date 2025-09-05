"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

interface AdminUser {
  id: string;
  email: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  role: string;
}

interface AuthContextType {
  user: AdminUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  supabase: any; // Use any type to avoid complex Supabase type issues
}

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAdmin: false,
  signOut: async () => {},
  supabase,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Get user profile with role
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile && profile.role === 'admin') {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              full_name: profile.full_name,
              first_name: profile.first_name,
              last_name: profile.last_name,
              role: profile.role,
            });
          } else {
            // Not an admin, sign out
            await supabase.auth.signOut();
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error getting user:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: any) => {
        if (event === 'SIGNED_OUT' || !session?.user) {
          setUser(null);
          setIsLoading(false);
        } else {
          getUser();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isLoading, 
        isAdmin: user?.role === 'admin',
        signOut,
        supabase
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};