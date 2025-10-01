"use client";

/**
 * ExportModal Component
 * Allows users to export conversation history in multiple formats
 * Supports Text, Markdown, and JSON exports with metadata
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Download,
  FileText,
  Code,
  FileJson,
  Calendar,
  MessageCircle,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportConversations, getExportPreview, validateExportData, type ExportFormat } from '../../utils/exportUtils';
import type { Conversation, Message } from '../../types/chat';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  currentConversationId?: string | null;
  darkMode?: boolean;
}

interface ExportOptions {
  format: ExportFormat;
  includeMetadata: boolean;
  selectedConversations: string[];
  exportAll: boolean;
}

export default function ExportModal({
  isOpen,
  onClose,
  conversations,
  currentConversationId,
  darkMode = false
}: ExportModalProps) {
  const [options, setOptions] = useState<ExportOptions>({
    format: 'markdown',
    includeMetadata: true,
    selectedConversations: currentConversationId ? [currentConversationId] : [],
    exportAll: false
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Reset options when modal opens
  useEffect(() => {
    if (isOpen) {
      setOptions({
        format: 'markdown',
        includeMetadata: true,
        selectedConversations: currentConversationId ? [currentConversationId] : [],
        exportAll: false
      });
      setExportStatus('idle');
    }
  }, [isOpen, currentConversationId]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const formatOptions = [
    {
      value: 'text' as ExportFormat,
      label: 'Plain Text',
      description: 'Simple text format, easy to read',
      icon: FileText,
      extension: '.txt'
    },
    {
      value: 'markdown' as ExportFormat,
      label: 'Markdown',
      description: 'Structured format with formatting preserved',
      icon: Code,
      extension: '.md'
    },
    {
      value: 'json' as ExportFormat,
      label: 'JSON',
      description: 'Machine-readable format with full data',
      icon: FileJson,
      extension: '.json'
    }
  ];

  const handleConversationToggle = (conversationId: string) => {
    if (options.exportAll) return; // Don't allow individual selection when export all is enabled

    setOptions(prev => ({
      ...prev,
      selectedConversations: prev.selectedConversations.includes(conversationId)
        ? prev.selectedConversations.filter(id => id !== conversationId)
        : [...prev.selectedConversations, conversationId]
    }));
  };

  const handleExportAllToggle = () => {
    setOptions(prev => ({
      ...prev,
      exportAll: !prev.exportAll,
      selectedConversations: !prev.exportAll ? conversations.map(c => c.id) : []
    }));
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setExportStatus('idle');

      const conversationsToExport = options.exportAll
        ? conversations
        : conversations.filter(c => options.selectedConversations.includes(c.id));

      if (conversationsToExport.length === 0) {
        setExportStatus('error');
        return;
      }

      // Validate export data
      if (!validateExportData(conversationsToExport)) {
        console.error('Invalid conversation data for export');
        setExportStatus('error');
        return;
      }

      // Use the export utility to handle the export
      await exportConversations(conversationsToExport, options.format, options.includeMetadata);
      setExportStatus('success');

      // Auto close after success
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Export failed:', error);
      setExportStatus('error');
    } finally {
      setIsExporting(false);
    }
  };

  const selectedFormat = formatOptions.find(f => f.value === options.format);
  const selectedCount = options.exportAll ? conversations.length : options.selectedConversations.length;

  // Get export preview
  const selectedConversations = options.exportAll
    ? conversations
    : conversations.filter(c => options.selectedConversations.includes(c.id));

  const exportPreview = selectedConversations.length > 0
    ? getExportPreview(selectedConversations, options.format, options.includeMetadata)
    : null;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 500 }}
          className={`w-full max-w-2xl max-h-[90vh] rounded-xl overflow-hidden shadow-2xl ${
            darkMode
              ? 'bg-gray-900 border border-gray-700'
              : 'bg-white border border-gray-200'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`flex items-center justify-between p-6 border-b ${
            darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-white'
          }`}>
            <div>
              <h2 className={`text-2xl font-bold ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Export Conversations
              </h2>
              <p className={`text-sm mt-1 ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Download your conversation history in your preferred format
              </p>
            </div>
            <button
              onClick={onClose}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                darkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
            >
              <X size={20} />
            </button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Format Selection */}
              <div>
                <h3 className={`text-lg font-semibold mb-3 ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Export Format
                </h3>
                <div className="grid gap-3">
                  {formatOptions.map((format) => {
                    const Icon = format.icon;
                    return (
                      <button
                        key={format.value}
                        onClick={() => setOptions(prev => ({ ...prev, format: format.value }))}
                        className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                          options.format === format.value
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : darkMode
                              ? 'border-gray-700 hover:border-gray-600 bg-gray-800'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Icon size={20} className={`mt-0.5 ${
                            options.format === format.value
                              ? 'text-blue-600'
                              : darkMode ? 'text-gray-400' : 'text-gray-500'
                          }`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${
                                darkMode ? 'text-white' : 'text-gray-900'
                              }`}>
                                {format.label}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {format.extension}
                              </span>
                            </div>
                            <p className={`text-sm mt-1 ${
                              darkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              {format.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Conversation Selection */}
              <div>
                <h3 className={`text-lg font-semibold mb-3 ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Select Conversations
                </h3>

                {/* Export All Toggle */}
                <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer mb-4 ${
                  darkMode
                    ? 'bg-gray-800 border-gray-700 hover:bg-gray-750'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}>
                  <input
                    type="checkbox"
                    checked={options.exportAll}
                    onChange={handleExportAllToggle}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <span className={`font-medium ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Export All Conversations
                    </span>
                    <p className={`text-sm ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Download your complete conversation history ({conversations.length} conversations)
                    </p>
                  </div>
                </label>

                {/* Individual Conversation Selection */}
                {!options.exportAll && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {conversations.slice(0, 10).map((conversation) => (
                      <label
                        key={conversation.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          options.selectedConversations.includes(conversation.id)
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : darkMode
                              ? 'bg-gray-800 border-gray-700 hover:bg-gray-750'
                              : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={options.selectedConversations.includes(conversation.id)}
                          onChange={() => handleConversationToggle(conversation.id)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-medium truncate ${
                              darkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {conversation.title}
                            </span>
                            {conversation.id === currentConversationId && (
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <MessageCircle size={12} />
                              {conversation.messageCount || 0} messages
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              {new Date(conversation.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </label>
                    ))}

                    {conversations.length > 10 && (
                      <p className={`text-sm text-center py-2 ${
                        darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Showing first 10 conversations. Use "Export All" for complete history.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Export Options */}
              <div>
                <h3 className={`text-lg font-semibold mb-3 ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Export Options
                </h3>

                <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${
                  darkMode
                    ? 'bg-gray-800 border-gray-700 hover:bg-gray-750'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}>
                  <input
                    type="checkbox"
                    checked={options.includeMetadata}
                    onChange={(e) => setOptions(prev => ({ ...prev, includeMetadata: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <span className={`font-medium ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Include Metadata
                    </span>
                    <p className={`text-sm ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Add timestamps, message counts, and participant information
                    </p>
                  </div>
                </label>
              </div>

              {/* Export Status */}
              {exportStatus !== 'idle' && (
                <div className={`p-4 rounded-lg flex items-center gap-3 ${
                  exportStatus === 'success'
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}>
                  {exportStatus === 'success' ? (
                    <CheckCircle2 size={20} className="text-green-600" />
                  ) : (
                    <AlertCircle size={20} className="text-red-600" />
                  )}
                  <span className="font-medium">
                    {exportStatus === 'success'
                      ? 'Export completed successfully!'
                      : 'Export failed. Please try again.'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className={`flex items-center justify-between p-6 border-t ${
            darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-gray-50'
          }`}>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {selectedCount > 0 && exportPreview ? (
                <>
                  {selectedCount} conversation{selectedCount !== 1 ? 's' : ''} selected
                  {selectedFormat && ` • ${selectedFormat.label} format`}
                  <br />
                  <span className="text-xs">
                    {exportPreview.messageCount} messages • Est. size: {exportPreview.size}
                  </span>
                </>
              ) : selectedCount > 0 ? (
                <>
                  {selectedCount} conversation{selectedCount !== 1 ? 's' : ''} selected
                  {selectedFormat && ` • ${selectedFormat.label} format`}
                </>
              ) : (
                'No conversations selected'
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isExporting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleExport}
                disabled={selectedCount === 0 || isExporting}
                className="flex items-center gap-2"
              >
                {isExporting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}