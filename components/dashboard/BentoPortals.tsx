"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Zola, Tumi } from '@/components/landing/Characters';
import { MascotCelebration, MascotJourney } from '@/components/mascots/LottieMascots';
import { ArrowRight, BookOpen, Users, Map, Trophy } from 'lucide-react';

export function BentoPortals() {
  const portals = [
    {
      id: "bento-courses",
      title: "Courses Quest",
      desc: "Learn civic, climate, & developer skills. Claim certificates!",
      href: "/courses",
      icon: BookOpen,
      mascot: <MascotJourney className="w-28 h-28" />,
      color: "bg-brand-cream border-brand-primary/30",
      accent: "text-brand-orange bg-brand-orange/10",
      hoverBg: "hover:bg-amber-50/50"
    },
    {
      id: "bento-community",
      title: "Community Space",
      desc: "Discuss policy, write petitions, & attend live town halls.",
      href: "/community",
      icon: Users,
      mascot: <Tumi action="cheer" className="w-28 h-28" />,
      color: "bg-emerald-50/20 border-emerald-300/60",
      accent: "text-emerald-600 bg-emerald-100/60",
      hoverBg: "hover:bg-emerald-50/50"
    },
    {
      id: "bento-impact",
      title: "Impact Action Map",
      desc: "Track public funds and municipal projects in your region.",
      href: "/impact-map",
      icon: Map,
      mascot: <Zola action="thinking" className="w-28 h-28" />,
      color: "bg-blue-50/20 border-blue-300/60",
      accent: "text-brand-primary bg-blue-100/60",
      hoverBg: "hover:bg-blue-50/50"
    },
    {
      id: "bento-leaderboard",
      title: "Leaderboard & Badges",
      desc: "Climb the local county ranks and collect starting medals.",
      href: "/profile",
      icon: Trophy,
      mascot: <MascotCelebration className="w-28 h-28" />,
      color: "bg-purple-50/20 border-purple-300/60",
      accent: "text-purple-600 bg-purple-100/60",
      hoverBg: "hover:bg-purple-50/50"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full my-6">
      {portals.map((p, index) => (
        <Link key={p.title} id={p.id} href={p.href} className="group block">
          <motion.div
            whileHover={{ y: -6, rotate: index % 2 === 0 ? -0.8 : 0.8 }}
            whileTap={{ scale: 0.98 }}
            className={`sticker p-6 ${p.color} ${p.hoverBg} border-2 border-brand-primary flex gap-4 text-left items-center justify-between min-h-[160px] h-full shadow-soft hover:shadow-float transition-all relative overflow-hidden`}
          >
            {/* Left Content */}
            <div className="flex-1 flex flex-col justify-between h-full z-10">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-2 rounded-lg border-2 border-brand-primary ${p.accent}`}>
                    <p.icon className="w-4 h-4" />
                  </div>
                  <h3 className="font-extrabold text-brand-primary text-lg font-display">
                    {p.title}
                  </h3>
                </div>
                <p className="text-sm font-medium text-brand-primary/70 leading-relaxed max-w-[260px] md:max-w-xs">
                  {p.desc}
                </p>
              </div>

              <div className="mt-4 flex items-center gap-1 text-xs font-black text-brand-orange uppercase tracking-wider group-hover:text-brand-orange-hover">
                <span>Enter Quest</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Right Mascot Illustration */}
            <motion.div 
              className="shrink-0 flex items-center justify-center select-none"
              animate={{ y: [0, -3, 0] }}
              transition={{ repeat: Infinity, duration: 2.5 + index * 0.2, ease: "easeInOut" }}
            >
              {p.mascot}
            </motion.div>
          </motion.div>
        </Link>
      ))}
    </div>
  );
}
