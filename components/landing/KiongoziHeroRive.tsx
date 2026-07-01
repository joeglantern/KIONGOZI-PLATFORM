"use client";

import { Mwanzo } from "./Characters";

interface KiongoziHeroRiveProps {
  className?: string;
}

export default function KiongoziHeroRive({ className = "" }: KiongoziHeroRiveProps) {
  return (
    <div
      className={`pointer-events-none relative flex items-center justify-center rounded-[2rem] border-2 border-brand-primary bg-[#fff7ed] p-3 shadow-[4px_4px_0_#1b2432] ${className}`}
      aria-hidden="true"
    >
      <div className="absolute -right-2 -top-2 h-5 w-5 rounded-full border-2 border-brand-primary bg-brand-orange" />
      <Mwanzo expression="excited" className="h-full w-full drop-shadow-sm" />
    </div>
  );
}
