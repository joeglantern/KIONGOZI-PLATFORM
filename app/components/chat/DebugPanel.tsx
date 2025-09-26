"use client";

import React from 'react';
import { useChatContext } from './ChatProvider';

interface DebugPanelProps {
  enabled?: boolean;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ enabled = process.env.NODE_ENV === 'development' }) => {
  const { messages, isLoading, isGenerating, currentConversationId, settings } = useChatContext();

  if (!enabled) return null;

  return (
    <div className="fixed bottom-4 left-4 bg-black/80 text-white p-4 rounded-lg text-xs font-mono max-w-sm z-50">
      <div className="font-bold mb-2">🐛 Chat Debug Panel</div>
      <div>Messages: {messages.length}</div>
      <div>Loading: {isLoading ? '✓' : '✗'}</div>
      <div>Generating: {isGenerating ? '✓' : '✗'}</div>
      <div>Conversation ID: {currentConversationId || 'none'}</div>
      <div>Dark Mode: {settings.darkMode ? '✓' : '✗'}</div>
      <div>Typing Effect: {settings.showTypingEffect ? '✓' : '✗'}</div>

      {messages.length > 0 && (
        <div className="mt-2 max-h-32 overflow-y-auto">
          <div className="font-bold">Recent Messages:</div>
          {messages.slice(-3).map((msg) => (
            <div key={msg.id} className="text-xs mb-1 opacity-70">
              <span className={msg.isUser ? 'text-blue-300' : 'text-green-300'}>
                {msg.isUser ? 'User' : 'AI'}:
              </span>
              <span className="ml-1">
                {msg.text.substring(0, 30)}...
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DebugPanel;