"use client";

import Image from "next/image";
import {
  Bell,
  Check,
  ClipboardCheck,
  Home,
  Trophy,
  User,
} from "lucide-react";

interface HeroPhoneMockupProps {
  className?: string;
}

export default function HeroPhoneMockup({ className = "" }: HeroPhoneMockupProps) {
  return (
    <div
      className={`relative aspect-[723/1351] ${className}`}
      role="img"
      aria-label="Mobile learning app preview showing the Za Kimotho animated mission"
    >
      <div className="absolute inset-0 rounded-[3.1rem] bg-gradient-to-br from-[#1c232b] via-[#05080c] to-[#3a3a3a] p-[7px] shadow-[0_35px_45px_rgba(27,36,50,0.22)]">
        <div className="absolute -right-[7px] top-[25%] h-24 w-1.5 rounded-r-full bg-gradient-to-r from-zinc-500 to-zinc-950" />
        <div className="absolute -right-[6px] top-[42%] h-20 w-1.5 rounded-r-full bg-gradient-to-r from-zinc-500 to-zinc-950" />
        <div className="absolute -left-[4px] top-[19%] h-16 w-1 rounded-l-full bg-zinc-800" />

        <div className="relative h-full overflow-hidden rounded-[2.7rem] bg-[#fbfbf8] ring-1 ring-white/20">
          <div className="relative overflow-hidden bg-gradient-to-br from-[#122131] via-[#07121e] to-[#07101a] px-5 pb-6 pt-4 text-white">
            <div className="flex items-center justify-between text-[11px] font-black">
              <span>9:41</span>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-4 rounded-[3px] border border-white/80">
                  <span className="block h-full w-3 rounded-[2px] bg-white" />
                </span>
              </div>
            </div>

            <div className="absolute left-1/2 top-4 h-6 w-24 -translate-x-1/2 rounded-full bg-black shadow-inner" />

            <div className="mt-7 flex items-start justify-between gap-4">
              <div>
                <p className="text-[20px] font-black leading-tight">Halo halo</p>
                <p className="mt-1.5 text-xs font-semibold text-white/82">Level 5 - Youth Advocate</p>
              </div>
              <div className="relative mt-1">
                <Bell className="h-5 w-5" />
                <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-brand-orange text-[9px] font-black shadow-sm">
                  2
                </span>
              </div>
            </div>
          </div>

          <div className="relative -mt-4 mx-3.5 rounded-[1.35rem] bg-white p-3 shadow-[0_14px_32px_rgba(27,36,50,0.12)]">
            <div className="flex items-center justify-between text-[11px] font-black text-brand-primary">
              <span>Level 5 Progress</span>
              <span>450 / 600 XP</span>
            </div>
            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full w-[75%] rounded-full bg-emerald-500" />
            </div>
            <p className="mt-1.5 text-right text-[10px] font-semibold italic text-brand-primary/70">
              You&apos;re on fire!
            </p>

            <div className="mt-2.5 overflow-hidden rounded-[1.1rem] border border-brand-primary/8 bg-[#fff8ef]">
              <div className="relative aspect-[16/10]">
                <Image
                  src="/lottie/za-kimotho.svg"
                  alt=""
                  fill
                  priority
                  unoptimized
                  aria-hidden="true"
                  className="object-contain p-1"
                />
              </div>
            </div>
          </div>

          <div className="mx-3.5 mt-2">
            <div className="flex items-center gap-2.5 rounded-2xl bg-white p-2 shadow-[0_8px_22px_rgba(27,36,50,0.08)]">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_8px_16px_rgba(16,185,129,0.25)]">
                <Check className="h-4 w-4 stroke-[3]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black text-brand-primary">Mission 1: Za Kimotho</p>
                <p className="text-[10px] font-black uppercase text-emerald-600">Completed</p>
              </div>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 grid grid-cols-4 bg-[#081521] px-4 pb-2.5 pt-2 text-white">
            {[
              { Icon: Home, label: "Home", active: true },
              { Icon: ClipboardCheck, label: "Missions" },
              { Icon: Trophy, label: "Leagues" },
              { Icon: User, label: "Profile" },
            ].map(({ Icon, label, active }) => (
              <div
                key={label}
                className={`flex flex-col items-center gap-0.5 text-[8px] font-bold ${
                  active ? "text-brand-orange" : "text-white/78"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
