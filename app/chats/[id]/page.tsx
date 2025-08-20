"use client";

import React from 'react';
import AskAI from '../../components/AskAI';

export default function ChatDetailPage({ params }: { params: { id: string } }) {
  return <AskAI conversationId={params.id} />;
}




