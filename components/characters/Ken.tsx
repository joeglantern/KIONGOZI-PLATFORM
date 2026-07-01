"use client";

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CharacterRig, CharacterState } from './CharacterRig';

export function Ken({ state = 'idle', className = '', speechBubble }: { state?: CharacterState; className?: string; speechBubble?: string }) {
  const prefersReducedMotion = useReducedMotion();
  const isExcited = state === 'excited' || state === 'celebrating' || state === 'happy';
  const isThinking = state === 'thinking';
  const isConcerned = state === 'concerned';
  
  // Custom 'adjusting glasses' animation triggers on thinking
  const isAdjusting = state === 'thinking';

  return (
    <CharacterRig state={state} className={className} speechBubble={speechBubble}>
      <motion.svg
        viewBox="0 0 160 180"
        className="w-full h-full min-w-[120px] min-h-[140px]"
        animate={!prefersReducedMotion ? { y: [0, -3, 0] } : {}}
        transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}
      >
        <defs>
          <linearGradient id="kenHoodie" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id="kenSkin" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffd3b6" />
            <stop offset="100%" stopColor="#da9c74" />
          </linearGradient>
          <linearGradient id="kenHair" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#78350f" />
            <stop offset="100%" stopColor="#451a03" />
          </linearGradient>
          <linearGradient id="lensReflect" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e0f2fe" />
            <stop offset="100%" stopColor="#7dd3fc" />
          </linearGradient>
        </defs>

        {/* Body */}
        <path d="M 50 140 L 110 140 L 122 180 L 38 180 Z" fill="url(#kenHoodie)" stroke="#1b2432" strokeWidth="3.5" />
        
        {/* Hoodie strings */}
        <path d="M 74 140 L 74 158" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M 86 140 L 86 158" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />

        {/* Arms */}
        <path d="M 45 145 Q 32 165 40 180" fill="none" stroke="url(#kenSkin)" strokeWidth="11" strokeLinecap="round" />
        {isAdjusting ? (
          <motion.path
            d="M 115 145 Q 120 120 95 105"
            fill="none"
            stroke="url(#kenSkin)"
            strokeWidth="11"
            strokeLinecap="round"
            animate={!prefersReducedMotion ? { x: [0, -4, 0], y: [0, -4, 0] } : {}}
            transition={{ repeat: Infinity, duration: 1 }}
          />
        ) : isExcited ? (
          <motion.path
            d="M 115 145 Q 138 108 132 95"
            fill="none"
            stroke="url(#kenSkin)"
            strokeWidth="11"
            strokeLinecap="round"
            animate={!prefersReducedMotion ? { rotate: [0, -10, 10, 0] } : {}}
            transition={{ repeat: Infinity, duration: 1.2 }}
            style={{ originX: "115px", originY: "145px" }}
          />
        ) : (
          <path d="M 115 145 Q 128 165 120 180" fill="none" stroke="url(#kenSkin)" strokeWidth="11" strokeLinecap="round" />
        )}

        {/* Neck */}
        <rect x="72" y="118" width="16" height="24" fill="url(#kenSkin)" stroke="#1b2432" strokeWidth="3.5" />
        <path d="M 72 128 L 88 128" stroke="#1b2432" strokeWidth="2.5" opacity="0.25" />

        {/* Ears */}
        <circle cx="41" cy="94" r="7.5" fill="url(#kenSkin)" stroke="#1b2432" strokeWidth="3" />
        <circle cx="119" cy="94" r="7.5" fill="url(#kenSkin)" stroke="#1b2432" strokeWidth="3" />

        {/* Face */}
        <circle cx="80" cy="90" r="38" fill="url(#kenSkin)" stroke="#1b2432" strokeWidth="3.5" />

        {/* Hair */}
        <path d="M 42 74 C 45 38 115 38 118 74 C 105 50 55 50 42 74 Z" fill="url(#kenHair)" stroke="#1b2432" strokeWidth="2" />

        {/* Glasses */}
        <g stroke="#1b2432" strokeWidth="3.5" fill="none">
          <rect x="52" y="82" width="22" height="16" rx="4" fill="url(#lensReflect)" fillOpacity="0.4" />
          <rect x="86" y="82" width="22" height="16" rx="4" fill="url(#lensReflect)" fillOpacity="0.4" />
          
          {(isAdjusting || isExcited) && !prefersReducedMotion && (
            <motion.path
              d="M 54 84 L 62 96 M 88 84 L 96 96"
              stroke="#ffffff"
              strokeWidth="2.5"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
          )}
          
          <path d="M 74 90 L 86 90" />
        </g>

        {/* Eyes behind glasses */}
        <circle cx="63" cy="90" r="2.5" fill="#1b2432" />
        <circle cx="97" cy="90" r="2.5" fill="#1b2432" />

        {/* Mouth */}
        <path
          d={
            isExcited ? "M 72 104 Q 80 116 88 104 Z" : 
            isConcerned ? "M 72 108 L 88 108" :
            "M 74 106 Q 80 112 86 106"
          }
          fill={isExcited ? "#991b1b" : "none"}
          stroke="#1b2432"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </motion.svg>
    </CharacterRig>
  );
}
