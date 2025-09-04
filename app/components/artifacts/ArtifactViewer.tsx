"use client";

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import * as Tabs from '@radix-ui/react-tabs';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import { CodeMirror } from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { sql } from '@codemirror/lang-sql';
import { ArtifactType, Artifact } from './types';
import { Eye, Code2, FileText, Play, Globe } from 'lucide-react';

interface ArtifactViewerProps {
  artifact: Artifact;
  darkMode: boolean;
  onUpdate?: (artifact: Artifact) => void;
  streamingContent?: string;
  isStreaming?: boolean;
}

const ArtifactViewer: React.FC<ArtifactViewerProps> = ({
  artifact,
  darkMode,
  onUpdate,
  streamingContent = '',
  isStreaming = false
}) => {
  const [activeTab, setActiveTab] = useState('preview');
  const [isEditing, setIsEditing] = useState(false);

  // Get display content
  const getDisplayContent = () => {
    if (isStreaming && streamingContent) {
      return streamingContent;
    }
    return artifact?.content || '';
  };

  // Get CodeMirror language extension
  const getLanguageExtension = (type: ArtifactType) => {
    const extensionMap = {
      javascript: javascript(),
      python: python(),
      html: html(),
      css: css(),
      json: json(),
      markdown: markdown(),
      sql: sql(),
      react: javascript(), // React uses JavaScript
      bash: javascript(), // Basic syntax highlighting
      text: undefined,
      document: undefined,
      richtext: undefined,
      csv: undefined,
      svg: html()
    };
    return extensionMap[type];
  };

  // Determine if we should show tabs based on artifact type
  const shouldShowCodeTab = useMemo(() => {
    const codeTypes: ArtifactType[] = [
      'html', 'css', 'javascript', 'python', 'json', 'sql', 'bash', 'react', 'svg'
    ];
    return codeTypes.includes(artifact.type);
  }, [artifact.type]);

  const shouldShowPreview = useMemo(() => {
    const previewTypes: ArtifactType[] = [
      'html', 'markdown', 'document', 'richtext', 'react', 'svg'
    ];
    return previewTypes.includes(artifact.type);
  }, [artifact.type]);

  // Handle content updates from editor
  const handleContentUpdate = (newContent: string) => {
    if (onUpdate) {
      onUpdate({
        ...artifact,
        content: newContent
      });
    }
  };

  // Render preview based on artifact type
  const renderPreview = () => {
    const content = getDisplayContent();
    
    switch (artifact.type) {
      case 'html':
      case 'react':
        return (
          <div className="h-full">
            <iframe
              srcDoc={content}
              className="w-full h-full border-0 bg-white"
              title="HTML Preview"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        );

      case 'svg':
        return (
          <div className="h-full flex items-center justify-center bg-white">
            <div dangerouslySetInnerHTML={{ __html: content }} />
          </div>
        );

      case 'markdown':
        return (
          <div className={`h-full overflow-auto p-6 prose max-w-none ${
            darkMode ? 'prose-invert' : ''
          }`}>
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        );

      case 'document':
      case 'richtext':
        return (
          <div className={`h-full overflow-auto p-8 ${
            darkMode ? 'text-gray-100' : 'text-gray-900'
          }`}>
            <div 
              className={`prose prose-lg max-w-none leading-relaxed ${
                darkMode 
                  ? 'prose-invert prose-headings:text-gray-100 prose-p:text-gray-200 prose-strong:text-gray-100 prose-li:text-gray-200' 
                  : 'prose-headings:text-gray-900 prose-p:text-gray-800 prose-strong:text-gray-900 prose-li:text-gray-800'
              } prose-headings:font-semibold prose-h1:text-3xl prose-h1:mb-6 prose-h2:text-2xl prose-h2:mb-4 prose-h2:mt-8 prose-p:mb-4 prose-p:leading-7 prose-li:mb-2 prose-ul:mb-6 prose-ol:mb-6`}
              dangerouslySetInnerHTML={{ __html: content }} 
            />
          </div>
        );

      case 'json':
        try {
          const parsed = JSON.parse(content);
          return (
            <div className="h-full overflow-auto p-4">
              <pre className={`text-sm ${
                darkMode ? 'text-gray-200' : 'text-gray-800'
              }`}>
                {JSON.stringify(parsed, null, 2)}
              </pre>
            </div>
          );
        } catch (e) {
          return (
            <div className="h-full overflow-auto p-4">
              <pre className={`text-sm ${
                darkMode ? 'text-gray-200' : 'text-gray-800'
              }`}>
                {content}
              </pre>
            </div>
          );
        }

      default:
        return (
          <div className="h-full overflow-auto p-4">
            <pre className={`text-sm whitespace-pre-wrap ${
              darkMode ? 'text-gray-200' : 'text-gray-800'
            }`}>
              {content}
            </pre>
          </div>
        );
    }
  };

  // Render code editor
  const renderCodeEditor = () => {
    const content = getDisplayContent();
    const extension = getLanguageExtension(artifact.type);
    
    if (isEditing) {
      return (
        <div className="h-full">
          <CodeMirror
            value={content}
            onChange={handleContentUpdate}
            theme={darkMode ? 'dark' : 'light'}
            extensions={extension ? [extension] : []}
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              dropCursor: false,
              allowMultipleSelections: false,
              indentOnInput: true,
              bracketMatching: true,
              closeBrackets: true,
              autocompletion: true,
              highlightSelectionMatches: false
            }}
            className="h-full text-sm"
          />
        </div>
      );
    }

    return (
      <div className="h-full overflow-auto">
        <SyntaxHighlighter
          language={artifact.type === 'react' ? 'jsx' : artifact.type}
          style={darkMode ? vscDarkPlus : prism}
          customStyle={{
            margin: 0,
            height: '100%',
            fontSize: '13px',
            lineHeight: '1.5'
          }}
          showLineNumbers
          wrapLongLines
        >
          {content}
        </SyntaxHighlighter>
      </div>
    );
  };

  // Render raw content
  const renderRawContent = () => {
    const content = getDisplayContent();
    
    return (
      <div className="h-full overflow-auto relative">
        <textarea
          value={content}
          onChange={(e) => handleContentUpdate(e.target.value)}
          className={`w-full h-full p-6 text-sm font-mono resize-none border-0 outline-none leading-6 ${
            darkMode 
              ? 'bg-gray-900/30 text-gray-200 placeholder-gray-500' 
              : 'bg-white/50 text-gray-800 placeholder-gray-400'
          } focus:bg-opacity-80 transition-all`}
          placeholder="Enter content here..."
          readOnly={!isEditing}
          style={{
            fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Monaco, Consolas, monospace'
          }}
        />
        {!isEditing && (
          <div className={`absolute top-4 right-4 px-2 py-1 text-xs rounded ${
            darkMode 
              ? 'bg-gray-800/60 text-gray-400 border border-gray-700/50' 
              : 'bg-gray-100/60 text-gray-600 border border-gray-200/50'
          }`}>
            Read-only
          </div>
        )}
      </div>
    );
  };

  // Get tab icon
  const getTabIcon = (tabValue: string) => {
    switch (tabValue) {
      case 'preview':
        return artifact.type === 'html' || artifact.type === 'react' 
          ? <Globe className="w-4 h-4" />
          : <Eye className="w-4 h-4" />;
      case 'code':
        return <Code2 className="w-4 h-4" />;
      case 'raw':
        return <FileText className="w-4 h-4" />;
      default:
        return null;
    }
  };

  // Determine available tabs
  const availableTabs = useMemo(() => {
    const tabs = [];
    
    if (shouldShowPreview) {
      tabs.push({ value: 'preview', label: 'Preview' });
    }
    
    if (shouldShowCodeTab) {
      tabs.push({ value: 'code', label: 'Code' });
    }
    
    tabs.push({ value: 'raw', label: 'Raw' });
    
    return tabs;
  }, [shouldShowPreview, shouldShowCodeTab]);

  // Set default tab based on artifact type
  React.useEffect(() => {
    if (artifact.type === 'document' || artifact.type === 'richtext' || artifact.type === 'markdown') {
      setActiveTab('preview');
    } else if (shouldShowCodeTab) {
      setActiveTab('code');
    } else {
      setActiveTab('raw');
    }
  }, [artifact.type, shouldShowCodeTab]);

  return (
    <div className="h-full flex flex-col">
      <Tabs.Root 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="h-full flex flex-col"
      >
        <Tabs.List className={`flex border-b shrink-0 px-6 ${
          darkMode ? 'border-gray-700/20 bg-gray-800/20' : 'border-gray-200/20 bg-gray-50/20'
        }`}>
          {availableTabs.map((tab) => (
            <Tabs.Trigger
              key={tab.value}
              value={tab.value}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 relative group ${
                activeTab === tab.value
                  ? darkMode 
                    ? 'text-blue-300 bg-gray-800/60' 
                    : 'text-blue-600 bg-white/80'
                  : darkMode
                    ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/60'
              } rounded-t-lg border-t border-l border-r ${
                activeTab === tab.value
                  ? darkMode
                    ? 'border-gray-600/30 border-b-transparent'
                    : 'border-gray-200/40 border-b-white'
                  : 'border-transparent'
              }`}
            >
              <span className={`transition-transform group-hover:scale-110 ${
                activeTab === tab.value ? 'scale-110' : ''
              }`}>
                {getTabIcon(tab.value)}
              </span>
              {tab.label}
              {activeTab === tab.value && (
                <motion.div
                  layoutId="activeTab"
                  className={`absolute bottom-0 left-0 right-0 h-0.5 ${
                    darkMode ? 'bg-blue-400' : 'bg-blue-500'
                  } rounded-full`}
                />
              )}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <div className="flex-1 min-h-0 relative">
          <Tabs.Content value="preview" className="h-full absolute inset-0">
            <div className={`h-full overflow-hidden ${
              darkMode ? 'bg-gray-900/50' : 'bg-gray-50/30'
            }`}>
              {renderPreview()}
            </div>
          </Tabs.Content>

          <Tabs.Content value="code" className="h-full absolute inset-0">
            <div className={`h-full overflow-hidden ${
              darkMode ? 'bg-gray-900/50' : 'bg-gray-50/30'
            }`}>
              {renderCodeEditor()}
            </div>
          </Tabs.Content>

          <Tabs.Content value="raw" className="h-full absolute inset-0">
            <div className={`h-full overflow-hidden ${
              darkMode ? 'bg-gray-900/50' : 'bg-gray-50/30'
            }`}>
              {renderRawContent()}
            </div>
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
};

export default ArtifactViewer;