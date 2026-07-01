"use client";

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CharacterRig, CharacterState } from './CharacterRig';

export function Tumi({ state = 'idle', className = '', speechBubble }: { state?: CharacterState; className?: string; speechBubble?: string }) {
  const prefersReducedMotion = useReducedMotion();
  const isCheering = state === 'excited' || state === 'celebrating' || state === 'happy';
  const isThinking = state === 'thinking';
  const isConcerned = state === 'concerned';

  // Tumi loves to spin when celebrating
  const shouldSpin = state === 'celebrating' && !prefersReducedMotion;

  return (
    <CharacterRig state={state} className={className} speechBubble={speechBubble}>
      <motion.svg
        viewBox="0 0 160 180"
        className="w-full h-full min-w-[120px] min-h-[140px]"
        animate={
          shouldSpin ? { rotate: [0, 360], scale: [1, 1.05, 1] } : 
          !prefersReducedMotion ? { y: [0, -3, 0] } : {}
        }
        transition={
          shouldSpin ? { duration: 0.8, ease: "easeInOut" } : 
          { repeat: Infinity, duration: 2.9, ease: "easeInOut" }
        }
      >
        <defs>
          <linearGradient id="tumiHair" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="tumiSkin" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ba762d" />
            <stop offset="100%" stopColor="#7a4b18" />
          </linearGradient>
          <linearGradient id="tumiShirt" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#c2410c" />
          </linearGradient>
          <linearGradient id="tumiBand" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#eab308" />
          </linearGradient>
        </defs>

        {/* Buns */}
        <circle cx="42" cy="82" r="16" fill="url(#tumiHair)" stroke="#1b2432" strokeWidth="3.5" />
        <circle cx="118" cy="82" r="16" fill="url(#tumiHair)" stroke="#1b2432" strokeWidth="3.5" />
        <circle cx="80" cy="54" r="22" fill="url(#tumiHair)" stroke="#1b2432" strokeWidth="3.5" />

        {/* Body */}
        <path d="M 50 140 L 110 140 L 122 180 L 40 180 Z" fill="url(#tumiShirt)" stroke="#1b2432" strokeWidth="3.5" />

        {/* Arms */}
        {isCheering ? (
          <>
            <motion.g
              animate={!prefersReducedMotion ? { rotate: [0, 15, -15, 0] } : {}}
              transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
              style={{ originX: "45px", originY: "145px" }}
            >
              <path d="M 45 145 Q 22 105 32 95" fill="none" stroke="url(#tumiSkin)" strokeWidth="11" strokeLinecap="round" />
            </motion.g>
            <motion.g
              animate={!prefersReducedMotion ? { rotate: [0, -15, 15, 0] } : {}}
              transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
              style={{ originX: "115px", originY: "145px" }}
            >
              <path d="M 115 145 Q 138 105 128 95" fill="none" stroke="url(#tumiSkin)" strokeWidth="11" strokeLinecap="round" />
            </motion.g>
          </>
        ) : isThinking ? (
          <>
            <path d="M 45 145 Q 32 165 42 180" fill="none" stroke="url(#tumiSkin)" strokeWidth="11" strokeLinecap="round" />
            <path d="M 115 145 Q 110 120 90 115" fill="none" stroke="url(#tumiSkin)" strokeWidth="11" strokeLinecap="round" />
          </>
        ) : (
          <>
            <motion.g
              animate={!prefersReducedMotion ? { rotate: [0, 4, -4, 0] } : {}}
              transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
              style={{ originX: "45px", originY: "145px" }}
            >
              <path d="M 45 145 Q 32 165 42 180" fill="none" stroke="url(#tumiSkin)" strokeWidth="11" strokeLinecap="round" />
            </motion.g>
            <motion.g
              animate={!prefersReducedMotion ? { rotate: [0, -4, 4, 0] } : {}}
              transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
              style={{ originX: "115px", originY: "145px" }}
            >
              <path d="M 115 145 Q 128 165 118 180" fill="none" stroke="url(#tumiSkin)" strokeWidth="11" strokeLinecap="round" />
            </motion.g>
          </>
        )}

        {/* Neck */}
        <rect x="72" y="118" width="16" height="24" fill="url(#tumiSkin)" stroke="#1b2432" strokeWidth="3.5" />
        <path d="M 72 128 L 88 128" stroke="#1b2432" strokeWidth="2.5" opacity="0.25" />

        {/* Ears */}
        <circle cx="41" cy="94" r="7.5" fill="url(#tumiSkin)" stroke="#1b2432" strokeWidth="3" />
        <circle cx="119" cy="94" r="7.5" fill="url(#tumiSkin)" stroke="#1b2432" strokeWidth="3" />

        {/* Face */}
        <circle cx="80" cy="90" r="38" fill="url(#tumiSkin)" stroke="#1b2432" strokeWidth="3.5" />

        {/* Headband */}
        <path d="M 42 70 Q 80 56 118 70 Q 110 50 50 50 Z" fill="url(#tumiBand)" stroke="#1b2432" strokeWidth="2.5" />
        <circle cx="45" cy="62" r="6" fill="url(#tumiBand)" stroke="#1b2432" strokeWidth="2" />
        <path d="M 42 62 Q 34 52 38 62 Q 34 70 45 64" fill="url(#tumiBand)" stroke="#1b2432" strokeWidth="2" strokeLinecap="round" />

        {/* Eyes */}
        <g fill="#1b2432">
          {isConcerned ? (
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
                  transition={{ repeat: Infinity, duration: 5, repeatDelay: 3 }}
                  style={{ originX: "66px", originY: "88px" }}
                >
                  <ellipse cx="66" cy="88" rx="4" ry="6.5" />
                  <circle cx="67.5" cy="85.5" r="1.5" fill="#ffffff" />
                </motion.g>
                <motion.g
                  animate={!prefersReducedMotion ? { scaleY: [1, 0.1, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 5, repeatDelay: 3 }}
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
            <circle cx="56" cy="96" r="4.5" fill="#f43f5e" opacity="0.3" />
            <circle cx="104" cy="96" r="4.5" fill="#f43f5e" opacity="0.3" />
          </>
        )}

        {/* Mouth */}
        <path
          d={
            isCheering ? "M 70 102 Q 80 120 90 102 Z" : 
            isConcerned ? "M 72 108 Q 80 102 88 108" :
            "M 72 104 Q 80 110 88 104"
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
