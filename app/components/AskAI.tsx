"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BiSend, BiMicrophone, BiPause, BiX, BiCopy, BiSearch, BiBook, BiUser, BiMenu, BiCog, BiLogOut, BiExpand, BiCollapse, BiSun, BiMoon, BiPencil, BiCollection, BiDownload, BiRefresh, BiChevronDown, BiChevronUp } from 'react-icons/bi';
import { GrConnect } from 'react-icons/gr';
import { HiOutlineSparkles } from 'react-icons/hi';
import { TbBook, TbBrandMixpanel, TbClipboardText, TbCpu, TbDashboard, TbFileSpreadsheet, TbMessageCircle } from 'react-icons/tb';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FiSend, 
  FiUser, 
  FiMessageSquare, 
  FiInfo, 
  FiHelpCircle, 
  FiPlusCircle, 
  FiHome, 
  FiChevronDown,
  FiChevronUp,
  FiCpu,
  FiMenu,
  FiX,
  FiSearch,
  FiStar,
  FiMoon,
  FiSun,
  FiMessageCircle,
  FiShield,
  FiAlertTriangle,
  FiClipboard,
  FiLink,
  FiBriefcase,
  FiChevronRight,
  FiChevronLeft,
  FiRefreshCw,
  FiSettings,
  FiStopCircle,
  FiTool, 
  FiFile,
  FiToggleLeft,
  FiToggleRight,
  FiTrash2,
  FiMoreHorizontal,
  FiPlus
} from 'react-icons/fi';
import { LuBrainCircuit, LuSquareLibrary, LuGraduationCap, LuVote } from "react-icons/lu";
import Image from 'next/image';
// Removed direct OpenAI imports for security - now using secure backend API
import { 
  generateResearchResponse, 
  ResearchResponse 
} from '../utils/deep-research-agent';
import { generateTopicCategories, TopicCategory, filterSelectedTopics } from '../utils/topic-generator';
import CompactArtifact from './artifacts/CompactArtifact';
import { Artifact } from './artifacts/types';
import { detectArtifacts } from '../utils/artifact-detector';
import './chat-animations.css';
import './animations.css';
import '../sidebar.css';
import './input-glow.css'; // Add this line for our new CSS
import './send-effects.css';
import ResearchOutput from './ResearchOutput';
import PageTransition from './PageTransition';
import TopicSelectionModal from './TopicSelectionModal';
import ProgressiveDocument from './ProgressiveDocument';
import axios from 'axios';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import FuturisticLoader from './FuturisticLoader';
import { supabase, getSupabase, getSupabaseAsync } from '../utils/supabaseClient';
import apiClient from '../utils/apiClient';

// Use the ResearchResponse type as DeepResearchResponse for all references
type DeepResearchResponse = ResearchResponse;

// Helper function to detect mobile devices
const isMobileDevice = () => {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
         (typeof window !== 'undefined' && window.innerWidth < 768);
};

// Extended message interface to support research mode and artifacts
export interface Message {
  text: string;
  isUser: boolean;
  id: number;
  type?: 'chat' | 'research';
  researchData?: DeepResearchResponse; // Use the imported type
  isTypingComplete?: boolean;
  artifacts?: Artifact[]; // New: artifacts detected in the message
}

// Article information for research view
interface ArticleInfo {
  title: string;
  content: string;
  url: string;
  imageUrl?: string;
}

// Fun, animated loading indicator
const LoadingDots = () => (
  <div className="flex items-center space-x-2">
    <motion.div 
      className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
      animate={{ 
        scale: [0.5, 1, 0.5],
        opacity: [0.3, 1, 0.3]
      }} 
      transition={{ 
        duration: 1.8, 
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
    <motion.div 
      className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
      animate={{ 
        scale: [0.5, 1, 0.5],
        opacity: [0.3, 1, 0.3]
      }} 
      transition={{ 
        duration: 1.8, 
        repeat: Infinity,
        ease: "easeInOut",
        delay: 0.3
      }}
    />
    <motion.div 
      className="w-3 h-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
      animate={{ 
        scale: [0.5, 1, 0.5],
        opacity: [0.3, 1, 0.3]
      }} 
      transition={{ 
        duration: 1.8, 
        repeat: Infinity,
        ease: "easeInOut",
        delay: 0.6
      }}
    />
  </div>
);

// Helper function to process markdown
const processMarkdown = (content: string) => {
  // Check if content starts with something that looks like JSON and try to parse it
  if (content.trim().startsWith('{') || content.trim().startsWith('[') || content.trim().startsWith('``json') || content.trim().startsWith('```json')) {
    try {
      // Extract JSON from markdown code blocks if present
      if (content.includes('```json')) {
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          // Parse the JSON and convert it to a readable format
          const jsonData = JSON.parse(jsonMatch[1].trim());
          return `<div class="prose prose-sm dark:prose-invert max-w-none">
                    ${content.replace(/```json\s*([\s\S]*?)\s*```/, 
                      `<div class="bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-auto my-2">
                        <pre class="text-sm font-mono">${JSON.stringify(jsonData, null, 2)}</pre>
                      </div>`
                    )}
                  </div>`;
        }
      }
      
      // Check for raw JSON without code blocks
      if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
        try {
          const jsonData = JSON.parse(content.trim());
          return `<div class="bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-auto my-2">
                    <pre class="text-sm font-mono">${JSON.stringify(jsonData, null, 2)}</pre>
                  </div>`;
        } catch (e) {
          // If JSON parsing fails, continue with regular markdown processing
          console.warn("Failed to parse potential JSON content:", e);
        }
      }
    } catch (e) {
      console.warn("Error handling JSON content:", e);
    }
  }

  // Replace markdown patterns with HTML
  
  // Handle bold: **text** or __text__
  content = content.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');
  
  // Handle italic: *text* or _text_
  content = content.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');
  
  // Handle links: [text](url)
  content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary-500 hover:underline">$1</a>');
  
  // Handle headings: ## Heading
  content = content.replace(/^##\s+(.*?)$/gm, '<h2 class="text-xl font-bold my-2">$1</h2>');
  content = content.replace(/^###\s+(.*?)$/gm, '<h3 class="text-lg font-bold my-2">$1</h3>');
  
  // Handle code blocks with language: ```language code ```
  content = content.replace(/```([a-z]*)\n([\s\S]*?)```/g, 
    '<div class="bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-auto my-2"><pre class="text-sm font-mono">$2</pre></div>');
  
  // Better list handling - convert consecutive list items to proper HTML lists
  // First, detect groups of consecutive list items
  let inList = false;
  const lines = content.split('\n');
  const processedLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isListItem = /^[\s]*[-*]\s+(.*)$/.test(line) || /^[\s]*\d+\.\s+(.*)$/.test(line);
    
    if (isListItem && !inList) {
      // Start of a new list
      processedLines.push('<ul class="list-disc pl-5 my-2">');
      inList = true;
    } else if (!isListItem && inList) {
      // End of a list
      processedLines.push('</ul>');
      inList = false;
    }
    
    if (isListItem) {
      // Process the list item, removing the marker
      const itemContent = line.replace(/^[\s]*[-*\d.]\s+/, '');
      processedLines.push(`<li>${itemContent}</li>`);
    } else {
      processedLines.push(line);
    }
  }
  
  // Close any open list
  if (inList) {
    processedLines.push('</ul>');
  }
  
  content = processedLines.join('\n');
  
  // Handle blockquotes: > text
  content = content.replace(/^>\s+(.*?)$/gm, '<blockquote class="pl-4 border-l-4 border-gray-300 text-gray-600 dark:text-gray-400 italic my-2">$1</blockquote>');
  
  // Handle code blocks: `code`
  content = content.replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded font-mono text-sm">$1</code>');
  
  // Handle horizontal rules: ---
  content = content.replace(/^---$/gm, '<hr class="my-4 border-t border-gray-300 dark:border-gray-700">');
  
  // Convert newlines to <br> (except within lists, which we've already processed)
  content = content.replace(/(?!<\/li>|<li>|<\/ul>|<ul[^>]*>)\n/g, '<br>');
  
  return content;
};

// Animated text typing effect
const TypewriterEffect = ({ text, onComplete }: { text: string, onComplete?: () => void }) => {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [highlightedWord, setHighlightedWord] = useState("");
  
  // Faster typing speed
  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        // Add multiple characters at once for faster typing
        const charsToAdd = Math.min(
          // Add 3-8 characters at a time for faster typing
          3 + Math.floor(Math.random() * 5), 
          // Don't go past the end of text
          text.length - currentIndex
        );
        
        const nextChars = text.substring(currentIndex, currentIndex + charsToAdd);
        setDisplayText(prev => prev + nextChars);
        
        // Set the last word as highlighted
        const words = (displayText + nextChars).split(' ');
        setHighlightedWord(words[words.length - 1]);
        
        setCurrentIndex(prev => prev + charsToAdd);
      }, 2 + Math.random() * 8); // Faster randomized typing speed (was 5 + Math.random() * 15)
      
      return () => clearTimeout(timeout);
    } else if (onComplete && !isComplete) {
      setIsComplete(true);
      setHighlightedWord("");
      onComplete();
    }
  }, [currentIndex, text, onComplete, isComplete, displayText]);
  
  // Reset effect when text changes
  useEffect(() => {
    setDisplayText("");
    setCurrentIndex(0);
    setIsComplete(false);
    setHighlightedWord("");
  }, [text]);
  
  // When typing is complete, return the full text with formatting
  if (currentIndex >= text.length) {
    return (
      <div 
        className="leading-relaxed prose prose-sm dark:prose-invert max-w-none" 
        dangerouslySetInnerHTML={{ __html: processMarkdown(text) }}
      />
    );
  }
  
  // Process text for rendering with highlighted last word
  const renderTextWithHighlight = () => {
    if (!highlightedWord || highlightedWord.trim() === '') {
      return processMarkdown(displayText);
    }
    
    // Split text to highlight the last word
    const processedText = processMarkdown(displayText);
    const lastIndex = processedText.lastIndexOf(highlightedWord);
    
    if (lastIndex === -1) {
      return processedText;
    }
    
    const beforeHighlight = processedText.substring(0, lastIndex);
    const afterHighlight = processedText.substring(lastIndex + highlightedWord.length);
    
    return `${beforeHighlight}<span class="text-highlight">${highlightedWord}</span>${afterHighlight}`;
  };
  
  return (
    <div className="leading-relaxed whitespace-pre-wrap">
      <span dangerouslySetInnerHTML={{ __html: renderTextWithHighlight() }} />
    </div>
  );
};

