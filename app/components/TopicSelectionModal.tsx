"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCheck, FiRefreshCw } from 'react-icons/fi';
import { TopicCategory } from '../utils/topic-generator';

interface TopicSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  topics: TopicCategory[];
  onSaveSelection: (selectedTopics: string[]) => void;
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
}

const TopicSelectionModal: React.FC<TopicSelectionModalProps> = ({
  isOpen,
  onClose,
  topics,
  onSaveSelection,
  onRefresh,
  isRefreshing
}) => {
  // Store selected topic IDs
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  
  // Initialize selection with current topics marked as selected
  useEffect(() => {
    if (isOpen) {
      // Get the IDs of topics that have selected property as true or undefined
      const selectedIds = topics
        .filter(topic => topic.selected !== false) // Include topics with selected=true or undefined
        .map(topic => topic.id);
        
      setSelectedTopicIds(selectedIds);
    }
  }, [isOpen, topics]);
  
  // Toggle a topic selection
  const toggleTopic = (topicId: string) => {
    setSelectedTopicIds(prev => {
      if (prev.includes(topicId)) {
        return prev.filter(id => id !== topicId);
      } else {
        return [...prev, topicId];
      }
    });
  };
  
  // Handle selecting all topics
  const selectAll = () => {
    setSelectedTopicIds(topics.map(topic => topic.id));
  };
  
  // Handle deselecting all topics
  const deselectAll = () => {
    setSelectedTopicIds([]);
  };
  
  // Save selection and close modal
  const handleSave = () => {
    onSaveSelection(selectedTopicIds);
    onClose();
  };
  
  // Handle escape key press to close modal
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscapeKey);
    return () => window.removeEventListener('keydown', handleEscapeKey);
  }, [isOpen, onClose]);
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Customize Topics</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Select the topics you're most interested in
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
              >
                <FiX size={20} />
              </button>
            </div>
            
            {/* Topic Selection Area */}
            <div className="p-4 sm:p-6 max-h-[60vh] overflow-y-auto">
              <div className="flex justify-between mb-4">
                <div className="flex space-x-2">
                  <button
                    onClick={selectAll}
                    className="px-3 py-1 text-xs font-medium rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={deselectAll}
                    className="px-3 py-1 text-xs font-medium rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Deselect All
                  </button>
                </div>
                
                <motion.button
                  onClick={onRefresh}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors disabled:opacity-50"
                  disabled={isRefreshing}
                  whileTap={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                >
                  <FiRefreshCw 
                    size={14} 
                    className={isRefreshing ? "animate-spin" : ""} 
                  />
                  <span>{isRefreshing ? "Refreshing..." : "Generate New Topics"}</span>
                </motion.button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {topics.map((topic) => (
                  <motion.div
                    key={topic.id}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedTopicIds.includes(topic.id)
                        ? `border-${topic.color} bg-${topic.color}/10`
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                    style={{
                      borderColor: selectedTopicIds.includes(topic.id) ? topic.color : '',
                      backgroundColor: selectedTopicIds.includes(topic.id) ? `${topic.color}15` : ''
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toggleTopic(topic.id)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{topic.emoji}</span>
                        <h3 className="font-medium text-gray-900 dark:text-white">{topic.title}</h3>
                      </div>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        selectedTopicIds.includes(topic.id)
                          ? `bg-${topic.color} text-white`
                          : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                      style={{
                        backgroundColor: selectedTopicIds.includes(topic.id) ? topic.color : ''
                      }}
                      >
                        {selectedTopicIds.includes(topic.id) && <FiCheck size={12} />}
                      </div>
                    </div>
                    <div className="mt-2 ml-8 text-xs text-gray-500 dark:text-gray-400">
                      {topic.questions.length} questions
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            
            {/* Footer with action buttons */}
            <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary-500 to-secondary-500 text-white hover:opacity-90 transition-colors"
                disabled={selectedTopicIds.length === 0}
              >
                Save Preferences
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TopicSelectionModal; 