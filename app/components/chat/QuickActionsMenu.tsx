"use client";

import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  BarChart3,
  Grid3X3,
  Search,
  HelpCircle,
  Command,
  ArrowRight,
  X,
  School,
  TrendingUp,
  Sparkles,
  Leaf,
  type LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  command: string;
  icon: LucideIcon;
  color: string;
  category: 'learning' | 'progress' | 'search' | 'help';
}

interface QuickActionsMenuProps {
  visible: boolean;
  onClose: () => void;
  onActionSelect: (command: string) => void;
  darkMode?: boolean;
}

const QUICK_ACTIONS: QuickAction[] = [
  // Learning Actions
  {
    id: 'browse-modules',
    title: 'Browse Modules',
    description: 'Show all available learning modules',
    command: '/modules',
    icon: BookOpen,
    color: '#3b82f6',
    category: 'learning'
  },
  {
    id: 'featured-modules',
    title: 'Featured Content',
    description: 'Show top recommended modules',
    command: '/modules featured',
    icon: Sparkles,
    color: '#fbbf24',
    category: 'learning'
  },
  {
    id: 'categories',
    title: 'Browse Categories',
    description: 'Show all learning topics',
    command: '/categories',
    icon: Grid3X3,
    color: '#10b981',
    category: 'learning'
  },
  {
    id: 'green-tech',
    title: 'Green Technology',
    description: 'Show sustainable tech modules',
    command: '/modules green',
    icon: Leaf,
    color: '#059669',
    category: 'learning'
  },

  // Progress Actions
  {
    id: 'my-progress',
    title: 'My Progress',
    description: 'Show your learning journey',
    command: '/progress',
    icon: BarChart3,
    color: '#06b6d4',
    category: 'progress'
  },

  // Search Actions
  {
    id: 'search-modules',
    title: 'Search Modules',
    description: 'Find specific content',
    command: '/search ',
    icon: Search,
    color: '#8b5cf6',
    category: 'search'
  },

  // Help Actions
  {
    id: 'help',
    title: 'Help & Tips',
    description: 'Learn how to use the platform',
    command: '/help',
    icon: HelpCircle,
    color: '#6b7280',
    category: 'help'
  }
];

const CATEGORIES = [
  { id: 'learning', name: 'Learning', icon: School, color: '#3b82f6' },
  { id: 'progress', name: 'Progress', icon: TrendingUp, color: '#06b6d4' },
  { id: 'search', name: 'Search', icon: Search, color: '#8b5cf6' },
  { id: 'help', name: 'Help', icon: HelpCircle, color: '#6b7280' },
];

export default function QuickActionsMenu({
  visible,
  onClose,
  onActionSelect,
  darkMode = false
}: QuickActionsMenuProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('learning');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [visible, onClose]);

  const handleActionClick = (action: QuickAction) => {
    if (action.id === 'search-modules') {
      onActionSelect('What would you like to search for?');
    } else {
      onActionSelect(action.command);
    }
    onClose();
  };

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const filteredActions = QUICK_ACTIONS.filter(action =>
    action.category === selectedCategory
  );

  if (!visible || !mounted) return null;

  const modalContent = (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{
          type: "spring",
          damping: 25,
          stiffness: 400,
          duration: 0.3
        }}
        style={{
          position: 'fixed',
          zIndex: 50,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(580px, calc(100vw - 2rem))',
          maxHeight: '85vh',
        }}
        className={cn(
          "rounded-xl md:rounded-2xl border overflow-hidden",
          "shadow-2xl shadow-black/20 backdrop-blur-xl",
          "flex flex-col",
          darkMode
            ? "bg-gray-900/95 border-gray-700"
            : "bg-white/95 border-gray-200"
        )}
      >
        {/* Header */}
        <div className={cn(
          "flex-shrink-0 flex items-center justify-between px-4 md:px-6 py-4 border-b",
          darkMode ? "border-gray-700" : "border-gray-100"
        )}>
          <div>
            <h2 className={cn(
              "text-lg md:text-xl font-bold",
              darkMode ? "text-white" : "text-gray-900"
            )}>
              Quick Actions
            </h2>
            <p className={cn(
              "text-xs md:text-sm mt-1",
              darkMode ? "text-gray-400" : "text-gray-600"
            )}>
              Choose what you'd like to do
            </p>
          </div>
          <button
            onClick={onClose}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-colors shrink-0",
              darkMode
                ? "bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-300"
                : "bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-700"
            )}
          >
            <X size={20} />
          </button>
        </div>

        {/* Category Tabs */}
        <div className={cn(
          "flex-shrink-0 flex gap-2 px-4 md:px-6 py-3 md:py-4 border-b overflow-x-auto scrollbar-hide",
          darkMode ? "border-gray-700" : "border-gray-100"
        )}>
          {CATEGORIES.map((category) => {
            const Icon = category.icon;
            const isActive = selectedCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                className={cn(
                  "flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 rounded-full border-2 transition-all whitespace-nowrap shrink-0",
                  isActive
                    ? "border-current bg-opacity-10"
                    : darkMode
                      ? "border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-300"
                      : "border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600"
                )}
                style={isActive ? {
                  borderColor: category.color,
                  backgroundColor: `${category.color}15`,
                  color: category.color
                } : {}}
              >
                <Icon size={14} className="md:w-4 md:h-4" />
                <span className="text-xs md:text-sm font-medium">{category.name}</span>
              </button>
            );
          })}
        </div>

        {/* Actions Grid */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto min-h-0">
          <div className="grid gap-2 sm:gap-3">
            {filteredActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleActionClick(action)}
                  className={cn(
                    "group relative flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg sm:rounded-xl border transition-all",
                    "hover:scale-[1.02] active:scale-[0.98] text-left",
                    darkMode
                      ? "bg-gray-800/50 border-gray-700 hover:bg-gray-800 hover:border-gray-600"
                      : "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-lg"
                  )}
                >
                  {/* Icon */}
                  <div
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shrink-0"
                    style={{ backgroundColor: `${action.color}15` }}
                  >
                    <Icon size={20} className="sm:w-6 sm:h-6" style={{ color: action.color }} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      "font-semibold text-sm sm:text-base leading-tight",
                      darkMode ? "text-white" : "text-gray-900"
                    )}>
                      {action.title}
                    </div>
                    <div className={cn(
                      "text-xs sm:text-sm mt-0.5 sm:mt-1 leading-tight",
                      darkMode ? "text-gray-400" : "text-gray-600"
                    )}>
                      {action.description}
                    </div>
                  </div>

                  {/* Arrow indicator */}
                  <div className={cn(
                    "w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all shrink-0",
                    "opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0",
                    darkMode ? "bg-gray-700" : "bg-gray-100"
                  )}>
                    <ArrowRight size={14} className={cn("sm:w-4 sm:h-4", darkMode ? "text-gray-400" : "text-gray-600")} />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className={cn(
          "flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t text-center",
          darkMode ? "border-gray-700" : "border-gray-100"
        )}>
          <div className={cn(
            "text-xs flex items-center justify-center gap-1 sm:gap-2 flex-wrap",
            darkMode ? "text-gray-500" : "text-gray-600"
          )}>
            <span className="hidden sm:inline">Type <code className="text-blue-500 font-mono">/</code> or press</span>
            <span className="sm:hidden">Press</span>
            <kbd className={cn(
              "px-1.5 sm:px-2 py-0.5 sm:py-1 rounded font-mono text-xs",
              darkMode ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-600"
            )}>
              ⌘K
            </kbd>
            <span>• Powered by</span>
            <span className="text-blue-500 font-medium">Kiongozi LMS</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}