"use client";

import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface ConfettiPiece {
  id: number;
  x: number; // starting horizontal position in %
  delay: number; // fall start delay
  duration: number; // fall duration
  color: string;
  size: number;
}

const CONFETTI_COLORS = ['#ff6633', '#3b82f6', '#10b981', '#ca8a04', '#8b5cf6', '#ec4899', '#4ade80'];

export function Confetti({ active }: { active: boolean }) {
  const prefersReducedMotion = useReducedMotion();
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (active && !prefersReducedMotion) {
      const newPieces = Array.from({ length: 80 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100, // random start horizontally
        delay: Math.random() * 2, // staggered delay up to 2s
        duration: 3 + Math.random() * 3, // fall duration between 3s and 6s
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size: 8 + Math.random() * 10 // size between 8px and 18px
      }));
      setPieces(newPieces);
    } else {
      setPieces([]);
    }
  }, [active, prefersReducedMotion]);

  if (!active || prefersReducedMotion) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[99] overflow-hidden">
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -50, x: `${p.x}vw`, opacity: 1, rotate: 0 }}
          animate={{
            y: '110vh',
            x: `${p.x + (Math.random() - 0.5) * 20}vw`, // slight horizontal drift
            rotate: 360 * (Math.random() > 0.5 ? 2 : -2),
            opacity: [1, 1, 0] // fade out at the bottom
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: "linear",
            repeat: Infinity,
            repeatDelay: Math.random() * 2
          }}
          style={{
            position: 'absolute',
            width: `${p.size}px`,
            height: `${p.size * 1.5}px`,
            backgroundColor: p.color,
            borderRadius: '2px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
          }}
        />
      ))}
    </div>
  );
}
