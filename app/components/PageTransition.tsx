"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface PageTransitionProps {
  children: React.ReactNode;
  mode: 'chat' | 'research';
}

const PageTransition: React.FC<PageTransitionProps> = ({ children, mode }) => {
  return (
    <div className="relative w-full h-full overflow-hidden">
      <div className="w-full h-full">
        {children}
        
        {/* Add decorative elements based on the mode */}
        {mode === 'research' && (
          <>
            {/* Animated circles in the background for research mode */}
            <motion.div
              className="absolute top-[10%] right-[10%] w-32 h-32 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 z-0 pointer-events-none"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.7, 0.3],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="absolute bottom-[15%] left-[15%] w-24 h-24 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 z-0 pointer-events-none"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.2, 0.6, 0.2],
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1,
              }}
            />
          </>
        )}
        
        {mode === 'chat' && (
          <>
            {/* Animated shapes for chat mode */}
            <motion.div
              className="absolute top-[20%] left-[5%] w-16 h-16 rounded-lg bg-gradient-to-r from-primary-500/10 to-secondary-500/10 z-0 pointer-events-none"
              animate={{
                rotate: [0, 45, 0],
                opacity: [0.2, 0.5, 0.2],
              }}
              transition={{
                duration: 12,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="absolute bottom-[30%] right-[8%] w-20 h-20 rounded-full bg-gradient-to-r from-secondary-500/10 to-primary-500/10 z-0 pointer-events-none"
              animate={{
                y: [0, -15, 0],
                opacity: [0.1, 0.4, 0.1],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 2,
              }}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default PageTransition; 