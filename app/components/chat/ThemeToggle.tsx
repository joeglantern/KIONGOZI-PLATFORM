"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { FiSun, FiMoon } from 'react-icons/fi';

interface ThemeToggleProps {
  darkMode: boolean;
  onToggle: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({
  darkMode,
  onToggle,
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-10 h-6',
    md: 'w-12 h-7',
    lg: 'w-14 h-8'
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16
  };

  const handleToggle = () => {
    onToggle();
  };

  return (
    <button
      onClick={handleToggle}
      className={`relative ${sizeClasses[size]} ${className} rounded-full p-1 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 ${
        darkMode
          ? 'bg-indigo-600 hover:bg-indigo-700'
          : 'bg-gray-200 hover:bg-gray-300'
      }`}
      title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <motion.div
        className={`absolute top-1 ${sizeClasses[size]} flex items-center justify-center rounded-full bg-white shadow-md transition-all duration-300`}
        animate={{
          x: darkMode ? sizeClasses[size] === 'w-10 h-6' ? 16 : sizeClasses[size] === 'w-12 h-7' ? 20 : 24 : 0,
          width: sizeClasses[size] === 'w-10 h-6' ? 20 : sizeClasses[size] === 'w-12 h-7' ? 24 : 28,
          height: sizeClasses[size] === 'w-10 h-6' ? 20 : sizeClasses[size] === 'w-12 h-7' ? 24 : 28,
        }}
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 30
        }}
      >
        <motion.div
          initial={false}
          animate={{ rotate: darkMode ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          {darkMode ? (
            <FiMoon
              size={iconSizes[size]}
              className="text-indigo-600"
            />
          ) : (
            <FiSun
              size={iconSizes[size]}
              className="text-yellow-500"
            />
          )}
        </motion.div>
      </motion.div>

      {/* Background icons for visual context */}
      <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
        <motion.div
          animate={{
            opacity: darkMode ? 0.3 : 0.8,
            scale: darkMode ? 0.8 : 1
          }}
          transition={{ duration: 0.3 }}
        >
          <FiSun size={iconSizes[size]} className="text-yellow-400" />
        </motion.div>
        <motion.div
          animate={{
            opacity: darkMode ? 0.8 : 0.3,
            scale: darkMode ? 1 : 0.8
          }}
          transition={{ duration: 0.3 }}
        >
          <FiMoon size={iconSizes[size]} className="text-white" />
        </motion.div>
      </div>
    </button>
  );
};

export default ThemeToggle;