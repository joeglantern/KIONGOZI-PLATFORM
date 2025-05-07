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
import { generateAIResponse, clearConversationHistory } from '../utils/gemini-ai';
import { 
  generateResearchResponse, 
  ResearchResponse 
} from '../utils/deep-research-agent';
import { generateTopicCategories, TopicCategory, filterSelectedTopics } from '../utils/topic-generator';
import './chat-animations.css';
import './animations.css';
import '../sidebar.css';
import './input-glow.css'; // Add this line for our new CSS
import ResearchOutput from './ResearchOutput';
import PageTransition from './PageTransition';
import TopicSelectionModal from './TopicSelectionModal';
import ProgressiveDocument from './ProgressiveDocument';
import ChartDisplay from './ChartDisplay';
import { 
  identifyChartRequest, 
  getElectionChart, 
  getGovernanceChart, 
  getCountyBudgetChart,
  ChartResponse
} from './ChartService';
import axios from 'axios';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';

// Use the ResearchResponse type as DeepResearchResponse for all references
type DeepResearchResponse = ResearchResponse;

// Helper function to detect mobile devices
const isMobileDevice = () => {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
         (typeof window !== 'undefined' && window.innerWidth < 768);
};

// Extended message interface to support research mode - use the imported type
export interface Message {
  text: string;
  isUser: boolean;
  id: number;
  type?: 'chat' | 'research';
  researchData?: DeepResearchResponse; // Use the imported type
  isTypingComplete?: boolean;
  chartData?: ChartResponse; // Add chart data support
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

const AskAI = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      text: "Hello! 👋 Welcome to Kiongozi Platform. I'm your AI assistant ready to help with questions about Kenyan governance, elections, and civic education. What would you like to learn about today?",
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
  const [topics, setTopics] = useState<TopicCategory[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [activeArticle, setActiveArticle] = useState<ArticleInfo | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [showTopicsDropdown, setShowTopicsDropdown] = useState(false); // New state for topics dropdown
  const [isInputFocused, setIsInputFocused] = useState(false);
  
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
    
    // Check if this is a chart-related request
    const chartRequest = identifyChartRequest(input.trim());
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsGenerating(true);

    try {
      // Create a new AbortController for this request
      const controller = new AbortController();
      setAbortController(controller);
      
      // Try to fetch chart data if this is a chart request
      let chartData: ChartResponse | undefined;
      if (chartRequest.type) {
        try {
          switch (chartRequest.type) {
            case 'election':
              chartData = await getElectionChart(
                chartRequest.params.year, 
                chartRequest.params.chartType as 'presidential' | 'turnout',
                darkMode ? 'dark' : 'light'
              );
              break;
            case 'governance':
              chartData = await getGovernanceChart(
                chartRequest.params.indicator,
                darkMode ? 'dark' : 'light'
              );
              break;
            case 'budget':
              chartData = await getCountyBudgetChart(
                chartRequest.params.county,
                darkMode ? 'dark' : 'light'
              );
              break;
          }
        } catch (error) {
          console.error("Error generating chart:", error);
        }
      }
      
      if (mode === 'chat') {
        try {
          // Get the AI response
          const aiResponse = await generateAIResponse(userMessage.text, controller.signal);
          
          // Enhance the response with chart acknowledgment if a chart was generated
          let enhancedResponse = aiResponse;
          if (chartData) {
            // Check if the response already mentions visualization or chart
            const visualTerms = ['chart', 'visual', 'graph', 'visualization', 'display', 'shown below', 'as you can see'];
            const alreadyMentionsVisual = visualTerms.some(term => 
              aiResponse.toLowerCase().includes(term)
            );
            
            if (!alreadyMentionsVisual) {
              // Add a sentence acknowledging the chart with more specific context
              if (chartData.chart_type === 'pie') {
                if (chartRequest.type === 'election' && chartRequest.params.chartType === 'presidential') {
                  enhancedResponse = `${aiResponse}\n\nI've created a pie chart visualizing the presidential election results, showing the percentage of votes received by each candidate.`;
                } else if (chartRequest.type === 'budget') {
                  enhancedResponse = `${aiResponse}\n\nI've created a pie chart showing the budget allocation breakdown by sector for ${chartRequest.params.county} County.`;
                } else {
                  enhancedResponse = `${aiResponse}\n\nI've created a pie chart to help visualize this data distribution for you.`;
                }
              } else if (chartData.chart_type === 'bar') {
                if (chartRequest.type === 'election' && chartRequest.params.chartType === 'turnout') {
                  enhancedResponse = `${aiResponse}\n\nI've included a bar chart showing voter turnout percentages across different regions of Kenya in the ${chartRequest.params.year} election.`;
                } else {
                  enhancedResponse = `${aiResponse}\n\nI've included a bar chart below to better illustrate these comparative statistics.`;
                }
              } else if (chartData.chart_type === 'line') {
                if (chartRequest.type === 'governance') {
                  enhancedResponse = `${aiResponse}\n\nI've generated a line chart showing the trend of governance ${chartRequest.params.indicator === 'all' ? 'indicators' : `${chartRequest.params.indicator} indicator`} over time from 2018 to 2023.`;
                } else {
                  enhancedResponse = `${aiResponse}\n\nI've generated a line chart to help you understand how these values have changed over time.`;
                }
              } else {
                enhancedResponse = `${aiResponse}\n\nI've generated a visualization to help you understand these numbers better.`;
              }
            }
          }
          
          // Add the response message
          const aiMessage: Message = {
            text: enhancedResponse,
            isUser: false,
            id: generateUniqueId(),
            type: 'chat',
            isTypingComplete: !showTypingEffect,
            chartData: chartData // Add chart data if available
          };
          
          setMessages(prev => [...prev, aiMessage]);
          if (showTypingEffect) {
            setTypingMessageId(aiMessage.id);
          }
        } catch (error) {
          if (!(error instanceof DOMException && error.name === 'AbortError')) {
            console.error('Error in chat mode:', error);
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
          
          // Enhance the response with chart acknowledgment if a chart was generated
          let enhancedSummary = researchData.summary;
          if (chartData) {
            // Check if the response already mentions visualization or chart
            const visualTerms = ['chart', 'visual', 'graph', 'visualization', 'display', 'shown below', 'as you can see'];
            const alreadyMentionsVisual = visualTerms.some(term => 
              researchData.summary.toLowerCase().includes(term)
            );
            
            if (!alreadyMentionsVisual) {
              // Add a sentence acknowledging the chart with specific details
              if (chartData.chart_type === 'pie') {
                if (chartRequest.type === 'election' && chartRequest.params.chartType === 'presidential') {
                  enhancedSummary = `${researchData.summary}\n\nI've included a pie chart visualizing the presidential election results, showing the percentage of votes received by each candidate.`;
                } else if (chartRequest.type === 'budget') {
                  enhancedSummary = `${researchData.summary}\n\nI've included a pie chart showing the budget allocation breakdown by sector for ${chartRequest.params.county} County.`;
                } else {
                  enhancedSummary = `${researchData.summary}\n\nI've included a pie chart to help visualize this data distribution for you.`;
                }
              } else if (chartData.chart_type === 'bar') {
                if (chartRequest.type === 'election' && chartRequest.params.chartType === 'turnout') {
                  enhancedSummary = `${researchData.summary}\n\nI've included a bar chart showing voter turnout percentages across different regions of Kenya in the ${chartRequest.params.year} election.`;
                } else {
                  enhancedSummary = `${researchData.summary}\n\nI've included a bar chart below to better illustrate these comparative statistics.`;
                }
              } else if (chartData.chart_type === 'line') {
                if (chartRequest.type === 'governance') {
                  enhancedSummary = `${researchData.summary}\n\nI've generated a line chart showing the trend of governance ${chartRequest.params.indicator === 'all' ? 'indicators' : `${chartRequest.params.indicator} indicator`} over time from 2018 to 2023.`;
                } else {
                  enhancedSummary = `${researchData.summary}\n\nI've generated a line chart to help you understand how these values have changed over time.`;
                }
              } else {
                enhancedSummary = `${researchData.summary}\n\nI've also included a visualization below to help illustrate this data.`;
              }
            }
          }
          
          // Create an enhanced research data object with the modified summary
          const enhancedResearchData = {
            ...researchData,
            summary: enhancedSummary
          };
          
          // Add the research response
          const researchMessage: Message = {
            text: enhancedSummary,
            isUser: false,
            id: generateUniqueId(),
            type: 'research',
            researchData: enhancedResearchData,
            isTypingComplete: !showTypingEffect,
            chartData: chartData // Add chart data if available
          };
          
          setMessages(prev => [...prev, researchMessage]);
          if (showTypingEffect) {
            setTypingMessageId(researchMessage.id);
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
    // Clear the conversation history
    clearConversationHistory();
    
    // Add a fade out animation to the messages
    if (chatContainerRef.current) {
      chatContainerRef.current.classList.add('fade-out');
      setTimeout(() => {
        setMessages([
          {
            text: "Hello! 👋 Welcome to Kiongozi Platform. I'm your AI assistant ready to help with questions about Kenyan governance, elections, and civic education. I can create visualizations and charts for statistics, election results, and budget data. Just ask me to show or visualize any information you're interested in. What would you like to learn about today?",
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
          text: "Hello! 👋 Welcome to Kiongozi Platform. I'm your AI assistant ready to help with questions about Kenyan governance, elections, and civic education. I can create visualizations and charts for statistics, election results, and budget data. Just ask me to show or visualize any information you're interested in. What would you like to learn about today?",
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

  // Add a component to suggest chart-related questions
  const VisualizationSuggestions = ({ onQuestionClick }: { onQuestionClick: (question: string) => void }) => {
    const suggestions = [
      "Show me the 2022 presidential election results",
      "Display voter turnout by region in 2017",
      "Visualize governance indicators over time",
      "Show Nairobi county budget allocation"
    ];

    return (
      <div className="mb-5 p-4 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 dark:from-indigo-900/40 dark:to-purple-900/40 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-md">
        <div className="flex items-center mb-3">
          <span className="text-xl mr-2">📊</span>
          <h3 className="text-base sm:text-lg text-indigo-800 dark:text-indigo-300 font-medium">Discover data visualizations!</h3>
        </div>
        <p className="text-sm text-indigo-700 dark:text-indigo-400 mb-3">
          I can create interactive charts and graphs to help you understand Kenyan civic data. Try asking:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => onQuestionClick(suggestion)}
              className="text-left p-3 bg-indigo-600/80 hover:bg-indigo-500 text-white rounded-lg transition-all duration-200 hover:shadow-md flex items-center transform hover:translate-y-[-2px]"
            >
              <span className="mr-2">📊</span>
              <span className="flex-1">{suggestion}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <section className={`w-full h-full flex flex-col ${darkMode ? 'dark' : ''}`} suppressHydrationWarning>
      {/* Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <>
          <motion.div 
              className={`flex flex-col ${isSidebarCollapsed ? 'w-[60px] sidebar-collapsed' : 'w-[280px]'} ${
              darkMode 
                ? 'bg-gradient-to-b from-gray-900 to-gray-950 text-white border-r border-gray-800' 
                : 'bg-gradient-to-b from-gray-100 to-gray-200 text-gray-800 border-r border-gray-300'
              } h-full fixed left-0 top-0 bottom-0 z-40 transition-all duration-300`}
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ ease: "easeInOut", duration: 0.3 }}
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
                
                {/* Dark mode toggle - added more margin */}
                <div className="flex items-center ml-auto">
                <button 
                  onClick={toggleDarkMode}
                  className={`p-2 rounded-lg ${
                    darkMode 
                      ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    } transition-colors ${isSidebarCollapsed ? 'sidebar-item' : ''}`}
                  data-tooltip={isSidebarCollapsed ? (darkMode ? "Light Mode" : "Dark Mode") : undefined}
                >
                  {darkMode ? <FiSun className={isSidebarCollapsed ? 'sidebar-icon' : ''} /> : <FiMoon className={isSidebarCollapsed ? 'sidebar-icon' : ''} />}
                </button>
              </div>
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
                onClick={() => setIsTopicModalOpen(true)}
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.98 }}
              >
                    <FiSettings size={18} />
                    {!isSidebarCollapsed && <span className="text-sm font-medium">Topics</span>}
              </motion.button>
                </div>
              </div>
            </div>
            
            {/* Topics section */}
            <div className={`flex-grow overflow-y-auto px-3 py-2 ${isSidebarCollapsed ? 'scrollbar-none space-y-4' : 'sidebar-scrollbar'}`}>
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
            <div className={`p-3 border-t ${darkMode ? 'border-gray-800' : 'border-gray-300'} ${isSidebarCollapsed ? 'text-center' : ''}`}>
              <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center sidebar-item' : ''} gap-2 py-2 px-3 rounded-lg ${
                darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-300'
              } transition-colors`} data-tooltip={isSidebarCollapsed ? "Kenyan Citizen" : undefined}>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center text-white">
                    <FiUser className={`${isSidebarCollapsed ? 'sidebar-icon' : ''}`} />
                </div>
                {!isSidebarCollapsed && (
                  <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} text-sm`}>Kenyan Citizen</span>
                )}
              </div>
              {!isSidebarCollapsed && (
                <div className={`${darkMode ? 'text-gray-500' : 'text-gray-600'} text-xs text-center mt-3`}>
                  © {new Date().getFullYear()} • Kiongozi Platform
                </div>
              )}
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

      {/* Collapsed sidebar toggle button - when sidebar is collapsed */}
      {showSidebar && isSidebarCollapsed && (
        <div 
          className="hidden md:block fixed z-40 mt-3"
          style={{ 
            left: '60px', 
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
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none"/>
              <line x1="9" y1="3" x2="9" y2="21" stroke="currentColor" strokeWidth="2"/>
              <circle cx="6" cy="8" r="1" fill="currentColor"/>
              <circle cx="6" cy="16" r="1" fill="currentColor"/>
            </svg>
          </button>
        </div>
      )}

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
        {!showSidebar && (
          <div className="flex fixed top-4 left-4 z-30 items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-1 shadow-md transition-all duration-300">
            <motion.button
              className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-all duration-200"
              onClick={toggleSidebar}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Show sidebar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none"/>
                <line x1="9" y1="3" x2="9" y2="21" stroke="currentColor" strokeWidth="2"/>
                <circle cx="6" cy="8" r="1" fill="currentColor"/>
                <circle cx="6" cy="16" r="1" fill="currentColor"/>
              </svg>
            </motion.button>
            
            <motion.button
              className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-all duration-200"
              onClick={startNewChat}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="New chat"
            >
              <FiPlusCircle size={20} />
            </motion.button>
            
            <div className="relative">
              <motion.button
                className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-all duration-200"
                onClick={() => setShowTopicsDropdown(!showTopicsDropdown)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Topics"
              >
                <FiMessageSquare size={20} />
              </motion.button>
              
              {/* Topics dropdown menu - remains the same */}
              {showTopicsDropdown && (
                <div className="absolute top-full left-0 mt-1 w-64 max-h-96 overflow-y-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg z-50 border border-gray-200 dark:border-gray-700">
                  {/* existing dropdown content */}
                  <div className="p-2 sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Topics</span>
                    <button
                      className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      onClick={() => setShowTopicsDropdown(false)}
                    >
                      <FiX size={16} />
                    </button>
                  </div>
                  
                  <div className="p-2">
                    {isLoadingTopics ? (
                      // Loading skeleton
                      <div className="animate-pulse space-y-2">
                        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      </div>
                    ) : (
                      <>
                        {filteredTopics.filter(topic => topic.selected !== false).map((topic) => {
                          const isExpanded = expandedSidebarTopic === topic.id;
                          
                          return (
                            <div key={topic.id} className="mb-1">
                              <button
                                onClick={(event) => toggleExpandTopic(topic.id, event)}
                                className={`flex items-center justify-between w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                                  isExpanded 
                                    ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' 
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                              >
                                <div className="flex items-center">
                                  <span className="mr-2">{topic.emoji}</span>
                                  <span>{topic.title}</span>
                                </div>
                                <FiChevronDown
                                  className={`transition-transform ${isExpanded ? 'transform rotate-180' : ''}`}
                                  size={14}
                                />
                              </button>
                              
                              {isExpanded && (
                                <div className="ml-2 pl-2 border-l-2 border-gray-200 dark:border-gray-700 mt-1 space-y-1">
                                  {topic.questions.map((question, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() => {
                                        handleQuestionClick(question);
                                        setShowTopicsDropdown(false);
                                      }}
                                      className="text-left text-xs w-full py-1.5 px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                                    >
                                      {question}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <motion.button
              className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-all duration-200"
              onClick={clearChat}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Clear chat"
            >
              <FiTrash2 size={20} />
            </motion.button>
            
            <motion.button
              className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-all duration-200"
              onClick={toggleDarkMode}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title={darkMode ? "Light mode" : "Dark mode"}
            >
              {darkMode ? <FiSun size={20} /> : <FiMoon size={20} />}
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

        {/* Messages Area with decorative elements - Removed PageTransition to keep all in the same screen */}
        <div className="relative w-full h-full overflow-hidden">
          <div 
            ref={chatContainerRef}
            className={`flex-grow overflow-y-auto custom-scrollbar h-[calc(100vh-160px)] sm:h-[calc(100vh-150px)] md:h-[calc(100vh-130px)] p-4 sm:px-6 sm:py-6 pt-16 sm:pt-16 md:pt-6 ${
              mode === 'research' && docGenEnabled ? 'pb-48' : 'pb-32'
            } space-y-6 sm:space-y-8 transition-all duration-500`}
          >
            {/* Decorative background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
              <div className="absolute top-20 left-[10%] w-64 h-64 rounded-full bg-primary-200/10 dark:bg-primary-900/10 blur-3xl"></div>
              <div className="absolute bottom-40 right-[5%] w-80 h-80 rounded-full bg-secondary-200/10 dark:bg-secondary-900/10 blur-3xl"></div>
              <div className="absolute top-1/3 right-1/4 w-40 h-40 rounded-full bg-blue-200/10 dark:bg-blue-900/10 blur-2xl"></div>
              
              {/* Mode-specific decorative elements */}
              {mode === 'research' && (
                <>
                  <motion.div
                    className="absolute top-[10%] right-[10%] w-32 h-32 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 z-0 pointer-events-none"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.3, 0.7, 0.3],
                    }}
                    transition={{
                      duration: 8,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                  <motion.div
                    className="absolute bottom-[15%] left-[15%] w-24 h-24 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 z-0 pointer-events-none"
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.2, 0.6, 0.2],
                    }}
                    transition={{
                      duration: 10,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 1,
                    }}
                  />
                </>
              )}
              
              {mode === 'chat' && (
                <>
                  <motion.div
                    className="absolute top-[20%] left-[5%] w-16 h-16 rounded-lg bg-gradient-to-r from-primary-500/10 to-secondary-500/10 z-0 pointer-events-none"
                    animate={{
                      rotate: [0, 45, 0],
                      opacity: [0.2, 0.5, 0.2],
                    }}
                    transition={{
                      duration: 12,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                  <motion.div
                    className="absolute bottom-[30%] right-[8%] w-20 h-20 rounded-full bg-gradient-to-r from-secondary-500/10 to-primary-500/10 z-0 pointer-events-none"
                    animate={{
                      y: [0, -15, 0],
                      opacity: [0.1, 0.4, 0.1],
                    }}
                    transition={{
                      duration: 8,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 2,
                    }}
                  />
                </>
              )}
            </div>
            
            <div className="w-full max-w-3xl mx-auto pt-3 sm:pt-6 px-1 sm:px-4 relative z-10">
              {/* Welcome message with category buttons - now shown with the initial message */}
              {messages.length <= 1 && messages.every(m => !m.isUser) && (
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
                      
                        <div className="text-gray-800 dark:text-gray-200 pl-10">
                          {message.type === 'research' && message.researchData ? (
                            showTypingEffect && !message.isTypingComplete ? (
                              <TypewriterEffect 
                                text={message.text} 
                                onComplete={() => handleTypingComplete(message.id)}
                              />
                            ) : (
                              <ResearchOutput 
                                research={message.researchData!} 
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
                                className="prose prose-sm dark:prose-invert max-w-none sm:text-base"
                                dangerouslySetInnerHTML={{ __html: processMarkdown(message.text) }}
                              />
                            )
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
      
      {/*component to create the futuristic glow effect */}
      <style jsx global>{`
        /* Button container positioning - this never changes */
        .absolute.right-3.bottom-3 {
          position: absolute !important;
          width: 36px !important;
          height: 36px !important;
        }
        
        /* Basic button styling */
        .absolute.right-3.bottom-3 button {
          transition: background-color 0.2s ease;
        }
        
        /* Hover effect for non-active button only */
        .absolute.right-3.bottom-3 button:not(.send-button-active):hover {
          background-color: #4b5563;
        }
        
        .dark .absolute.right-3.bottom-3 button:not(.send-button-active):hover {
          background-color: #374151;
        }
        
        /* Active state styling */
        .send-button-active {
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          transition: all 0.3s ease;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
          z-index: 1;
        }
        
        .send-button-active:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
          background: linear-gradient(135deg, #4338ca, #6d28d9);
        }
        
        /* Futuristic glow effect */
        .send-button-active::before {
          content: '';
          position: absolute;
          inset: -4px;
          background: conic-gradient(
            from 0deg at 50% 50%,
            #4f46e5,
            #7c3aed,
            #8b5cf6,
            #a855f7,
            #d946ef,
            #ec4899,
            #f43f5e,
            #ef4444,
            #f43f5e,
            #ec4899,
            #d946ef,
            #a855f7,
            #8b5cf6,
            #7c3aed,
            #4f46e5
          );
          border-radius: 8px;
          -webkit-mask: 
            linear-gradient(#fff 0 0) content-box, 
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: 0.8;
          filter: blur(4px);
          animation: rotate 6s linear infinite, pulse-glow 3s ease infinite;
          z-index: -1;
          transform-origin: center;
        }
        
        /* Outer glow */
        .send-button-active::after {
          content: '';
          position: absolute;
          inset: -2px;
          background: radial-gradient(circle at center, rgba(99, 102, 241, 0.8), transparent 70%);
          border-radius: 8px;
          opacity: 0;
          filter: blur(10px);
          animation: pulse-halo 2s ease infinite;
          z-index: -2;
        }
        
        .dark .send-button-active::before {
          filter: blur(4px) brightness(1.3);
        }
        
        .dark .send-button-active::after {
          background: radial-gradient(circle at center, rgba(139, 92, 246, 0.9), transparent 70%);
          filter: blur(8px) brightness(1.2);
        }
        
        @keyframes rotate {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        
        @keyframes pulse-glow {
          0% {
            opacity: 0.4;
            transform: scale(0.97);
            filter: blur(3px) brightness(0.9);
          }
          50% {
            opacity: 1;
            transform: scale(1.02);
            filter: blur(5px) brightness(1.2);
          }
          100% {
            opacity: 0.4;
            transform: scale(0.97);
            filter: blur(3px) brightness(0.9);
          }
        }
        
        @keyframes pulse-halo {
          0% {
            opacity: 0;
            transform: scale(0.9);
            filter: blur(8px) brightness(0.8);
          }
          30% {
            opacity: 0.7;
            transform: scale(1.1);
            filter: blur(12px) brightness(1.3);
          }
          70% {
            opacity: 0.5;
            transform: scale(1.05);
            filter: blur(10px) brightness(1.1);
          }
          100% {
            opacity: 0;
            transform: scale(0.9);
            filter: blur(8px) brightness(0.8);
          }
        }
        
        /* Additional glow effect for the button itself */
        .send-button-active {
          animation: button-pulse 2.5s ease-in-out infinite;
        }
        
        @keyframes button-pulse {
          0%, 100% {
            box-shadow: 0 0 5px rgba(99, 102, 241, 0.5), 0 0 10px rgba(168, 85, 247, 0.3);
          }
          50% {
            box-shadow: 0 0 15px rgba(99, 102, 241, 0.7), 0 0 25px rgba(168, 85, 247, 0.5);
          }
        }
        
        /* Enhanced hover state */
        .send-button-active:hover {
          transform: translateY(-1px);
          animation: button-pulse-hover 1.5s ease-in-out infinite;
        }
        
        @keyframes button-pulse-hover {
          0%, 100% {
            box-shadow: 0 0 10px rgba(99, 102, 241, 0.6), 0 0 20px rgba(168, 85, 247, 0.4);
          }
          50% {
            box-shadow: 0 0 20px rgba(99, 102, 241, 0.8), 0 0 30px rgba(168, 85, 247, 0.6);
          }
        }
        
        /* Send button style */
        .send-button-active {
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
          box-shadow: 0 0 8px rgba(255, 255, 255, 0.2);
        }
        
        .send-button-active:hover {
          transform: translateY(-1px);
          box-shadow: 0 0 12px rgba(255, 255, 255, 0.3);
        }
        
        .send-button-active::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0));
          transition: all 0.3s ease;
          z-index: 0;
        }
        
        /* Dark mode adjustments */
        .dark .send-button-active::before {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0));
        }
        
        /* User message bubble with custom shape */
        .message-bubble-user {
          position: relative;
          border-radius: 18px 18px 4px 18px;
          transition: all 0.3s ease;
          overflow: hidden;
        }
        
        /* Animated gradient background */
        .message-bubble-user::before {
          content: "";
          position: absolute;
          inset: 0;
          background-size: 200% 200%;
          opacity: 0.8;
          background-image: linear-gradient(
            -45deg, 
            rgba(99, 102, 241, 0.8),
            rgba(139, 92, 246, 0.8),
            rgba(124, 58, 237, 0.9),
            rgba(99, 102, 241, 0.8)
          );
          animation: gradient-shift 8s ease infinite;
          z-index: 0;
        }
        
        /* Stylized chat bubble tail */
        .message-bubble-user::after {
          content: "";
          position: absolute;
          bottom: -4px;
          right: -8px;
          width: 24px;
          height: 24px;
          background: linear-gradient(225deg, var(--tw-gradient-stops));
          background-image: linear-gradient(225deg, #6366f1, #8b5cf6);
          clip-path: polygon(100% 0, 0 0, 100% 100%);
        }
        
        /* Animation for new messages */
        .animate-in {
          animation: message-pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          transform-origin: bottom right;
        }
        
        /* Interactive hover effect */
        .message-bubble-user:hover {
          transform: translateY(-2px) scale(1.01);
          box-shadow: 0 8px 24px rgba(79, 70, 229, 0.2);
        }
        
        /* Add light shine effect on hover */
        .message-bubble-user:hover::before {
          animation: gradient-shift 4s ease infinite;
        }
        
        /* Animation keyframes */
        @keyframes gradient-shift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        
        @keyframes message-pop {
          0% {
            opacity: 0;
            transform: scale(0.8) translateY(10px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        /* Dark mode enhancements */
        .dark .message-bubble-user {
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3), 
                     0 0 8px rgba(124, 58, 237, 0.3);
        }
        
        .dark .message-bubble-user::after {
          background-image: linear-gradient(225deg, #4f46e5, #7c3aed);
        }
      `}</style>
    </section>
  );
};

export default AskAI; 