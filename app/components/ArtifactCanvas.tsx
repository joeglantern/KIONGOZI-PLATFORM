"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiCode, 
  FiFile, 
  FiDownload, 
  FiCopy, 
  FiEdit, 
  FiX, 
  FiMaximize2, 
  FiMinimize2,
  FiPlay,
  FiEye,
  FiRefreshCw,
  FiSave,
  FiExternalLink,
  FiSettings
} from 'react-icons/fi';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, prism } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Artifact types that the canvas can handle
export type ArtifactType = 
  | 'html' | 'css' | 'javascript' | 'python' | 'json' | 'markdown' 
  | 'text' | 'svg' | 'react' | 'csv' | 'sql' | 'bash'
  | 'document' | 'richtext';

// Artifact data structure
export interface Artifact {
  id: string;
  type: ArtifactType;
  title: string;
  content: string;
  language?: string;
  createdAt: Date;
  updatedAt: Date;
  isEditable?: boolean;
  isExecutable?: boolean;
  metadata?: {
    description?: string;
    author?: string;
    version?: string;
    dependencies?: string[];
  };
}

interface ArtifactCanvasProps {
  artifact: Artifact;
  darkMode: boolean;
  isVisible: boolean;
  onClose: () => void;
  onUpdate?: (artifact: Artifact) => void;
  className?: string;
}

