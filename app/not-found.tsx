import Link from 'next/link';
import { Mascot404 } from '@/components/mascots/LottieMascots';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      <Mascot404 className="w-48 h-48 md:w-56 md:h-56" />
      <p className="mt-2 text-xs font-black uppercase tracking-[0.2em] text-brand-orange">Error 404</p>
      <h1 className="mt-2 font-display text-3xl md:text-4xl font-black text-brand-primary">
        This page went walkabout
      </h1>
      <p className="mt-3 max-w-md font-medium text-brand-primary/70">
        We couldn&apos;t find what you were looking for. It may have moved, or the link might be off.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/dashboard"
          className="rounded-full border-2 border-brand-primary bg-brand-orange px-6 py-3 text-sm font-black text-white shadow-[4px_4px_0_#1b2432] transition-transform hover:-translate-y-0.5"
        >
          Back to dashboard
        </Link>
        <Link
          href="/courses"
          className="rounded-full border-2 border-brand-primary bg-white px-6 py-3 text-sm font-black text-brand-primary shadow-[4px_4px_0_#1b2432] transition-transform hover:-translate-y-0.5"
        >
          Browse courses
        </Link>
      </div>
    </div>
  );
}
