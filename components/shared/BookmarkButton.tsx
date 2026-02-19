"use client";

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/app/utils/supabase/client';
import { useUser } from '@/app/contexts/UserContext';
import { Bookmark, BookmarkCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface BookmarkButtonProps {
    itemId: string;
    itemType: 'course' | 'module' | 'chat';
    metadata: {
        title: string;
        icon?: string;
        link: string;
    };
    variant?: 'ghost' | 'outline' | 'default';
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
}

export function BookmarkButton({
    itemId,
    itemType,
    metadata,
    variant = 'ghost',
    size = 'md',
    showLabel = false
}: BookmarkButtonProps) {
    const supabase = createBrowserClient();
    const { user } = useUser();
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState(false);

    useEffect(() => {
        if (user) {
            checkBookmarkStatus();
        } else {
            setLoading(false);
        }
    }, [user, itemId, itemType]);

    const checkBookmarkStatus = async () => {
        // Validate UUID format to prevent DB errors
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!itemId || !uuidRegex.test(itemId)) {
            console.warn('Invalid Item ID for bookmark:', itemId);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('user_bookmarks')
                .select('id')
                .eq('user_id', user!.id)
                .eq('item_id', itemId)
                .eq('item_type', itemType)
                .maybeSingle();

            if (error) throw error;
            setIsBookmarked(!!data);
        } catch (error) {
            // Log the raw error to see hidden properties
            console.error('Error checking bookmark status:', error);
            setIsBookmarked(false);
        } finally {
            setLoading(false);
        }
    };

    const toggleBookmark = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!user || toggling) return;

        try {
            setToggling(true);

            if (isBookmarked) {
                // Remove bookmark
                const { error } = await supabase
                    .from('user_bookmarks')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('item_id', itemId)
                    .eq('item_type', itemType);

                if (error) throw error;
                setIsBookmarked(false);
            } else {
                // Add bookmark
                const { error } = await supabase
                    .from('user_bookmarks')
                    .insert({
                        user_id: user.id,
                        item_id: itemId,
                        item_type: itemType,
                        metadata: metadata
                    });

                if (error) throw error;
                setIsBookmarked(true);
            }
        } catch (error: any) {
            console.error('Error toggling bookmark:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            });
        } finally {
            setToggling(false);
        }
    };

    if (loading) {
        return <Loader2 className="w-5 h-5 animate-spin text-gray-300" />;
    }

    const sizes = {
        sm: 'p-1.5 h-8 w-8',
        md: 'p-2 h-10 w-10',
        lg: 'p-3 h-12 w-12'
    };

    if (showLabel) {
        return (
            <Button
                variant={isBookmarked ? 'default' : variant}
                onClick={toggleBookmark}
                disabled={toggling}
                className={`flex items-center gap-2 rounded-xl transition-all ${isBookmarked ? 'bg-orange-500 text-white hover:bg-orange-600' : 'text-gray-500 hover:text-orange-600'
                    }`}
            >
                {toggling ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : isBookmarked ? (
                    <BookmarkCheck className="w-4 h-4 fill-current" />
                ) : (
                    <Bookmark className="w-4 h-4" />
                )}
                <span>{isBookmarked ? 'Saved' : 'Save for later'}</span>
            </Button>
        );
    }

    return (
        <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleBookmark}
            disabled={toggling}
            className={`rounded-xl flex items-center justify-center transition-all ${isBookmarked
                ? 'bg-orange-100 text-orange-600 shadow-inner'
                : 'bg-white border border-gray-100 text-gray-400 hover:text-orange-500 hover:border-orange-200'
                } ${sizes[size as keyof typeof sizes]}`}
            title={isBookmarked ? "Remove Bookmark" : "Save Bookmark"}
        >
            <AnimatePresence mode="wait">
                {toggling ? (
                    <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <Loader2 className="w-4 h-4 animate-spin" />
                    </motion.div>
                ) : isBookmarked ? (
                    <motion.div
                        key="checked"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                    >
                        <BookmarkCheck className="w-5 h-5 fill-current" />
                    </motion.div>
                ) : (
                    <motion.div
                        key="empty"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                    >
                        <Bookmark className="w-5 h-5" />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.button>
    );
}
