"use client";

import dynamic from 'next/dynamic';
import { UserProvider } from '../contexts/UserContext';

const SupabaseTokenBridge = dynamic(() => import('../supabase-token-bridge'), {
  ssr: false
});

export default function ClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <SupabaseTokenBridge />
      {children}
    </UserProvider>
  );
}