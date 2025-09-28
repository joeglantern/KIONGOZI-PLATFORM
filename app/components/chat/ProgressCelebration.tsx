"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Target } from 'lucide-react';
import type { LearningModule } from '../../types/lms';

interface ProgressCelebrationProps {
  type: 'module_complete' | 'milestone' | 'streak';
  module?: LearningModule;
  milestone?: {
    title: string;
    description: string;
    value: number;
  };
  streak?: number;
}

const ProgressCelebration: React.FC<ProgressCelebrationProps> = ({
  type,
  module,
  milestone,
  streak
}) => {
  const getContent = () => {
    switch (type) {
      case 'module_complete':
        return {
          emoji: '🎉',
          title: 'Module Complete!',
          subtitle: module ? `Great job completing "${module.title}"!` : 'Module completed!',
          color: 'from-green-400 to-blue-500',
          icon: Trophy
        };

      case 'milestone':
        return {
          emoji: '🏆',
          title: milestone?.title || 'Milestone Reached!',
          subtitle: milestone?.description || 'You reached a learning milestone!',
          color: 'from-yellow-400 to-orange-500',
          icon: Target
        };

      case 'streak':
        return {
          emoji: '🔥',
          title: `${streak} Day Streak!`,
          subtitle: 'You\'re on fire! Keep up the great work!',
          color: 'from-red-400 to-pink-500',
          icon: Star
        };

      default:
        return {
          emoji: '✨',
          title: 'Great Job!',
          subtitle: 'Keep up the excellent work!',
          color: 'from-purple-400 to-blue-500',
          icon: Star
        };
    }
  };

  const content = getContent();
  const Icon = content.icon;

  const confettiPieces = Array.from({ length: 6 }, (_, i) => (
    <motion.div
      key={i}
      className="absolute w-2 h-2 bg-yellow-400 rounded-full"
      initial={{
        x: 0,
        y: 0,
        scale: 0,
        rotate: 0
      }}
      animate={{
        x: Math.random() * 200 - 100,
        y: Math.random() * 200 - 100,
        scale: [0, 1, 0],
        rotate: Math.random() * 360
      }}
      transition={{
        duration: 2,
        delay: Math.random() * 0.5,
        ease: "easeOut"
      }}
      style={{
        left: '50%',
        top: '50%'
      }}
    />
  ));

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      className="relative bg-white rounded-xl shadow-xl border border-gray-200 p-6 max-w-sm mx-auto overflow-hidden"
    >
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${content.color} opacity-5`} />

      {/* Confetti */}
      <div className="absolute inset-0 pointer-events-none">
        {confettiPieces}
      </div>

      {/* Content */}
      <div className="relative z-10 text-center">
        {/* Main emoji/icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          transition={{ duration: 0.6, times: [0, 0.6, 1] }}
          className="mb-4"
        >
          <div className="text-5xl mb-2">{content.emoji}</div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 }}
            className={`inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br ${content.color} rounded-full`}
          >
            <Icon className="w-6 h-6 text-white" />
          </motion.div>
        </motion.div>

        {/* Text content */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {content.title}
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            {content.subtitle}
          </p>
        </motion.div>

        {/* Module details if available */}
        {module && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-4 p-3 bg-gray-50 rounded-lg"
          >
            <div className="text-xs text-gray-500 mb-1">Completed Module</div>
            <div className="font-medium text-gray-900 text-sm">{module.title}</div>
            <div className="text-xs text-gray-500 mt-1">
              {module.estimated_duration_minutes} minutes • {module.difficulty_level}
            </div>
          </motion.div>
        )}

        {/* Milestone details if available */}
        {milestone && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-4 p-3 bg-gray-50 rounded-lg"
          >
            <div className="font-medium text-gray-900 text-sm">
              {milestone.value} modules completed
            </div>
          </motion.div>
        )}

        {/* Action buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-6 flex gap-2"
        >
          <button className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
            Share Achievement
          </button>
          <button className={`flex-1 px-4 py-2 bg-gradient-to-br ${content.color} text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity`}>
            Continue Learning
          </button>
        </motion.div>
      </div>

      {/* Sparkle effects */}
      <motion.div
        className="absolute top-4 right-4 text-yellow-400"
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 180, 360]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        ✨
      </motion.div>

      <motion.div
        className="absolute bottom-4 left-4 text-yellow-400"
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, -180, -360]
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.5
        }}
      >
        ⭐
      </motion.div>
    </motion.div>
  );
};

export default ProgressCelebration;