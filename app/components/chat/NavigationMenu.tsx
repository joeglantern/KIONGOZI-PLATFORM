"use client";

import React from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  BookOpen,
  MessageSquare,
  TrendingUp,
  Bookmark,
  Target,
  Settings,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface NavigationMenuProps {
  isCollapsed?: boolean;
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: string | number;
  isActive?: boolean;
  children?: MenuItem[];
}

const NavigationMenu: React.FC<NavigationMenuProps> = ({
  isCollapsed = false,
  currentPath = '/chat',
  onNavigate
}) => {
  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={18} />,
      path: '/dashboard',
      isActive: currentPath === '/dashboard'
    },
    {
      id: 'modules',
      label: 'Learning Modules',
      icon: <BookOpen size={18} />,
      path: '/modules',
      isActive: currentPath.startsWith('/modules'),
      children: [
        {
          id: 'featured',
          label: 'Featured',
          icon: <Sparkles size={16} />,
          path: '/modules/featured'
        },
        {
          id: 'green-tech',
          label: 'Green Technology',
          icon: <div className="w-4 h-4 bg-green-500 rounded" />,
          path: '/modules/green-tech'
        },
        {
          id: 'digital-skills',
          label: 'Digital Skills',
          icon: <div className="w-4 h-4 bg-blue-500 rounded" />,
          path: '/modules/digital-skills'
        }
      ]
    },
    {
      id: 'chat',
      label: 'AI Chat',
      icon: <MessageSquare size={18} />,
      path: '/chat',
      isActive: currentPath === '/chat'
    },
    {
      id: 'progress',
      label: 'My Progress',
      icon: <TrendingUp size={18} />,
      path: '/progress',
      isActive: currentPath === '/progress',
      badge: '85%'
    },
    {
      id: 'bookmarks',
      label: 'Bookmarked',
      icon: <Bookmark size={18} />,
      path: '/bookmarks',
      isActive: currentPath === '/bookmarks',
      badge: 3
    },
    {
      id: 'recommendations',
      label: 'Recommendations',
      icon: <Target size={18} />,
      path: '/recommendations',
      isActive: currentPath === '/recommendations',
      badge: 'New'
    }
  ];

  const bottomItems: MenuItem[] = [
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings size={18} />,
      path: '/settings',
      isActive: currentPath === '/settings'
    }
  ];

  const handleNavigate = (item: MenuItem) => {
    if (onNavigate) {
      onNavigate(item.path);
    }
  };

  const MenuItemComponent = ({
    item,
    level = 0
  }: {
    item: MenuItem;
    level?: number;
  }) => {
    const baseClasses = "flex items-center w-full text-left transition-all duration-200 group";
    const activeClasses = item.isActive
      ? "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-r-2 border-primary-500"
      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white";

    const content = (
      <motion.button
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => handleNavigate(item)}
        className={`${baseClasses} ${activeClasses} ${
          isCollapsed ? 'p-3 justify-center' : 'px-3 py-2.5'
        } ${level > 0 ? 'ml-4 mr-2 rounded-lg' : 'rounded-r-lg'}`}
      >
        <div className="flex items-center min-w-0 flex-1">
          <div className="flex-shrink-0">
            {item.icon}
          </div>

          {!isCollapsed && (
            <>
              <span className={`ml-3 font-medium truncate ${level > 0 ? 'text-sm' : ''}`}>
                {item.label}
              </span>

              <div className="flex-1" />

              {/* Badge */}
              {item.badge && (
                <span className={`
                  px-2 py-0.5 text-xs font-medium rounded-full
                  ${typeof item.badge === 'number'
                    ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                    : item.badge === 'New'
                    ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                  }
                `}>
                  {item.badge}
                </span>
              )}

              {/* Expand arrow for items with children */}
              {item.children && level === 0 && (
                <ChevronRight size={14} className="opacity-50 group-hover:opacity-100" />
              )}
            </>
          )}
        </div>
      </motion.button>
    );

    if (isCollapsed) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>{content}</div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p className="font-medium">{item.label}</p>
              {item.badge && (
                <p className="text-xs opacity-75">{item.badge}</p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return content;
  };

  return (
    <nav className="flex flex-col h-full">
      {/* Main Navigation */}
      <div className="flex-1 py-2">
        <div className="space-y-1">
          {menuItems.map((item) => (
            <div key={item.id}>
              <MenuItemComponent item={item} />

              {/* Sub-menu items */}
              {!isCollapsed && item.children && (item.isActive || item.id === 'modules') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-1 mb-2"
                >
                  {item.children.map((child) => (
                    <MenuItemComponent
                      key={child.id}
                      item={child}
                      level={1}
                    />
                  ))}
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="border-t border-gray-200 dark:border-gray-700 py-2">
        <div className="space-y-1">
          {bottomItems.map((item) => (
            <MenuItemComponent key={item.id} item={item} />
          ))}
        </div>
      </div>
    </nav>
  );
};

export default NavigationMenu;