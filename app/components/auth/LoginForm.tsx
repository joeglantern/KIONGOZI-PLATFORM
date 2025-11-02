"use client";

/**
 * LoginForm Component
 * Reusable login form that works in both pages and modals
 * Extracted from app/login/page.tsx for consistency
 */
import { useState } from 'react';
import Link from 'next/link';
import { supabase, getSupabase } from '../../utils/supabaseClient';
import PasswordInput from '../PasswordInput';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToSignup?: () => void;
  redirectTo?: string;
  showSignupLink?: boolean;
  className?: string;
}

export default function LoginForm({
  onSuccess,
  onSwitchToSignup,
  redirectTo = '/',
  showSignupLink = true,
  className = ''
}: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      setLoading(true);
      setMessage('');
      const s = supabase || getSupabase();
      const { error } = await s.auth.signInWithPassword({ email, password });

      if (error) throw error;

      // Call success callback or redirect
      if (onSuccess) {
        onSuccess();
      } else if (typeof window !== 'undefined') {
        window.location.href = redirectTo;
      }
    } catch (err: any) {
      setMessage(err?.message || 'Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      setLoading(true);
      const s = supabase || getSupabase();
      await s.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <form onSubmit={handleEmailLogin} className="space-y-3">
        <div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full rounded-xl px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
            required
          />
        </div>
        <PasswordInput value={password} onChange={setPassword} />
        <button
          type="submit"
          disabled={loading || !email || !password}
          className={`w-full rounded-full py-3 font-medium transition-colors ${
            loading || !email || !password
              ? 'bg-gray-300 cursor-not-allowed text-gray-500'
              : 'bg-gray-900 text-white hover:bg-gray-800'
          }`}
        >
          {loading ? 'Signing in...' : 'Continue'}
        </button>
      </form>

      <div className="flex items-center gap-3 my-5">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs text-gray-500">OR</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <button
        onClick={handleGoogle}
        disabled={loading}
        className="w-full rounded-xl border border-gray-300 py-3 text-gray-800 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue with Google
      </button>

      {message && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-600">{message}</p>
        </div>
      )}

      {showSignupLink && (
        <p className="mt-6 text-sm text-gray-600 text-center">
          Don&apos;t have an account?{' '}
          {onSwitchToSignup ? (
            <button
              onClick={onSwitchToSignup}
              className="text-indigo-600 hover:underline font-medium"
            >
              Sign up
            </button>
          ) : (
            <Link href="/signup" className="text-indigo-600 hover:underline font-medium">
              Sign up
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
