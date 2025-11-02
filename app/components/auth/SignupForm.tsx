"use client";

/**
 * SignupForm Component
 * Reusable signup form that works in both pages and modals
 * Extracted from app/signup/page.tsx for consistency
 */
import { useState } from 'react';
import Link from 'next/link';
import { supabase, getSupabase } from '../../utils/supabaseClient';
import PasswordInput from '../PasswordInput';

interface SignupFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
  redirectTo?: string;
  showLoginLink?: boolean;
  className?: string;
}

export default function SignupForm({
  onSuccess,
  onSwitchToLogin,
  redirectTo = '/',
  showLoginLink = true,
  className = ''
}: SignupFormProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('error');

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !password) return;

    try {
      setLoading(true);
      setMessage('');
      const s = supabase || getSupabase();
      const { data, error } = await s.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          }
        }
      });

      if (error) throw error;

      setMessageType('success');
      setMessage('Check your email to confirm your account.');

      // Call success callback if provided
      if (onSuccess) {
        setTimeout(() => onSuccess(), 2000);
      }
    } catch (err: any) {
      setMessageType('error');
      setMessage(err?.message || 'Sign up failed. Please try again.');
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
      <form onSubmit={handleEmailSignup} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              className="w-full rounded-xl px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
              required
            />
          </div>
          <div>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              className="w-full rounded-xl px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
              required
            />
          </div>
        </div>
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
          disabled={loading || !firstName || !lastName || !email || !password}
          className={`w-full rounded-full py-3 font-medium transition-colors ${
            loading || !firstName || !lastName || !email || !password
              ? 'bg-gray-300 cursor-not-allowed text-gray-500'
              : 'bg-gray-900 text-white hover:bg-gray-800'
          }`}
        >
          {loading ? 'Creating account...' : 'Continue'}
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
        <div className={`mt-4 p-3 rounded-lg ${
          messageType === 'success'
            ? 'bg-green-50 border border-green-200'
            : 'bg-red-50 border border-red-200'
        }`}>
          <p className={`text-sm ${
            messageType === 'success' ? 'text-green-600' : 'text-red-600'
          }`}>
            {message}
          </p>
        </div>
      )}

      {showLoginLink && (
        <p className="mt-6 text-sm text-gray-600 text-center">
          Already have an account?{' '}
          {onSwitchToLogin ? (
            <button
              onClick={onSwitchToLogin}
              className="text-indigo-600 hover:underline font-medium"
            >
              Sign in
            </button>
          ) : (
            <Link href="/login" className="text-indigo-600 hover:underline font-medium">
              Sign in
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
