"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase, getSupabase, getSupabaseAsync } from "../utils/supabaseClient";
import dynamic from "next/dynamic";
const PasswordInput = dynamic(() => import("../components/PasswordInput"), { ssr: false });

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        (window as any).__SUPABASE_URL__ = process.env.NEXT_PUBLIC_SUPABASE_URL;
        (window as any).__SUPABASE_ANON_KEY__ = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      } catch {}
    }
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    try {
      setLoading(true);
      setMessage("");
      const s = supabase || getSupabase();
      const { error } = await s.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push("/");
    } catch (err: any) {
      setMessage(err?.message || "Failed to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      setLoading(true);
      const s = supabase || getSupabase();
      await s.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-6">
          <Image src="/images/ai-head-icon.svg" alt="Kiongozi AI" width={28} height={28} />
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Sign in</h1>
        </div>
        <form onSubmit={handleEmailLogin} className="space-y-3">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
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

        <div className="flex items-center gap-3 my-5">
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          <span className="text-xs text-gray-500 dark:text-gray-400">OR</span>
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        </div>

        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full rounded-xl border border-gray-300 dark:border-gray-700 py-3 text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Continue with Google
        </button>

        {message && (
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">{message}</p>
        )}

        <p className="mt-6 text-sm text-gray-600 dark:text-gray-300">
          Don&apos;t have an account? <Link href="/signup" className="text-indigo-600 dark:text-indigo-400 hover:underline">Sign up</Link>
        </p>
      </div>
    </main>
  );
}


