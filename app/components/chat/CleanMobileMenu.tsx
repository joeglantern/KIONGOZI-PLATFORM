"use client";

import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  MessageSquare,
  TrendingUp,
  User,
  Plus,
  X
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Conversation } from '../../types/chat';

interface CleanMobileMenuProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onConversationSelect: (id: string) => void;
  onNewConversation: () => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

const CleanMobileMenu: React.FC<CleanMobileMenuProps> = ({
  conversations,
  currentConversationId,
  onConversationSelect,
  onNewConversation,
  isOpen,
  onOpenChange,
  currentPath = '/chat',
  onNavigate
}) => {
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: BookOpen, label: 'Modules', path: '/modules' },
    { icon: MessageSquare, label: 'Chat', path: '/chat' },
    { icon: TrendingUp, label: 'Progress', path: '/progress' },
  ];

  const handleNavigate = (path: string) => {
    onNavigate?.(path);
    onOpenChange(false);
  };

  const handleConversationSelect = (id: string) => {
    onConversationSelect(id);
    onOpenChange(false);
  };

  const recentConversations = conversations.slice(0, 5);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-80 p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium text-sm">User</h3>
                  <p className="text-xs text-gray-500">Kiongozi LMS</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8"
              >
                <X size={16} />
              </Button>
            </div>
          </SheetHeader>

          {/* Navigation */}
          <div className="flex-1 px-6 py-4">
            <div className="space-y-2 mb-6">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPath === item.path;

                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigate(item.path)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Recent Chats */}
            {currentPath === '/chat' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Recent Chats</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onNewConversation();
                      onOpenChange(false);
                    }}
                  >
                    <Plus size={14} className="mr-1" />
                    New
                  </Button>
                </div>

                <div className="space-y-1">
                  {recentConversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => handleConversationSelect(conv.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        currentConversationId === conv.id
                          ? 'bg-gray-100 dark:bg-gray-800'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-900'
                      }`}
                    >
                      <div className="truncate">{conv.title}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {conv.lastMessage}
                      </div>
                    </button>
                  ))}

                  {conversations.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No conversations yet
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Learning Progress */}
            {currentPath !== '/chat' && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Learning Progress</h4>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Modules Completed</span>
                    <span className="text-gray-500">12/20</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-primary-500 h-2 rounded-full" style={{width: '60%'}}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CleanMobileMenu;