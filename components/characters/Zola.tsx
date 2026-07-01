"use client";

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CharacterRig, CharacterState } from './CharacterRig';

export function Zola({ state = 'idle', className = '', speechBubble }: { state?: CharacterState; className?: string; speechBubble?: string }) {
  const prefersReducedMotion = useReducedMotion();
  const isCheering = state === 'excited' || state === 'celebrating' || state === 'happy';
  const isThinking = state === 'thinking';
  const isConcerned = state === 'concerned';

  return (
    <CharacterRig state={state} className={className} speechBubble={speechBubble}>
      <motion.svg
        viewBox="0 0 160 180"
        className="w-full h-full min-w-[120px] min-h-[140px]"
        animate={!prefersReducedMotion ? { y: [0, -3, 0] } : {}}
        transition={{ repeat: Infinity, duration: 3.2, ease: "easeInOut" }}
      >
        <defs>
          <linearGradient id="zolaHair" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <linearGradient id="zolaSkin" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f8c09e" />
            <stop offset="100%" stopColor="#d29570" />
          </linearGradient>
          <linearGradient id="zolaShirt" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>
          <linearGradient id="zolaArm" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e2ab86" />
            <stop offset="100%" stopColor="#c0825c" />
          </linearGradient>
        </defs>

        {/* Back Hair */}
        <path d="M 40 80 C 18 55 18 120 40 132 Z" fill="url(#zolaHair)" stroke="#1b2432" strokeWidth="2" />
        <path d="M 120 80 C 142 55 142 120 120 132 Z" fill="url(#zolaHair)" stroke="#1b2432" strokeWidth="2" />

        {/* Body */}
        <path d="M 50 140 L 110 140 L 122 180 L 38 180 Z" fill="url(#zolaShirt)" stroke="#1b2432" strokeWidth="3.5" />
        <path d="M 75 160 Q 80 148 85 160 T 75 160" fill="#a7f3d0" stroke="#047857" strokeWidth="1.5" />

        {/* Arms */}
        {isCheering ? (
          <>
            <motion.path
              d="M 40 145 Q 15 105 22 95"
              fill="none"
              stroke="url(#zolaArm)"
              strokeWidth="11"
              strokeLinecap="round"
              animate={!prefersReducedMotion ? { rotate: [0, 15, -15, 0] } : {}}
              transition={{ repeat: Infinity, duration: 1.5 }}
              style={{ originX: "40px", originY: "145px" }}
            />
            <motion.path
              d="M 120 145 Q 145 105 138 95"
              fill="none"
              stroke="url(#zolaArm)"
              strokeWidth="11"
              strokeLinecap="round"
              animate={!prefersReducedMotion ? { rotate: [0, -15, 15, 0] } : {}}
              transition={{ repeat: Infinity, duration: 1.5 }}
              style={{ originX: "120px", originY: "145px" }}
            />
          </>
        ) : isThinking ? (
          <>
            <path d="M 45 145 Q 32 165 40 180" fill="none" stroke="url(#zolaArm)" strokeWidth="11" strokeLinecap="round" />
            <path d="M 115 145 Q 110 120 88 112" fill="none" stroke="url(#zolaArm)" strokeWidth="11" strokeLinecap="round" />
          </>
        ) : isConcerned ? (
          <>
            <path d="M 45 145 Q 55 120 70 125" fill="none" stroke="url(#zolaArm)" strokeWidth="11" strokeLinecap="round" />
            <path d="M 115 145 Q 128 165 120 180" fill="none" stroke="url(#zolaArm)" strokeWidth="11" strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d="M 45 145 Q 32 165 40 180" fill="none" stroke="url(#zolaArm)" strokeWidth="11" strokeLinecap="round" />
            <path d="M 115 145 Q 128 165 120 180" fill="none" stroke="url(#zolaArm)" strokeWidth="11" strokeLinecap="round" />
          </>
        )}

        {/* Neck */}
        <rect x="72" y="118" width="16" height="24" fill="url(#zolaSkin)" stroke="#1b2432" strokeWidth="3.5" />
        <path d="M 72 128 L 88 128" stroke="#1b2432" strokeWidth="2.5" opacity="0.25" />

        {/* Ears */}
        <circle cx="41" cy="94" r="7.5" fill="url(#zolaSkin)" stroke="#1b2432" strokeWidth="3" />
        <circle cx="119" cy="94" r="7.5" fill="url(#zolaSkin)" stroke="#1b2432" strokeWidth="3" />

        {/* Face */}
        <circle cx="80" cy="90" r="38" fill="url(#zolaSkin)" stroke="#1b2432" strokeWidth="3.5" />

        {/* Bangs */}
        <path d="M 42 75 C 60 52 100 52 118 75 C 110 62 50 62 42 75 Z" fill="url(#zolaHair)" />

        {/* Eyes */}
        <g fill="#1b2432">
          {isThinking ? (
            <>
              <circle cx="72" cy="88" r="4.5" />
              <circle cx="73.5" cy="86.5" r="1.2" fill="#ffffff" />
              <circle cx="100" cy="88" r="4.5" />
              <circle cx="101.5" cy="86.5" r="1.2" fill="#ffffff" />
            </>
          ) : isConcerned ? (
            <>
              <ellipse cx="66" cy="88" rx="4" ry="4" />
              <path d="M 58 80 L 72 84" fill="none" stroke="#1b2432" strokeWidth="2.5" strokeLinecap="round" />
              <ellipse cx="94" cy="88" rx="4" ry="4" />
              <path d="M 102 80 L 88 84" fill="none" stroke="#1b2432" strokeWidth="2.5" strokeLinecap="round" />
            </>
          ) : (
            <>
              <motion.g
                animate={!prefersReducedMotion ? { scaleY: [1, 0.1, 1] } : {}}
                transition={{ repeat: Infinity, duration: 4.5, repeatDelay: 3.5 }}
                style={{ originX: "66px", originY: "88px" }}
              >
                <ellipse cx="66" cy="88" rx="4" ry="6.5" />
                <circle cx="67.5" cy="85.5" r="1.5" fill="#ffffff" />
              </motion.g>
              <motion.g
                animate={!prefersReducedMotion ? { scaleY: [1, 0.1, 1] } : {}}
                transition={{ repeat: Infinity, duration: 4.5, repeatDelay: 3.5 }}
                style={{ originX: "94px", originY: "88px" }}
              >
                <ellipse cx="94" cy="88" rx="4" ry="6.5" />
                <circle cx="95.5" cy="85.5" r="1.5" fill="#ffffff" />
              </motion.g>
            </>
          )}
        </g>

        {/* Cheeks */}
        {!isConcerned && (
          <>
            <circle cx="56" cy="96" r="4.5" fill="#f43f5e" opacity="0.4" />
            <circle cx="104" cy="96" r="4.5" fill="#f43f5e" opacity="0.4" />
          </>
        )}

        {/* Mouth */}
        <path
          d={
            isCheering ? "M 70 102 Q 80 116 90 102 Z" : 
            isThinking ? "M 74 104 L 86 104" : 
            isConcerned ? "M 74 106 Q 80 100 86 106" :
            "M 74 104 Q 80 110 86 104"
          }
          fill={isCheering ? "#991b1b" : "none"}
          stroke="#1b2432"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </motion.svg>
    </CharacterRig>
  );
}
