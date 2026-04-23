"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useUser } from '@/app/contexts/UserContext';
import { ArrowRight, LayoutDashboard } from 'lucide-react';

export function AuthCTA() {
  const { user } = useUser();

  if (user) {
    return (
      <Button asChild className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center space-x-2 w-full sm:w-auto">
        <Link href="/dashboard">
          <LayoutDashboard className="w-5 h-5" />
          <span>Go to Dashboard</span>
          <ArrowRight className="w-5 h-5" />
        </Link>
      </Button>
    );
  }

  return (
    <Button asChild className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center space-x-2 w-full sm:w-auto">
      <Link href="/signup">
        <span>Start Learning Free</span>
        <ArrowRight className="w-5 h-5" />
      </Link>
    </Button>
  );
}
