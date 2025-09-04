"use client";

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Code, 
  FileText, 
  Download, 
  Copy, 
  Edit3, 
  X, 
  Maximize2,
  Minimize2,
  Play,
  Eye,
  Settings,
  ExternalLink,
  Share2
} from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Dialog from '@radix-ui/react-dialog';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ArtifactType, Artifact } from './types';
import ArtifactViewer from './ArtifactViewer';

interface ArtifactContainerProps {
  artifact: Artifact;
  darkMode: boolean;
  onUpdate?: (artifact: Artifact) => void;
  onClose?: () => void;
  streamingContent?: string;
  isStreaming?: boolean;
  className?: string;
}

const ArtifactContainer: React.FC<ArtifactContainerProps> = ({
  artifact,
  darkMode,
  onUpdate,
  onClose,
  streamingContent = '',
  isStreaming = false,
  className = ''
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get the display content (streaming or final)
  const getDisplayContent = () => {
    if (isStreaming && streamingContent) {
      return streamingContent;
    }
    return artifact?.content || '';
  };

  // Handle copy functionality
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getDisplayContent());
      setCopySuccess('Copied!');
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      setCopySuccess('Failed');
      setTimeout(() => setCopySuccess(null), 2000);
    }
  };

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Get artifact icon
  const getArtifactIcon = (type: ArtifactType) => {
    const iconMap: Record<ArtifactType, React.ReactNode> = {
      html: <Code className="w-4 h-4 text-orange-500" />,
      css: <Code className="w-4 h-4 text-blue-500" />,
      javascript: <Code className="w-4 h-4 text-yellow-500" />,
      python: <Code className="w-4 h-4 text-green-500" />,
      json: <Code className="w-4 h-4 text-purple-500" />,
      markdown: <FileText className="w-4 h-4 text-gray-500" />,
      text: <FileText className="w-4 h-4 text-gray-500" />,
      svg: <Code className="w-4 h-4 text-pink-500" />,
      react: <Code className="w-4 h-4 text-cyan-500" />,
      csv: <FileText className="w-4 h-4 text-green-600" />,
      sql: <Code className="w-4 h-4 text-blue-600" />,
      bash: <Code className="w-4 h-4 text-gray-600" />,
      document: <FileText className="w-4 h-4 text-indigo-500" />,
      richtext: <Edit3 className="w-4 h-4 text-purple-600" />
    };
    return iconMap[type] || <FileText className="w-4 h-4" />;
  };

  const ArtifactContent = () => (
    <div className={`artifact-container h-full flex flex-col ${className} ${
      darkMode ? 'dark' : ''
    }`}>
      <div className={`h-full flex flex-col rounded-xl border shadow-2xl overflow-hidden ${
        darkMode 
          ? 'bg-gray-900/98 border-gray-700/30 backdrop-blur-2xl' 
          : 'bg-white/98 border-gray-200/30 backdrop-blur-2xl'
      } ${darkMode ? 'shadow-black/20' : 'shadow-gray-900/10'}`}>
        
        {/* Modern Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          darkMode 
            ? 'border-gray-700/20 bg-gradient-to-r from-gray-800/50 to-gray-900/30' 
            : 'border-gray-200/20 bg-gradient-to-r from-gray-50/50 to-white/30'
        }`}>
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className={`p-2.5 rounded-lg ${
              darkMode 
                ? 'bg-gray-800/70 ring-1 ring-gray-700/50' 
                : 'bg-gray-100/70 ring-1 ring-gray-200/50'
            }`}>
              {getArtifactIcon(artifact.type)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold text-base truncate ${
                darkMode ? 'text-gray-100' : 'text-gray-900'
              }`}>
                {artifact.title}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  darkMode 
                    ? 'bg-blue-900/30 text-blue-300 border border-blue-800/30' 
                    : 'bg-blue-100/70 text-blue-700 border border-blue-200/50'
                }`}>
                  {artifact.type.toUpperCase()}
                </span>
                <span className={`text-xs ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {getDisplayContent().split('\n').length} lines
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopy}
              className={`p-2.5 rounded-lg transition-all duration-200 group ${
                darkMode 
                  ? 'hover:bg-gray-700/60 text-gray-400 hover:text-gray-200 border border-gray-700/30 hover:border-gray-600/50' 
                  : 'hover:bg-gray-100/60 text-gray-600 hover:text-gray-900 border border-gray-200/30 hover:border-gray-300/50'
              }`}
              title="Copy content"
            >
              <Copy className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>
            
            <button
              onClick={toggleFullscreen}
              className={`p-2.5 rounded-lg transition-all duration-200 group ${
                darkMode 
                  ? 'hover:bg-gray-700/60 text-gray-400 hover:text-gray-200 border border-gray-700/30 hover:border-gray-600/50' 
                  : 'hover:bg-gray-100/60 text-gray-600 hover:text-gray-900 border border-gray-200/30 hover:border-gray-300/50'
              }`}
              title="Toggle fullscreen"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
              ) : (
                <Maximize2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
              )}
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className={`p-2.5 rounded-lg transition-all duration-200 group ${
                  darkMode 
                    ? 'hover:bg-red-900/30 text-gray-400 hover:text-red-400 border border-gray-700/30 hover:border-red-800/50' 
                    : 'hover:bg-red-50/60 text-gray-600 hover:text-red-600 border border-gray-200/30 hover:border-red-200/50'
                }`}
                title="Close"
              >
                <X className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 relative">
          <div className="absolute inset-0">
            <ArtifactViewer
              artifact={artifact}
              darkMode={darkMode}
              onUpdate={onUpdate}
              streamingContent={streamingContent}
              isStreaming={isStreaming}
            />
          </div>
        </div>

        {/* Enhanced Status Bar */}
        {(isStreaming || copySuccess) && (
          <div className={`flex items-center justify-between px-6 py-3 border-t ${
            darkMode 
              ? 'border-gray-700/20 bg-gradient-to-r from-gray-800/30 to-gray-900/20' 
              : 'border-gray-200/20 bg-gradient-to-r from-gray-50/30 to-white/20'
          }`}>
            {isStreaming && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-1 h-1 bg-blue-300 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
                <span className={`text-sm font-medium ${
                  darkMode ? 'text-blue-300' : 'text-blue-600'
                }`}>
                  Generating content...
                </span>
              </div>
            )}
            
            {copySuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className={`ml-auto px-3 py-1.5 rounded-lg text-sm font-medium ${
                  copySuccess === 'Copied!' 
                    ? darkMode 
                      ? 'bg-green-900/40 text-green-300 border border-green-800/40' 
                      : 'bg-green-100/80 text-green-700 border border-green-200/60'
                    : darkMode
                      ? 'bg-red-900/40 text-red-300 border border-red-800/40'
                      : 'bg-red-100/80 text-red-700 border border-red-200/60'
                }`}
              >
                {copySuccess}
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Render fullscreen version
  if (isFullscreen) {
    return (
      <Dialog.Root open={isFullscreen} onOpenChange={setIsFullscreen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed inset-4 z-50">
            <div className="h-full">
              <ArtifactContent />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  return <ArtifactContent />;
};

export default ArtifactContainer;