
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, CornerDownRight, Reply, Send, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface CommentItemProps {
    comment: any;
    replies: any[];
    currentUser: any;
    onReply: (content: string, parentId: string) => Promise<void>;
    depth?: number;
}

export function CommentItem({ comment, replies, currentUser, onReply, depth = 0 }: CommentItemProps) {
    const [isReplying, setIsReplying] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleReplySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyContent.trim()) return;

        setIsSubmitting(true);
        await onReply(replyContent, comment.id);
        setIsSubmitting(false);
        setReplyContent('');
        setIsReplying(false);
    };

    // Limit nesting depth visual for cleaner UI, but still show structure
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const maxDepth = isMobile ? 3 : 5;
    const effectiveDepth = Math.min(depth, maxDepth);

    return (
        <div className={`group ${depth > 0 ? 'mt-3' : 'mt-4'}`}>
            <div className="flex gap-3">
                <Avatar className="h-8 w-8 h-8 w-8 ring-2 ring-background">
                    <AvatarImage src={comment.profiles?.avatar_url || ''} />
                    <AvatarFallback className="bg-civic-green-light text-white">
                        {(comment.profiles?.full_name || comment.anonymous_name || 'AN').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-1">
                    <div className="bg-muted/30 p-3 rounded-lg rounded-tl-none border border-border/50">
                        <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-semibold text-sm text-foreground">
                                {comment.profiles?.full_name || comment.anonymous_name || 'Anonymous'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                            </span>
                        </div>
                        <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                    </div>

                    <div className="flex items-center gap-2 pl-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-muted-foreground hover:text-civic-green"
                            onClick={() => setIsReplying(!isReplying)}
                        >
                            <Reply className="h-3 w-3 mr-1" />
                            Reply
                        </Button>
                    </div>

                    {/* Reply Form */}
                    {isReplying && (
                        <div className="mt-2 ml-2 flex gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="w-[2px] bg-border/50 rounded-full my-1"></div>
                            <div className="flex-1">
                                <form onSubmit={handleReplySubmit}>
                                    <Textarea
                                        placeholder={`Reply to ${comment.profiles?.full_name || 'Anonymous'}...`}
                                        value={replyContent}
                                        onChange={(e) => setReplyContent(e.target.value)}
                                        className="min-h-[60px] text-sm bg-background"
                                        autoFocus
                                    />
                                    <div className="flex justify-end gap-2 mt-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setIsReplying(false)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            size="sm"
                                            type="submit"
                                            disabled={isSubmitting || !replyContent.trim()}
                                            className="bg-civic-green hover:bg-civic-green-dark"
                                        >
                                            {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                                            Reply
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Nested Replies */}
            {replies.length > 0 && (
                <div className="pl-6 md:pl-9 relative">
                    {/* Thread Line */}
                    <div className="absolute left-[1.125rem] md:left-[1.85rem] top-0 bottom-0 w-[2px] bg-border/30 rounded-full group-last:bottom-auto group-last:h-4"></div>

                    <div className="space-y-3 pt-3">
                        {replies.map((reply) => (
                            <CommentItem
                                key={reply.id}
                                comment={reply}
                                replies={reply.replies || []} // This assumes pre-processed tree or flat list handling
                                currentUser={currentUser}
                                onReply={onReply}
                                depth={depth + 1}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
