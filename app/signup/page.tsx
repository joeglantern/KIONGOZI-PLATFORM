"use client";
import { useEffect } from "react";
import Image from "next/image";
import SignupForm from "../components/auth/SignupForm";

export default function SignupPage() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__SUPABASE_URL__ = process.env.NEXT_PUBLIC_SUPABASE_URL;
      (window as any).__SUPABASE_ANON_KEY__ = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    }
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-6">
          <Image src="/images/ai-head-icon.svg" alt="Kiongozi AI" width={28} height={28} />
          <h1 className="text-2xl font-semibold text-gray-900">Create an account</h1>
        </div>
        <SignupForm />
      </div>
    </main>
  );
}


