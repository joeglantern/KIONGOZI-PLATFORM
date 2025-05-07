"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ResearchResponse } from '../utils/deep-research-agent';
import { 
  FiBookOpen, 
  FiStar, 
  FiExternalLink, 
  FiArrowRight,
  FiList,
  FiInfo,
  FiCheckCircle,
  FiCopy
} from 'react-icons/fi';
import { LuBrainCircuit } from "react-icons/lu";

// Animation variants for staggered animations
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

interface ResearchOutputProps {
  research: ResearchResponse;
  isTypingComplete: boolean;
  onTopicClick?: (topic: string) => void; // Add callback for topic clicks
}

const ResearchOutput: React.FC<ResearchOutputProps> = ({ research, isTypingComplete, onTopicClick }) => {
  // Only animate once the typing effect has completed
  const shouldAnimate = isTypingComplete;
  const [copiedText, setCopiedText] = useState<string | null>(null);
  
  // Handle copying text to clipboard
  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(type);
      setTimeout(() => setCopiedText(null), 2000);
    });
  };
  
  // Helper function to safely render HTML content
  const renderHTML = (html: string) => {
    return { __html: html };
  };
  
  // Extract text content from a string with HTML/emojis
  const extractTextContent = (text: string) => {
    // Remove HTML tags
    let cleanText = text.replace(/<[^>]*>/g, '');
    // Keep emojis at the beginning if present
    const emojiMatch = cleanText.match(/^(\p{Emoji}+)/u);
    const emoji = emojiMatch ? emojiMatch[0] : '';
    // Remove markdown formatting
    cleanText = cleanText
      .replace(/\*\*(.*?)\*\*/g, '$1') // bold
      .replace(/__(.*?)__/g, '$1')     // bold
      .replace(/\*(.*?)\*/g, '$1')     // italic
      .replace(/_(.*?)_/g, '$1')       // italic
      .replace(/`(.*?)`/g, '$1')       // code
      .trim();
    
    return emoji + cleanText;
  };
  
  // Handler for when a related topic is clicked
  const handleTopicClick = (topic: string) => {
    if (onTopicClick) {
      // Extract clean text from the topic (removing markdown and HTML but keeping emoji)
      const cleanTopic = extractTextContent(topic);
      onTopicClick(cleanTopic);
    }
  };
  
  // Process markdown for the summary - we handle this separately from the TypewriterEffect
  // to ensure consistent rendering even for the research summary
  const processMarkdown = (content: string) => {
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
    
    // Handle lists: - item or * item
    content = content.replace(/^[\s]*[-*]\s+(.*?)$/gm, '<li class="ml-5">$1</li>');
    
    // Handle blockquotes: > text
    content = content.replace(/^>\s+(.*?)$/gm, '<blockquote class="pl-4 border-l-4 border-gray-300 text-gray-600 dark:text-gray-400 italic my-2">$1</blockquote>');
    
    // Handle code blocks: `code`
    content = content.replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded font-mono text-sm">$1</code>');
    
    // Handle horizontal rules: ---
    content = content.replace(/^---$/gm, '<hr class="my-4 border-t border-gray-300 dark:border-gray-700">');
    
    // Convert newlines to <br>
    content = content.replace(/\n/g, '<br>');
    
    return content;
  };
  
  return (
    <div className="w-full">
      {/* Research header with icon */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
          <LuBrainCircuit size={20} className="animate-pulse" />
          <h3 className="font-medium text-lg">Deep Research Analysis</h3>
        </div>
        <motion.button
          className="text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 p-1 rounded-lg"
          onClick={() => copyToClipboard(research.summary, 'summary')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {copiedText === 'summary' ? (
            <span className="text-xs flex items-center gap-1">
              <FiCheckCircle size={14} className="text-green-500" />
              <span className="text-green-500">Copied!</span>
            </span>
          ) : (
            <span className="text-xs flex items-center gap-1">
              <FiCopy size={14} />
              <span>Copy</span>
            </span>
          )}
        </motion.button>
      </div>
      
      {/* Main summary with enhanced styling */}
      <div className="prose prose-slate dark:prose-invert max-w-none mb-6">
        <div
          className="leading-relaxed bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm"
          dangerouslySetInnerHTML={renderHTML(processMarkdown(research.summary))}
        />
      </div>
      
      {/* Key points section */}
      {shouldAnimate && research.keyPoints && research.keyPoints.length > 0 && (
        <motion.div 
          className="mb-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <FiCheckCircle size={18} />
              <h4 className="font-medium">Key Points</h4>
            </div>
            <motion.button
              className="text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 p-1 rounded-lg"
              onClick={() => copyToClipboard(research.keyPoints.join('\n\n'), 'keyPoints')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {copiedText === 'keyPoints' ? (
                <span className="text-xs flex items-center gap-1">
                  <FiCheckCircle size={14} className="text-green-500" />
                  <span className="text-green-500">Copied!</span>
                </span>
              ) : (
                <span className="text-xs flex items-center gap-1">
                  <FiCopy size={14} />
                  <span>Copy</span>
                </span>
              )}
            </motion.button>
          </div>
          
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800/30">
            <ul className="divide-y divide-emerald-100 dark:divide-emerald-800/30">
              {research.keyPoints.map((point, idx) => (
                <motion.li 
                  key={idx} 
                  className="p-4 flex items-start gap-3 text-gray-800 dark:text-gray-200"
                  variants={itemVariants}
                >
                  <div className="bg-emerald-100 dark:bg-emerald-800/50 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FiStar className="text-emerald-600 dark:text-emerald-400" size={14} />
                  </div>
                  <div 
                    className="flex-grow prose-sm dark:prose-invert"
                    dangerouslySetInnerHTML={renderHTML(processMarkdown(point))}
                  />
                </motion.li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}
      
      {/* Related topics section - now clickable */}
      {shouldAnimate && research.relatedTopics && research.relatedTopics.length > 0 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mt-6"
        >
          <div className="flex items-center gap-2 mb-3 text-primary-600 dark:text-primary-400">
            <FiList size={18} />
            <h4 className="font-medium">Explore Related Topics</h4>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {research.relatedTopics.map((topic, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                whileHover={{ scale: 1.03, y: -2 }}
                className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-lg border border-primary-100 dark:border-primary-800/30 cursor-pointer hover:shadow-md transition-all"
                onClick={() => handleTopicClick(topic)}
                title="Click to explore this topic"
              >
                <div className="flex items-center justify-between">
                  <div
                    className="text-gray-800 dark:text-gray-200 font-medium"
                    dangerouslySetInnerHTML={renderHTML(processMarkdown(topic))}
                  />
                  <FiArrowRight size={14} className="text-primary-500 flex-shrink-0 ml-2" />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
      
      {/* Sources section (if available) */}
      {shouldAnimate && research.sources && research.sources.length > 0 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mt-6"
        >
          <div className="flex items-center gap-2 mb-3 text-amber-600 dark:text-amber-400">
            <FiBookOpen size={18} />
            <h4 className="font-medium">Sources</h4>
          </div>
          
          <div className="space-y-3">
            {research.sources.map((source, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-100 dark:border-amber-800/30"
              >
                <div className="flex items-center justify-between mb-1">
                  <h5 className="font-medium text-gray-900 dark:text-gray-100">{source.title}</h5>
                  <a 
                    href={source.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                  >
                    <span className="text-sm">View</span>
                    <FiExternalLink size={14} />
                  </a>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{source.snippet}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
      
      {/* Footer note */}
      <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <FiInfo size={12} />
        <span>This research was conducted using AI. Verify important information from official sources.</span>
      </div>
    </div>
  );
};

export default ResearchOutput; 