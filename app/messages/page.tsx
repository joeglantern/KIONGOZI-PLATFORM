"use client";

import { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RoomList } from '@/components/chat/RoomList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import {
    MessageSquare,
    ArrowLeft,
    Inbox
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export default function MessagesPage() {
    const [selectedRoom, setSelectedRoom] = useState<{
        id: string;
        name: string;
        role: string;
    } | null>(null);

    return (
        <ProtectedRoute allowedRoles={['user', 'instructor', 'admin']}>
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <div className="mb-8 flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 mb-2 flex items-center gap-3">
                                Messages <MessageSquare className="w-8 h-8 text-orange-500" />
                            </h1>
                            <Breadcrumb
                                items={[
                                    { label: 'Dashboard', href: '/dashboard' },
                                    { label: 'Messages' }
                                ]}
                            />
                        </div>
                    </div>

                    {/* Chat Layout */}
                    <div className="grid lg:grid-cols-12 gap-8 h-[700px]">
                        {/* Sidebar - Conversation List */}
                        <div className={`lg:col-span-4 h-full ${selectedRoom ? 'hidden lg:block' : 'block'}`}>
                            <RoomList
                                currentRoomId={selectedRoom?.id}
                                onSelectRoom={(id, name, role) => setSelectedRoom({ id, name, role })}
                            />
                        </div>

                        {/* Main - Chat Window */}
                        <div className={`lg:col-span-8 h-full ${!selectedRoom ? 'hidden lg:block' : 'block'}`}>
                            <AnimatePresence mode="wait">
                                {selectedRoom ? (
                                    <motion.div
                                        key={selectedRoom.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="h-full flex flex-col"
                                    >
                                        <div className="lg:hidden mb-4">
                                            <Button
                                                variant="ghost"
                                                onClick={() => setSelectedRoom(null)}
                                                className="text-gray-500 hover:text-orange-600 font-bold"
                                            >
                                                <ArrowLeft className="w-4 h-4 mr-2" />
                                                Back to Inbox
                                            </Button>
                                        </div>
                                        <ChatWindow
                                            roomId={selectedRoom.id}
                                            recipientName={selectedRoom.name}
                                            recipientRole={selectedRoom.role}
                                        />
                                    </motion.div>
                                ) : (
                                    <div className="h-full bg-white rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center p-12">
                                        <div className="w-24 h-24 bg-orange-50 rounded-[2rem] flex items-center justify-center text-orange-200 mb-6">
                                            <Inbox className="w-12 h-12" />
                                        </div>
                                        <h3 className="text-2xl font-black text-gray-900 mb-2">Select a Conversation</h3>
                                        <p className="text-gray-500 max-w-sm font-medium">
                                            Choose a chat from the list on the left to start messaging with mentors and peers.
                                        </p>
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
