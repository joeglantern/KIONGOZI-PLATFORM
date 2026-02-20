"use client";

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/app/utils/supabaseClient';
import { useUser } from '@/app/contexts/UserContext';
import {
    Send,
    Loader2,
    User,
    ShieldCheck,
    MoreVertical,
    Check,
    CheckCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { BookmarkButton } from '@/components/shared/BookmarkButton';

interface Message {
    id: string;
    room_id: string;
    sender_id: string;
    content: string;
    is_read: boolean;
    created_at: string;
    profiles?: {
        username: string;
        avatar_url?: string;
        role: string;
    };
}

interface ChatWindowProps {
    roomId: string;
    recipientName?: string;
    recipientRole?: string;
}

export function ChatWindow({ roomId, recipientName, recipientRole }: ChatWindowProps) {
    const supabase = createClient();
    const { user } = useUser();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (roomId) {
            fetchMessages();
            const subscription = supabase
                .channel(`room:${roomId}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `room_id=eq.${roomId}`
                }, (payload) => {
                    const msg = payload.new as Message;
                    if (msg.sender_id !== user?.id) {
                        setMessages(prev => [...prev, msg]);
                    }
                })
                .subscribe();

            return () => {
                supabase.removeChannel(subscription);
            };
        }
    }, [roomId, user?.id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchMessages = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('chat_messages')
                .select(`
                    *,
                    profiles:sender_id (
                        username,
                        role
                    )
                `)
                .eq('room_id', roomId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setMessages(data || []);
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || !roomId || sending) return;

        const messageContent = newMessage.trim();
        setNewMessage(''); // Clear input early for better UX

        try {
            setSending(true);
            // Optimistic update
            const tempMsg: Message = {
                id: Math.random().toString(),
                room_id: roomId,
                sender_id: user.id,
                content: messageContent,
                is_read: false,
                created_at: new Date().toISOString()
            };
            setMessages(prev => [...prev, tempMsg]);

            const { error } = await supabase
                .from('chat_messages')
                .insert({
                    room_id: roomId,
                    sender_id: user.id,
                    content: messageContent,
                    metadata: {}
                });

            if (error) throw error;
        } catch (error) {
            console.error('Error sending message:', error);
            // Rollback optimistic update on error
            setMessages(prev => prev.filter(m => m.id !== roomId));
            setNewMessage(messageContent);
        } finally {
            setSending(false);
        }
    };

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-white rounded-3xl border border-gray-100 h-[600px]">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[600px] bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <header className="px-8 py-6 bg-orange-50 border-b border-orange-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-orange-600 shadow-sm border border-orange-100">
                        <User className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-black text-gray-900 leading-tight">
                            {recipientName || 'Chat'}
                        </h3>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-orange-600 uppercase tracking-widest mt-0.5">
                            <ShieldCheck className="w-3 h-3" />
                            <span>{recipientRole || 'Official'}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <BookmarkButton
                        itemId={roomId}
                        itemType="chat"
                        metadata={{
                            title: recipientName || 'Chat',
                            link: '/messages', // Direct to messages page
                            icon: 'chat'
                        }}
                    />
                    <button className="p-2 hover:bg-white rounded-xl text-gray-400 hover:text-gray-600 transition-all border border-transparent">
                        <MoreVertical className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Messages Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-8 space-y-6 bg-white custom-scrollbar"
            >
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                        <div className="w-16 h-16 bg-orange-50 rounded-3xl flex items-center justify-center text-orange-200">
                            <Send className="w-8 h-8" />
                        </div>
                        <p className="text-sm font-bold text-gray-400">
                            Start the conversation...
                        </p>
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const isOwn = msg.sender_id === user?.id;
                        return (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                key={msg.id}
                                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[80%] rounded-3xl p-5 shadow-sm border ${isOwn
                                    ? 'bg-gray-900 border-gray-800 text-white rounded-tr-none'
                                    : 'bg-white border-gray-100 text-gray-900 rounded-tl-none'
                                    }`}>
                                    <p className="text-sm font-medium leading-relaxed">
                                        {msg.content}
                                    </p>
                                    <div className={`mt-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${isOwn ? 'text-gray-400' : 'text-gray-400'
                                        }`}>
                                        <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        {isOwn && (
                                            msg.is_read ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>

            {/* Input Area */}
            <div className="p-6 bg-gray-50/50 border-t border-gray-100">
                <form
                    onSubmit={handleSendMessage}
                    className="relative flex items-center gap-3"
                >
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 bg-white border-gray-200 rounded-2xl px-6 py-4 text-sm font-medium focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-sm"
                    />
                    <Button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="bg-orange-500 hover:bg-orange-600 text-white rounded-2xl w-14 h-14 flex items-center justify-center p-0 shadow-lg shadow-orange-200 active:scale-95 transition-all flex-shrink-0"
                    >
                        {sending ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5 ml-0.5" />
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}
