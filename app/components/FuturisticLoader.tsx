import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

const FuturisticLoader = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-95">
      <div className="mb-8 flex items-center gap-10 relative">
        {/* Kiongozi Icon with floating animation */}
        <motion.div
          initial={{ y: 0 }}
          animate={{ y: [0, -18, 0, 18, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Image src="/images/ai-head-icon.svg" alt="Kiongozi Icon" width={110} height={110} priority />
        </motion.div>
        {/* Animated glowing connection */}
        <motion.div
          className="relative flex items-center justify-center"
          initial={{ opacity: 0.7 }}
          animate={{ opacity: [0.7, 1, 0.7], scale: [1, 1.2, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
        >
          <span className="block w-16 h-2 rounded-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-orange-400 shadow-lg animate-pulse-glow" style={{ boxShadow: '0 0 24px 8px #6366f1, 0 0 32px 8px #f97316' }}></span>
        </motion.div>
        {/* Afosi Logo with floating animation */}
        <motion.div
          initial={{ y: 0 }}
          animate={{ y: [0, 18, 0, -18, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Image src="/images/Afosi.png" alt="Afosi Logo" width={110} height={110} className="rounded-full object-cover" priority />
        </motion.div>
      </div>
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: [0, 1, 0.7, 1], y: [20, 0, 0, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
        className="text-2xl md:text-4xl font-bold text-white mb-2 text-center drop-shadow-lg"
        style={{ letterSpacing: '0.01em' }}
      >
        Afosi presents Kiongozi Platform
      </motion.h2>
      <motion.div
        className="flex gap-3 mt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.7, 1] }}
        transition={{ duration: 1.2, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
      >
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="w-4 h-4 rounded-full bg-gradient-to-r from-indigo-500 to-pink-500 shadow-lg"
            animate={{ scale: [0.7, 1.3, 0.7], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.2, repeat: Infinity, repeatType: 'reverse', delay: i * 0.13 }}
          />
        ))}
      </motion.div>
      <style jsx global>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 24px 8px #6366f1, 0 0 32px 8px #f97316; opacity: 0.7; }
          50% { box-shadow: 0 0 40px 16px #f97316, 0 0 48px 16px #6366f1; opacity: 1; }
        }
        .animate-pulse-glow {
          animation: pulse-glow 1.6s infinite alternate;
        }
      `}</style>
    </div>
  );
};

export default FuturisticLoader; 