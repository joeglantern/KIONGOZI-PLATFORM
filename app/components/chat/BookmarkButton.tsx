"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Bookmark } from 'lucide-react';
import apiClient from '../../utils/apiClient';

interface BookmarkButtonProps {
  moduleId: string;
  isBookmarked?: boolean;
  onBookmarkChange?: (isBookmarked: boolean) => void;
  variant?: 'heart' | 'bookmark';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const BookmarkButton: React.FC<BookmarkButtonProps> = ({
  moduleId,
  isBookmarked = false,
  onBookmarkChange,
  variant = 'heart',
  size = 'md',
  className = ''
}) => {
  const [bookmarked, setBookmarked] = useState(isBookmarked);
  const [isLoading, setIsLoading] = useState(false);

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-6 h-6 p-1';
      case 'lg':
        return 'w-10 h-10 p-2.5';
      default:
        return 'w-8 h-8 p-2';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 12;
      case 'lg':
        return 18;
      default:
        return 14;
    }
  };

  const handleToggleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (isLoading) return;

    setIsLoading(true);
    try {
      const newBookmarkState = !bookmarked;
      const response = await apiClient.toggleModuleBookmark(moduleId, newBookmarkState);

      if (response.success) {
        setBookmarked(newBookmarkState);
        onBookmarkChange?.(newBookmarkState);
      }
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const Icon = variant === 'heart' ? Heart : Bookmark;

  return (
    <motion.button
      onClick={handleToggleBookmark}
      disabled={isLoading}
      className={`
        ${getSizeClasses()}
        rounded-full transition-all duration-200
        ${bookmarked
          ? variant === 'heart'
            ? 'bg-red-100 text-red-600 hover:bg-red-200'
            : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
          : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
        }
        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.05 }}
      aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
    >
      <motion.div
        animate={{
          scale: bookmarked ? [1, 1.2, 1] : 1,
          rotate: isLoading ? 360 : 0
        }}
        transition={{
          scale: { duration: 0.3 },
          rotate: { duration: 0.8, repeat: isLoading ? Infinity : 0, ease: "linear" }
        }}
      >
        <Icon
          size={getIconSize()}
          fill={bookmarked ? 'currentColor' : 'none'}
          className="transition-all duration-200"
        />
      </motion.div>
    </motion.button>
  );
};

export default BookmarkButton;