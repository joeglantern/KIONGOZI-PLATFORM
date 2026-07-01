"use client";

import React, { useRef } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { useCursorTracking } from './hooks';

export type CharacterState = 'idle' | 'happy' | 'excited' | 'thinking' | 'celebrating' | 'concerned';

interface CharacterRigProps {
  state?: CharacterState;
  className?: string;
  speechBubble?: string;
  children: React.ReactNode;
}

export function CharacterRig({ state = 'idle', className = '', speechBubble, children }: CharacterRigProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { mousePosition, isHovering } = useCursorTracking(containerRef);
  const prefersReducedMotion = useReducedMotion();

  // Subtle look direction based on cursor (only active if hovering nearby)
  const lookX = prefersReducedMotion || !isHovering ? 0 : mousePosition.x * 12;
  const lookY = prefersReducedMotion || !isHovering ? 0 : mousePosition.y * 12;

  // Jump animation for celebrating state
  const jumpY = state === 'celebrating' && !prefersReducedMotion ? [0, -15, 0] : 0;

  return (
    <div ref={containerRef} className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Speech Bubble System */}
      <AnimatePresence>
        {speechBubble && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.8 }}
            transition={{ type: "spring", bounce: 0.5, duration: 0.6 }}
            className="absolute bottom-[85%] mb-2 px-4 py-3 bg-white text-slate-800 text-sm font-bold rounded-2xl rounded-br-none shadow-xl border-2 border-slate-100 z-20 whitespace-nowrap"
          >
            {speechBubble}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Character Wrapper with physics and cursor tracking */}
      <motion.div
        animate={{ 
          x: lookX, 
          y: lookY,
          scale: isHovering && !prefersReducedMotion ? 1.05 : 1
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <motion.div
          animate={{ y: jumpY }}
          transition={{ repeat: state === 'celebrating' ? Infinity : 0, duration: 0.6, ease: "easeInOut" }}
        >
          {children}
        </motion.div>
      </motion.div>

      {/* Particle Emitter (for celebrating) */}
      <AnimatePresence>
        {state === 'celebrating' && !prefersReducedMotion && (
          <ParticleBurst />
        )}
      </AnimatePresence>
    </div>
  );
}

function ParticleBurst() {
  // Generate 12 particles
  const particles = Array.from({ length: 12 });
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0">
      {particles.map((_, i) => {
        const angle = (i / particles.length) * Math.PI * 2;
        const radius = 80 + Math.random() * 40;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const isStar = i % 3 === 0;
        
        return (
          <motion.div
            key={i}
            initial={{ opacity: 1, x: 0, y: 0, scale: 0, rotate: 0 }}
            animate={{ 
              opacity: [1, 1, 0], 
              x, 
              y, 
              scale: Math.random() * 0.5 + 0.5,
              rotate: Math.random() * 360
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 + Math.random() * 0.5, ease: "easeOut", repeat: Infinity, repeatDelay: 1 }}
            className={`absolute ${isStar ? 'w-4 h-4' : 'w-3 h-3 rounded-full'}`}
            style={{
              backgroundColor: isStar ? 'transparent' : ['#f43f5e', '#fbbf24', '#34d399', '#60a5fa'][i % 4]
            }}
          >
            {isStar && (
              <svg viewBox="0 0 24 24" fill="#fbbf24" stroke="#d97706" strokeWidth="1">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
