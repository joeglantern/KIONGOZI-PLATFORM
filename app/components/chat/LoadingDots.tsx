"use client";

import React from 'react';
import { motion } from 'framer-motion';
import type { LoadingDotsProps } from '../../types/chat';

const LoadingDots: React.FC<LoadingDotsProps> = ({
  size = 'md',
  className = ''
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-2 h-2';
      case 'lg':
        return 'w-4 h-4';
      default:
        return 'w-3 h-3';
    }
  };

  const dotClass = `${getSizeClasses()} rounded-full`;

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <motion.div
        className={`${dotClass} bg-gradient-to-r from-purple-500 to-pink-500`}
        animate={{
          scale: [0.5, 1, 0.5],
          opacity: [0.3, 1, 0.3]
        }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className={`${dotClass} bg-gradient-to-r from-blue-500 to-purple-500`}
        animate={{
          scale: [0.5, 1, 0.5],
          opacity: [0.3, 1, 0.3]
        }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.3
        }}
      />
      <motion.div
        className={`${dotClass} bg-gradient-to-r from-cyan-500 to-blue-500`}
        animate={{
          scale: [0.5, 1, 0.5],
          opacity: [0.3, 1, 0.3]
        }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.6
        }}
      />
    </div>
  );
};

export default LoadingDots;