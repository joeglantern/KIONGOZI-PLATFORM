'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CommentItem } from './CommentItem';

interface CommentSectionProps {
    postId: string;
    currentUser: any;
}

export default function CommentSection({ postId, currentUser }: CommentSectionProps) {
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const supabase = createClient();

    // Fetch comments
    useEffect(() => {
        async function fetchComments() {
            const { data, error } = await supabase
                .from('social_comments')
                .select(`
          *,
          profiles:user_id (
            username
          )
        `)
                .eq('post_id', postId)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error fetching comments:', error);
            } else {
                setComments(data || []);
            }
            setIsLoading(false);
        }

        fetchComments();
    }, [postId, supabase]);

    // Build comment tree
    const commentTree = useMemo(() => {
        const commentMap = new Map();
        const roots: any[] = [];

        // First pass: create map
        comments.forEach(comment => {
            commentMap.set(comment.id, { ...comment, replies: [] });
        });

        // Second pass: link children to parents
        comments.forEach(comment => {
            if (comment.parent_id) {
                const parent = commentMap.get(comment.parent_id);
                if (parent) {
                    parent.replies.push(commentMap.get(comment.id));
                } else {
                    // Orphaned comment (parent deleted?), treat as root or ignore
                    roots.push(commentMap.get(comment.id));
                }
            } else {
                roots.push(commentMap.get(comment.id));
            }
        });

        return roots;
    }, [comments]);

    const handlePostComment = async (content: string, parentId: string | null = null) => {
        const payload: any = {
            post_id: postId,
            content: content,
            parent_id: parentId
        };

        if (currentUser) {
            payload.user_id = currentUser.id;
        } else {
            payload.user_id = null;
            payload.anonymous_name = 'Anonymous';
        }

        try {
            const { data, error } = await supabase
                .from('social_comments')
                .insert(payload)
                .select(`
                  *,
                  profiles:user_id (
                    username
                  )
                `)
                .single();

            if (error) throw error;

            setComments(prev => [...prev, data]);
            return Promise.resolve();
        } catch (error: any) {
            console.error('Error posting comment:', error);
            toast({
                title: "Error",
                description: error.message || "Failed to post comment.",
                variant: "destructive",
            });
            return Promise.reject(error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setIsSubmitting(true);
        try {
            await handlePostComment(newComment, null);
            setNewComment('');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-civic-green-dark flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Discussion ({comments.length})
            </h3>

            {/* Comment List */}
            <div className="space-y-6">
                {isLoading ? (
                    <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-civic-green" />
                    </div>
                ) : comments.length === 0 ? (
                    <div className="text-center py-10 bg-civic-earth-light/20 rounded-xl border border-civic-earth/10">
                        <MessageSquare className="h-10 w-10 mx-auto text-civic-earth mb-3 opacity-50" />
                        <p className="text-sm text-muted-foreground">No comments yet. Be the first to start the conversation!</p>
                    </div>
                ) : (
                    commentTree.map((comment) => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            replies={comment.replies}
                            currentUser={currentUser}
                            onReply={(content, parentId) => handlePostComment(content, parentId)}
                        />
                    ))
                )}
            </div>

            {/* Add Root Comment Form */}
            <div className="bg-muted/10 p-4 rounded-xl border border-border/50 mt-8">
                <form onSubmit={handleSubmit} className="flex gap-3 items-start">
                    <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                        <AvatarImage src={currentUser?.user_metadata?.avatar_url} />
                        <AvatarFallback className="bg-civic-green text-white">
                            {currentUser ? 'ME' : 'AN'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 gap-2 flex flex-col">
                        <Textarea
                            placeholder={currentUser ? "Share your perspective..." : "Share your perspective as Anonymous..."}
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            className="min-h-[100px] bg-background focus-visible:ring-civic-green"
                        />
                        <div className="flex justify-between items-center mt-1">
                            <p className="text-xs text-muted-foreground italic">
                                {currentUser ? 'Posting publicly' : 'Posting anonymously'}
                            </p>
                            <Button size="sm" type="submit" disabled={isSubmitting || !newComment.trim()} className="bg-civic-green hover:bg-civic-green-dark text-white">
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                                Post Comment
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
