"use client";

import React from 'react';
import { LayoutDashboard, BookOpen, MessageSquare, TrendingUp, User, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Conversation } from '../../types/chat';
import NavigationMenu from './NavigationMenu';
import RecentConversations from './RecentConversations';
import UserStats from './UserStats';

interface LMSMobileSheetProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onConversationSelect: (id: string) => void;
  onConversationDelete: (id: string) => void;
  onConversationRename: (id: string, newTitle: string) => void;
  onNewConversation: () => void;
  currentPath?: string;
  onNavigate?: (path: string) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  trigger?: React.ReactNode;
}

const LMSMobileSheet: React.FC<LMSMobileSheetProps> = ({
  conversations,
  currentConversationId,
  onConversationSelect,
  onConversationDelete,
  onConversationRename,
  onNewConversation,
  currentPath = '/chat',
  onNavigate,
  isOpen,
  onOpenChange,
  user = { name: 'User', email: 'user@example.com' },
  trigger
}) => {
  const handleNavigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    }
    onOpenChange(false); // Close sheet after navigation
  };

  const handleConversationSelect = (id: string) => {
    onConversationSelect(id);
    onOpenChange(false); // Close sheet after selection
  };

  const handleNewConversation = () => {
    onNewConversation();
    onOpenChange(false); // Close sheet after creating new conversation
  };

  const handleViewAllConversations = () => {
    handleNavigate('/chat');
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      {trigger && <>{trigger}</>}

      <SheetContent side="left" className="w-80 p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Avatar className="w-8 h-8 mr-3">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 text-xs">
                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                    {user.name}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    Kiongozi LMS
                  </p>
                </div>
              </div>

              <Button
                onClick={() => onOpenChange(false)}
                variant="ghost"
                size="icon"
                className="h-8 w-8"
              >
                <X size={16} />
              </Button>
            </div>
          </SheetHeader>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-100 dark:border-blue-800">
                  <div className="flex items-center mb-2">
                    <BookOpen size={16} className="text-blue-600 dark:text-blue-400 mr-2" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Learning</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">5 modules in progress</p>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-100 dark:border-green-800">
                  <div className="flex items-center mb-2">
                    <TrendingUp size={16} className="text-green-600 dark:text-green-400 mr-2" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Progress</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">85% completed</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => handleNavigate('/dashboard')}
                  variant="outline"
                  size="sm"
                  className="justify-start h-auto p-3"
                >
                  <LayoutDashboard size={16} className="mr-2" />
                  <div className="text-left">
                    <div className="text-sm font-medium">Dashboard</div>
                    <div className="text-xs text-gray-500">Overview</div>
                  </div>
                </Button>

                <Button
                  onClick={() => handleNavigate('/modules')}
                  variant="outline"
                  size="sm"
                  className="justify-start h-auto p-3"
                >
                  <BookOpen size={16} className="mr-2" />
                  <div className="text-left">
                    <div className="text-sm font-medium">Modules</div>
                    <div className="text-xs text-gray-500">Learn</div>
                  </div>
                </Button>
              </div>

              <Separator />

              {/* Navigation Menu */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Navigation
                </h4>
                <NavigationMenu
                  isCollapsed={false}
                  currentPath={currentPath}
                  onNavigate={handleNavigate}
                />
              </div>

              <Separator />

              {/* Recent Conversations */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    AI Chat
                  </h4>
                  <Button
                    onClick={handleNewConversation}
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                  >
                    New Chat
                  </Button>
                </div>

                <RecentConversations
                  conversations={conversations}
                  currentConversationId={currentConversationId}
                  onConversationSelect={handleConversationSelect}
                  onNewConversation={handleNewConversation}
                  onViewAll={handleViewAllConversations}
                  isCollapsed={false}
                  limit={5}
                />
              </div>
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                <span>Online</span>
              </div>
              <span>v1.0.0</span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default LMSMobileSheet;