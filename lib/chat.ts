import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Starts or retrieves a private conversation with another user
 */
export async function startConversation(supabase: SupabaseClient, userId: string, targetUserId: string) {
    try {
        // Use the atomic RPC to get or create the room
        const { data: roomId, error } = await supabase
            .rpc('get_private_chat_room', {
                user_a: userId,
                user_b: targetUserId
            });

        if (error) throw error;
        return roomId as string;
    } catch (error) {
        console.error('Error starting conversation:', error);
        return null;
    }
}

/**
 * Retrieves or creates a group chat room for a course
 */
export async function getCourseChatRoom(supabase: SupabaseClient, courseId: string) {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!courseId || !uuidRegex.test(courseId)) {
        console.warn('Invalid Course ID for chat:', courseId);
        return null;
    }

    try {
        const { data: roomId, error } = await supabase
            .rpc('get_course_chat_room', {
                p_course_id: courseId
            });

        if (error) throw error;
        return roomId as string;
    } catch (error) {
        console.error('Error getting course chat room:', error);
        return null;
    }
}

/**
 * Ensures a user is a participant in a room
 */
export async function joinChatRoom(supabase: SupabaseClient, userId: string, roomId: string) {
    try {
        const { error } = await supabase
            .from('chat_participants')
            .upsert({
                room_id: roomId,
                user_id: userId
            }, {
                onConflict: 'room_id, user_id'
            });

        if (error) throw error;
        return true;
    } catch (error: any) {
        console.error('Error joining chat room:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
        });
        return false;
    }
}
