"use client";

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CharacterRig, CharacterState } from './CharacterRig';

export function Mwanzo({ state = 'idle', className = '', speechBubble }: { state?: CharacterState; className?: string; speechBubble?: string }) {
  const prefersReducedMotion = useReducedMotion();
  const isExcited = state === 'excited' || state === 'celebrating' || state === 'happy';
  const isThinking = state === 'thinking';
  const isConcerned = state === 'concerned';

  return (
    <CharacterRig state={state} className={className} speechBubble={speechBubble}>
      <motion.svg
        viewBox="0 0 160 160"
        className="w-full h-full min-w-[120px] min-h-[120px]"
        animate={isThinking && !prefersReducedMotion ? { rotate: [-2, 2, -2] } : { y: [0, -5, 0] }}
        transition={{ repeat: Infinity, duration: isThinking ? 2 : 3, ease: "easeInOut" }}
      >
        <defs>
          <radialGradient id="mwanzoBody" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="60%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#15803d" />
          </radialGradient>
          <linearGradient id="goldCrown" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#ca8a04" />
          </linearGradient>
          <linearGradient id="leafGrad" x1="0%" y1="0%" x2="120%" y2="100%">
            <stop offset="0%" stopColor="#a7f3d0" />
            <stop offset="50%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
        </defs>

        {/* Floating Crown */}
        <motion.g
          animate={!prefersReducedMotion ? { y: [0, -4, 0], rotate: [0, 4, -4, 0] } : {}}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
        >
          <path
            d="M 65 25 L 72 35 L 80 22 L 88 35 L 95 25 L 92 42 L 68 42 Z"
            fill="url(#goldCrown)"
            stroke="#1b2432"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path d="M 69 39 L 73 35 L 80 26 L 87 35 L 91 39" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" />
        </motion.g>
        
        {/* Sprout Stem */}
        <path d="M 80 80 Q 80 50 92 48" fill="none" stroke="#15803d" strokeWidth="6" strokeLinecap="round" />
        
        {/* Leaf */}
        <motion.g
          animate={!prefersReducedMotion ? (isThinking ? { rotate: [0, -15, 15, 0] } : { rotate: [ -10, 10, -10 ] }) : {}}
          transition={{ repeat: Infinity, duration: isThinking ? 1.5 : 4, ease: "easeInOut" }}
          style={{ originX: "80px", originY: "70px" }}
        >
          <path
            d="M 92 48 C 108 38 118 48 95 56 C 85 53 88 49 92 48 Z"
            fill="url(#leafGrad)"
            stroke="#15803d"
            strokeWidth="2"
          />
          <path d="M 94 51 Q 102 47 108 49" fill="none" stroke="#047857" strokeWidth="1.2" strokeLinecap="round" />
        </motion.g>

        {/* Body */}
        <motion.path
          d="M 45 125 C 45 65 115 65 115 125 C 115 135 45 135 45 125 Z"
          fill="url(#mwanzoBody)"
          stroke="#1b2432"
          strokeWidth="3.5"
          animate={isExcited && !prefersReducedMotion ? { scaleY: [1, 1.06, 0.96, 1], scaleX: [1, 0.96, 1.04, 1] } : {}}
          transition={{ repeat: isExcited ? Infinity : 0, duration: 1.2 }}
        />
        <path d="M 52 110 C 52 75 75 75 90 75" fill="none" stroke="#ffffff" strokeWidth="2.5" opacity="0.45" strokeLinecap="round" />

        {/* Cheeks */}
        {!isConcerned && (
          <>
            <circle cx="58" cy="112" r="7" fill="#f43f5e" opacity="0.5" />
            <circle cx="102" cy="112" r="7" fill="#f43f5e" opacity="0.5" />
          </>
        )}

        {/* Eyes */}
        <g fill="#1b2432">
          {isExcited ? (
            <>
              <path d="M 50 102 Q 58 92 66 102" fill="none" stroke="#1b2432" strokeWidth="4" strokeLinecap="round" />
              <path d="M 94 102 Q 102 92 110 102" fill="none" stroke="#1b2432" strokeWidth="4" strokeLinecap="round" />
            </>
          ) : isThinking ? (
            <>
              <ellipse cx="62" cy="98" rx="5" ry="5" />
              <circle cx="64" cy="96" r="1.5" fill="#ffffff" />
              <ellipse cx="106" cy="98" rx="5" ry="5" />
              <circle cx="108" cy="96" r="1.5" fill="#ffffff" />
            </>
          ) : isConcerned ? (
            <>
              <ellipse cx="58" cy="98" rx="5" ry="6" />
              <circle cx="59.5" cy="96" r="1.8" fill="#ffffff" />
              <path d="M 50 90 L 64 94" fill="none" stroke="#1b2432" strokeWidth="2.5" strokeLinecap="round" />
              
              <ellipse cx="102" cy="98" rx="5" ry="6" />
              <circle cx="103.5" cy="96" r="1.8" fill="#ffffff" />
              <path d="M 110 90 L 96 94" fill="none" stroke="#1b2432" strokeWidth="2.5" strokeLinecap="round" />
            </>
          ) : (
            <>
              <motion.g
                animate={!prefersReducedMotion ? { scaleY: [1, 0.1, 1] } : {}}
                transition={{ repeat: Infinity, duration: 4, repeatDelay: 3 }}
                style={{ originX: "58px", originY: "100px" }}
              >
                <ellipse cx="58" cy="100" rx="5" ry="7" />
                <circle cx="59.5" cy="97" r="1.8" fill="#ffffff" />
              </motion.g>
              <motion.g
                animate={!prefersReducedMotion ? { scaleY: [1, 0.1, 1] } : {}}
                transition={{ repeat: Infinity, duration: 4, repeatDelay: 3 }}
                style={{ originX: "102px", originY: "100px" }}
              >
                <ellipse cx="102" cy="100" rx="5" ry="7" />
                <circle cx="103.5" cy="97" r="1.8" fill="#ffffff" />
              </motion.g>
            </>
          )}
        </g>

        {/* Mouth */}
        <motion.path
          d={
            isExcited ? "M 70 112 Q 80 126 90 112 Z" : 
            isThinking ? "M 74 114 Q 80 114 86 114" : 
            isConcerned ? "M 74 116 Q 80 110 86 116" :
            "M 72 112 Q 80 120 88 112"
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
