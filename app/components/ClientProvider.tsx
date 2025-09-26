"use client";

import dynamic from 'next/dynamic';

const SupabaseTokenBridge = dynamic(() => import('../supabase-token-bridge'), {
  ssr: false
});

export default function ClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SupabaseTokenBridge />
      {children}
    </>
  );
}