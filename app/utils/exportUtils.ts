/**
 * Export Utilities for Conversation Data
 * Handles formatting and downloading conversation data in multiple formats
 */
import type { Conversation, Message } from '../types/chat';

export type ExportFormat = 'text' | 'markdown' | 'json';

// Extended conversation interface specifically for export purposes
export interface ExportableConversation extends Conversation {
  messages: Message[];
}

interface ExportOptions {
  includeMetadata: boolean;
  format: ExportFormat;
}

/**
 * Export conversations to specified format and trigger download
 */
export async function exportConversations(
  conversations: ExportableConversation[],
  format: ExportFormat,
  includeMetadata: boolean = true
): Promise<void> {
  if (conversations.length === 0) {
    throw new Error('No conversations to export');
  }

  const options: ExportOptions = { includeMetadata, format };

  let content: string;
  let filename: string;
  let mimeType: string;

  switch (format) {
    case 'text':
      content = formatAsText(conversations, options);
      filename = generateFilename(conversations, 'txt');
      mimeType = 'text/plain';
      break;
    case 'markdown':
      content = formatAsMarkdown(conversations, options);
      filename = generateFilename(conversations, 'md');
      mimeType = 'text/markdown';
      break;
    case 'json':
      content = formatAsJSON(conversations, options);
      filename = generateFilename(conversations, 'json');
      mimeType = 'application/json';
      break;
    default:
      throw new Error(`Unsupported format: ${format}`);
  }

  // Trigger download
  downloadFile(content, filename, mimeType);
}

/**
 * Format conversations as plain text
 */
function formatAsText(conversations: ExportableConversation[], options: ExportOptions): string {
  const { includeMetadata } = options;
  let output = '';

  if (includeMetadata) {
    output += '='.repeat(80) + '\n';
    output += 'KIONGOZI CONVERSATION EXPORT\n';
    output += '='.repeat(80) + '\n';
    output += `Export Date: ${new Date().toLocaleString()}\n`;
    output += `Conversations: ${conversations.length}\n`;
    output += `Total Messages: ${conversations.reduce((sum, conv) => sum + (conv.messageCount || 0), 0)}\n`;
    output += '='.repeat(80) + '\n\n';
  }

  conversations.forEach((conversation, index) => {
    // Conversation header
    output += `CONVERSATION ${index + 1}: ${conversation.title}\n`;
    output += '-'.repeat(60) + '\n';

    if (includeMetadata) {
      output += `ID: ${conversation.id}\n`;
      output += `Created: ${new Date(conversation.createdAt).toLocaleString()}\n`;
      output += `Updated: ${new Date(conversation.updatedAt).toLocaleString()}\n`;
      output += `Messages: ${conversation.messageCount || 0}\n`;
      output += '\n';
    }

    // Messages
    if (conversation.messages && conversation.messages.length > 0) {
      conversation.messages.forEach((message, msgIndex) => {
        const timestamp = includeMetadata ? `[${new Date(message.timestamp).toLocaleString()}] ` : '';
        const role = message.role.toUpperCase();

        output += `${timestamp}${role}:\n`;
        output += `${message.content}\n\n`;
      });
    } else {
      output += '(No messages)\n\n';
    }

    output += '\n';
  });

  return output;
}

/**
 * Format conversations as Markdown
 */
