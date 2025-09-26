"use client";

import React, { useEffect, useState } from 'react';

interface AuthDebugProps {
  enabled?: boolean;
}

const AuthDebug: React.FC<AuthDebugProps> = ({ enabled = process.env.NODE_ENV === 'development' }) => {
  const [authInfo, setAuthInfo] = useState<any>({});

  useEffect(() => {
    const checkAuth = () => {
      const info: any = {
        hasWindow: typeof window !== 'undefined',
        hasLocalStorage: false,
        tokens: {},
        localStorage: {},
      };

      if (typeof window !== 'undefined') {
        info.hasLocalStorage = !!window.localStorage;
        info.windowToken = !!(window as any).supabaseToken;

        if (window.localStorage) {
          // Check all possible token locations
          const keys = [
            'sb-jdncfyagppohtksogzkx-auth-token',
            'supabase_token',
            'token',
            'supabase.auth.token'
          ];

          keys.forEach(key => {
            const value = localStorage.getItem(key);
            if (value) {
              info.localStorage[key] = value.length > 50 ? value.substring(0, 50) + '...' : value;
              try {
                const parsed = JSON.parse(value);
                if (parsed.access_token) {
                  info.tokens[key] = parsed.access_token.substring(0, 20) + '...';
                }
              } catch {
                info.tokens[key] = 'Not JSON';
              }
            }
          });

          // Check all localStorage keys for auth-related items
          info.allKeys = Object.keys(localStorage).filter(k =>
            k.includes('auth') || k.includes('token') || k.includes('supabase')
          );
        }
      }

      setAuthInfo(info);
    };

    checkAuth();
    const interval = setInterval(checkAuth, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, []);

  if (!enabled) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-blue-900/90 text-white p-3 rounded-lg text-xs font-mono max-w-sm z-50 max-h-64 overflow-y-auto">
      <div className="font-bold mb-2">🔐 Auth Debug</div>
      <div>Has Window: {authInfo.hasWindow ? '✅' : '❌'}</div>
      <div>Has LocalStorage: {authInfo.hasLocalStorage ? '✅' : '❌'}</div>
      <div>Window Token: {authInfo.windowToken ? '✅' : '❌'}</div>

      {authInfo.allKeys && authInfo.allKeys.length > 0 && (
        <div className="mt-2">
          <div className="font-bold">Auth Keys Found:</div>
          {authInfo.allKeys.map((key: string) => (
            <div key={key} className="text-xs opacity-70 truncate">
              {key}
            </div>
          ))}
        </div>
      )}

      {Object.keys(authInfo.tokens || {}).length > 0 && (
        <div className="mt-2">
          <div className="font-bold">Tokens:</div>
          {Object.entries(authInfo.tokens).map(([key, value]) => (
            <div key={key} className="text-xs opacity-70">
              <div className="font-semibold">{key}:</div>
              <div className="truncate">{value as string}</div>
            </div>
          ))}
        </div>
      )}

      {Object.keys(authInfo.localStorage || {}).length === 0 && (
        <div className="mt-2 text-red-300">
          ❌ No auth tokens found!
        </div>
      )}
    </div>
  );
};

export default AuthDebug;