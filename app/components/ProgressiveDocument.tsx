"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message } from './AskAI';
import { 
  FiFile,
  FiChevronDown,
  FiChevronUp,
  FiDownload,
  FiCopy,
  FiEdit,
  FiBookOpen,
  FiClock,
  FiCheckCircle,
  FiFileText,
  FiX,
  FiSettings
} from 'react-icons/fi';
import dynamic from 'next/dynamic';

// Interface for document generation
interface DocumentSection {
  title: string;
  content: string;
  messages: number[]; // IDs of messages that contributed to this section
  lastUpdated: Date;
}

interface DocumentData {
  title: string; 
  sections: DocumentSection[];
  lastUpdated: Date;
  keywords: string[];
  isEnabled: boolean; // Flag to check if user wants document generation
}

interface ProgressiveDocumentProps {
  messages: Message[];
  darkMode: boolean;
  isEnabled?: boolean; // External control for document generation
}

const ProgressiveDocument: React.FC<ProgressiveDocumentProps> = ({ 
  messages, 
  darkMode,
  isEnabled: externalEnabled = false // Default to false if not provided
}) => {
  const [document, setDocument] = useState<DocumentData>({
    title: 'My Research Document',
    sections: [],
    lastUpdated: new Date(),
    keywords: [],
    isEnabled: false // Local state still used as fallback
  });
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState(document.title);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false); // Show opt-in prompt
  const titleInputRef = useRef<HTMLInputElement>(null);
  
  // For document tracking
  const processedMessageIds = useRef<Set<number>>(new Set());
  
  // Add useRef for tracking dismiss status
  const dismissInProgress = useRef(false);
  
  // Add useRef for content area
  const contentRef = useRef<HTMLDivElement>(null);
  const documentRef = useRef<HTMLDivElement>(null);
  
  // Lock body scroll when document is expanded - improved version
  useEffect(() => {
    if (!isExpanded) return;
    
    // Save current body scroll position
    const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    
    // Modern approach with CSS
    const doc = window.document;
    doc.documentElement.style.setProperty('--scroll-position', `-${scrollY}px`);
    doc.body.classList.add('overflow-hidden', 'fixed', 'inset-x-0', 'top-[var(--scroll-position)]');
    doc.body.style.width = '100%';
    
    // Handle touch events on iOS and other mobile devices
    const preventScroll = (e: TouchEvent) => {
      // Allow events originating from the document content
      if (contentRef.current?.contains(e.target as Node) || 
          documentRef.current?.contains(e.target as Node)) {
        return;
      }
      e.preventDefault();
    };
    
    // Add touchmove listener to body
    doc.body.addEventListener('touchmove', preventScroll, { passive: false });
    
    return () => {
      // Cleanup - restore scrolling
      doc.body.classList.remove('overflow-hidden', 'fixed', 'inset-x-0', 'top-[var(--scroll-position)]');
      doc.body.style.width = '';
      doc.body.removeEventListener('touchmove', preventScroll);
      
      // Restore scroll position
      window.scrollTo(0, scrollY);
    };
  }, [isExpanded]);
  
  // Add handler to prevent scroll propagation
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };
  
  // Add handler for touch events
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    // Only prevent default if we're at the boundary of the scroll container
    const contentElement = contentRef.current;
    if (!contentElement) return;
    
    const { scrollTop, scrollHeight, clientHeight } = contentElement;
    
    // If we're at the top or bottom of the scroll container and trying to scroll further
    // in that direction, prevent default to avoid scrolling the body
    if ((scrollTop <= 0 && e.touches[0].clientY > 0) || 
        (scrollTop + clientHeight >= scrollHeight && e.touches[0].clientY < 0)) {
      e.stopPropagation();
    }
  };
  
  // Update effect to check for changes in external isEnabled state
  useEffect(() => {
    if (externalEnabled !== document.isEnabled) {
      setDocument(prev => ({
        ...prev,
        isEnabled: externalEnabled
      }));
      
      // If newly enabled, reset processed IDs to reprocess everything
      if (externalEnabled && !document.isEnabled) {
        processedMessageIds.current.clear();
      }
    }
  }, [externalEnabled, document.isEnabled]);
  
  // Update showPrompt effect to respect external control
  useEffect(() => {
    // Only show prompt if:
    // 1. Document generation is not enabled (both external and internal state)
    // 2. The user has received at least one research response
    // 3. We haven't shown the prompt yet
    // 4. External control is not being used (only show automatic prompt if external control is not present)
    const hasResearchResponses = messages.some(msg => 
      !msg.isUser && msg.type === 'research' && msg.isTypingComplete
    );
    
    if (!document.isEnabled && hasResearchResponses && !showPrompt && !externalEnabled) {
      console.log("Setting showPrompt to true"); // Debug log
      setShowPrompt(true);
    }
  }, [messages, document.isEnabled, showPrompt, externalEnabled]);
  
  // Effect to update document based on new messages
  useEffect(() => {
    // Only process if document generation is enabled
    if (!document.isEnabled) return;
    
    const updateDocument = async () => {
      // Check for new messages that need processing
      const newMessages = messages.filter(msg => 
        !msg.isUser && 
        !processedMessageIds.current.has(msg.id) &&
        msg.isTypingComplete // Only process completed messages
      );
      
      if (newMessages.length === 0) return;
      
      let updatedDocument = { ...document };
      let documentChanged = false;
      
      // Process each new AI message
      for (const message of newMessages) {
        // Skip user messages and already processed ones
        if (message.isUser || processedMessageIds.current.has(message.id)) continue;
        
        // Mark message as processed
        processedMessageIds.current.add(message.id);
        
        // Add to document
        documentChanged = await addMessageToDocument(message, updatedDocument) || documentChanged;
      }
      
      // Only update state if document changed
      if (documentChanged) {
        updatedDocument.lastUpdated = new Date();
        setDocument(updatedDocument);
      }
    };
    
    updateDocument();
  }, [messages, document]);
  
  // Update the toggleDocumentGeneration function to work with external state
  const toggleDocumentGeneration = (enable: boolean) => {
    setDocument(prev => ({
      ...prev,
      isEnabled: enable
    }));
    setShowPrompt(false);
    
    // If enabling, process existing messages
    if (enable) {
      // Reset processed messages to reprocess everything
      processedMessageIds.current.clear();
    }
  };
  
  // Improve the dismissPrompt function with delay timer
  const dismissPrompt = () => {
    // Prevent multiple dismiss attempts
    if (dismissInProgress.current) return;
    dismissInProgress.current = true;
    
    // Force the prompt to disappear immediately
    setShowPrompt(false);
    
    // Also store user preference in localStorage for persistence
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('document-prompt-dismissed', 'true');
        console.log("Prompt dismissed and preference saved");
      } catch (e) {
        console.error("Failed to save preference:", e);
      }
    }
    
    // Reset dismiss tracking after delay
    setTimeout(() => {
      dismissInProgress.current = false;
    }, 500);
  };
  
  // Handle title editing
  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [editingTitle]);
  
  // Function to close/disable the document
  const closeDocument = () => {
    // Ask for confirmation
    if (document.sections.length > 0) {
      if (window.confirm('Are you sure you want to close this document? You can re-enable it later.')) {
        toggleDocumentGeneration(false);
      }
    } else {
      toggleDocumentGeneration(false);
    }
  };
  
  // Update document content to only include research-specific content
  const addMessageToDocument = async (message: Message, currentDocument: DocumentData): Promise<boolean> => {
    // Check if the message is a research type
    if (message.type !== 'research') {
      return false;
    }
    
    // Initialize document changed flag
    let documentChanged = false;
    
    // Generate title if needed
    if (currentDocument.title === 'My Research Document') {
      // Try to extract title from research data or message text
      if (message.text && message.text.length > 10) {
        const firstSentence = message.text.split('.')[0];
        if (firstSentence.length > 10 && firstSentence.length < 100) {
          currentDocument.title = firstSentence
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .replace(/`/g, '')
            .replace(/_/g, '')
            .replace(/#/g, '')
            .trim();
          setNewTitle(currentDocument.title);
          documentChanged = true;
        }
      }
    }
    
    // Add summary section - be flexible about where we get the summary from
    const summaryText = message.researchData?.summary || message.text;
    
    if (summaryText && summaryText.length > 0) {
      // Check if we already have a summary section
      const hasSummarySection = currentDocument.sections.some(s => 
        s.title === 'Summary' || s.title === 'Overview'
      );
      
      if (!hasSummarySection) {
        currentDocument.sections.push({
          title: 'Summary',
          content: summaryText,
          messages: [message.id],
          lastUpdated: new Date()
        });
        documentChanged = true;
      }
    }
    
    // Add key points as sections
    const keyPoints = message.researchData?.keyPoints || [];
    if (keyPoints.length > 0) {
      // Group similar key points by topic
      const pointsByTopic = groupSimilarPoints(keyPoints);
      
      // Add each topic as a section
      Object.entries(pointsByTopic).forEach(([topic, points]) => {
        // Create a well-formatted section with detailed content
        const sectionContent = points.join('\n\n');
        
        currentDocument.sections.push({
          title: topic,
          content: sectionContent,
          messages: [message.id],
          lastUpdated: new Date()
        });
        documentChanged = true;
      });
    } 
    // If no key points but we have text, try to extract sections from the text
    else if (message.text && message.text.length > 100 && currentDocument.sections.length === 0) {
      // Try to find headers in the text
      const paragraphs = message.text.split('\n\n').filter(p => p.trim().length > 0);
      if (paragraphs.length >= 2) {
        // Create a simple section structure
        const mainContent = paragraphs.slice(1).join('\n\n');
        currentDocument.sections.push({
          title: 'Key Points',
          content: mainContent,
          messages: [message.id],
          lastUpdated: new Date()
        });
        documentChanged = true;
      }
    }
    
    // Add related topics as keywords
    const relatedTopics = message.researchData?.relatedTopics || [];
    if (relatedTopics.length > 0) {
      const newKeywords = relatedTopics.map(topic => 
        // Clean emojis and formatting more thoroughly
        topic.replace(/^[🔍📊🌐⚖️📚💡🧩🔄📈🏛️📝🗂️]\s*/, '')
             .replace(/\*\*/g, '')
             .replace(/\*/g, '')
             .replace(/`/g, '')
             .replace(/_/g, '')
             .replace(/#/g, '')
             .trim()
      );
      
      // Add unique keywords
      let keywordsAdded = false;
      newKeywords.forEach(keyword => {
        if (!currentDocument.keywords.includes(keyword)) {
          currentDocument.keywords.push(keyword);
          keywordsAdded = true;
        }
      });
      
      if (keywordsAdded) {
        documentChanged = true;
      }
    }
    
    // Add sources section if available
    const sources = message.researchData?.sources || [];
    if (sources.length > 0) {
      const sourcesContent = sources
        .map(source => `• ${source.title || 'Source'} - ${source.url || '#'}`)
        .join('\n\n');
      
      // Check if we already have a sources section
      const hasSourcesSection = currentDocument.sections.some(s => 
        s.title === 'Sources' || s.title === 'References'
      );
      
      // Only add if we don't already have a sources section
      if (!hasSourcesSection) {
        currentDocument.sections.push({
          title: 'Sources',
          content: sourcesContent,
          messages: [message.id],
          lastUpdated: new Date()
        });
        documentChanged = true;
      }
    }
    
    return documentChanged;
  };
  
  // Helper function to group similar points by topic
  const groupSimilarPoints = (points: string[]): Record<string, string[]> => {
    const grouped: Record<string, string[]> = {};
    
    // Extract topics from points (usually before the colon)
    points.forEach(point => {
      let topic = '';
      let content = point;
      
      // Try to split by colon to extract topic
      if (point.includes(':')) {
        const [topicPart, ...contentParts] = point.split(':');
        topic = topicPart.trim()
          .replace(/\*\*/g, '')
          .replace(/\*/g, '')
          .replace(/`/g, '')
          .replace(/_/g, '')
          .replace(/#/g, '');
        content = contentParts.join(':').trim();
      } else {
        // Use first few words as topic if no colon
        const words = point.split(' ');
        topic = words.slice(0, Math.min(5, words.length)).join(' ')
          .replace(/\*\*/g, '')
          .replace(/\*/g, '')
          .replace(/`/g, '')
          .replace(/_/g, '')
          .replace(/#/g, '');
        content = point;
      }
      
      // Add to appropriate group
      if (!grouped[topic]) {
        grouped[topic] = [];
      }
      grouped[topic].push(content);
    });
    
    return grouped;
  };
  
  // Generate document as markdown
  const generateMarkdown = () => {
    // Create a clean document title (no markdown)
    let plainTitle = document.title
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/`/g, '')
      .replace(/#/g, '')
      .trim();
      
    let markdown = `${plainTitle}\n\n`;
    
    // Add clean keywords section
    if (document.keywords.length > 0) {
      markdown += `Keywords: ${document.keywords.join(', ')}\n\n`;
    }
    
    // Add each section with professional formatting
    document.sections.forEach(section => {
      // Clean section title
      let cleanTitle = section.title
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/`/g, '')
        .replace(/#/g, '')
        .trim();
      
      markdown += `${cleanTitle}\n\n`;
      
      // Clean section content by thoroughly removing all markdown artifacts
      let cleanContent = section.content
        // Remove headers
        .replace(/^#+\s+/gm, '')
        // Remove bold markers
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        // Remove italic markers
        .replace(/\*([^*]+)\*/g, '$1')
        // Remove underscore emphasis
        .replace(/_([^_]+)_/g, '$1')
        // Remove backticks
        .replace(/`([^`]+)`/g, '$1')
        // Clean list markers but keep the structure
        .replace(/^-\s+/gm, '• ')
        .replace(/^\d+\.\s+/gm, '• ')
        // Clean blockquotes
        .replace(/^>\s+/gm, '');
      
      markdown += `${cleanContent}\n\n`;
    });
    
    return markdown;
  };
  
  // Update the handleDownload function
  const handleDownload = async () => {
    try {
      setCopySuccess('Preparing document...');
      
      // Dynamically import the docx library (to avoid SSR issues)
      const docx = await import('docx');
      const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx;
      
      // Create document sections
      const sections = [];
      
      // Add title
      sections.push(
        new Paragraph({
          text: document.title,
          heading: HeadingLevel.TITLE,
          spacing: { after: 200 }
        })
      );
      
      // Add keywords if available
      if (document.keywords.length > 0) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Keywords: ',
                bold: true
              }),
              new TextRun(document.keywords.join(', '))
            ],
            spacing: { after: 200 }
          })
        );
      }
      
      // Add each document section
      document.sections.forEach(section => {
        // Add section title
        sections.push(
          new Paragraph({
            text: section.title,
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 120 }
          })
        );
        
        // Process content by removing markdown formatting
        const cleanContent = section.content
          .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
          .replace(/\*([^*]+)\*/g, '$1')     // Remove italic
          .replace(/`([^`]+)`/g, '$1')       // Remove code
          .replace(/_([^_]+)_/g, '$1');      // Remove underscore
        
        // Split content into paragraphs
        const paragraphs = cleanContent.split(/\n\n+/);
        
        // Add each paragraph
        paragraphs.forEach(para => {
          // Check if it's a list item
          if (para.trim().startsWith('- ') || para.trim().match(/^\d+\.\s/)) {
            // Convert to bullet point
            const listText = para.trim().replace(/^- |\d+\.\s/, '');
            sections.push(
              new Paragraph({
                text: '• ' + listText,
                indent: { left: 360 }, // ~0.25 inch indent
                spacing: { after: 80 }
              })
            );
          } else {
            // Regular paragraph
            sections.push(
              new Paragraph({
                text: para.trim(),
                spacing: { after: 120 }
              })
            );
          }
        });
      });
      
      // Create document with sections
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: sections
          }
        ]
      });
      
      // Generate the document buffer
      const buffer = await Packer.toBuffer(doc);
      
      // Create blob and download
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      
      if (typeof window !== 'undefined' && window.document) {
        const href = URL.createObjectURL(blob);
        
        const link = window.document.createElement('a');
        link.href = href;
        link.download = `${document.title.replace(/\s+/g, '-').toLowerCase()}.docx`;
        
        // Append to document, click, then remove
        window.document.body.appendChild(link);
        link.click();
        
        // Small timeout to ensure the download starts before removing
        setTimeout(() => {
          window.document.body.removeChild(link);
          URL.revokeObjectURL(href);
          setCopySuccess('Document downloaded');
          setTimeout(() => setCopySuccess(null), 2000);
        }, 100);
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      
      // Fallback to plain text if DOCX generation fails
      try {
        const markdown = generateMarkdown();
        const blob = new Blob([markdown], { type: 'text/plain' });
        
        if (typeof window !== 'undefined' && window.document) {
          const href = URL.createObjectURL(blob);
          
          const link = window.document.createElement('a');
          link.href = href;
          link.download = `${document.title.replace(/\s+/g, '-').toLowerCase()}.txt`;
          
          window.document.body.appendChild(link);
          link.click();
          
          setTimeout(() => {
            window.document.body.removeChild(link);
            URL.revokeObjectURL(href);
            setCopySuccess('Downloaded as text (DOCX failed)');
            setTimeout(() => setCopySuccess(null), 2000);
          }, 100);
        }
      } catch (fallbackError) {
        console.error('Fallback download failed:', fallbackError);
        setCopySuccess('Download failed. Try copying instead.');
        setTimeout(() => setCopySuccess(null), 2000);
      }
    }
  };
  
  // Enhance the copy functionality with better error handling and fallbacks
  const handleCopy = async () => {
    const markdown = generateMarkdown();
    
    try {
      // Primary clipboard method
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(markdown);
        setCopySuccess('Copied to clipboard!');
        setTimeout(() => setCopySuccess(null), 2000);
        return;
      }
      
      // Fallback for older browsers or when clipboard API is not available
      // Create a temporary textarea element
      const textArea = window.document.createElement('textarea');
      textArea.value = markdown;
      
      // Make it invisible but part of the document
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      textArea.style.pointerEvents = 'none';
      window.document.body.appendChild(textArea);
      
      // Select and copy text
      textArea.focus();
      textArea.select();
      
      try {
        // Execute copy command
        const successful = window.document.execCommand('copy');
        if (successful) {
          setCopySuccess('Copied to clipboard!');
        } else {
          setCopySuccess('Copy failed - try manually selecting text');
        }
      } catch (err) {
        console.error('Fallback copy method failed:', err);
        setCopySuccess('Copy failed - try manually selecting text');
      }
      
      // Clean up
      window.document.body.removeChild(textArea);
      
    } catch (err) {
      console.error('Error copying document:', err);
      setCopySuccess('Copy failed - please try again');
    }
    
    // Clear message after 2 seconds
    setTimeout(() => setCopySuccess(null), 2000);
  };
  
  // Handle title changes
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewTitle(e.target.value);
  };
  
  const handleTitleSubmit = () => {
    if (newTitle.trim()) {
      setDocument(prev => ({
        ...prev,
        title: newTitle.trim(),
        lastUpdated: new Date()
      }));
    }
    setEditingTitle(false);
  };
  
  // Prevent clicks inside document from propagating
  const handleDocumentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };
  
  // Render logic should now consider both internal and external state
  // If document is enabled via either method, and has sections, render it
  if ((!document.isEnabled && !externalEnabled) && !showPrompt) {
    return null;
  }
  
  // If showing the opt-in prompt
  if (showPrompt) {
    return (
      <div className="fixed bottom-32 left-0 right-0 z-20 px-4">
        <div 
          className={`relative w-full max-w-3xl mx-auto mb-4 rounded-xl overflow-hidden shadow-lg p-5 ${
            darkMode 
              ? 'bg-gray-800/95 backdrop-blur-sm border border-indigo-800/30' 
              : 'bg-white/95 backdrop-blur-sm border border-indigo-200'
          }`}
        >
          {/* Close button for prompt */}
          <button
            onClick={dismissPrompt}
            className={`absolute top-3 right-3 p-1.5 rounded-full z-10 ${
              darkMode 
                ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-200' 
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
            }`}
            title="Dismiss"
          >
            <FiX size={16} />
          </button>
          
          <div className="flex items-center space-x-3 mb-3">
            <div className="relative flex items-center justify-center h-7 w-7">
              <FiFileText size={18} className="absolute text-indigo-500 dark:text-indigo-400" />
              <svg className="h-full w-full text-indigo-500/20 dark:text-indigo-400/30" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Create Canvas Document
            </h3>
          </div>
          
          <p className={`text-sm mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Would you like to generate a document containing only your research results?
            This document will:
          </p>

          <ul className={`text-sm list-disc pl-5 mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            <li className="mb-1">Organize your research findings only</li>
            <li className="mb-1">Update automatically as research progresses</li>
            <li className="mb-1">Be available to download as a Word document (.docx)</li>
            <li>Help you save and share what you've learned</li>
          </ul>
          
          <div className="flex space-x-3">
            <button
              onClick={() => {
                toggleDocumentGeneration(true);
                setShowPrompt(false);
              }}
              className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Yes, create canvas
            </button>
            
            <button
              onClick={dismissPrompt}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                darkMode 
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              } transition-colors`}
            >
              No thanks
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // If no sections yet, don't render the document
  if (document.sections.length === 0) {
    return null;
  }

  // When document has content but is collapsed, show a small icon button
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={`inline-flex items-center justify-center gap-1.5 rounded-full pl-2 pr-3 py-1.5 text-xs font-medium transition-all shadow-sm hover:shadow ${
          darkMode 
            ? 'bg-indigo-600/20 text-indigo-200 hover:bg-indigo-600/30 border border-indigo-500/30' 
            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
        }`}
        title="Open research document"
      >
        <div className="relative flex items-center justify-center h-5 w-5">
          <FiFileText size={14} className="absolute text-indigo-400 dark:text-indigo-300" />
          <svg className="h-full w-full text-indigo-500/20 dark:text-indigo-400/30" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" />
          </svg>
        </div>
        <span className="whitespace-nowrap">Canvas</span>
      </button>
    );
  }

  // When expanded, show the full document
  return (
    <div 
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overscroll-none"
      onClick={() => setIsExpanded(false)}
    >
      <motion.div 
        ref={documentRef}
        className={`relative w-full max-w-2xl mx-auto rounded-xl overflow-hidden shadow-2xl ${
          darkMode 
            ? 'bg-gray-900 border border-gray-700' 
            : 'bg-white border border-gray-200'
        } max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Header with modern design */}
        <div 
          className={`flex items-center justify-between px-4 py-3 ${
            darkMode ? 'bg-gray-800/80' : 'bg-white'
          } backdrop-blur-sm border-b ${
            darkMode ? 'border-gray-700/70' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative flex items-center justify-center h-6 w-6">
              <FiFileText 
                size={16} 
                className="absolute text-indigo-500 dark:text-indigo-400" 
              />
              <svg className="h-full w-full text-indigo-500/20 dark:text-indigo-400/30" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            
            {editingTitle ? (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleTitleSubmit();
                }}
                onClick={handleDocumentClick}
                className="flex-1 min-w-0"
              >
                <input
                  ref={titleInputRef}
                  type="text"
                  value={newTitle}
                  onChange={handleTitleChange}
                  onBlur={handleTitleSubmit}
                  className={`w-full px-2 py-1.5 rounded-md border ${
                    darkMode 
                      ? 'bg-gray-700/70 border-gray-600 text-white' 
                      : 'bg-gray-50 border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm`}
                />
              </form>
            ) : (
              <div className="flex items-center gap-1 min-w-0 flex-1">
                <h3 className={`font-medium text-sm truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {document.title}
                </h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingTitle(true);
                  }}
                  className={`text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-full flex-shrink-0`}
                >
                  <FiEdit size={12} />
                </button>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 text-xs rounded-full bg-indigo-100/70 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
              <FiClock size={10} />
              <span>Auto-updating</span>
            </div>
            
            <div className="flex items-center gap-1">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy();
                }}
                className={`p-1.5 rounded-md ${
                  darkMode 
                    ? 'hover:bg-gray-700 text-gray-400 hover:text-indigo-300 hover:bg-indigo-900/20' 
                    : 'hover:bg-indigo-50 text-gray-500 hover:text-indigo-700'
                } transition-colors`}
                title="Copy document"
              >
                <FiCopy size={16} />
              </button>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload();
                }}
                className={`p-1.5 rounded-md ${
                  darkMode 
                    ? 'hover:bg-gray-700 text-gray-400 hover:text-indigo-300 hover:bg-indigo-900/20' 
                    : 'hover:bg-indigo-50 text-gray-500 hover:text-indigo-700'
                } transition-colors`}
                title="Download as DOCX"
              >
                <FiDownload size={16} />
              </button>
            </div>
            
            <button
              onClick={() => setIsExpanded(false)}
              className={`flex items-center justify-center p-1.5 rounded-md ${
                darkMode 
                  ? 'bg-gray-700/70 text-white hover:bg-gray-700' 
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              } transition-colors`}
              title="Collapse document"
            >
              <FiX size={16} />
            </button>
          </div>
        </div>
        
        {/* Document content - scrollable with isolation */}
        <div
          ref={contentRef}
          onClick={handleDocumentClick}
          onScroll={handleScroll}
          onTouchMove={handleTouchMove}
          onWheel={(e) => {
            const content = contentRef.current;
            if (!content) return;
            
            const { scrollTop, scrollHeight, clientHeight } = content;
            const isAtTop = scrollTop <= 0;
            const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
            
            // Prevent scroll propagation when at boundaries
            if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
              e.stopPropagation();
            }
          }}
          className={`p-5 overflow-y-auto flex-1 isolate overscroll-contain ${
            darkMode ? 'custom-scrollbar-dark bg-gray-900' : 'custom-scrollbar bg-gray-50/50'
          }`}
        >
          {/* Keywords section */}
          {document.keywords.length > 0 && (
            <div className="mb-5">
              <h4 className={`text-xs uppercase tracking-wider font-medium mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Keywords
              </h4>
              <div className="flex flex-wrap gap-2">
                {document.keywords.map((keyword, index) => (
                  <span 
                    key={index}
                    className={`text-xs px-3 py-1.5 rounded-full ${
                      darkMode 
                        ? 'bg-indigo-900/30 text-indigo-300 border border-indigo-800/50 hover:bg-indigo-900/40 transition-colors' 
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 transition-colors'
                    }`}
                  >
                    {keyword.replace(/[*_`]/g, '')}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Document sections */}
          <div className="space-y-6">
            {document.sections.map((section, index) => (
              <div 
                key={index} 
                className={`border-b last:border-b-0 pb-6 last:pb-0 ${
                  darkMode ? 'border-gray-800' : 'border-gray-200/70'
                }`}
              >
                <h3 className={`text-lg font-semibold mb-3 ${
                  darkMode ? 'text-indigo-300' : 'text-indigo-700'
                }`}>
                  {section.title.replace(/[*_`#]/g, '')}
                </h3>
                <div 
                  className={`prose prose-sm max-w-none ${
                    darkMode ? 'prose-invert prose-headings:text-indigo-300 prose-a:text-indigo-400' : 'prose-headings:text-indigo-700 prose-a:text-indigo-600'
                  }`}
                  dangerouslySetInnerHTML={{ 
                    __html: section.content
                      // Remove all markdown artifacts before processing
                      .replace(/\\(.)/g, '$1') // Remove escape characters
                      // Process formatting with improved capture groups and handling
                      .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>') // Bold and italic
                      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') // Bold
                      .replace(/\*([^*]+)\*/g, '<em>$1</em>') // Italic
                      .replace(/__([^_]+)__/g, '<strong>$1</strong>') // Bold (underscore)
                      .replace(/_([^_]+)_/g, '<em>$1</em>') // Italic (underscore)
                      // Format code inline with better styling
                      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 font-mono text-xs text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50">$1</code>')
                      // Format headings with proper spacing and styling
                      .replace(/^###\s+(.*?)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2 text-indigo-700 dark:text-indigo-300">$1</h3>')
                      .replace(/^##\s+(.*?)$/gm, '<h2 class="text-xl font-bold mt-5 mb-3 text-indigo-700 dark:text-indigo-300">$1</h2>')
                      .replace(/^#\s+(.*?)$/gm, '<h1 class="text-2xl font-bold mt-5 mb-3 text-indigo-700 dark:text-indigo-300">$1</h1>')
                      // Format lists with better styling and handling
                      .replace(/^- (.*?)$/gm, '<li class="ml-5 mb-1 flex items-start"><span class="inline-block w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400 mt-1.5 mr-2 flex-shrink-0"></span><span>$1</span></li>')
                      .replace(/^(\d+)\.\s+(.*?)$/gm, '<li class="ml-5 mb-1 flex items-start"><span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-xs font-medium text-indigo-700 dark:text-indigo-300 mr-2 flex-shrink-0">$1</span><span>$2</span></li>')
                      // Wrap lists in ul/ol tags - using multiple replacements instead of 's' flag
                      .replace(/(<li class="ml-5 mb-1 flex items-start"><span class="inline-block[^<]*<\/span><span>[^<]*<\/span><\/li>)(<li class="ml-5 mb-1 flex items-start"><span class="inline-block[^<]*<\/span><span>[^<]*<\/span><\/li>)*/g, '<ul class="my-3 space-y-1">$&</ul>')
                      .replace(/(<li class="ml-5 mb-1 flex items-start"><span class="inline-flex[^<]*<\/span><span>[^<]*<\/span><\/li>)(<li class="ml-5 mb-1 flex items-start"><span class="inline-flex[^<]*<\/span><span>[^<]*<\/span><\/li>)*/g, '<ol class="my-3 space-y-1">$&</ol>')
                      // Handle quotes with improved styling
                      .replace(/^>\s+(.*?)$/gm, '<blockquote class="pl-4 py-2 border-l-4 border-indigo-300 dark:border-indigo-700 my-3 italic text-gray-700 dark:text-gray-300 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-r">$1</blockquote>')
                      // Handle links with better formatting
                      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-indigo-600 dark:text-indigo-400 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
                      // Format paragraphs with better spacing and text color
                      .replace(/\n\n/g, '</p><p class="mb-3 text-gray-800 dark:text-gray-200 leading-relaxed">')
                      // Wrap everything in paragraph tags if not already wrapped
                      .replace(/^[\s\S]+?(?:<\/p>|$)/, '<p class="mb-3 text-gray-800 dark:text-gray-200 leading-relaxed">$&')
                  }}
                />
                <div className="mt-3 text-xs text-indigo-500 dark:text-indigo-400 flex items-center">
                  <FiClock size={10} className="mr-1" />
                  <span>Updated {timeAgo(section.lastUpdated)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Success message overlay */}
        <AnimatePresence>
          {copySuccess && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-indigo-600 text-white py-2 px-4 rounded-lg flex items-center shadow-lg"
            >
              <FiCheckCircle className="mr-2" />
              {copySuccess}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

// Helper function to format dates as relative time
function timeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
}

export default ProgressiveDocument; 