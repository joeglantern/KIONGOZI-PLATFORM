"use client";

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Code, 
  FileText, 
  Copy, 
  ExternalLink,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ArtifactType, Artifact } from './types';

interface CompactArtifactProps {
  artifact: Artifact;
  darkMode: boolean;
  onUpdate?: (artifact: Artifact) => void;
  streamingContent?: string;
  isStreaming?: boolean;
  className?: string;
}

const CompactArtifact: React.FC<CompactArtifactProps> = ({
  artifact,
  darkMode,
  onUpdate,
  streamingContent = '',
  isStreaming = false,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

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
      richtext: <FileText className="w-4 h-4 text-purple-600" />
    };
    return iconMap[type] || <FileText className="w-4 h-4" />;
  };

  // Render preview content
  const renderPreview = () => {
    const content = getDisplayContent();
    const previewContent = isExpanded ? content : content.slice(0, 500);
    const shouldTruncate = !isExpanded && content.length > 500;
    
    if (artifact.type === 'document' || artifact.type === 'richtext') {
      return (
        <div className={`prose prose-sm max-w-none ${
          darkMode ? 'prose-invert' : ''
        } prose-headings:text-sm prose-p:text-sm prose-p:leading-5`}>
          <div dangerouslySetInnerHTML={{ 
            __html: shouldTruncate ? previewContent + '...' : previewContent 
          }} />
        </div>
      );
    }

    if (artifact.type === 'markdown') {
      return (
        <div className={`prose prose-sm max-w-none ${
          darkMode ? 'prose-invert' : ''
        } prose-headings:text-sm prose-p:text-sm prose-p:leading-5`}>
          <pre className={`text-xs font-mono whitespace-pre-wrap ${
            darkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            {shouldTruncate ? previewContent + '...' : previewContent}
          </pre>
        </div>
      );
    }
    
    // For code, show syntax highlighted preview
    const getLanguage = (type: ArtifactType) => {
      const languageMap: Record<ArtifactType, string> = {
        javascript: 'javascript',
        python: 'python',
        html: 'html',
        css: 'css',
        json: 'json',
        sql: 'sql',
        bash: 'bash',
        react: 'jsx',
        svg: 'xml',
        csv: 'csv',
        text: 'text',
        document: 'html',
        richtext: 'html',
        markdown: 'markdown'
      };
      return languageMap[type] || 'text';
    };

    return (
      <div className="relative">
        <SyntaxHighlighter
          language={getLanguage(artifact.type)}
          style={darkMode ? vscDarkPlus : prism}
          customStyle={{
            margin: 0,
            padding: '12px',
            fontSize: '12px',
            lineHeight: '1.4',
            borderRadius: '6px',
            maxHeight: isExpanded ? 'none' : '200px',
            overflow: 'auto',
            background: darkMode ? '#1f2937' : '#f8fafc'
          }}
          showLineNumbers={false}
          wrapLongLines={true}
        >
          {shouldTruncate ? previewContent + '\n...' : previewContent}
        </SyntaxHighlighter>
        {shouldTruncate && (
          <div className={`absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t ${
            darkMode ? 'from-gray-800 to-transparent' : 'from-gray-100 to-transparent'
          } pointer-events-none`} />
        )}
      </div>
    );
  };

  return (
    <motion.div 
      className={`compact-artifact max-w-2xl mx-auto my-4 ${className}`}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className={`rounded-lg border overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl ${
        darkMode 
          ? 'bg-gray-900/70 border-gray-700/40 backdrop-blur-lg hover:bg-gray-900/80' 
          : 'bg-gray-50/70 border-gray-200/40 backdrop-blur-lg hover:bg-white/80'
      }`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between p-3 border-b ${
          darkMode ? 'border-gray-700/40' : 'border-gray-200/40'
        }`}>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {getArtifactIcon(artifact.type)}
            <div className="flex-1 min-w-0">
              <h4 className={`font-medium text-sm truncate ${
                darkMode ? 'text-gray-100' : 'text-gray-900'
              }`}>
                {artifact.title}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  darkMode 
                    ? 'bg-gray-800 text-gray-300' 
                    : 'bg-gray-200 text-gray-600'
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
            <motion.button
              onClick={handleCopy}
              className={`p-1.5 rounded transition-colors ${
                darkMode 
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200' 
                  : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
              }`}
              title="Copy content"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Copy className="w-3.5 h-3.5" />
            </motion.button>
            
            <motion.button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`p-1.5 rounded transition-colors ${
                darkMode 
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200' 
                  : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
              }`}
              title={isExpanded ? "Collapse" : "Expand"}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </motion.div>
            </motion.button>
          </div>
        </div>

        {/* Content Preview */}
        <motion.div
          animate={{ height: isExpanded ? 'auto' : 180 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <motion.div
            className="p-4"
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.1 }}
          >
            {renderPreview()}
          </motion.div>
        </motion.div>

        {/* Status bar */}
        {(isStreaming || copySuccess) && (
          <div className={`flex items-center justify-between px-3 py-2 text-xs border-t ${
            darkMode ? 'border-gray-700/40 bg-gray-800/20' : 'border-gray-200/40 bg-gray-100/20'
          }`}>
            {isStreaming && (
              <div className="flex items-center gap-2 text-blue-500">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                Generating...
              </div>
            )}
            
            {copySuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`ml-auto px-2 py-0.5 rounded text-xs ${
                  copySuccess === 'Copied!' 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}
              >
                {copySuccess}
              </motion.div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default CompactArtifact;