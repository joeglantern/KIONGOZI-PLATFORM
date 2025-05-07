"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiMessageCircle, FiGithub } from 'react-icons/fi';

const Header = () => {
  return (
    <header className="fixed w-full z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 h-16">
      <div className="container mx-auto h-full px-4 flex justify-between items-center">
        <Link href="/" className="flex items-center space-x-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center">
              <FiMessageCircle className="text-white" size={16} />
            </div>
          </motion.div>
          <motion.span 
            className="font-bold text-lg"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Civic<span className="text-primary-600">Chat</span>
          </motion.span>
        </Link>

        {/* Right side links */}
        <div className="flex items-center gap-4">
          <a 
            href="https://github.com/your-repository/civic-chat" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-600 hover:text-primary-600 transition-colors flex items-center gap-1 text-sm"
          >
            <FiGithub size={16} />
            <span className="hidden md:inline">GitHub</span>
          </a>
        </div>
      </div>
    </header>
  );
};

export default Header; 