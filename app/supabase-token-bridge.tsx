"use client";
import { useEffect } from 'react';
import { supabase, getSupabase, getSupabaseAsync } from './utils/supabaseClient';

export default function SupabaseTokenBridge() {
  useEffect(() => {
    let unsub: (() => void) | null = null;
    (async () => {
      let s;
      try {
        s = supabase || getSupabase();
      } catch {
        try {
          s = await getSupabaseAsync();
        } catch {
          return; // give up silently; UI may show auth buttons but API calls will be anonymous
        }
      }
      const { data } = await s.auth.getSession();
      (window as any).supabaseToken = data.session?.access_token || '';
      const { data: sub } = s.auth.onAuthStateChange((_event, session) => {
        (window as any).supabaseToken = session?.access_token || '';
      });
      unsub = () => sub.subscription.unsubscribe();
    })();
    return () => { if (unsub) unsub(); };
  }, []);
  return null;
}

