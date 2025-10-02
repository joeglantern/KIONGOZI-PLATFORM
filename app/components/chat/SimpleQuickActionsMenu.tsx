"use client";

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  BarChart3,
  Search,
  HelpCircle,
  X,
  Sparkles,
  Leaf,
  Grid3X3,
  Settings,
  type LucideIcon
} from 'lucide-react';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  command: string;
  icon: LucideIcon;
  color: string;
}

interface SimpleQuickActionsMenuProps {
  visible: boolean;
  onClose: () => void;
  onActionSelect: (command: string) => void;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'browse-modules',
    title: 'Browse Modules',
    description: 'Show all available learning modules',
    command: '/modules',
    icon: BookOpen,
    color: '#3b82f6'
  },
  {
    id: 'featured-modules',
    title: 'Featured Content',
    description: 'Show top recommended modules',
    command: '/modules featured',
    icon: Sparkles,
    color: '#fbbf24'
  },
  {
    id: 'categories',
    title: 'Browse Categories',
    description: 'Show all learning topics',
    command: '/categories',
    icon: Grid3X3,
    color: '#10b981'
  },
  {
    id: 'green-tech',
    title: 'Green Technology',
    description: 'Show sustainable tech modules',
    command: '/modules green',
    icon: Leaf,
    color: '#059669'
  },
  {
    id: 'my-progress',
    title: 'My Progress',
    description: 'Show your learning journey',
    command: '/progress',
    icon: BarChart3,
    color: '#06b6d4'
  },
  {
    id: 'search-modules',
    title: 'Search Modules',
    description: 'Find specific content',
    command: '/search ',
    icon: Search,
    color: '#8b5cf6'
  },
  {
    id: 'preferences',
    title: 'AI Preferences',
    description: 'Control learning suggestions',
    command: '/preferences',
    icon: Settings,
    color: '#8b5cf6'
  },
  {
    id: 'help',
    title: 'Help & Tips',
    description: 'Learn how to use the platform',
    command: '/help',
    icon: HelpCircle,
    color: '#6b7280'
  }
];

export default function SimpleQuickActionsMenu({
  visible,
  onClose,
  onActionSelect
}: SimpleQuickActionsMenuProps) {
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

  if (!visible) return null;

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 24px 16px',
            borderBottom: '1px solid #f3f4f6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#111827' }}>
              Quick Actions
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0' }}>
              Choose what you'd like to do
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Actions Grid */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1
          }}
        >
          <div
            style={{
              display: 'grid',
              gap: '12px'
            }}
          >
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => handleActionClick(action)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.backgroundColor = 'white';
                  }}
                >
                  {/* Icon */}
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      backgroundColor: `${action.color}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <Icon size={24} style={{ color: action.color }} />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: '600',
                        fontSize: '16px',
                        color: '#111827',
                        marginBottom: '4px'
                      }}
                    >
                      {action.title}
                    </div>
                    <div
                      style={{
                        fontSize: '14px',
                        color: '#6b7280'
                      }}
                    >
                      {action.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #f3f4f6',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              fontSize: '12px',
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <span>Press</span>
            <kbd
              style={{
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: '#f3f4f6',
                color: '#6b7280',
                fontSize: '12px',
                fontFamily: 'monospace'
              }}
            >
              ⌘K
            </kbd>
            <span>• Powered by</span>
            <span style={{ color: '#3b82f6', fontWeight: '500' }}>Kiongozi LMS</span>
          </div>
        </div>
      </motion.div>
    </div>
  );

  return createPortal(modalContent, document.body);
}