const ArtifactCanvas: React.FC<ArtifactCanvasProps> = ({
  artifact,
  darkMode,
  isVisible,
  onClose,
  onUpdate,
  className = ''
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(artifact.content);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'code' | 'preview' | 'output'>('code');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Update edited content when artifact changes
  useEffect(() => {
    setEditedContent(artifact.content);
  }, [artifact.content]);

  // Get the appropriate syntax highlighter language
  const getSyntaxLanguage = (type: ArtifactType): string => {
    const languageMap: Record<ArtifactType, string> = {
      html: 'markup',
      css: 'css',
      javascript: 'javascript',
      python: 'python',
      json: 'json',
      markdown: 'markdown',
      text: 'text',
      svg: 'markup',
      react: 'jsx',
      csv: 'csv',
      sql: 'sql',
      bash: 'bash',
      document: 'markup',
      richtext: 'markup'
    };
    return languageMap[type] || 'text';
  };

  // Get file extension for downloads
  const getFileExtension = (type: ArtifactType): string => {
    const extMap: Record<ArtifactType, string> = {
      html: 'html',
      css: 'css',
      javascript: 'js',
      python: 'py',
      json: 'json',
      markdown: 'md',
      text: 'txt',
      svg: 'svg',
      react: 'jsx',
      csv: 'csv',
      sql: 'sql',
      bash: 'sh',
      document: 'html',
      richtext: 'html'
    };
    return extMap[type] || 'txt';
  };

  // Get icon for artifact type
  const getTypeIcon = (type: ArtifactType) => {
    const iconMap: Record<ArtifactType, JSX.Element> = {
      html: <FiCode className="text-orange-500" />,
      css: <FiCode className="text-blue-500" />,
      javascript: <FiCode className="text-yellow-500" />,
      python: <FiCode className="text-green-500" />,
      json: <FiCode className="text-purple-500" />,
      markdown: <FiFile className="text-gray-500" />,
      text: <FiFile className="text-gray-500" />,
      svg: <FiCode className="text-pink-500" />,
      react: <FiCode className="text-cyan-500" />,
      csv: <FiFile className="text-green-600" />,
      sql: <FiCode className="text-blue-600" />,
      bash: <FiCode className="text-gray-600" />,
      document: <FiFile className="text-indigo-500" />,
      richtext: <FiEdit className="text-purple-600" />
    };
    return iconMap[type] || <FiFile />;
  };

  // Check if artifact type can be previewed
  const canPreview = (type: ArtifactType): boolean => {
    return ['html', 'svg', 'react', 'markdown'].includes(type);
  };

  // Check if artifact type can be executed
  const canExecute = (type: ArtifactType): boolean => {
    return ['javascript', 'python', 'bash'].includes(type);
  };

  // Handle save changes
  const handleSave = () => {
    const updatedArtifact: Artifact = {
      ...artifact,
      content: editedContent,
      updatedAt: new Date()
    };
    
    onUpdate?.(updatedArtifact);
    setIsEditing(false);
    
    // Show success message
    setCopySuccess('Saved successfully!');
    setTimeout(() => setCopySuccess(null), 2000);
  };

  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(artifact.content);
      setCopySuccess('Copied to clipboard!');
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      setCopySuccess('Failed to copy');
      setTimeout(() => setCopySuccess(null), 2000);
    }
  };

  // Handle download
  const handleDownload = () => {
    const blob = new Blob([artifact.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.title.replace(/\\s+/g, '-').toLowerCase()}.${getFileExtension(artifact.type)}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setCopySuccess('Downloaded!');
    setTimeout(() => setCopySuccess(null), 2000);
  };

  // Handle execute (for executable artifacts)
  const handleExecute = async () => {
    if (!canExecute(artifact.type)) return;
    
    setIsExecuting(true);
    setActiveTab('output');
    
    // Simulate execution (in a real implementation, you'd send to a backend)
    setTimeout(() => {
      setIsExecuting(false);
      setCopySuccess('Executed successfully!');
      setTimeout(() => setCopySuccess(null), 2000);
    }, 2000);
  };

  // Render preview content
  const renderPreview = () => {
    switch (artifact.type) {
      case 'html':
        return (
          <iframe
            ref={iframeRef}
            srcDoc={artifact.content}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
          />
        );
      
      case 'svg':
        return (
          <div 
            className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800"
            dangerouslySetInnerHTML={{ __html: artifact.content }}
          />
        );
      
      case 'markdown':
        return (
          <div className="w-full h-full p-4 overflow-auto bg-white dark:bg-gray-900">
            <div 
              className="prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ 
                __html: artifact.content
                  .replace(/\\n/g, '<br>')
                  .replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>')
                  .replace(/\\*([^*]+)\\*/g, '<em>$1</em>')
              }}
            />
          </div>
        );
      
      default:
        return (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            Preview not available for this file type
          </div>
        );
    }
  };

  // Render output tab (for executable artifacts)
  const renderOutput = () => {
    if (isExecuting) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="flex items-center gap-2 text-blue-500">
            <FiRefreshCw className="animate-spin" />
            <span>Executing...</span>
          </div>
        </div>
      );
    }
    
    return (
      <div className="w-full h-full p-4 bg-gray-900 text-green-400 font-mono text-sm overflow-auto">
        <div>$ Execution output will appear here</div>
        <div className="mt-2 text-gray-500"># This is a simulated output panel</div>
      </div>
    );
  };

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm ${className}`}
      onClick={onClose}
    >
      <motion.div
        ref={canvasRef}
        className={`relative w-full max-w-6xl mx-4 rounded-xl overflow-hidden shadow-2xl ${
          darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'
        } ${isFullscreen ? 'max-w-none mx-0 h-screen rounded-none' : 'max-h-[90vh]'} flex flex-col`}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${
          darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
        }`}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {getTypeIcon(artifact.type)}
              <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {artifact.title}
              </span>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs ${
              darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
            }`}>
              {artifact.type.toUpperCase()}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Action buttons */}
            <button
              onClick={handleCopy}
              className={`p-2 rounded-lg transition-colors ${
                darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600'
              }`}
              title="Copy to clipboard"
            >
              <FiCopy size={16} />
            </button>
            
            <button
              onClick={handleDownload}
              className={`p-2 rounded-lg transition-colors ${
                darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600'
              }`}
              title="Download file"
            >
              <FiDownload size={16} />
            </button>
            
            {artifact.isEditable && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`p-2 rounded-lg transition-colors ${
                  isEditing 
                    ? 'bg-blue-500 text-white' 
                    : darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600'
                }`}
                title="Edit content"
              >
                <FiEdit size={16} />
              </button>
            )}
            
            {canExecute(artifact.type) && (
              <button
                onClick={handleExecute}
                disabled={isExecuting}
                className={`p-2 rounded-lg transition-colors ${
                  isExecuting 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
                title="Execute code"
              >
                <FiPlay size={16} />
              </button>
            )}
            
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`p-2 rounded-lg transition-colors ${
                darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600'
              }`}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <FiMinimize2 size={16} /> : <FiMaximize2 size={16} />}
            </button>
            
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600'
              }`}
              title="Close"
            >
              <FiX size={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'code'
                ? darkMode ? 'bg-gray-800 text-white border-b-2 border-blue-500' : 'bg-white text-gray-900 border-b-2 border-blue-500'
                : darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Code
          </button>
          
          {canPreview(artifact.type) && (
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'preview'
                  ? darkMode ? 'bg-gray-800 text-white border-b-2 border-blue-500' : 'bg-white text-gray-900 border-b-2 border-blue-500'
                  : darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Preview
            </button>
          )}
          
          {canExecute(artifact.type) && (
            <button
              onClick={() => setActiveTab('output')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'output'
                  ? darkMode ? 'bg-gray-800 text-white border-b-2 border-blue-500' : 'bg-white text-gray-900 border-b-2 border-blue-500'
                  : darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Output
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'code' && (
            <div className="h-full">
              {isEditing ? (
                <div className="h-full flex flex-col">
                  <textarea
                    ref={textareaRef}
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className={`flex-1 p-4 font-mono text-sm resize-none outline-none ${
                      darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
                    }`}
                    placeholder="Enter your code here..."
                  />
                  <div className={`flex items-center gap-2 p-3 border-t ${
                    darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
                  }`}>
                    <button
                      onClick={handleSave}
                      className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
                    >
                      <FiSave size={14} />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditedContent(artifact.content);
                        setIsEditing(false);
                      }}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-full overflow-auto">
                  <SyntaxHighlighter
                    language={getSyntaxLanguage(artifact.type)}
                    style={darkMode ? vscDarkPlus : prism}
                    customStyle={{
                      margin: 0,
                      padding: '1rem',
                      background: 'transparent',
                      height: '100%'
                    }}
                    showLineNumbers
                    lineNumberStyle={{ minWidth: '3em' }}
                  >
                    {artifact.content}
                  </SyntaxHighlighter>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'preview' && renderPreview()}
          {activeTab === 'output' && renderOutput()}
        </div>

        {/* Success message */}
        <AnimatePresence>
          {copySuccess && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg"
            >
              {copySuccess}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ArtifactCanvas;