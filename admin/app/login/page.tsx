"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from '@supabase/supabase-js';
import dynamic from "next/dynamic";
const PasswordInput = dynamic(() => import("../components/PasswordInput"), { ssr: false });

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [mounted, setMounted] = useState(false);
  
  const router = useRouter();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  useEffect(() => {
    setMounted(true);
    
    // Check if already logged in
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Check if user is admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        
        if (profile?.role === 'admin' || profile?.role === 'org_admin') {
          router.push('/dashboard');
        }
      }
    };
    
    checkAuth();
  }, [router, supabase]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    try {
      setLoading(true);
      setMessage("");

      // Attempt to sign in
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (authData.user) {
        // Check if user has admin role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, full_name, status')
          .eq('id', authData.user.id)
          .single();

        if (profileError) {
          throw new Error('Failed to verify admin privileges');
        }

        if (!profile) {
          throw new Error('User profile not found');
        }

        if (profile.status === 'banned' || profile.status === 'inactive') {
          await supabase.auth.signOut();
          throw new Error('Account is disabled. Contact system administrator.');
        }

        if (profile.role !== 'admin' && profile.role !== 'org_admin') {
          await supabase.auth.signOut();
          throw new Error('Access denied. Admin privileges required.');
        }

        // Log the admin login
        try {
          await supabase.rpc('log_admin_action', {
            admin_id: authData.user.id,
            target_user_id: null,
            action_type: 'admin_login',
            action_details: { 
              login_time: new Date().toISOString(),
              user_agent: navigator.userAgent
            }
          });
        } catch (logError) {
          console.warn('Failed to log admin login:', logError);
        }

        // Success - redirect to dashboard
        router.push('/dashboard');
      }
    } catch (err: any) {
      setMessage(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors px-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-6">
          <Image src="/images/ai-head-icon.svg" alt="Kiongozi AI" width={28} height={28} />
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Admin Sign in</h1>
        </div>
        <form onSubmit={handleEmailLogin} className="space-y-3">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Admin email address"
              className="w-full rounded-xl px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
              required
            />
          </div>
          <PasswordInput value={password} onChange={setPassword} />
          <button
            type="submit"
            disabled={loading || !email || !password}
            className={`w-full rounded-full py-3 ${loading || !email || !password ? "bg-gray-300 dark:bg-gray-700 cursor-not-allowed" : "bg-gray-900 dark:bg-white text-white dark:text-gray-900"}`}
          >
            Continue
          </button>
        </form>

        {message && (
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">{message}</p>
        )}

        <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-400/20 rounded-xl">
          <div className="text-sm text-yellow-600 dark:text-yellow-200">
            <p className="font-medium mb-1">🔒 Admin Portal</p>
            <p className="text-xs opacity-90">
              This portal is restricted to authorized administrators only.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}