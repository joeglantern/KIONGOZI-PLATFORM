"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AskAI from '../../components/AskAI';
import apiClient from '../../utils/apiClient';

export default function ChatSlugPage() {
  const params = useParams();
  const router = useRouter();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

  useEffect(() => {
    const loadConversationBySlug = async () => {
      if (!slug) {
        setError('No conversation slug provided');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Get conversations and find the one with matching slug
        console.log('🔍 [ChatSlugPage] Loading conversation with slug:', slug);
        const response = await apiClient.getConversations({ limit: 100 });
        console.log('📡 [ChatSlugPage] API response:', response);

        if (response.success && response.data) {
          const conversations = Array.isArray(response.data) ? response.data : (response.data as any).items || [];
          console.log('📋 [ChatSlugPage] Found conversations:', conversations.length);

          // Try to find by slug first, then by ID as fallback
          let conversation = conversations.find(conv => conv.slug === slug);

          if (!conversation) {
            // If not found by slug, try by ID (for backward compatibility)
            conversation = conversations.find(conv => conv.id === slug);
            console.log('🔄 [ChatSlugPage] Trying to find by ID since slug not found');
          }

          if (conversation) {
            console.log('✅ [ChatSlugPage] Found conversation:', conversation.id);
            setConversationId(conversation.id);
          } else {
            // If no conversation found with this slug/ID, redirect to main chat
            console.warn(`❌ [ChatSlugPage] No conversation found with slug/ID: ${slug}`);
            console.log('Available slugs:', conversations.map(c => c.slug).filter(Boolean));
            console.log('Available IDs:', conversations.map(c => c.id));
            router.replace('/chats');
            return;
          }
        } else {
          console.error('❌ [ChatSlugPage] API error:', response.error);
          throw new Error(response.error || 'Failed to load conversations');
        }
      } catch (err) {
        console.error('Error loading conversation by slug:', err);
        setError('Failed to load conversation');
        // Redirect to main chat on error
        setTimeout(() => router.replace('/chats'), 2000);
      } finally {
        setIsLoading(false);
      }
    };

    loadConversationBySlug();
  }, [slug, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 text-gray-600">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
          <span>Loading conversation...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 mb-2">⚠️</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Redirecting to main chat...</p>
        </div>
      </div>
    );
  }

  return <AskAI conversationId={conversationId || undefined} />;
}