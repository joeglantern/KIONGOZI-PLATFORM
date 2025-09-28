"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Search, TrendingUp, ThumbsUp, HelpCircle, Command, CheckCircle, Folder, Heart, User } from 'lucide-react';

interface ChatInputHintsProps {
  onCommandSelect: (command: string) => void;
  input: string;
  isVisible: boolean;
}

const ChatInputHints: React.FC<ChatInputHintsProps> = ({
  onCommandSelect,
  input,
  isVisible
}) => {
  const [showCommands, setShowCommands] = useState(false);

  const commands = [
    {
      command: '/search',
      icon: Search,
      description: 'Search for modules',
      example: '/search sustainability',
      color: 'text-blue-500'
    },
    {
      command: '/progress',
      icon: TrendingUp,
      description: 'Show your progress',
      example: '/progress',
      color: 'text-green-500'
    },
    {
      command: '/profile',
      icon: User,
      description: 'View your profile',
      example: '/profile',
      color: 'text-blue-500'
    },
    {
      command: '/complete',
      icon: CheckCircle,
      description: 'Mark module complete',
      example: '/complete Digital Skills',
      color: 'text-green-600'
    },
    {
      command: '/browse',
      icon: Folder,
      description: 'Browse by category',
      example: '/browse Digital Skills',
      color: 'text-blue-600'
    },
    {
      command: '/bookmarks',
      icon: Heart,
      description: 'View bookmarks',
      example: '/bookmarks',
      color: 'text-red-500'
    },
    {
      command: '/recommend',
      icon: ThumbsUp,
      description: 'Get recommendations',
      example: '/recommend',
      color: 'text-purple-500'
    },
    {
      command: '/help',
      icon: HelpCircle,
      description: 'Show all commands',
      example: '/help',
      color: 'text-gray-500'
    }
  ];

  // Show commands when user types "/"
  useEffect(() => {
    setShowCommands(input.startsWith('/') && input.length > 0);
  }, [input]);

  if (!isVisible && !showCommands) return null;

  const filteredCommands = showCommands
    ? commands.filter(cmd => cmd.command.startsWith(input.toLowerCase()))
    : commands;

  return (
    <div className="border-t border-gray-200 bg-gray-50 p-3">
      {showCommands ? (
        // Command suggestions when typing "/"
        <div>
          <div className="text-xs text-gray-500 mb-2">Available commands:</div>
          <div className="space-y-1">
            {filteredCommands.map((cmd) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.command}
                  onClick={() => onCommandSelect(cmd.example)}
                  className="w-full flex items-center gap-3 p-2 text-left hover:bg-white rounded transition-colors"
                >
                  <Icon className={`w-4 h-4 ${cmd.color}`} />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{cmd.command}</div>
                    <div className="text-xs text-gray-500">{cmd.description}</div>
                  </div>
                  <div className="text-xs text-gray-400">{cmd.example}</div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        // Quick command hints when input is empty
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Command className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">Quick actions</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {commands.map((cmd) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.command}
                  onClick={() => onCommandSelect(cmd.example)}
                  className="flex items-center gap-2 p-2 text-left hover:bg-white rounded transition-colors border border-gray-200"
                >
                  <Icon className={`w-3 h-3 ${cmd.color}`} />
                  <span className="text-xs font-medium truncate">{cmd.description}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInputHints;