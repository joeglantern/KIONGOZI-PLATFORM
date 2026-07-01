"use client";

import Link from 'next/link';
import { useUser } from '@/app/contexts/UserContext';
import { ArrowRight, LayoutDashboard } from 'lucide-react';

export function AuthCTA() {
  const { user } = useUser();

  if (user) {
    return (
      <Link 
        href="/dashboard" 
        className="btn-pill bg-brand-orange text-white px-8 py-4 border-2 border-brand-primary hover:bg-brand-orange-hover text-lg w-full sm:w-auto flex items-center justify-center space-x-2 transition-all hover:scale-105"
      >
        <LayoutDashboard className="w-5 h-5" />
        <span>Go to Dashboard</span>
        <ArrowRight className="w-5 h-5" />
      </Link>
    );
  }

  return (
    <Link 
      href="/signup" 
      className="btn-pill bg-brand-orange text-white px-8 py-4 border-2 border-brand-primary hover:bg-brand-orange-hover text-lg w-full sm:w-auto flex items-center justify-center space-x-2 transition-all hover:scale-105"
    >
      <span>Start Learning Free</span>
      <ArrowRight className="w-5 h-5" />
    </Link>
  );
}
