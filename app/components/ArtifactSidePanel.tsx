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
  FiPlay,
  FiEye,
  FiRefreshCw,
  FiSave,
  FiChevronLeft,
  FiChevronRight,
  FiMaximize2,
  FiMinimize2
} from 'react-icons/fi';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ArtifactType, Artifact } from './ArtifactCanvas';
import RichTextEditor from './RichTextEditor';
import { exportDocument, ExportFormat } from '../utils/document-export';

interface ArtifactSidePanelProps {
  isOpen: boolean;
  artifact: Artifact | null;
  darkMode: boolean;
  onClose: () => void;
  onUpdate?: (artifact: Artifact) => void;
  streamingContent?: string;
  isStreaming?: boolean;
}

const ArtifactSidePanel: React.FC<ArtifactSidePanelProps> = ({
  isOpen,
  artifact,
  darkMode,
  onClose,
  onUpdate,
  streamingContent = '',
  isStreaming = false
}) => {
  const [activeTab, setActiveTab] = useState<'code' | 'preview' | 'edit'>('code');
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Update content when artifact or streaming changes
  useEffect(() => {
    if (artifact) {
      setEditedContent(artifact.content);
      
      // Set default tab based on artifact type
      if (['document', 'richtext'].includes(artifact.type)) {
        setActiveTab('preview'); // Show formatted document first
      } else if (['html', 'svg'].includes(artifact.type)) {
        setActiveTab('preview'); // Show visual preview first
      } else {
        setActiveTab('code'); // Show code view for programming languages
      }
    }
  }, [artifact?.content, artifact?.type]);

  // Get the display content (streaming or final)
  const getDisplayContent = () => {
    if (isStreaming && streamingContent) {
      return streamingContent;
    }
    return artifact?.content || '';
  };

  // Get syntax language
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

  // Check if can preview
  const canPreview = (type: ArtifactType): boolean => {
    return ['html', 'svg', 'react', 'markdown', 'document', 'richtext'].includes(type);
  };

  // Get file extension
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

  // Handle copy
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

  // Handle download
  const handleDownload = () => {
    if (!artifact) return;
    
    const blob = new Blob([getDisplayContent()], { type: 'text/plain' });
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

  // Handle save edit
  const handleSave = () => {
    if (!artifact || !onUpdate) return;
    
    const updatedArtifact: Artifact = {
      ...artifact,
      content: editedContent,
      updatedAt: new Date()
    };
    
    onUpdate(updatedArtifact);
    setIsEditing(false);
    setCopySuccess('Saved!');
    setTimeout(() => setCopySuccess(null), 2000);
  };

  // Handle exporting document
  const handleExport = async (format: ExportFormat) => {
    if (!artifact) return;
    
    try {
      const content = getDisplayContent();
      const filename = artifact.title.replace(/\s+/g, '-').toLowerCase();
      
      await exportDocument(content, format, filename, {
        title: artifact.title,
        author: 'Kiongozi AI',
        subject: `Generated ${artifact.type} content`
      });
      
      setCopySuccess(`Exported as ${format.toUpperCase()}!`);
      setTimeout(() => setCopySuccess(null), 2000);
      setShowExportMenu(false);
    } catch (error) {
      setCopySuccess('Export failed');
      setTimeout(() => setCopySuccess(null), 2000);
    }
  };

  // Render preview
  const renderPreview = () => {
    if (!artifact) return null;
    
    const content = getDisplayContent();
    
    switch (artifact.type) {
      case 'html':
        return (
          <iframe
            ref={iframeRef}
            srcDoc={content}
            className="w-full h-full border-0 bg-white"
            sandbox="allow-scripts allow-same-origin"
          />
        );
      
      case 'svg':
        return (
          <div 
            className="w-full h-full flex items-center justify-center bg-white p-4"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        );
      
      case 'markdown':
        return (
          <div className="w-full h-full p-6 overflow-auto bg-white dark:bg-gray-900">
            <div 
              className="prose prose-lg dark:prose-invert max-w-none prose-headings:text-gray-900 dark:prose-headings:text-gray-100"
              dangerouslySetInnerHTML={{ 
                __html: content
                  .replace(/\n/g, '<br>')
                  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                  .replace(/\*([^*]+)\*/g, '<em>$1</em>')
                  .replace(/^#{1,6}\s+(.*)$/gm, (match, text, offset, string) => {
                    const level = match.indexOf(' ');
                    return `<h${level}>${text}</h${level}>`;
                  })
              }}
            />
          </div>
        );
      
      case 'document':
      case 'richtext':
        return (
          <div className="w-full h-full p-6 overflow-auto bg-white dark:bg-gray-900">
            <div 
              className="prose prose-lg dark:prose-invert max-w-none prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-strong:text-gray-900 dark:prose-strong:text-gray-100"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
        );
      
      default:
        return (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            Preview not available
          </div>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ type: "spring", stiffness: 400, damping: 40 }}
      className={`h-full border-l flex flex-col overflow-hidden backdrop-blur-xl ${isCollapsed ? 'w-16' : 'w-full'} ${
        darkMode 
          ? 'bg-gray-900/95 border-gray-700/50 shadow-2xl' 
          : 'bg-white/95 border-gray-200/50 shadow-xl'
      }`}
    >
      {/* Collapse/Expand Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`absolute left-2 top-4 z-10 w-6 h-6 rounded-full flex items-center justify-center ${
          darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900'
        } transition-colors shadow-md`}
        title={isCollapsed ? 'Expand panel' : 'Collapse panel'}
      >
        {isCollapsed ? <FiChevronLeft size={12} /> : <FiChevronRight size={12} />}
      </button>

      {!isCollapsed && (
        <>
          {/* Header */}
          <div className={`flex items-center justify-between p-4 border-b backdrop-blur-sm ${
            darkMode ? 'border-gray-700/50 bg-gray-800/20' : 'border-gray-200/50 bg-gray-50/30'
          }`}>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FiCode className={darkMode ? 'text-blue-400' : 'text-blue-600'} size={16} />
              <span className={`font-medium text-sm truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {artifact?.title || 'Artifact'}
              </span>
              {artifact && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'
                }`}>
                  {artifact.type.toUpperCase()}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopy}
                className={`p-1.5 rounded transition-colors ${
                  darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                }`}
                title="Copy"
              >
                <FiCopy size={14} />
              </button>
              
              <button
                onClick={handleDownload}
                className={`p-1.5 rounded transition-colors ${
                  darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                }`}
                title="Download"
              >
                <FiDownload size={14} />
              </button>
              
              {/* Export Options Dropdown */}
              {artifact && ['document', 'richtext', 'html', 'markdown'].includes(artifact.type) && (
                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className={`p-1.5 rounded transition-colors ${
                      darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                    }`}
                    title="Export Options"
                  >
                    <FiFile size={14} />
                  </button>
                  
                  {showExportMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -5 }}
                      transition={{ duration: 0.2 }}
                      className={`absolute right-0 top-full mt-2 w-32 rounded-lg border shadow-lg z-10 ${
                        darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="py-1">
                        <button
                          onClick={() => handleExport('pdf')}
                          className={`w-full px-3 py-2 text-left text-xs transition-colors ${
                            darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          Export as PDF
                        </button>
                        <button
                          onClick={() => handleExport('docx')}
                          className={`w-full px-3 py-2 text-left text-xs transition-colors ${
                            darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          Export as Word
                        </button>
                        <button
                          onClick={() => handleExport('html')}
                          className={`w-full px-3 py-2 text-left text-xs transition-colors ${
                            darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          Export as HTML
                        </button>
                        <button
                          onClick={() => handleExport('txt')}
                          className={`w-full px-3 py-2 text-left text-xs transition-colors ${
                            darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          Export as Text
                        </button>
                        <button
                          onClick={() => handleExport('md')}
                          className={`w-full px-3 py-2 text-left text-xs transition-colors ${
                            darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          Export as Markdown
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
              
              <button
                onClick={onClose}
                className={`p-1.5 rounded transition-colors ${
                  darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                }`}
                title="Close"
              >
                <FiX size={14} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className={`flex border-b bg-gradient-to-r ${
            darkMode 
              ? 'from-gray-800/30 to-gray-700/30 border-gray-700/50' 
              : 'from-gray-50/50 to-gray-100/50 border-gray-200/50'
          }`}>
            {/* Only show Code tab for non-document types */}
            {artifact && !['document', 'richtext'].includes(artifact.type) && (
              <button
                onClick={() => setActiveTab('code')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-300 relative ${
                  activeTab === 'code'
                    ? darkMode 
                      ? 'bg-gradient-to-b from-blue-600/20 to-blue-700/20 text-blue-400 shadow-inner' 
                      : 'bg-gradient-to-b from-blue-50 to-blue-100 text-blue-700 shadow-inner'
                    : darkMode 
                      ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                }`}
              >
                Code
                {activeTab === 'code' && (
                  <motion.div
                    layoutId="activeTab"
                    className={`absolute bottom-0 left-0 right-0 h-0.5 ${
                      darkMode ? 'bg-blue-400' : 'bg-blue-600'
                    }`}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            )}
            
            {/* Preview tab - always show but rename for documents */}
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-300 relative ${
                activeTab === 'preview'
                  ? darkMode 
                    ? 'bg-gradient-to-b from-green-600/20 to-green-700/20 text-green-400 shadow-inner' 
                    : 'bg-gradient-to-b from-green-50 to-green-100 text-green-700 shadow-inner'
                  : darkMode 
                    ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
              }`}
            >
              {artifact && ['document', 'richtext'].includes(artifact.type) ? 'Document' : 'Preview'}
              {activeTab === 'preview' && (
                <motion.div
                  layoutId="activeTab"
                  className={`absolute bottom-0 left-0 right-0 h-0.5 ${
                    darkMode ? 'bg-green-400' : 'bg-green-600'
                  }`}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </button>
            
            {/* Edit Tab - for rich text and document types */}
            {artifact && ['document', 'richtext'].includes(artifact.type) && (
              <button
                onClick={() => setActiveTab('edit')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-300 relative ${
                  activeTab === 'edit'
                    ? darkMode 
                      ? 'bg-gradient-to-b from-purple-600/20 to-purple-700/20 text-purple-400 shadow-inner' 
                      : 'bg-gradient-to-b from-purple-50 to-purple-100 text-purple-700 shadow-inner'
                    : darkMode 
                      ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                }`}
              >
                Edit
                {activeTab === 'edit' && (
                  <motion.div
                    layoutId="activeTab"
                    className={`absolute bottom-0 left-0 right-0 h-0.5 ${
                      darkMode ? 'bg-purple-400' : 'bg-purple-600'
                    }`}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
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
                      className={`flex-1 p-3 font-mono text-xs resize-none outline-none ${
                        darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
                      }`}
                    />
                    <div className={`flex items-center gap-2 p-2 border-t ${
                      darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
                    }`}>
                      <button
                        onClick={handleSave}
                        className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditedContent(artifact?.content || '');
                          setIsEditing(false);
                        }}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                        }`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-full overflow-auto">
                    {artifact ? (
                      <SyntaxHighlighter
                        language={getSyntaxLanguage(artifact.type)}
                        style={darkMode ? vscDarkPlus : prism}
                        customStyle={{
                          margin: 0,
                          padding: '12px',
                          background: 'transparent',
                          fontSize: '11px',
                          lineHeight: '1.4'
                        }}
                        showLineNumbers
                        lineNumberStyle={{ minWidth: '2.5em', fontSize: '10px' }}
                      >
                        {getDisplayContent()}
                      </SyntaxHighlighter>
                    ) : (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        {isStreaming ? 'Generating content...' : 'No content'}
                      </div>
                    )}
                    
                    {/* Streaming indicator */}
                    {isStreaming && (
                      <div className={`absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                        darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'
                      }`}>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        Writing...
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'preview' && renderPreview()}
            
            {activeTab === 'edit' && artifact && ['document', 'richtext'].includes(artifact.type) && (
              <div className="h-full p-4">
                <RichTextEditor
                  content={editedContent}
                  onChange={(content) => setEditedContent(content)}
                  darkMode={darkMode}
                  placeholder="Start writing your document..."
                />
                
                {/* Save Button for Rich Text Editor */}
                <div className={`flex items-center justify-end gap-2 p-3 border-t mt-4 ${
                  darkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <button
                    onClick={handleSave}
                    disabled={editedContent === artifact?.content}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      editedContent === artifact?.content
                        ? darkMode 
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                    }`}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Success message */}
          <AnimatePresence>
            {copySuccess && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-2 py-1 rounded text-xs"
              >
                {copySuccess}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
};

export default ArtifactSidePanel;