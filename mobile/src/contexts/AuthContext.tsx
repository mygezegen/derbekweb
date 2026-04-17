import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Member } from '../types';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  member: Member | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshMember: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMember = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('members')
      .select('*')
      .eq('auth_id', userId)
      .maybeSingle();
    setMember(data);
  }, []);

  const refreshMember = useCallback(async () => {
    if (user) await loadMember(user.id);
  }, [user, loadMember]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        setLoading(false);
        return;
      }
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadMember(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            await loadMember(session.user.id);
          }
          if (event === 'INITIAL_SESSION') {
            setLoading(false);
          }
        } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
          setSession(null);
          setUser(null);
          setMember(null);
        } else if (session) {
          setSession(session);
          setUser(session.user);
          await loadMember(session.user.id);
        } else {
          setSession(null);
          setUser(null);
          setMember(null);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, [loadMember]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`member-profile-${user.id}`)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'members',
          filter: `auth_id=eq.${user.id}`,
        },
        () => {
          loadMember(user.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadMember]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      setSession(null);
      setUser(null);
      setMember(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, member, loading, signIn, signUp, signOut, refreshMember }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
