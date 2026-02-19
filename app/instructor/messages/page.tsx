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

export default function InstructorMessagesPage() {
    const [selectedRoom, setSelectedRoom] = useState<{
        id: string;
        name: string;
        role: string;
    } | null>(null);

    return (
        <ProtectedRoute allowedRoles={['instructor', 'admin']}>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <MessageSquare className="w-8 h-8 text-orange-500" />
                        Messages
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Communicate with your students
                    </p>
                    <div className="mt-4">
                        <Breadcrumb
                            items={[
                                { label: 'Dashboard', href: '/instructor/dashboard' },
                                { label: 'Messages' }
                            ]}
                        />
                    </div>
                </div>

                {/* Chat Layout */}
                <div className="grid lg:grid-cols-12 gap-6 h-[calc(100vh-12rem)] min-h-[600px]">
                    {/* Sidebar - Conversation List */}
                    <div className={`lg:col-span-4 h-full ${selectedRoom ? 'hidden lg:block' : 'block'}`}>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm h-full overflow-hidden">
                            <RoomList
                                currentRoomId={selectedRoom?.id}
                                onSelectRoom={(id, name, role) => setSelectedRoom({ id, name, role })}
                            />
                        </div>
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
                                    className="h-full flex flex-col bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
                                >
                                    <div className="lg:hidden p-4 border-b border-gray-200 dark:border-gray-700">
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
                                <div className="h-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center text-center p-12">
                                    <div className="w-24 h-24 bg-orange-50 dark:bg-orange-900/20 rounded-[2rem] flex items-center justify-center text-orange-200 dark:text-orange-700 mb-6">
                                        <Inbox className="w-12 h-12" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Select a Conversation</h3>
                                    <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                                        Choose a student from the list to start messaging.
                                    </p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
