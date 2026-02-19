"use client";

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/app/utils/supabaseClient';
import { useUser } from '@/app/contexts/UserContext';
import {
    MessageSquare,
    Search,
    Loader2,
    Users,
    User
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Room {
    id: string;
    type: 'private' | 'group';
    name?: string;
    last_message_at: string;
    participants?: {
        user_id: string;
        profiles: {
            full_name: string;
            role: string;
        };
    }[];
}

interface RoomListProps {
    onSelectRoom: (roomId: string, recipientName: string, recipientRole: string) => void;
    currentRoomId?: string;
}

export function RoomList({ onSelectRoom, currentRoomId }: RoomListProps) {
    const supabase = createClient();
    const { user } = useUser();
    const [searchQuery, setSearchQuery] = useState('');

    const { data: rooms = [], isLoading: loading } = useQuery({
        queryKey: ['chat-rooms', user?.id],
        queryFn: async () => {
            if (!user) return [];

            // 1. Get rooms user is participating in
            const { data: participations, error: partError } = await supabase
                .from('chat_participants')
                .select('room_id')
                .eq('user_id', user.id);

            if (partError) throw partError;

            if (!participations || participations.length === 0) {
                return [];
            }

            const roomIds = participations.map(p => p.room_id);

            // 2. Fetch room details
            const { data, error } = await supabase
                .from('chat_rooms')
                .select(`
                    *,
                    participants:chat_participants(
                        user_id,
                        profiles:profiles(
                            full_name,
                            role
                        )
                    )
                `)
                .in('id', roomIds)
                .order('last_message_at', { ascending: false });

            if (error) throw error;
            return data as Room[];
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });

    const filteredRooms = rooms.filter(room => {
        if (room.type === 'private') {
            const otherParticipant = room.participants?.find(p => p.user_id !== user?.id);
            const name = otherParticipant?.profiles?.full_name || 'Anonymous';
            return name.toLowerCase().includes(searchQuery.toLowerCase());
        }
        return (room.name || 'Group Chat').toLowerCase().includes(searchQuery.toLowerCase());
    });

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
            {/* Search Bar */}
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search conversations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white border-gray-100 rounded-2xl pl-11 pr-4 py-3 text-sm font-medium focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-sm"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {filteredRooms.length === 0 ? (
                    <div className="p-12 text-center">
                        <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                        <p className="text-gray-400 text-sm font-bold">No conversations found</p>
                    </div>
                ) : (
                    <div className="px-3 py-4 space-y-1">
                        {filteredRooms.map((room) => {
                            const isSelected = room.id === currentRoomId;
                            let displayName = room.name || 'Group Chat';
                            let displayRole = room.type === 'private' ? 'Instructor' : 'Course Discussion';
                            let displayIcon = <Users className="w-5 h-5" />;

                            if (room.type === 'private') {
                                const otherParticipant = room.participants?.find(p => p.user_id !== user?.id);
                                displayName = otherParticipant?.profiles?.full_name || 'Anonymous';
                                displayRole = otherParticipant?.profiles?.role || 'Member';
                                displayIcon = <User className="w-5 h-5" />;
                            }

                            return (
                                <button
                                    key={room.id}
                                    onClick={() => onSelectRoom(room.id, displayName, displayRole)}
                                    className={`w-full flex items-center gap-4 p-4 rounded-3xl transition-all ${isSelected
                                        ? 'bg-orange-50 text-orange-600 shadow-sm'
                                        : 'hover:bg-gray-50 text-gray-500 hover:text-gray-900'
                                        }`}
                                >
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner border ${isSelected ? 'bg-white border-orange-100 text-orange-600' : 'bg-white border-gray-100 text-gray-400'
                                        }`}>
                                        {displayIcon}
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <h4 className="font-bold text-sm truncate">{displayName}</h4>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase truncate ml-2">
                                                {new Date(room.last_message_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 truncate">
                                            {displayRole}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
