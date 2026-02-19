"use client";

import Link from 'next/link';
import { ArrowRight, CheckCircle, Leaf } from 'lucide-react';

export default function ResetPasswordSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-2xl p-8 shadow-2xl border border-gray-100 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-orange-500 flex items-center justify-center shadow-xl">
            <Leaf className="w-10 h-10 text-white" strokeWidth={2.5} />
          </div>
          <div className="mx-auto w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle className="w-7 h-7 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Password Updated</h1>
          <p className="text-gray-600 mb-6">
            Your password has been reset successfully. You can sign in now.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-all"
          >
            Go to Sign In
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
