"use client";

import React from 'react';
import { motion } from 'framer-motion';

export function TreasureChest({ isOpen = false, className = '' }: { isOpen: boolean; className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <motion.svg
        viewBox="0 0 160 160"
        className="w-48 h-48"
        animate={!isOpen ? { rotate: [0, -3, 3, 0] } : {}}
        transition={{ repeat: !isOpen ? Infinity : 0, duration: 1.8, repeatDelay: 2 }}
      >
        <defs>
          <linearGradient id="woodGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#a16207" />
            <stop offset="100%" stopColor="#713f12" />
          </linearGradient>
          <linearGradient id="woodLid" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>
          <linearGradient id="goldTrim" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#ca8a04" />
          </linearGradient>
          <linearGradient id="steelTrim" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f4f4f5" />
            <stop offset="100%" stopColor="#71717a" />
          </linearGradient>
        </defs>

        {isOpen && (
          <motion.circle
            cx="80"
            cy="90"
            r="50"
            fill="#fdba74"
            opacity="0.45"
            animate={{ scale: [1, 1.4, 1], opacity: [0.45, 0.75, 0.45] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
        )}

        <path d="M 30 90 L 130 90 L 122 135 L 38 135 Z" fill="url(#woodGrad)" stroke="#1b2432" strokeWidth="4" />
        <path d="M 30 90 L 45 90 L 38 135 L 30 135 Z" fill="url(#steelTrim)" stroke="#1b2432" strokeWidth="2" />
        <path d="M 130 90 L 115 90 L 122 135 L 130 135 Z" fill="url(#steelTrim)" stroke="#1b2432" strokeWidth="2" />

        <motion.g
          animate={isOpen ? { y: -20, rotate: -25 } : { y: 0, rotate: 0 }}
          transition={{ type: "spring", damping: 10 }}
          style={{ originX: "80px", originY: "90px" }}
        >
          <path d="M 30 90 C 30 45 130 45 130 90 Z" fill="url(#woodLid)" stroke="#1b2432" strokeWidth="4" />
          <path d="M 30 90 L 130 90" stroke="#1b2432" strokeWidth="4" />
          <path d="M 60 52 C 60 52 80 50 80 90" fill="none" stroke="url(#goldTrim)" strokeWidth="4.5" />
          <path d="M 100 52 C 100 52 80 50 80 90" fill="none" stroke="url(#goldTrim)" strokeWidth="4.5" />

          <path d="M 30 90 C 30 45 42 45 45 90 Z" fill="url(#goldTrim)" opacity="0.35" />
          <path d="M 130 90 C 130 45 118 45 115 90 Z" fill="url(#goldTrim)" opacity="0.35" />

          <rect x="72" y="82" width="16" height="18" rx="2" fill="url(#goldTrim)" stroke="#1b2432" strokeWidth="3" />
          <circle cx="80" cy="91" r="2.5" fill="#1b2432" />
        </motion.g>

        <rect x="74" y="90" width="12" height="10" fill="url(#steelTrim)" stroke="#1b2432" strokeWidth="3" />
      </motion.svg>
    </div>
  );
}