// Helper function to generate unique IDs
const generateUniqueId = () => {
  return Date.now() + Math.floor(Math.random() * 10000);
};

// Mode switcher component for switching between chat and research modes
const ModeSwitcher = ({ mode, setMode }: { mode: 'chat' | 'research', setMode: React.Dispatch<React.SetStateAction<'chat' | 'research'>> }) => {
  return (
    <div className="inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-1 shadow-inner">
      <button
        onClick={() => setMode('chat')}
        className={`flex items-center gap-1.5 sm:gap-2 rounded-full px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium transition-all ${
          mode === 'chat'
            ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
      >
        <FiMessageCircle size={14} className="hidden xs:block sm:hidden" />
        <FiMessageCircle size={16} className="xs:hidden sm:block" />
        <span className="whitespace-nowrap">Precise Chat</span>
      </button>
      
      <button
        onClick={() => setMode('research')}
        className={`flex items-center gap-1.5 sm:gap-2 rounded-full px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium transition-all ${
          mode === 'research'
            ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
      >
        <LuBrainCircuit size={14} className="hidden xs:block sm:hidden" />
        <LuBrainCircuit size={16} className="xs:hidden sm:block" />
        <span className="whitespace-nowrap">Targeted Research</span>
      </button>
    </div>
  );
};

const AskAI = ({ conversationId, overrideContent, hideInput = false, disableInitialLoader = false }: { conversationId?: string, overrideContent?: React.ReactNode, hideInput?: boolean, disableInitialLoader?: boolean }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      text: `<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 180px;" class="welcome-container">
        <h1 style="font-size: 1.5rem; font-weight: 600; text-align: center; font-family: 'Inter', sans-serif; margin-bottom: 0.5rem;" class="welcome-heading">What can I do for you?</h1>
        <div style="font-size: 0.875rem; text-align: center; font-family: 'Inter', sans-serif;" class="welcome-subtext">Ask me anything about Kenyan governance, elections, or civic education.</div>
      </div>`,
      isUser: false,
      id: generateUniqueId(),
      type: 'chat',
      isTypingComplete: true
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showTopics, setShowTopics] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showTypingEffect, setShowTypingEffect] = useState(true);
  const [mode, setMode] = useState<'chat' | 'research'>('chat');
  const [typingMessageId, setTypingMessageId] = useState<number | null>(null);
  const [showModeChangeAnimation, setShowModeChangeAnimation] = useState(false);
  const previousMode = useRef(mode);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [autoCollapseOnMouseLeave, setAutoCollapseOnMouseLeave] = useState(true);
  const [hasFirstUserMessage, setHasFirstUserMessage] = useState(false);
  const [topics, setTopics] = useState<TopicCategory[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [activeArticle, setActiveArticle] = useState<ArticleInfo | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [showTopicsDropdown, setShowTopicsDropdown] = useState(false); // New state for topics dropdown
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showLoader, setShowLoader] = useState(disableInitialLoader ? false : true);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  
  // Artifact state variables
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [showArtifactPanel, setShowArtifactPanel] = useState(false);
  const [isStreamingArtifact, setIsStreamingArtifact] = useState(false);
  const [streamingArtifactContent, setStreamingArtifactContent] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userFirstName, setUserFirstName] = useState<string | null>(null);
  const [userLastName, setUserLastName] = useState<string | null>(null);
  const [userInitials, setUserInitials] = useState<string>('KC');
  // Generate a conversation ID immediately for new chats to avoid race conditions
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(() => {
    // If we have a conversationId prop, use it (for existing conversations)
    if (conversationId) return conversationId;
    
    // For new conversations, generate a UUID immediately
    const newId = crypto.randomUUID();
    console.log('🆔 Pre-generated conversation ID for new chat:', newId);
    return newId;
  });
  
  // Function to reload conversation messages
  const reloadConversationMessages = useCallback(async () => {
    if (!currentConversationId) return;
    try {
      let token = (typeof window !== 'undefined') ? (window as any).supabaseToken || '' : '';
      if (!token) {
        try {
          const s = supabase || getSupabase();
          const { data } = await s.auth.getSession();
          token = data.session?.access_token || '';
        } catch {
          try {
            const s2 = await getSupabaseAsync();
            const { data } = await s2.auth.getSession();
            token = data.session?.access_token || '';
          } catch {}
        }
      }
      if (!token) return;
      
      const response = await apiClient.getConversationMessages(currentConversationId, { limit: 100, offset: 0 });
      if (!response.success) return;
      const items = Array.isArray(response.data) ? response.data : [];
      
      // Only update messages if we got data from the database
      if (items.length > 0) {
        const mapped: Message[] = items.map((m: any) => ({
          id: generateUniqueId(),
          text: String(m.text || ''),
          isUser: !!m.is_user,
          type: (m.type === 'research' ? 'research' : 'chat'),
          researchData: m.research_data || undefined,
          isTypingComplete: true,
        }));
        setMessages(mapped);
      }
      // Don't clear messages if we got empty data - keep current UI state
    } catch (error) {
      console.error('Error reloading conversation messages:', error);
    }
  }, [currentConversationId]);
  const [recentConversations, setRecentConversations] = useState<Array<{ id: string; title: string; updated_at: string }>>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Add separate state variables for sidebar and welcome screen topics
  const [expandedSidebarTopic, setExpandedSidebarTopic] = useState<string | null>(null);
  const [expandedWelcomeTopic, setExpandedWelcomeTopic] = useState<string | null>(null);
  
  // Add state for tools menu in the AskAI component
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [docGenEnabled, setDocGenEnabled] = useState(false);
  
  // Load AI-generated topics on initial render
  useEffect(() => {
    const loadTopics = async () => {
      setIsLoadingTopics(true);
      try {
        // Generate AI topics first
        const aiTopics = await generateTopicCategories(10);
        
        // Try to load saved topic preferences
        try {
        const savedTopics = localStorage.getItem('selectedTopics');
        if (savedTopics) {
            const parsedIds = JSON.parse(savedTopics);
            // Only set selection IDs if the array is valid and not empty
            if (Array.isArray(parsedIds) && parsedIds.length > 0) {
              setSelectedTopicIds(parsedIds);
            } else {
              // If empty or invalid, mark all topics as selected by default
              setSelectedTopicIds(aiTopics.map(topic => topic.id));
              // Save this selection to localStorage
              localStorage.setItem('selectedTopics', JSON.stringify(aiTopics.map(topic => topic.id)));
            }
          } else {
            // If no saved selections, mark all topics as selected by default
            setSelectedTopicIds(aiTopics.map(topic => topic.id));
            // Save this selection to localStorage
            localStorage.setItem('selectedTopics', JSON.stringify(aiTopics.map(topic => topic.id)));
          }
          } catch (e) {
          console.error('Error with saved topics, selecting all by default:', e);
          // On error, select all topics by default
          setSelectedTopicIds(aiTopics.map(topic => topic.id));
          // Try to save this selection to localStorage
          try {
            localStorage.setItem('selectedTopics', JSON.stringify(aiTopics.map(topic => topic.id)));
          } catch (storageError) {
            console.error('Could not save to localStorage:', storageError);
          }
        }
        
        // Set topics regardless of localStorage status
        setTopics(aiTopics);
      } catch (error) {
        console.error('Error loading AI topics:', error);
        // If there's an error, load fallback topics and select all of them
        try {
          const fallbackTopics = await generateTopicCategories(10); // This will return fallbacks on error
          setTopics(fallbackTopics);
          setSelectedTopicIds(fallbackTopics.map(topic => topic.id));
          // Save this selection to localStorage
          localStorage.setItem('selectedTopics', JSON.stringify(fallbackTopics.map(topic => topic.id)));
        } catch (fallbackError) {
          console.error('Critical error loading any topics:', fallbackError);
        }
      } finally {
        setIsLoadingTopics(false);
      }
    };
    
    loadTopics();
  }, []);
  
  // Ensure topics are immediately visible by forcing re-computation of filteredTopics
  const [forceUpdate, setForceUpdate] = useState(0);
  
  useEffect(() => {
    // After topics are loaded or selectedTopicIds changes, trigger a re-render
    if (topics.length > 0) {
      // Delay slightly to ensure state updates have processed
      const timer = setTimeout(() => {
        setForceUpdate(prev => prev + 1);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [topics, selectedTopicIds]);

  // Load messages if a conversationId is provided
  useEffect(() => {
    (async () => {
      if (!currentConversationId) return;
      try {
        let token = (typeof window !== 'undefined') ? (window as any).supabaseToken || '' : '';
        if (!token) {
          try {
            const s = supabase || getSupabase();
            const { data } = await s.auth.getSession();
            token = data.session?.access_token || '';
          } catch {
            try {
              const s2 = await getSupabaseAsync();
              const { data } = await s2.auth.getSession();
              token = data.session?.access_token || '';
            } catch {}
          }
        }
        if (!token) return;
        // Use centralized API client
        const response = await apiClient.getConversationMessages(currentConversationId, { limit: 100, offset: 0 });
        if (!response.success) return;
        const items = Array.isArray(response.data) ? response.data : [];
        const mapped: Message[] = items.map((m: any) => ({
          id: generateUniqueId(),
          text: String(m.text || ''),
          isUser: !!m.is_user,
          type: (m.type === 'research' ? 'research' : 'chat'),
          researchData: m.research_data || undefined,
          isTypingComplete: true,
        }));
        setMessages(mapped.length ? mapped : []);
        setHasFirstUserMessage(mapped.some((m) => m.isUser));
        // collapse sidebar for reading larger history on load
        if (mapped.length > 0) setIsSidebarCollapsed(true);
      } catch {}
    })();
  }, [currentConversationId]);

  // Load recent conversations list for sidebar
  useEffect(() => {
    (async () => {
      try {
        let token = (typeof window !== 'undefined') ? (window as any).supabaseToken || '' : '';
        if (!token) {
          try {
            const s = supabase || getSupabase();
            const { data } = await s.auth.getSession();
            token = data.session?.access_token || '';
          } catch {
            try {
              const s2 = await getSupabaseAsync();
              const { data } = await s2.auth.getSession();
              token = data.session?.access_token || '';
            } catch {}
          }
        }
        if (!token) return;
        // Use centralized API client
        const response = await apiClient.getConversations({ limit: 20, offset: 0 });
        console.log('🗨️ Conversations API response:', response);
        if (!response.success) {
          console.warn('❌ Failed to load conversations:', response.error);
          return;
        }
        const list = Array.isArray(response.data) ? response.data : [];
        console.log('✅ Loaded conversations:', list.length, 'items');
        setRecentConversations(list);
      } catch {}
    })();
  }, [hasFirstUserMessage, currentConversationId]);
  
  // Function to refresh topics with new AI-generated ones
  const refreshTopics = async () => {
    setIsLoadingTopics(true);
    try {
      const aiTopics = await generateTopicCategories();
      setTopics(aiTopics);
      
      // Auto-select all newly generated topics
      const newTopicIds = aiTopics.map(topic => topic.id);
      setSelectedTopicIds(newTopicIds);
      
      // Save the new selection to localStorage
      localStorage.setItem('selectedTopics', JSON.stringify(newTopicIds));
      
      // Reset active category
      setActiveCategory(null);
    } catch (error) {
      console.error('Error refreshing AI topics:', error);
      
      // If refresh fails, try to get fallback topics and select all
      try {
        const fallbackTopics = await generateTopicCategories(10); // This returns fallbacks on error
        setTopics(fallbackTopics);
        
        // Select all fallback topics
        const fallbackIds = fallbackTopics.map(topic => topic.id);
        setSelectedTopicIds(fallbackIds);
        
        // Save fallbacks to localStorage
        localStorage.setItem('selectedTopics', JSON.stringify(fallbackIds));
      } catch (fallbackError) {
        console.error('Critical error loading fallback topics:', fallbackError);
      }
    } finally {
      setIsLoadingTopics(false);
    }
  };
  
  // Auto-scroll to the bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-focus the input field only on non-mobile devices
  useEffect(() => {
    // Only focus on desktop devices
    if (!isMobileDevice() && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);
  
  // Apply dark mode class to document body
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Track mode changes
  useEffect(() => {
    // Store previous mode for reference
    previousMode.current = mode;
    
    // Update document title to reflect current mode
    document.title = `Kiongozi Platform`;
    
    // No transitions or animations between modes - just state changes
  }, [mode]);

  // Function to stop AI generation
  const stopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsGenerating(false);
      setIsLoading(false);
      
      // Add a message indicating generation was stopped
      setMessages(prev => [...prev, {
        text: "Generation stopped by user.",
        isUser: false,
        id: generateUniqueId(),
        type: 'chat',
        isTypingComplete: true
      }]);
    }
  };


  // Handle live artifact streaming
  const handleStartArtifactStreaming = (artifact: Artifact) => {
    setSelectedArtifact(artifact);
    setShowArtifactPanel(true);
    setIsStreamingArtifact(true);
    setStreamingArtifactContent('');
  };

  // Update streaming content in real-time
  const handleUpdateStreamingContent = (content: string) => {
    setStreamingArtifactContent(content);
  };

  // Complete streaming
  const handleCompleteStreaming = () => {
    setIsStreamingArtifact(false);
  };

  // Handle updating artifact
  const handleUpdateArtifact = (updatedArtifact: Artifact) => {
    // Update the artifact in the messages
    setMessages(prev => prev.map(message => ({
      ...message,
      artifacts: message.artifacts?.map(artifact => 
        artifact.id === updatedArtifact.id ? updatedArtifact : artifact
      )
    })));
    setSelectedArtifact(updatedArtifact);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    
    const userMessage: Message = {
      text: input.trim(),
      isUser: true,
      id: generateUniqueId(),
      type: mode,
      isTypingComplete: true
    };
    
    // First, add the user message to UI immediately
    setMessages(prev => {
      if (!hasFirstUserMessage) setHasFirstUserMessage(true);
      // Auto-collapse topics after first user message to give room to history
      if (!isSidebarCollapsed) setIsSidebarCollapsed(true);
      return [...prev, userMessage]
    });
    setInput('');
    setIsLoading(true);
    setIsGenerating(true);

    // Send user message to API (we already have the conversation ID)
    try {
      const token = (window as any)?.supabaseToken;
      if (token && currentConversationId) {
        console.log('📤 Sending user message to API...', { conversationId: currentConversationId });
        // Use centralized API client with pre-generated conversation ID
        const response = await apiClient.sendMessage(userMessage.text, currentConversationId);
        if (!response.success) {
          console.error('❌ Failed to send user message:', response.error);
        }
      } else {
        console.warn('⚠️ Cannot send user message - missing token or conversation ID');
      }
    } catch (error) {
      console.error('❌ Error sending user message:', error);
    }

    try {
      // Create a new AbortController for this request
      const controller = new AbortController();
      setAbortController(controller);
      

      
      if (mode === 'chat') {
        try {
          const messageId = generateUniqueId();
          let streamingContent = '';
          let detectedArtifacts: Artifact[] = [];
          let currentStreamingArtifact: Artifact | null = null;
          
          // Create initial empty message for streaming
          const aiMessage: Message = {
            text: '',
            isUser: false,
            id: messageId,
            type: 'chat',
            isTypingComplete: false,
            artifacts: []
          };
          
          setMessages(prev => [...prev, aiMessage]);
          setTypingMessageId(messageId);
          
          // Get the AI response via secure backend API
          const apiResponse = await apiClient.generateAIResponse(
            userMessage.text,
            currentConversationId,
            'chat'
          );

          if (!apiResponse.success) {
            throw new Error(apiResponse.error || 'Failed to generate AI response');
          }

          const aiResponse = (apiResponse.data as any)?.response || 'Sorry, I could not generate a response.';
          
          // Complete streaming
          handleCompleteStreaming();
          
          // Final artifact detection
          const finalArtifactDetection = detectArtifacts(aiResponse, messageId.toString(), input);
          
          // Update the final message with complete content and artifacts
          let finalArtifacts: Artifact[] = [];
          if (finalArtifactDetection.shouldCreateArtifact) {
            finalArtifacts = [{
              id: `${messageId}-artifact-final`,
              type: finalArtifactDetection.type,
              title: finalArtifactDetection.title,
              content: aiResponse,
              description: finalArtifactDetection.description,
              createdAt: new Date(),
              updatedAt: new Date(),
              version: 1
            }];
          }
          
          setMessages(prev => prev.map(msg =>
            msg.id === messageId
              ? {
                  ...msg,
                  text: aiResponse,
                  isTypingComplete: !showTypingEffect, // Enable typing effect if showTypingEffect is true
                  artifacts: finalArtifacts
                }
              : msg
          ));

          // Only clear typing message ID if typing effect is disabled
          if (!showTypingEffect) {
            setTypingMessageId(null);
          }

          // Backend auto-saves the AI response, so reload to show updated messages
          if (currentConversationId) {
            try {
              console.log('🔄 Reloading conversation messages...');
              await reloadConversationMessages();
            } catch (error) {
              console.error('❌ Error reloading conversation messages:', error);
            }
          }
        } catch (error) {
          if (!(error instanceof DOMException && error.name === 'AbortError')) {
            console.error('❌ Error in chat mode:', error);
            // Add error message
            setMessages(prev => [...prev, {
              text: "I'm sorry, I'm having trouble generating a response. Please try again in a moment.",
              isUser: false,
              id: generateUniqueId(),
              type: 'chat',
              isTypingComplete: true
            }]);
          }
        }
      } else {
        // Deep research mode
        try {
          const researchData = await generateResearchResponse(userMessage.text, controller.signal);
          
          // Add the research response
          const researchMessage: Message = {
            text: researchData.summary,
            isUser: false,
            id: generateUniqueId(),
            type: 'research',
            researchData: researchData,
            isTypingComplete: !showTypingEffect
          };
          
          setMessages(prev => [...prev, researchMessage]);
          if (showTypingEffect) {
            setTypingMessageId(researchMessage.id);
          }

          // Persist assistant research message to DB
          // Research mode still uses client-side processing, manual save needed
          try {
            let token = (typeof window !== 'undefined') ? (window as any).supabaseToken || '' : '';
            if (!token) {
              try {
                const s = supabase || getSupabase();
                const { data } = await s.auth.getSession();
                token = data.session?.access_token || '';
              } catch {
                try {
                  const s2 = await getSupabaseAsync();
                  const { data } = await s2.auth.getSession();
                  token = data.session?.access_token || '';
                } catch {}
              }
            }
            if (token && currentConversationId) {
              console.log('💾 Saving research response to database...', { conversation_id: currentConversationId, summaryLength: researchData.summary.length });
              // Use centralized API client
              const response = await apiClient.saveAssistantMessage(researchData.summary, currentConversationId, 'research', researchData);
              if (response.success) {
                console.log('✅ Research response saved successfully');
                // Reload conversation to show updated messages
                await reloadConversationMessages();
              } else {
                console.error('❌ Failed to save research response:', response.error, response.details);
              }
            } else {
              console.warn('⚠️  Cannot save research response - missing token or conversation ID', { hasToken: !!token, conversationId: currentConversationId });
            }
          } catch (error) {
            console.error('❌ Error saving research response:', error);
          }
        } catch (error) {
          if (!(error instanceof DOMException && error.name === 'AbortError')) {
            console.error('Error in research mode:', error);
            // Add error message
            setMessages(prev => [...prev, {
              text: "I'm sorry, I'm having trouble generating a research response. Please try again with a more specific query.",
              isUser: false,
              id: generateUniqueId(),
              type: 'chat',
              isTypingComplete: true
            }]);
          }
        }
      }
    } catch (error) {
      // Only show error if it's not an abort error
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        console.error('Error handling submission:', error);
        
        // Add error message
        setMessages(prev => [...prev, {
          text: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
          isUser: false,
          id: generateUniqueId(),
          type: 'chat',
          isTypingComplete: true
        }]);
      }
    } finally {
      setAbortController(null);
      setIsLoading(false);
      setIsGenerating(false);
    }
  };

  const handleTypingComplete = (messageId: number) => {
    setMessages(prev => 
      prev.map(message => 
        message.id === messageId 
          ? { ...message, isTypingComplete: true } 
          : message
      )
    );
    setTypingMessageId(null);
  };

  const handleQuestionClick = (question: string) => {
    setInput(question);
    
    // Only focus on desktop devices
    if (!isMobileDevice() && inputRef.current) {
      inputRef.current.focus();
    }
    
    // Add fun animation to the input field
    if (inputRef.current) {
      inputRef.current.classList.add('highlight-input');
      setTimeout(() => {
        inputRef.current?.classList.remove('highlight-input');
      }, 700);
    }
  };

  const startNewChat = () => {
    // Client-side conversation history no longer needed - backend manages context
    
    // Add a fade out animation to the messages
    if (chatContainerRef.current) {
      chatContainerRef.current.classList.add('fade-out');
      setTimeout(() => {
        setMessages([
          {
            text: "Hello! 👋 Welcome to Kiongozi Platform. I'm your AI assistant ready to help with questions about Kenyan governance, elections, and civic education. What would you like to learn about today?",
            isUser: false,
            id: generateUniqueId(),
            type: 'chat',
            isTypingComplete: true
          }
        ]);
        chatContainerRef.current?.classList.remove('fade-out');
      }, 300);
    } else {
      setMessages([
        {
          text: "Hello! 👋 Welcome to Kiongozi Platform. I'm your AI assistant ready to help with questions about Kenyan governance, elections, and civic education. What would you like to learn about today?",
          isUser: false,
          id: generateUniqueId(),
          type: 'chat',
          isTypingComplete: true
        }
      ]);
    }
    
    // Reset expanded topics when starting a new chat
    setExpandedSidebarTopic(null);
    setExpandedWelcomeTopic(null);
  };
  
  // Add clear chat functionality - keeps the existing conversation but clears messages
  const clearChat = () => {
    // Don't clear conversation history on the server - just clear the UI
    if (chatContainerRef.current) {
      chatContainerRef.current.classList.add('fade-out');
      setTimeout(() => {
        setMessages([
          {
            text: "Chat cleared. What would you like to talk about now?",
            isUser: false,
            id: generateUniqueId(),
            type: 'chat',
            isTypingComplete: true
          }
        ]);
        chatContainerRef.current?.classList.remove('fade-out');
      }, 300);
    } else {
      setMessages([
        {
          text: "Chat cleared. What would you like to talk about now?",
          isUser: false,
          id: generateUniqueId(),
          type: 'chat',
          isTypingComplete: true
        }
      ]);
    }
  };
  
  const toggleCategory = (categoryId: string) => {
    if (activeCategory === categoryId) {
      setActiveCategory(null);
    } else {
      setActiveCategory(categoryId);
    }
  };

  // Toggle dark mode with a smooth transition
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Handle textarea height adjustment and Enter key to submit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    
    // Auto-adjust height
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
  };

  // Effect for creating sparkles on mode change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Create sparkle effect on mode change
    const createSparkles = () => {
      const container = document.querySelector('.mode-container');
      if (!container) return;
      
      // Get container dimensions
      const rect = container.getBoundingClientRect();
      
      // Create 10 sparkles
      for (let i = 0; i < 10; i++) {
        const sparkle = document.createElement('div');
        sparkle.classList.add('sparkle');
        
        // Random position within container
        const x = Math.random() * rect.width;
        const y = Math.random() * rect.height;
        
        // Random size and delay
        const size = 3 + Math.random() * 5;
        const delay = Math.random() * 1;
        
        // Apply styles
        sparkle.style.width = `${size}px`;
        sparkle.style.height = `${size}px`;
        sparkle.style.left = `${x}px`;
        sparkle.style.top = `${y}px`;
        sparkle.style.animationDelay = `${delay}s`;
        
        // Random color
        const colors = ['#fff', '#ffe066', '#ffcc33', '#f9fafb'];
        sparkle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        
        // Add to container
        container.appendChild(sparkle);
        
        // Remove after animation
        setTimeout(() => {
          if (sparkle.parentNode) {
            sparkle.parentNode.removeChild(sparkle);
          }
        }, 1000);
      }
    };
    
    // Call on mount and when mode changes
    createSparkles();
    
    return () => {
      // Cleanup sparkles on unmount
      const sparkles = document.querySelectorAll('.sparkle');
      sparkles.forEach(sparkle => {
        if (sparkle.parentNode) {
          sparkle.parentNode.removeChild(sparkle);
        }
      });
    };
  }, [mode]);

  // Effect to show animation on mode change
  useEffect(() => {
    if (previousMode.current !== mode) {
      setShowModeChangeAnimation(true);
      
      // Hide animation after it plays
      const timer = setTimeout(() => {
        setShowModeChangeAnimation(false);
      }, 1000);
      
      previousMode.current = mode;
      return () => clearTimeout(timer);
    }
  }, [mode]);

  // Add a useEffect to handle responsive placeholder text based on screen size
  useEffect(() => {
    // Function to handle window resize for responsive elements
    const handleResize = () => {
      // This will force a re-render to update placeholder text
      setInput(input);
    };

    // Add event listener for window resize
    window.addEventListener('resize', handleResize);
    
    // Clean up the event listener
    return () => window.removeEventListener('resize', handleResize);
  }, [input]);

  // Toggle sidebar collapsed state
  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
    // When sidebar is toggled, reset the collapsed state
    setIsSidebarCollapsed(false);
  };

  // Function to handle topic clicks in research mode
  const handleTopicClick = (topic: string) => {
    // Set the clicked topic as the input value
    setInput(topic);
    
    // Only focus the input field on desktop devices
    if (!isMobileDevice() && inputRef.current) {
      inputRef.current.focus();
    }
    
    // Add fun animation to the input field
    if (inputRef.current) {
      inputRef.current.classList.add('highlight-input');
      setTimeout(() => {
        inputRef.current?.classList.remove('highlight-input');
      }, 700);
    }
  };

  // Save selected topics
  const saveTopicSelection = (selectedIds: string[]) => {
    // Ensure at least one topic is selected - if empty, select them all
    if (selectedIds.length === 0) {
      const allTopicIds = topics.map(topic => topic.id);
      setSelectedTopicIds(allTopicIds);
      
      // Save to localStorage for persistence
      try {
        localStorage.setItem('selectedTopics', JSON.stringify(allTopicIds));
      } catch (error) {
        console.error('Error saving topic preferences:', error);
      }
    } else {
    setSelectedTopicIds(selectedIds);
    
    // Save to localStorage for persistence
    try {
      localStorage.setItem('selectedTopics', JSON.stringify(selectedIds));
    } catch (error) {
      console.error('Error saving topic preferences:', error);
      }
    }
  };
  
  // Get filtered topics based on user selection
  const getFilteredTopics = useCallback(() => {
    return filterSelectedTopics(topics, selectedTopicIds);
  }, [topics, selectedTopicIds, forceUpdate]);
  
  const filteredTopics = getFilteredTopics();

  // New function to toggle sidebar expanded topic
  const toggleExpandTopic = (topicId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (expandedSidebarTopic === topicId) {
      setExpandedSidebarTopic(null);
    } else {
      setExpandedSidebarTopic(topicId);
    }
  };

  // Add function to toggle document generation
  const toggleDocGeneration = () => {
    setDocGenEnabled(!docGenEnabled);
    // Store preference in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('document-generation-enabled', (!docGenEnabled).toString());
    }
  };

  // Add effect to load saved preferences
  useEffect(() => {
    // Load document generation preference
    if (typeof window !== 'undefined') {
      const savedPref = localStorage.getItem('document-generation-enabled');
      if (savedPref === 'true') {
        setDocGenEnabled(true);
      }
    }
  }, []);

  // Load Supabase user (if configured) to show profile avatar
  useEffect(() => {
    (async () => {
      try {
        if (!supabase) return;
        const { data } = await supabase.auth.getUser();
        const email = data.user?.email ?? null;
        const userId = data.user?.id ?? null;
        setUserEmail(email);
        
        if (userId) {
          // Fetch profile data from profiles table
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', userId)
            .single();
            
          if (profile) {
            setUserFirstName(profile.first_name);
            setUserLastName(profile.last_name);
            if (profile.email) setUserEmail(profile.email);
            
            // Create initials from names if available, otherwise from email
            let initials = 'KC';
            if (profile.first_name && profile.last_name) {
              initials = (profile.first_name[0] + profile.last_name[0]).toUpperCase();
            } else if (profile.first_name) {
              initials = profile.first_name.slice(0, 2).toUpperCase();
            } else if (email) {
          const namePart = email.split('@')[0] || 'kc';
              initials = namePart
            .split(/[._-]/)
            .filter(Boolean)
            .slice(0, 2)
            .map(s => s[0]?.toUpperCase() || '')
            .join('') || 'KC';
            }
          setUserInitials(initials);
          }
        }
      } catch {}
    })();
  }, []);

  const handleSignIn = async () => {
    try {
      if (!supabase) return;
      await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    } catch {}
  };

  const handleSignOut = async () => {
    try {
      if (!supabase) return;
      await supabase.auth.signOut();
      setUserEmail(null);
      setUserFirstName(null);
      setUserLastName(null);
      setUserInitials('KC');
      (window as any).supabaseToken = '';
      setProfileMenuOpen(false);
    } catch {}
  };

  // Add effect to close tools menu when clicking outside
  useEffect(() => {
    if (!showToolsMenu) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // Check if the click is outside the tools menu
      if (!target.closest('.tools-menu') && !target.closest('.tools-button')) {
        setShowToolsMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showToolsMenu]);

  useEffect(() => {
    if (disableInitialLoader) {
      setShowLoader(false);
      return;
    }
    if (!isLoadingTopics) {
      const timer = setTimeout(() => setShowLoader(false), 900);
      return () => clearTimeout(timer);
    }
  }, [isLoadingTopics, disableInitialLoader]);

  return (
    <>
      {showLoader && <FuturisticLoader />}
    <div className={`min-h-screen ${darkMode ? 'dark' : ''} flex flex-col`} suppressHydrationWarning>
      {/* Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <>
          <motion.div 
              className={`group flex flex-col ${isSidebarCollapsed ? 'w-[60px] sidebar-collapsed' : 'w-[280px]'} ${
              darkMode 
                ? 'bg-gradient-to-b from-gray-900 to-gray-950 text-white border-r border-gray-800' 
                : 'bg-gradient-to-b from-gray-100 to-gray-200 text-gray-800 border-r border-gray-300'
              } h-full fixed left-0 top-0 bottom-0 z-40 transition-all duration-300`}
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ ease: "easeInOut", duration: 0.3 }}
            onMouseEnter={() => { if (isSidebarCollapsed) setIsSidebarCollapsed(false); }}
            onMouseLeave={() => { if (autoCollapseOnMouseLeave) setIsSidebarCollapsed(true); }}
          >
            {/* Logo and title in sidebar */}
            <div className={`p-3 border-b ${darkMode ? 'border-gray-800' : 'border-gray-300'} flex items-center ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'flex-col' : ''}`}>
                  <div className={`${isSidebarCollapsed ? 'w-10 h-10' : 'w-8 h-8'} rounded-full overflow-hidden transition-all duration-300 flex items-center justify-center`}>
                    <Image 
                      src="/images/ai-head-icon.svg"
                      alt="Kiongozi AI"
                      width={isSidebarCollapsed ? 40 : 32}
                      height={isSidebarCollapsed ? 40 : 32}
                      className="w-full h-full object-cover"
                    />
                </div>
                {!isSidebarCollapsed && (
                  <span className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Kiongozi<span className="text-primary-400">Platform</span>
                  </span>
                )}
                </div>
              {/* theme toggle in header when expanded; moved to collapsed rail when collapsed */}
              {!isSidebarCollapsed && (
                <div className="flex items-center ml-auto">
                <button 
                  onClick={toggleDarkMode}
                  className={`p-2 rounded-lg ${
                    darkMode 
                      ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      } transition-colors`}
                >
                    {darkMode ? <FiSun /> : <FiMoon />}
                </button>
              </div>
              )}
            </div>
            
              {/* Rest of sidebar content ... */}
            {/* Sidebar navigation items */}
            <div className="p-2 pt-4">
              <div className="flex flex-col space-y-4">
                {/* New chat item */}
                <div>
              <motion.button 
                    className={`flex items-center gap-3 w-full ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'} transition-colors duration-200`}
                onClick={startNewChat}
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.98 }}
              >
                    <FiMessageSquare size={18} />
                    {!isSidebarCollapsed && <span className="text-sm font-medium">New chat</span>}
              </motion.button>
                </div>
              
                {/* Clear Chat item */}
                <div>
              <motion.button 
                    className={`flex items-center gap-3 w-full ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'} transition-colors duration-200`}
                onClick={clearChat}
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.98 }}
              >
                    <FiTrash2 size={18} />
                    {!isSidebarCollapsed && <span className="text-sm font-medium">Clear chat</span>}
              </motion.button>
                </div>
              
                {/* Edit Topics item */}
                <div>
              <motion.button 
                    className={`flex items-center gap-3 w-full ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'} transition-colors duration-200`}
                    onClick={() => setShowTopicsDropdown(prev => !prev)}
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.98 }}
              >
                    <FiSettings size={18} />
                    {!isSidebarCollapsed && <span className="text-sm font-medium">Topics</span>}
              </motion.button>
                </div>

                {/* Chats link */}
                <div>
                  <motion.a
                    href="/chats"
                    className={`flex items-center gap-3 w-full ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'} transition-colors duration-200`}
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <LuSquareLibrary size={18} />
                    {!isSidebarCollapsed && <span className="text-sm font-medium">Chats</span>}
                  </motion.a>
                </div>

                {/* Recent conversations */}
                {!isSidebarCollapsed && recentConversations.length > 0 && (
                  <div>
                    <div className={`text-xs uppercase ${darkMode ? 'text-gray-500' : 'text-gray-500'} mb-2`}>Recent</div>
                    <div className="space-y-1.5">
                      {recentConversations.slice(0, 10).map((c) => (
                        <Link key={c.id} href={`/chats/${c.id}`} className={`${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'} block truncate px-2 py-1 rounded-md hover:bg-gray-200/40 dark:hover:bg-gray-800/60`}>
                          {c.title || 'Untitled conversation'}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {showTopicsDropdown && (
              <div
                className={`${darkMode ? 'bg-gray-900/90 border-gray-800' : 'bg-white/95 border-gray-200'} mt-2 mx-3 p-3 rounded-xl border shadow-lg z-40`}
                style={{ backdropFilter: 'blur(6px)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className={`${darkMode ? 'text-gray-200' : 'text-gray-800'} text-sm font-semibold`}>Suggested topics</h4>
                  <button
                    onClick={() => setShowTopicsDropdown(false)}
                    className={`${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-800'}`}
                  >
                    ✕
                  </button>
                </div>
                {isSidebarCollapsed ? (
                  <div className="grid grid-cols-3 gap-2">
                    {filteredTopics.slice(0, 9).map((topic, idx) => (
                      <button
                        key={idx}
                        className={`${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'} p-2 rounded-lg flex items-center justify-center transition-colors`}
                        title={topic.title}
                        onClick={() => {
                          setInput((topic as any).questions?.[0] || `Tell me about ${topic.title}`);
                          setShowTopicsDropdown(false);
                        }}
                      >
                        <span className="text-xl" aria-label={topic.title}>{topic.emoji}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                    {filteredTopics.slice(0, 20).map((topic, idx) => (
                      <button
                        key={idx}
                        className={`${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-100' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'} w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2`}
                        onClick={() => {
                          setInput((topic as any).questions?.[0] || `Tell me about ${topic.title}`);
                          setShowTopicsDropdown(false);
                        }}
                      >
                        <span className="text-lg" aria-hidden>{topic.emoji}</span>
                        <span className="text-sm font-medium">{topic.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Topics section */}
            <div className={`hidden flex-grow overflow-y-auto px-3 py-2 ${isSidebarCollapsed ? 'scrollbar-none space-y-4' : 'sidebar-scrollbar'}`}>
              {!isSidebarCollapsed && (
              <div className="flex items-center justify-between mb-3">
                  <h3 className={`${
                      darkMode 
                      ? 'text-gray-400' 
                      : 'text-gray-600'
                  } text-xs font-medium uppercase`}>
                    Suggested Topics
                  </h3>
                  <motion.button
                    onClick={refreshTopics}
                    className={`${
                      darkMode 
                        ? 'text-gray-400 hover:text-gray-300' 
                        : 'text-gray-600 hover:text-gray-800'
                    } p-1 rounded-lg`}
                    whileTap={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                    disabled={isLoadingTopics}
                    data-tooltip="Refresh topics"
                  >
                    <FiRefreshCw size={14} className={isLoadingTopics ? "animate-spin" : ""} />
                  </motion.button>
                </div>
              )}
              
              {isLoadingTopics ? (
                // Loading skeleton
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((_, idx) => (
                    <div key={idx} className="animate-pulse">
                      <div className={`h-10 ${darkMode ? 'bg-gray-800' : 'bg-gray-300'} rounded-lg mb-2`}></div>
                      <div className="space-y-2 pl-9">
                        <div className={`h-6 ${darkMode ? 'bg-gray-800' : 'bg-gray-300'} rounded w-3/4`}></div>
                        <div className={`h-6 ${darkMode ? 'bg-gray-800' : 'bg-gray-300'} rounded w-2/3`}></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Actual topics
                <>
                  {filteredTopics.filter(topic => topic.selected !== false).map((topic, index) => {
                    // Generate a gradient color for each topic
                    const gradientColors = darkMode ? {
                      "voting": "from-blue-500 to-indigo-600",
                      "governance": "from-emerald-500 to-teal-600",
                      "rights": "from-amber-500 to-orange-600",
                      "education": "from-pink-500 to-rose-600",
                      "legal": "from-purple-500 to-violet-600",
                      "category-1": "from-blue-500 to-indigo-600",
                      "category-2": "from-emerald-500 to-teal-600",
                      "category-3": "from-amber-500 to-orange-600",
                      "category-4": "from-pink-500 to-rose-600",
                      "category-5": "from-purple-500 to-violet-600",
                      "iebc-process": "from-violet-500 to-purple-600",
                      "election-leadership": "from-cyan-500 to-blue-600"
                    } : {
                      "voting": "from-blue-300 to-indigo-400",
                      "governance": "from-emerald-300 to-teal-400",
                      "rights": "from-amber-300 to-orange-400",
                      "education": "from-pink-300 to-rose-400",
                      "legal": "from-purple-300 to-violet-400",
                      "category-1": "from-blue-300 to-indigo-400",
                      "category-2": "from-emerald-300 to-teal-400",
                      "category-3": "from-amber-300 to-orange-400",
                      "category-4": "from-pink-300 to-rose-400",
                      "category-5": "from-purple-300 to-violet-400",
                      "iebc-process": "from-violet-300 to-purple-400",
                      "election-leadership": "from-cyan-300 to-blue-400"
                    };
                    
                    // Instead of gray fallback, pick a random vibrant color
                    const vibrantGradients = darkMode ? [
                      "from-red-500 to-orange-600",
                      "from-orange-500 to-amber-600",
                      "from-yellow-500 to-lime-600",
                      "from-lime-500 to-green-600",
                      "from-green-500 to-emerald-600",
                      "from-emerald-500 to-teal-600",
                      "from-teal-500 to-cyan-600",
                      "from-cyan-500 to-blue-600",
                      "from-blue-500 to-indigo-600",
                      "from-indigo-500 to-violet-600",
                      "from-violet-500 to-purple-600",
                      "from-purple-500 to-fuchsia-600",
                      "from-fuchsia-500 to-pink-600",
                      "from-pink-500 to-rose-600"
                    ] : [
                      "from-red-300 to-orange-400",
                      "from-orange-300 to-amber-400",
                      "from-yellow-300 to-lime-400",
                      "from-lime-300 to-green-400",
                      "from-green-300 to-emerald-400",
                      "from-emerald-300 to-teal-400",
                      "from-teal-300 to-cyan-400",
                      "from-cyan-300 to-blue-400",
                      "from-blue-300 to-indigo-400",
                      "from-indigo-300 to-violet-400",
                      "from-violet-300 to-purple-400",
                      "from-purple-300 to-fuchsia-400",
                      "from-fuchsia-300 to-pink-400",
                      "from-pink-300 to-rose-400"
                    ];
                    
                    // Create a deterministic but random-looking color selection based on the topic ID
                    const getColorIndex = (id: string) => {
                      let sum = 0;
                      for (let i = 0; i < id.length; i++) {
                        sum += id.charCodeAt(i);
                      }
                      return sum % vibrantGradients.length;
                    };
                    
                    const color = gradientColors[topic.id as keyof typeof gradientColors] || 
                                 vibrantGradients[getColorIndex(topic.id)];
                    
                    const isExpanded = expandedSidebarTopic === topic.id;
                    
                    return (
                      <div 
                        key={topic.id}
                        className="mb-4"
                      >
                        <motion.button
                          onClick={(event) => toggleExpandTopic(topic.id, event)}
                          className={`flex items-center ${isSidebarCollapsed ? 'justify-center sidebar-item' : 'justify-between'} w-full text-left px-3 py-2 rounded-lg transition-all ${
                            isExpanded 
                              ? `bg-gradient-to-r ${color} text-white` 
                              : darkMode ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-300'
                          }`}
                          whileHover={{ x: isExpanded ? 0 : 3 }}
                          whileTap={{ scale: 0.98 }}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05, duration: 0.3 }}
                          data-tooltip={isSidebarCollapsed ? topic.title : undefined}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`${isSidebarCollapsed ? 'text-2xl' : 'text-xl'}`}>{topic.emoji}</span>
                            {!isSidebarCollapsed && <h4 className="font-medium">{topic.title}</h4>}
                          </div>
                          {!isSidebarCollapsed && (
                            <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              <FiChevronDown size={16} />
                            </motion.div>
                          )}
                        </motion.button>
                        
                          <AnimatePresence>
                          {isExpanded && !isSidebarCollapsed && (
                              <motion.ul 
                                className="space-y-1 mt-2 pl-9"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                              >
                                {topic.questions.map((question, idx) => (
                                  <motion.li 
                                    key={idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                  >
                                    <button 
                                    onClick={(event) => {
                                      handleQuestionClick(question);
                                      toggleExpandTopic(topic.id, event);
                                    }}
                                    className={`text-left text-sm w-full py-2 px-3 rounded-lg ${
                                      darkMode
                                        ? 'text-gray-300 hover:bg-gray-800'
                                        : 'text-gray-700 hover:bg-gray-300'
                                    } transition-colors`}
                                    >
                                      {question}
                                    </button>
                                  </motion.li>
                                ))}
                              </motion.ul>
                            )}
                          </AnimatePresence>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
            
            {/* User info with copyright */}
            <div className={`relative p-3 mt-auto border-t ${darkMode ? 'border-gray-800' : 'border-gray-300'} ${isSidebarCollapsed ? 'text-center' : ''}`}>
              <button
                onClick={() => setProfileMenuOpen(p => !p)}
                className={`flex items-center ${isSidebarCollapsed ? 'justify-center sidebar-item' : ''} gap-2 py-2 px-3 rounded-lg ${
                  darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200'
                } transition-colors w-full`}
                title={userEmail || 'Profile'}
              >
                <div
                  onClick={() => {
                  if (userEmail || userFirstName) setProfileMenuOpen((p) => !p);
                  else window.location.href = '/login';
                }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${darkMode ? 'bg-gray-700 text-gray-100' : 'bg-gray-300 text-gray-800'} cursor-pointer`}
                >
                  {userInitials}
                </div>
                {!isSidebarCollapsed && (
                  <div className="flex flex-col items-start">
                    <span className={`${darkMode ? 'text-gray-200' : 'text-gray-800'} text-sm font-medium`}>
                      {userFirstName && userLastName 
                        ? `${userFirstName} ${userLastName}`
                        : userFirstName 
                        ? userFirstName
                        : userEmail || 'Sign in'
                      }
                    </span>
                    <span className={`${darkMode ? 'text-gray-500' : 'text-gray-500'} text-xs`}>
                      {userEmail && (userFirstName || userLastName) ? userEmail : 'Profile'}
                    </span>
                  </div>
                )}
              </button>

              {profileMenuOpen && (
                <div className={`absolute ${isSidebarCollapsed ? 'left-1/2 -translate-x-1/2' : 'left-3'} bottom-14 z-50 min-w-[220px] rounded-lg border shadow-lg ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                  <div className="px-4 py-3">
                    <div className={`${darkMode ? 'text-gray-200' : 'text-gray-800'} font-semibold text-sm`}>
                      {userFirstName && userLastName 
                        ? `${userFirstName} ${userLastName}`
                        : userFirstName 
                        ? userFirstName
                        : userEmail || 'Guest'
                      }
                    </div>
                    {userEmail && (userFirstName || userLastName) && (
                      <div className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-xs mt-0.5`}>{userEmail}</div>
                    )}
                    <div className={`${darkMode ? 'text-gray-500' : 'text-gray-500'} text-xs mt-1`}>
                      {userEmail ? 'Signed in' : 'Not signed in'}
                    </div>
              </div>
                  <div className={`${darkMode ? 'border-gray-800' : 'border-gray-200'} border-t`} />
                  {userEmail ? (
                    <>
                      <button onClick={() => (window.location.href = '/chats')} className={`w-full text-left px-3 py-2 text-sm ${darkMode ? 'hover:bg-gray-800 text-gray-200' : 'hover:bg-gray-100 text-gray-800'}`}>My chats</button>
                    <button onClick={handleSignOut} className={`w-full text-left px-3 py-2 text-sm ${darkMode ? 'hover:bg-gray-800 text-gray-200' : 'hover:bg-gray-100 text-gray-800'}`}>Sign out</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => (window.location.href = '/login')} className={`w-full text-left px-3 py-2 text-sm ${darkMode ? 'hover:bg-gray-800 text-gray-200' : 'hover:bg-gray-100 text-gray-800'}`}>Sign in</button>
                      <button onClick={() => (window.location.href = '/signup')} className={`w-full text-left px-3 py-2 text-sm ${darkMode ? 'hover:bg-gray-800 text-gray-200' : 'hover:bg-gray-100 text-gray-800'}`}>Sign up</button>
                    </>
                  )}
                </div>
              )}

              {/* Footer copyright removed as requested */}
            </div>
          </motion.div>
            
            {/* External sidebar toggle button - positioned at the edge */}
            {!isSidebarCollapsed && (
              <div 
                className="hidden md:block fixed z-40 mt-3"
                style={{ 
                  left: '280px', 
                  transform: 'translateX(-50%)', 
                  top: '0px',
                  width: '28px',
                  height: '28px'
                }}
              >
                <button 
                  onClick={toggleSidebar}
                  className={`flex items-center justify-center p-1 rounded-full shadow-md ${
                    darkMode 
                      ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700 border border-gray-300'
                  } transition-colors`}
                  style={{ width: '28px', height: '28px' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="rotate-180">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <line x1="9" y1="3" x2="9" y2="21" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="6" cy="8" r="1" fill="currentColor"/>
                    <circle cx="6" cy="16" r="1" fill="currentColor"/>
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </AnimatePresence>

      {/* Keep only the hover-to-expand behavior; remove extra floating rail variations */}

      {/* Removed floating topic emojis when sidebar is collapsed to avoid overlaying main content */}

      {/* Main Chat Area */}
      <div 
        className={`flex-grow flex flex-col h-full transition-all duration-300 ${
          showSidebar && !isSidebarCollapsed 
            ? 'md:pl-[280px]' 
            : (showSidebar && isSidebarCollapsed ? 'md:pl-[60px]' : '')
        } relative bg-gray-50 dark:bg-gray-900 transition-colors duration-300`}
        suppressHydrationWarning
      >
        {/* Floating control bar - visible on all screen sizes when sidebar is hidden */}
        {/* Removed the alternate floating control bar when sidebar is hidden */}

        {/* Mobile toggle buttons */}
        {!showSidebar && (
          <div className="md:hidden fixed top-4 left-4 z-30">
            <motion.button
              className="p-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full shadow-lg transition-all duration-200"
              onClick={toggleSidebar}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Show sidebar"
            >
              <FiMenu size={22} />
            </motion.button>
          </div>
        )}

        {/* Mobile toggle button in the content area when sidebar is open */}
        {showSidebar && (
          <div className="md:hidden fixed top-4 right-4 z-30">
            <motion.button
              className="p-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full shadow-lg transition-all duration-200"
              onClick={toggleSidebar}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Hide sidebar"
            >
              <FiX size={22} />
            </motion.button>
          </div>
        )}

        {/* Remove the other floating buttons when sidebar is open on mobile */}
        {/* Mobile floating action buttons for additional controls when sidebar is shown - REMOVED */}

        {/* Remove the top mini header for mobile as we now have floating controls */}

        {/* Messages Area with decorative elements or overridden content */}
        <div className="relative w-full h-full overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
              <div className="absolute top-20 left-[10%] w-64 h-64 rounded-full bg-primary-200/10 dark:bg-primary-900/10 blur-3xl"></div>
              <div className="absolute bottom-40 right-[5%] w-80 h-80 rounded-full bg-secondary-200/10 dark:bg-secondary-900/10 blur-3xl"></div>
            <div className={`absolute top-1/3 right-1/4 w-40 h-40 rounded-full bg-blue-200/10 dark:bg-blue-900/10 blur-2xl ${hasFirstUserMessage ? 'opacity-30' : 'opacity-100'}`}></div>
            {mode === 'research' ? (
                <>
                  <motion.div
                    className="absolute top-[10%] right-[10%] w-32 h-32 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 z-0 pointer-events-none"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <motion.div
                    className="absolute bottom-[15%] left-[15%] w-24 h-24 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 z-0 pointer-events-none"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.6, 0.2] }}
                  transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                  />
                </>
            ) : (
                <>
                  <motion.div
                    className="absolute top-[20%] left-[5%] w-16 h-16 rounded-lg bg-gradient-to-r from-primary-500/10 to-secondary-500/10 z-0 pointer-events-none"
                  animate={{ rotate: [0, 45, 0], opacity: [0.2, 0.5, 0.2] }}
                  transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <motion.div
                    className="absolute bottom-[30%] right-[8%] w-20 h-20 rounded-full bg-gradient-to-r from-secondary-500/10 to-primary-500/10 z-0 pointer-events-none"
                  animate={{ y: [0, -15, 0], opacity: [0.1, 0.4, 0.1] }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                  />
                </>
              )}
            </div>
            
          {overrideContent ? (
            <div className={`flex-grow overflow-y-auto custom-scrollbar h-[calc(100vh-160px)] sm:h-[calc(100vh-150px)] md:h-[calc(100vh-130px)] p-4 sm:px-6 sm:py-6 pt-16 sm:pt-16 md:pt-6 ${mode === 'research' && docGenEnabled ? 'pb-48' : 'pb-32'} transition-all duration-500`}>
              <div className="w-full max-w-4xl mx-auto relative z-10">
                {overrideContent}
              </div>
            </div>
          ) : (
            <div 
              ref={chatContainerRef}
              className={`flex-grow overflow-y-auto custom-scrollbar h-[calc(100vh-160px)] sm:h-[calc(100vh-150px)] md:h-[calc(100vh-130px)] p-4 sm:px-6 sm:py-6 pt-16 sm:pt-16 md:pt-6 ${
                mode === 'research' && docGenEnabled ? 'pb-48' : 'pb-32'
              } space-y-6 sm:space-y-8 transition-all duration-500`}
            >
            <div className={`w-full ${hasFirstUserMessage ? 'max-w-4xl' : 'max-w-3xl'} mx-auto pt-3 sm:pt-6 px-1 sm:px-4 relative z-10`}>
              {/* Welcome message with category buttons - show only before first user message */}
              {!hasFirstUserMessage && messages.length <= 1 && messages.every(m => !m.isUser) && (
                <motion.div
                  className="mb-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-lg"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <h2 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 text-gray-800 dark:text-white">Welcome to Kiongozi Platform! 🇰🇪</h2>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4 sm:mb-6">
                    Type a message to start learning about Kenyan governance, elections, and your rights as a citizen.
                    You can customize which topics appear below using the <button onClick={() => setIsTopicModalOpen(true)} className="text-primary-500 dark:text-primary-400 hover:underline">topic editor</button>.
                  </p>
                  
                  {isLoadingTopics ? (
                    // Loading skeleton for welcome screen topics
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[1, 2, 3].map((_, idx) => (
                        <div key={idx} className="animate-pulse">
                          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                      {filteredTopics.filter(topic => topic.selected !== false).slice(0, 3).map((topic, topicIdx) => {
                        // Generate a gradient color for each topic
                        const gradientColors = darkMode ? {
                          "voting": "from-blue-500 to-indigo-600",
                          "governance": "from-emerald-500 to-teal-600",
                          "rights": "from-amber-500 to-orange-600",
                          "education": "from-pink-500 to-rose-600",
                          "legal": "from-purple-500 to-violet-600",
                          "category-1": "from-blue-500 to-indigo-600",
                          "category-2": "from-emerald-500 to-teal-600",
                          "category-3": "from-amber-500 to-orange-600",
                          "category-4": "from-pink-500 to-rose-600",
                          "category-5": "from-purple-500 to-violet-600",
                          "iebc-process": "from-violet-500 to-purple-600",
                          "election-leadership": "from-cyan-500 to-blue-600"
                        } : {
                          "voting": "from-blue-300 to-indigo-400",
                          "governance": "from-emerald-300 to-teal-400",
                          "rights": "from-amber-300 to-orange-400",
                          "education": "from-pink-300 to-rose-400",
                          "legal": "from-purple-300 to-violet-400",
                          "category-1": "from-blue-300 to-indigo-400",
                          "category-2": "from-emerald-300 to-teal-400",
                          "category-3": "from-amber-300 to-orange-400",
                          "category-4": "from-pink-300 to-rose-400",
                          "category-5": "from-purple-300 to-violet-400",
                          "iebc-process": "from-violet-300 to-purple-400",
                          "election-leadership": "from-cyan-300 to-blue-400"
                        };
                        
                        // Instead of gray fallback, pick a random vibrant color
                        const vibrantGradients = darkMode ? [
                          "from-red-500 to-orange-600",
                          "from-orange-500 to-amber-600",
                          "from-yellow-500 to-lime-600",
                          "from-lime-500 to-green-600",
                          "from-green-500 to-emerald-600",
                          "from-emerald-500 to-teal-600",
                          "from-teal-500 to-cyan-600",
                          "from-cyan-500 to-blue-600",
                          "from-blue-500 to-indigo-600",
                          "from-indigo-500 to-violet-600",
                          "from-violet-500 to-purple-600",
                          "from-purple-500 to-fuchsia-600",
                          "from-fuchsia-500 to-pink-600",
                          "from-pink-500 to-rose-600"
                        ] : [
                          "from-red-300 to-orange-400",
                          "from-orange-300 to-amber-400",
                          "from-yellow-300 to-lime-400",
                          "from-lime-300 to-green-400",
                          "from-green-300 to-emerald-400",
                          "from-emerald-300 to-teal-400",
                          "from-teal-300 to-cyan-400",
                          "from-cyan-300 to-blue-400",
                          "from-blue-300 to-indigo-400",
                          "from-indigo-300 to-violet-400",
                          "from-violet-300 to-purple-400",
                          "from-purple-300 to-fuchsia-400",
                          "from-fuchsia-300 to-pink-400",
                          "from-pink-300 to-rose-400"
                        ];
                        
                        // Create a deterministic but random-looking color selection based on the topic ID
                        const getColorIndex = (id: string) => {
                          let sum = 0;
                          for (let i = 0; i < id.length; i++) {
                            sum += id.charCodeAt(i);
                          }
                          return sum % vibrantGradients.length;
                        };
                        
                        const color = gradientColors[topic.id as keyof typeof gradientColors] || 
                                     vibrantGradients[getColorIndex(topic.id)];
                        
                        const isExpanded = expandedWelcomeTopic === topic.id;
                        
                        return (
                          <div 
                            key={topic.id}
                            className="relative"
                          >
                            <motion.div
                              className={`p-3 sm:p-4 rounded-xl bg-gradient-to-r ${color} ${darkMode ? 'text-white' : 'text-gray-800'} shadow-md text-left ${isExpanded ? 'rounded-b-none' : ''}`}
                              whileHover={{ y: isExpanded ? 0 : -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
                            whileTap={{ scale: 0.98 }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: topicIdx * 0.1, duration: 0.4 }}
                              onClick={() => setExpandedWelcomeTopic(isExpanded ? null : topic.id)}
                            >
                              <div className="flex items-center justify-between gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                                <div className="flex items-center gap-1.5 sm:gap-2">
                              <span className="text-xl sm:text-2xl">{topic.emoji}</span>
                              <h3 className="font-medium text-sm sm:text-base">{topic.title}</h3>
                            </div>
                                <motion.div
                                  animate={{ rotate: isExpanded ? 180 : 0 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  <FiChevronDown size={16} />
                                </motion.div>
                              </div>
                              <p className={`text-xs sm:text-sm ${darkMode ? 'text-white/90' : 'text-gray-800/90'}`}>
                                {isExpanded ? 'Select a question below' : 'Click to view questions'}
                              </p>
                            </motion.div>
                            
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div 
                                  className={`overflow-hidden rounded-b-xl border-t ${darkMode ? 'border-white/20' : 'border-gray-800/20'} bg-gradient-to-r ${color}`}
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  <div className="p-2 px-3">
                                    <ul className="space-y-1.5">
                                      {topic.questions.map((question, idx) => (
                                        <motion.li 
                                          key={idx}
                                          initial={{ opacity: 0, y: -5 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ delay: idx * 0.05, duration: 0.2 }}
                                        >
                                          <button 
                                            onClick={() => {
                                              handleQuestionClick(question);
                                              setExpandedWelcomeTopic(null);
                                            }}
                                            className={`text-left text-xs sm:text-sm w-full py-1.5 px-2 rounded-lg ${darkMode ? 'text-white hover:bg-white/20' : 'text-gray-800 hover:bg-gray-800/10'} transition-colors`}
                                          >
                                            {question}
                                          </button>
                                        </motion.li>
                                      ))}
                                    </ul>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
                
                {/* Chat messages */}
                {messages.map((message, index) => (
                  <motion.div
                    key={`message-${message.id}`}
                    className={`flex ${message.isUser ? 'justify-end' : 'justify-start w-full'} message-enter message-enter-active my-6`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ 
                      opacity: 1, 
                      y: 0,
                      scale: message.isUser ? [0.98, 1.02, 1] : 1,
                      rotate: message.isUser ? [0, 1, 0] : 0
                    }}
                    transition={{ 
                      duration: 0.5, 
                      ease: "easeOut",
                      scale: { duration: 0.4, ease: "easeInOut" },
                      rotate: { duration: 0.3, ease: "easeInOut" }
                    }}
                  >
                    {message.isUser ? (
                      <div className="flex justify-end items-end">
                      <div 
                          className="relative max-w-[85vw] sm:max-w-xl px-4 sm:px-5 py-2.5 sm:py-3.5 shadow-lg bg-gradient-to-br from-primary-500 via-indigo-500 to-secondary-500 text-white message-bubble-user animate-in"
                      >
                          <div className="text-white font-light drop-shadow-sm relative z-10">{message.text}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full">
                        {/* Only show the AI icon and header for non-welcome messages */}
                        {!message.text.includes('What can I do for you?') && (
                          <div className="flex items-start mb-2">
                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full overflow-hidden flex items-center justify-center mr-3">
                              <Image 
                                src="/images/ai-head-icon.svg"
                                alt="Kiongozi AI"
                                width={28}
                                height={28}
                                className="w-full h-full"
                              />
                            </div>
                            {/* Removed the Kiongozi AI text label */}
                          </div>
                        )}
                      
                        <div className={`${!message.text.includes('What can I do for you?') ? 'text-gray-800 dark:text-gray-200 pl-10' : ''} relative z-10`}>
                          {index === 0 ? (
                            <div dangerouslySetInnerHTML={{ __html: message.text }} />
                          ) : message.type === 'research' && message.researchData ? (
                            showTypingEffect && !message.isTypingComplete ? (
                              <TypewriterEffect 
                                text={message.text} 
                                onComplete={() => handleTypingComplete(message.id)}
                              />
                            ) : (
                              <ResearchOutput 
                                research={message.researchData} 
                                isTypingComplete={message.isTypingComplete || false}
                                onTopicClick={handleTopicClick}
                              />
                            )
                          ) : (
                            showTypingEffect && !message.isTypingComplete ? (
                              <TypewriterEffect 
                                text={message.text} 
                                onComplete={() => handleTypingComplete(message.id)}
                              />
                            ) : (
                              <div 
                                className="prose prose-sm dark:prose-invert max-w-none"
                                dangerouslySetInnerHTML={{ __html: processMarkdown(message.text) }}
                              />
                            )
                          )}
                          
                          {/* Compact Artifacts */}
                          {message.artifacts && message.artifacts.length > 0 && (
                            <div className="mt-4">
                              {message.artifacts.map((artifact) => (
                                <CompactArtifact
                                  key={artifact.id}
                                  artifact={artifact}
                                  darkMode={darkMode}
                                  onUpdate={(updatedArtifact) => {
                                    // Update artifact in message
                                    setMessages(prev => prev.map(msg =>
                                      msg.id === message.id
                                        ? {
                                            ...msg,
                                            artifacts: msg.artifacts?.map(a =>
                                              a.id === updatedArtifact.id ? updatedArtifact : a
                                            )
                                          }
                                        : msg
                                    ));
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
                
                {isLoading && (
                  <motion.div
                    className="flex w-full mt-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-start w-full">
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full overflow-hidden flex items-center justify-center mr-3">
                        <Image 
                          src="/images/ai-head-icon.svg"
                          alt="Kiongozi AI"
                          width={28}
                          height={28}
                          className="w-full h-full"
                        />
                      </div>
                      <LoadingDots />
                    </div>
                  </motion.div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
          </div>
          )}
        </div>
        
        {/* Progressive Document for research mode - Now moved to input area */}
        {/* {mode === 'research' && (
          <ProgressiveDocument 
            messages={messages}
            darkMode={darkMode}
            isEnabled={docGenEnabled}
          />
        )} */}
        
        {/* Input area with mode switcher - redesigned for better centering in chat area */}
        {!hideInput && (
        <div className={`fixed bottom-0 left-0 right-0 pb-6 pt-2 z-10 bg-gradient-to-t from-gray-50 to-transparent dark:from-gray-900 dark:to-transparent ${
          mode === 'research' && docGenEnabled ? 'pb-20' : 'pb-6'
        }`}>
          <div className={`relative mx-auto w-full transition-all duration-300 ${
              showSidebar && !isSidebarCollapsed 
                ? 'md:pl-[280px]' 
                : (showSidebar && isSidebarCollapsed ? 'md:pl-[60px]' : '')
            } px-4`}
          >
            <div className="max-w-2xl mx-auto">
              {/* Document button positioned above input */}
              {(mode === 'research' && docGenEnabled) && (
                <div className="flex justify-center mb-3">
                  <ProgressiveDocument 
                    messages={messages}
                    darkMode={darkMode}
                    isEnabled={docGenEnabled}
                  />
                </div>
              )}
              
              {/* ChatGPT-style dynamic island input - centered in chat area */}
              <form onSubmit={handleSubmit}>
                <div className={`relative mx-auto bg-white dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden input-glow-container ${input.trim() ? 'input-active' : ''} ${isInputFocused ? 'input-focused' : ''}`}>
                  <div className="flex items-start">
                    {/* Attachment button (like in ChatGPT) */}
                    <button 
                      type="button"
                      className="p-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                      onClick={() => inputRef.current?.focus()}
                    >
                      <FiPlusCircle size={18} />
                    </button>
                    
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      onFocus={() => setIsInputFocused(true)}
                      onBlur={() => setIsInputFocused(false)}
                      placeholder="Ask a question about Kenyan civic education..."
                      className="flex-grow py-3 pl-0 pr-10 text-sm sm:text-base resize-none bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none min-h-[24px] max-h-[200px]"
                      disabled={isLoading}
                    />

                    {/* Tools and document controls integrated in input field */}
                    <div className="flex items-center gap-1 p-3 mr-8">
                      {/* Document Generation Toggle - show only when document has content */}
                      {(mode === 'research' && docGenEnabled) && (
                        <button 
                          type="button"
                          onClick={toggleDocGeneration}
                          className={`p-1.5 rounded-md transition-colors ${
                            docGenEnabled
                              ? 'text-primary-600 dark:text-primary-400 bg-primary-100 dark:bg-primary-900/30' 
                              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                          title={docGenEnabled ? 'Document generation enabled' : 'Enable document generation'}
                        >
                          <FiFile size={16} />
                        </button>
                      )}

                      {/* Tools button */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowToolsMenu(!showToolsMenu);
                          }}
                          className={`tools-button p-1.5 rounded-md transition-colors ${
                            showToolsMenu 
                              ? 'text-primary-600 dark:text-primary-400 bg-primary-100 dark:bg-primary-900/30' 
                              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                          title="Tools"
                        >
                          <FiTool size={16} />
                        </button>
                      </div>
                    </div>
                    
                    {isGenerating ? (
                      <motion.button
                        type="button"
                        onClick={stopGeneration}
                        className="absolute right-3 bottom-3 rounded-lg p-2 text-white bg-red-500 hover:bg-red-600"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        <FiStopCircle size={18} />
                      </motion.button>
                    ) : (
                    <div className="absolute right-3 bottom-3" style={{width: '36px', height: '36px'}}>
                      <button
                      type="submit"
                        className={`w-full h-full rounded-md p-2 ${
                        isLoading || !input.trim()
                            ? 'bg-gray-300 dark:bg-gray-600/60 cursor-not-allowed'
                            : 'bg-indigo-600 dark:bg-indigo-500'
                        } ${input.trim() ? 'send-button-active' : 'non-active-send-btn'} flex items-center justify-center`}
                      disabled={isLoading || !input.trim()}
                      >
                        <svg 
                          width="22" 
                          height="22" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          xmlns="http://www.w3.org/2000/svg"
                          className={`${input.trim() ? 'text-white' : 'text-gray-400 dark:text-gray-300'} transition-colors duration-300`}
                        >
                          {/* Modern artistic arrow with balanced centering */}
                          <path 
                            d="M12 3v16M7 8L12 3l5 5" 
                            stroke="currentColor" 
                            strokeWidth="3" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                    )}
                  </div>

                  {/* ChatGPT-style mode toggles inside input container - removed border-t */}
                  <div className="flex justify-center items-center py-2 px-3">
                    <div className="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-700/80 rounded-full p-1">
                      <button
                        onClick={() => setMode('chat')}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-all ${
                          mode === 'chat'
                            ? 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600/50'
                        }`}
                      >
                        <FiMessageCircle size={14} />
                        <span>Chat</span>
                      </button>
                      
                      <button
                        onClick={() => setMode('research')}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-all ${
                          mode === 'research'
                            ? 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600/50'
                        }`}
                      >
                        <FiSearch size={14} />
                        <span>Deep research</span>
                      </button>
                    </div>
                  </div>
                </div>
              </form>
              
              {/* ChatGPT-style mode explanation */}
              {mode === 'research' && (
                <div className="flex justify-center mt-2">
                  <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 py-1 px-3 rounded-full">
                    In-depth research that directly addresses your specific question
                  </div>
                </div>
              )}

              {/* Moved tools menu outside the form for better visibility */}
              {showToolsMenu && (
                <div 
                  className="tools-menu absolute z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 min-w-[240px]"
                  style={{
                    bottom: '120px',
                    right: '40px',
                  }}
                >
                  <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200">Tools</h3>
                    <button 
                      onClick={() => setShowToolsMenu(false)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <FiX size={16} />
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {/* Document Generation Toggle */}
                    <div className="flex items-center justify-between py-1">
                      <div className="flex items-center">
                        <FiFile size={16} className="mr-2 text-indigo-500" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Document Generation</span>
                      </div>
                      <button 
                        onClick={toggleDocGeneration}
                        className={`rounded-full p-1 ${
                          docGenEnabled
                            ? 'text-indigo-600 dark:text-indigo-400' 
                            : 'text-gray-400 dark:text-gray-600'
                        }`}
                        aria-label={docGenEnabled ? 'Disable document generation' : 'Enable document generation'}
                      >
                        {docGenEnabled ? (
                          <FiToggleRight size={24} />
                        ) : (
                          <FiToggleLeft size={24} />
                        )}
                      </button>
                    </div>
                    
                    {/* Research Mode Toggle - reuse existing mode switcher */}
                    <div className="flex items-center justify-between py-1">
                      <div className="flex items-center">
                        <FiCpu size={16} className="mr-2 text-indigo-500" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Research Mode</span>
                      </div>
                      <button 
                        onClick={() => setMode(mode === 'chat' ? 'research' : 'chat')}
                        className={`rounded-full p-1 ${
                          mode === 'research'
                            ? 'text-indigo-600 dark:text-indigo-400' 
                            : 'text-gray-400 dark:text-gray-600'
                        }`}
                        aria-label={mode === 'research' ? 'Switch to chat mode' : 'Switch to research mode'}
                      >
                        {mode === 'research' ? (
                          <FiToggleRight size={24} />
                        ) : (
                          <FiToggleLeft size={24} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Mode change animation overlay - disabled to keep all modes in the same screen */}

      {/* Topic Selection Modal */}
      <TopicSelectionModal
        isOpen={isTopicModalOpen}
        topics={topics}
        onSaveSelection={saveTopicSelection}
        onRefresh={refreshTopics}
        isRefreshing={isLoadingTopics}
        onClose={() => setIsTopicModalOpen(false)}
      />
      
      {/* Global styles moved to imported './send-effects.css' */}
    </div>
    </>
  );
};

export default AskAI; 