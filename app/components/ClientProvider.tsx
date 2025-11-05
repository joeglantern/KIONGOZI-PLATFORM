"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { UserProvider, useUser } from '../contexts/UserContext';

// Loading wrapper that waits for auth initialization
function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { loading } = useUser();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Show loading only on first mount to prevent race conditions
  if (!mounted || loading) {
    return (
      <div className="min-h-screen h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4">
            <Image
              src="/Kiongozi.png"
              alt="Kiongozi"
              width={64}
              height={64}
              className="w-full h-full object-contain animate-pulse"
            />
          </div>
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function ClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <AuthInitializer>
        {children}
      </AuthInitializer>
    </UserProvider>
  );
}