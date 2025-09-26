"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Settings,
  LogOut,
  HelpCircle,
  MessageCircle,
  ChevronDown
} from 'lucide-react';

interface ProfileMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  onLogout?: () => void;
}

const ProfileMenu: React.FC<ProfileMenuProps> = ({
  isOpen,
  onToggle,
  onClose,
  userName = 'User',
  userEmail = 'user@example.com',
  userAvatar,
  onLogout
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  const handleNavigation = (path: string) => {
    // For now, we'll use console.log, but this should be replaced with actual routing
    console.log(`Navigate to: ${path}`);
    onClose();
  };

  const menuItems = [
    {
      icon: User,
      label: 'Profile',
      action: () => handleNavigation('/profile')
    },
    {
      icon: Settings,
      label: 'Settings',
      action: () => handleNavigation('/settings')
    },
    {
      icon: HelpCircle,
      label: 'Help & Support',
      action: () => handleNavigation('/help')
    }
  ];

  return (
    <div className="relative" ref={menuRef}>
      {/* Profile Button */}
      <button
        onClick={onToggle}
        className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
          isOpen
            ? 'bg-gray-100'
            : 'hover:bg-gray-100'
        }`}
        title="Profile menu"
      >
        <div className="flex items-center gap-2">
          {userAvatar ? (
            <img
              src={userAvatar}
              alt={userName}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="hidden md:block text-left">
            <div className="text-sm font-medium text-gray-900 truncate max-w-24">
              {userName}
            </div>
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`text-gray-500 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50"
          >
            {/* User Info Header */}
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-3">
                {userAvatar ? (
                  <img
                    src={userAvatar}
                    alt={userName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center">
                    <span className="text-white font-medium">
                      {userName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="min-w-0 flex-grow">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {userName}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {userEmail}
                  </div>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  onClick={item.action}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <item.icon size={16} />
                  {item.label}
                </button>
              ))}
            </div>

            {/* Logout Section */}
            <div className="border-t border-gray-200 py-1">
              <button
                onClick={async () => {
                  onClose();
                  if (onLogout) {
                    await onLogout();
                  }
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfileMenu;