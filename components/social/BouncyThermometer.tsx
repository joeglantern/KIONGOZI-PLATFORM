"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface BouncyThermometerProps {
  value: number; // 0 to 100
  className?: string;
}

export function BouncyThermometer({ value, className = '' }: BouncyThermometerProps) {
  // Normalize value between 0 and 100
  const progressPercent = Math.min(Math.max(value, 0), 100);

  // SVG dimensions
  const height = 150;
  const width = 45;
  const bulbRadius = 14;
  const stemWidth = 12;
  const padding = 10;

  // stemHeight calculation
  const stemTop = padding;
  const stemBottom = height - bulbRadius * 2 - padding;
  const totalStemHeight = stemBottom - stemTop;

  // Fluid height inside stem
  const fluidHeight = (progressPercent / 100) * totalStemHeight;
  const fluidTop = stemBottom - fluidHeight;

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Cartoon Thermometer SVG */}
      <motion.svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-12 h-36 select-none shrink-0"
        whileHover={{ scale: 1.05, rotate: [0, -1, 1, 0] }}
        transition={{ duration: 0.3 }}
      >
        {/* Thermometer Glass Outer Tube */}
        <path
          d={`
            M ${width / 2 - stemWidth / 2} ${stemTop}
            A ${stemWidth / 2} ${stemWidth / 2} 0 0 1 ${width / 2 + stemWidth / 2} ${stemTop}
            L ${width / 2 + stemWidth / 2} ${stemBottom}
            A ${bulbRadius} ${bulbRadius} 0 1 1 ${width / 2 - stemWidth / 2} ${stemBottom}
            Z
          `}
          fill="#f8fafc"
          stroke="#1b2432"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />

        {/* Graduations / Level Ticks */}
        {[0.25, 0.5, 0.75].map((tick, i) => {
          const tickY = stemBottom - tick * totalStemHeight;
          return (
            <line
              key={i}
              x1={width / 2 + stemWidth / 2 - 2}
              y1={tickY}
              x2={width / 2 + stemWidth / 2 + 3}
              y2={tickY}
              stroke="#1b2432"
              strokeWidth="2.5"
            />
          );
        })}

        {/* Outer Bulb Shadow */}
        <circle cx={width / 2} cy={height - bulbRadius - padding} r={bulbRadius - 3.5} fill="#f1f5f9" />

        {/* Inner Red Fluid Bulb */}
        <circle
          cx={width / 2}
          cy={height - bulbRadius - padding}
          r={bulbRadius - 5}
          fill="#f97316"
        />

        {/* Inner Red Fluid Stem */}
        {progressPercent > 0 && (
          <motion.rect
            initial={{ height: 0, y: stemBottom }}
            animate={{ height: fluidHeight, y: fluidTop }}
            transition={{ type: "spring", damping: 15 }}
            x={width / 2 - stemWidth / 2 + 3}
            width={stemWidth - 6}
            fill="#f97316"
          />
        )}

        {/* Bubbling Particles inside bulb (only if value > 0) */}
        {progressPercent > 0 && (
          <>
            <motion.circle
              cx={width / 2 - 4}
              cy={height - bulbRadius - padding + 2}
              r="2"
              fill="white"
              opacity="0.7"
              animate={{ y: [0, -10, 0], opacity: [0.7, 0, 0.7] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
            />
            <motion.circle
              cx={width / 2 + 4}
              cy={height - bulbRadius - padding - 2}
              r="1.5"
              fill="white"
              opacity="0.6"
              animate={{ y: [0, -14, 0], opacity: [0.6, 0, 0.6] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut", delay: 0.5 }}
            />
          </>
        )}

        {/* Shiny Highlight Glare on Glass Outer Tube */}
        <path
          d={`M ${width / 2 - 2} ${stemTop + 4} L ${width / 2 - 2} ${stemBottom}`}
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.4"
        />
      </motion.svg>

      {/* Progress Info Overlay */}
      <div className="flex-1">
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-xl font-display font-black text-brand-primary">
            {Math.round(progressPercent)}%
          </span>
          <span className="text-[10px] font-black uppercase text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded border border-brand-orange/20 animate-pulse">
            {progressPercent >= 100 ? 'SUCCESS! 🎉' : progressPercent >= 90 ? 'SO CLOSE! 🔥' : progressPercent >= 50 ? 'HALF WAY! 🚀' : 'ACTIVE'}
          </span>
        </div>
        
        {/* Animated Bar with sparkles */}
        <div className="w-full bg-brand-primary/10 rounded-full h-3.5 border-2 border-brand-primary overflow-hidden relative shadow-inner">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ type: "spring", damping: 20 }}
            className="bg-brand-orange h-full rounded-full"
          />
        </div>
      </div>
    </div>
  );
}