function formatAsMarkdown(conversations: ExportableConversation[], options: ExportOptions): string {
  const { includeMetadata } = options;
  let output = '';

  if (includeMetadata) {
    output += '# Kiongozi Conversation Export\n\n';
    output += `**Export Date:** ${new Date().toLocaleString()}  \n`;
    output += `**Conversations:** ${conversations.length}  \n`;
    output += `**Total Messages:** ${conversations.reduce((sum, conv) => sum + (conv.messageCount || 0), 0)}\n\n`;
    output += '---\n\n';
  }

  conversations.forEach((conversation, index) => {
    // Conversation header
    output += `## Conversation ${index + 1}: ${conversation.title}\n\n`;

    if (includeMetadata) {
      output += '**Metadata:**\n';
      output += `- **ID:** \`${conversation.id}\`\n`;
      output += `- **Created:** ${new Date(conversation.createdAt).toLocaleString()}\n`;
      output += `- **Updated:** ${new Date(conversation.updatedAt).toLocaleString()}\n`;
      output += `- **Messages:** ${conversation.messageCount || 0}\n\n`;
    }

    // Messages
    if (conversation.messages && conversation.messages.length > 0) {
      conversation.messages.forEach((message, msgIndex) => {
        const timestamp = includeMetadata ?
          `<small>*${new Date(message.timestamp).toLocaleString()}*</small>\n\n` : '';

        if (message.role === 'user') {
          output += `### 👤 User\n\n${timestamp}${message.content}\n\n`;
        } else {
          output += `### 🤖 Assistant\n\n${timestamp}${message.content}\n\n`;
        }
      });
    } else {
      output += '*No messages*\n\n';
    }

    output += '---\n\n';
  });

  return output;
}

/**
 * Format conversations as JSON
 */
function formatAsJSON(conversations: ExportableConversation[], options: ExportOptions): string {
  const { includeMetadata } = options;

  const exportData = {
    ...(includeMetadata && {
      metadata: {
        exportDate: new Date().toISOString(),
        exportVersion: '1.0',
        platform: 'Kiongozi Web App',
        conversationCount: conversations.length,
        totalMessages: conversations.reduce((sum, conv) => sum + (conv.messageCount || 0), 0)
      }
    }),
    conversations: conversations.map(conversation => ({
      id: conversation.id,
      title: conversation.title,
      ...(includeMetadata && {
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messageCount: conversation.messageCount || 0
      }),
      messages: conversation.messages || []
    }))
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Generate filename for export
 */
function generateFilename(conversations: Conversation[] | ExportableConversation[], extension: string): string {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const count = conversations.length;

  if (count === 1) {
    // Single conversation - use conversation title
    const title = conversations[0].title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').toLowerCase();
    return `kiongozi-conversation-${title}-${timestamp}.${extension}`;
  } else {
    // Multiple conversations
    return `kiongozi-conversations-${count}-${timestamp}.${extension}`;
  }
}

/**
 * Trigger file download in browser
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL object
  URL.revokeObjectURL(url);
}

/**
 * Validate export data before processing
 */
export function validateExportData(conversations: ExportableConversation[]): boolean {
  if (!Array.isArray(conversations) || conversations.length === 0) {
    return false;
  }

  return conversations.every(conv =>
    conv.id &&
    conv.title &&
    conv.createdAt &&
    conv.updatedAt
  );
}

/**
 * Get export preview for UI
 */
export function getExportPreview(
  conversations: Conversation[] | ExportableConversation[],
  format: ExportFormat,
  includeMetadata: boolean
): { size: string; messageCount: number; filename: string } {
  const messageCount = conversations.reduce((sum, conv) => sum + (conv.messageCount || 0), 0);
  const filename = generateFilename(conversations, format === 'text' ? 'txt' : format === 'markdown' ? 'md' : 'json');

  // Estimate file size (rough calculation)
  let estimatedSize = 0;
  conversations.forEach(conv => {
    estimatedSize += conv.title.length * 2; // Title overhead
    if (conv.messages) {
      conv.messages.forEach(msg => {
        estimatedSize += msg.content.length;
        estimatedSize += 100; // Metadata overhead per message
      });
    }
  });

  // Format-specific overhead
  if (format === 'json') {
    estimatedSize *= 1.5; // JSON formatting overhead
  } else if (format === 'markdown') {
    estimatedSize *= 1.2; // Markdown formatting overhead
  }

  if (includeMetadata) {
    estimatedSize *= 1.1; // Metadata overhead
  }

  const sizeKB = Math.round(estimatedSize / 1024);
  const size = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;

  return { size, messageCount, filename };
}