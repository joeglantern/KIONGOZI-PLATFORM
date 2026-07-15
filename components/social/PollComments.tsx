'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/useToast';
import { 
    ChevronDown, ChevronUp, Globe, Loader2, MessageSquare, Reply, Send, 
    Trash2 
} from 'lucide-react';
import Link from 'next/link';
import { getProfileDisplayName } from '@/lib/social/profile-display';

interface PollCommentsProps {
    pollId: string;
    questionId?: string; // Optional: question-level comment
    currentUser: any;
}

export default function PollComments({ pollId, questionId = undefined, currentUser }: PollCommentsProps) {
    const [comments, setComments] = useState<any[]>([]);
    const [votes, setVotes] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [content, setContent] = useState('');
    const [replyToId, setReplyToId] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const [translatingId, setTranslatingId] = useState<string | null>(null);
    const [translations, setTranslations] = useState<Record<string, string>>({});
    
    // User mentions search
    const [showMentions, setShowMentions] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [profiles, setProfiles] = useState<any[]>([]);
    const [activeInput, setActiveInput] = useState<'main' | 'reply'>('main');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

    const supabase = useMemo(() => createClient(), []);
    const { toast } = useToast();

    // Fetch comments
    const fetchComments = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('poll_comments')
                .select(`
                    *,
                    profiles(username, full_name, avatar_url)
                `)
                .eq('poll_id', pollId);

            if (questionId) {
                query = query.eq('question_id', questionId);
            } else {
                query = query.is('question_id', null);
            }

            const { data, error } = await query.order('created_at', { ascending: true });
            if (error) throw error;
            
            setComments(data ?? []);

            // Fetch user votes if logged in
            if (currentUser && data?.length) {
                const commentIds = data.map(c => c.id);
                const { data: votesData, error: votesErr } = await supabase
                    .from('poll_comment_votes')
                    .select('comment_id, vote_type')
                    .eq('user_id', currentUser.id)
                    .in('comment_id', commentIds);

                if (votesErr) throw votesErr;

                const votesMap: Record<string, string> = {};
                votesData?.forEach(v => {
                    votesMap[v.comment_id] = v.vote_type;
                });
                setVotes(votesMap);
            }
        } catch (err: any) {
            console.error('Error fetching comments:', err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (pollId) fetchComments();
    }, [pollId, questionId, currentUser]);

    // Handle upvote/downvote
    const handleVote = async (commentId: string, type: 'upvote' | 'downvote') => {
        if (!currentUser) {
            toast({ title: 'Authentication Required', description: 'Please sign in to vote on comments.', variant: 'destructive' });
            return;
        }

        const currentVote = votes[commentId];

        try {
            if (currentVote === type) {
                const { error } = await supabase
                    .from('poll_comment_votes')
                    .delete()
                    .eq('comment_id', commentId)
                    .eq('user_id', currentUser.id);

                if (error) throw error;

                setVotes(prev => {
                    const next = { ...prev };
                    delete next[commentId];
                    return next;
                });

                setComments(prev => prev.map(c => {
                    if (c.id === commentId) {
                        return { ...c, likes_count: c.likes_count + (type === 'upvote' ? -1 : 1) };
                    }
                    return c;
                }));
            } else {
                const { error: clearErr } = await supabase
                    .from('poll_comment_votes')
                    .delete()
                    .eq('comment_id', commentId)
                    .eq('user_id', currentUser.id);

                if (clearErr) throw clearErr;

                const { error } = await supabase
                    .from('poll_comment_votes')
                    .upsert({
                        comment_id: commentId,
                        user_id: currentUser.id,
                        vote_type: type
                    }, {
                        onConflict: 'comment_id,user_id',
                        ignoreDuplicates: true
                    });

                if (error) throw error;

                setVotes(prev => ({ ...prev, [commentId]: type }));

                setComments(prev => prev.map(c => {
                    if (c.id === commentId) {
                        let diff = 0;
                        if (!currentVote) {
                            diff = type === 'upvote' ? 1 : -1;
                        } else {
                            diff = type === 'upvote' ? 2 : -2;
                        }
                        return { ...c, likes_count: c.likes_count + diff };
                    }
                    return c;
                }));
            }
        } catch (err: any) {
            toast({ title: 'Vote Failed', description: err.message, variant: 'destructive' });
        }
    };

    // Submit a comment
    const handleSubmit = async (e: React.FormEvent, parentCommentId: string | null = null) => {
        e.preventDefault();
        if (!currentUser) {
            toast({ title: 'Authentication Required', description: 'Please sign in to comment.', variant: 'destructive' });
            return;
        }

        const text = parentCommentId ? replyContent : content;
        if (!text.trim()) return;

        setIsSubmitting(true);
        try {
            const { data, error } = await supabase
                .from('poll_comments')
                .insert({
                    poll_id: pollId,
                    question_id: questionId ?? null,
                    user_id: currentUser.id,
                    parent_id: parentCommentId,
                    content: text.trim()
                })
                .select(`
                    *,
                    profiles(username, full_name, avatar_url)
                `)
                .single();

            if (error) throw error;

            setComments(prev => [...prev, data]);
            if (parentCommentId) {
                setReplyContent('');
                setReplyToId(null);
            } else {
                setContent('');
            }
            toast({ title: 'Comment posted', className: 'bg-civic-green text-white border-none' });
        } catch (err: any) {
            toast({ title: 'Failed to post comment', description: err.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Delete comment
    const handleDelete = async (commentId: string) => {
        if (!window.confirm('Are you sure you want to delete this comment?')) return;
        try {
            const { error } = await supabase
                .from('poll_comments')
                .delete()
                .eq('id', commentId);

            if (error) throw error;

            setComments(prev => prev.filter(c => c.id !== commentId));
            toast({ title: 'Comment deleted' });
        } catch (err: any) {
            toast({ title: 'Failed to delete', description: err.message, variant: 'destructive' });
        }
    };

    // Dynamic translation
    const translateComment = async (commentId: string, text: string) => {
        if (translations[commentId]) {
            // Toggle translation off if already fetched
            setTranslations(prev => {
                const next = { ...prev };
                delete next[commentId];
                return next;
            });
            return;
        }

        setTranslatingId(commentId);
        try {
            const res = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, targetLanguage: 'English' })
            });

            if (!res.ok) throw new Error('Translation failed');
            const data = await res.json();
            
            if (data.translatedText) {
                setTranslations(prev => ({ ...prev, [commentId]: data.translatedText }));
            }
        } catch (err: any) {
            toast({ title: 'Translation Error', description: 'Unable to translate this comment at the moment.', variant: 'destructive' });
        } finally {
            setTranslatingId(null);
        }
    };

    // User Mention suggestions logic
    const handleTextareaChange = async (e: React.ChangeEvent<HTMLTextAreaElement>, inputType: 'main' | 'reply') => {
        const val = e.target.value;
        if (inputType === 'main') setContent(val);
        else setReplyContent(val);

        setActiveInput(inputType);

        const cursorIdx = e.target.selectionStart;
        const textBeforeCursor = val.slice(0, cursorIdx);
        const lastWord = textBeforeCursor.split(/\s+/).pop() ?? '';

        if (lastWord.startsWith('@')) {
            const query = lastWord.slice(1);
            setMentionQuery(query);
            setShowMentions(true);

            // Fetch matching profiles
            const { data } = await supabase
                .from('profiles')
                .select('username, full_name')
                .ilike('username', `${query}%`)
                .limit(5);

            setProfiles(data ?? []);
        } else {
            setShowMentions(false);
        }
    };

    const insertMention = (username: string) => {
        const input = activeInput === 'main' ? content : replyContent;
        const textarea = activeInput === 'main' ? textareaRef.current : replyTextareaRef.current;
        if (!textarea) return;

        const cursorIdx = textarea.selectionStart;
        const textBeforeCursor = input.slice(0, cursorIdx);
        const textAfterCursor = input.slice(cursorIdx);

        const words = textBeforeCursor.split(/\s+/);
        words.pop(); // Remove the typed "@name"
        const newTextBefore = [...words, `@${username} `].join(' ');

        if (activeInput === 'main') {
            setContent(newTextBefore + textAfterCursor);
        } else {
            setReplyContent(newTextBefore + textAfterCursor);
        }

        setShowMentions(false);
        textarea.focus();
    };

    // Organize comments hierarchically (roots & replies)
    const structuredComments = useMemo(() => {
        const roots = comments.filter(c => !c.parent_id);
        const replies = comments.filter(c => c.parent_id);
        
        return roots.map(root => ({
            ...root,
            replies: replies.filter(r => r.parent_id === root.id)
        }));
    }, [comments]);

    return (
        <div className="space-y-6">
            <div className="border-b pb-2 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-civic-green-dark" />
                <h3 className="font-bold text-foreground">Discussions & Viewpoints</h3>
            </div>

            {/* Post Main Comment Form */}
            {currentUser ? (
                <form onSubmit={(e) => handleSubmit(e)} className="space-y-3 relative">
                    <div className="relative">
                        <Textarea 
                            ref={textareaRef}
                            placeholder="Share your viewpoint, explain your reasoning, or challenge ideas respectfully..."
                            value={content}
                            onChange={(e) => handleTextareaChange(e, 'main')}
                            className="min-h-[90px] rounded-2xl"
                        />
                        {/* Mention list */}
                        {showMentions && activeInput === 'main' && profiles.length > 0 && (
                            <div className="absolute left-0 bottom-full mb-1 bg-white border rounded-xl shadow-lg z-20 w-48 py-1">
                                {profiles.map(p => (
                                    <button
                                        key={p.username}
                                        type="button"
                                        onClick={() => insertMention(p.username)}
                                        className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-muted"
                                    >
                                        {p.full_name || `@${p.username}`}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end">
                        <Button type="submit" className="bg-civic-green hover:bg-civic-green-dark text-white rounded-full gap-2" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            Post insight
                        </Button>
                    </div>
                </form>
            ) : (
                <div className="p-4 bg-muted/20 border border-dashed rounded-xl text-center text-sm text-muted-foreground">
                    Please <Link href="/login" className="text-civic-green font-semibold hover:underline">sign in</Link> to join the discussion.
                </div>
            )}

            {/* Comments List */}
            {loading ? (
                <div className="flex items-center justify-center py-6 text-muted-foreground gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-xs">Loading discussions…</span>
                </div>
            ) : comments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                    No viewpoints shared yet. Spark the discussion!
                </div>
            ) : (
                <div className="space-y-5">
                    {structuredComments.map(comment => {
                        const rootVote = votes[comment.id];
                        const isAuthor = currentUser?.id === comment.user_id;

                        return (
                            <div key={comment.id} className="space-y-3">
                                {/* Root Comment */}
                                <div className="flex gap-3 items-start p-4 bg-white border border-border/40 rounded-2xl">
                                    {/* Vote buttons */}
                                    <div className="flex flex-col items-center bg-muted/20 px-2 py-1.5 rounded-lg shrink-0">
                                        <button onClick={() => handleVote(comment.id, 'upvote')} className={`p-0.5 rounded ${rootVote === 'upvote' ? 'text-green-600' : 'text-muted-foreground hover:text-foreground'}`}>
                                            <ChevronUp className="h-4 w-4" />
                                        </button>
                                        <span className="text-xs font-bold my-0.5">{comment.likes_count}</span>
                                        <button onClick={() => handleVote(comment.id, 'downvote')} className={`p-0.5 rounded ${rootVote === 'downvote' ? 'text-red-500' : 'text-muted-foreground hover:text-foreground'}`}>
                                            <ChevronDown className="h-4 w-4" />
                                        </button>
                                    </div>

                                    {/* Main content */}
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs font-bold text-foreground">{getProfileDisplayName(comment.profiles, 'Youth voice')}</span>
                                            <span className="text-[10px] text-muted-foreground">{new Date(comment.created_at).toLocaleDateString('en-KE')}</span>
                                        </div>

                                        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                                            {translations[comment.id] ? (
                                                <span className="block p-2 bg-yellow-50/50 rounded-lg border-l-2 border-yellow-400 text-xs italic">
                                                    Translated: {translations[comment.id]}
                                                </span>
                                            ) : (
                                                comment.content
                                            )}
                                        </p>

                                        {/* Actions */}
                                        <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
                                            {currentUser && (
                                                <button onClick={() => setReplyToId(comment.id)} className="flex items-center gap-1 hover:text-civic-green font-semibold">
                                                    <Reply className="h-3 w-3" /> Reply
                                                </button>
                                            )}
                                            
                                            <button 
                                                onClick={() => translateComment(comment.id, comment.content)} 
                                                className="flex items-center gap-1 hover:text-civic-clay font-semibold"
                                                disabled={translatingId === comment.id}
                                            >
                                                {translatingId === comment.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Globe className="h-3 w-3" />}
                                                {translations[comment.id] ? 'Show Original' : 'Translate'}
                                            </button>

                                            {isAuthor && (
                                                <button onClick={() => handleDelete(comment.id)} className="flex items-center gap-1 hover:text-destructive font-semibold ml-auto">
                                                    <Trash2 className="h-3 w-3" /> Delete
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Replies (Level 1 Nested) */}
                                {comment.replies?.length > 0 && (
                                    <div className="ml-8 space-y-3 border-l-2 border-border/40 pl-4">
                                        {comment.replies.map((reply: any) => {
                                            const replyVote = votes[reply.id];
                                            const isReplyAuthor = currentUser?.id === reply.user_id;

                                            return (
                                                <div key={reply.id} className="flex gap-3 items-start p-3 bg-muted/10 border border-border/30 rounded-xl">
                                                    {/* Vote buttons */}
                                                    <div className="flex flex-col items-center bg-muted/30 px-1.5 py-1 rounded-md shrink-0">
                                                        <button onClick={() => handleVote(reply.id, 'upvote')} className={`p-0.5 rounded ${replyVote === 'upvote' ? 'text-green-600' : 'text-muted-foreground'}`}>
                                                            <ChevronUp className="h-3.5 w-3.5" />
                                                        </button>
                                                        <span className="text-[10px] font-bold">{reply.likes_count}</span>
                                                        <button onClick={() => handleVote(reply.id, 'downvote')} className={`p-0.5 rounded ${replyVote === 'downvote' ? 'text-red-500' : 'text-muted-foreground'}`}>
                                                            <ChevronDown className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>

                                                    <div className="flex-1 min-w-0 space-y-1">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="text-xs font-bold text-foreground">{getProfileDisplayName(reply.profiles, 'Reply voice')}</span>
                                                            <span className="text-[10px] text-muted-foreground">{new Date(reply.created_at).toLocaleDateString('en-KE')}</span>
                                                        </div>
                                                        <p className="text-xs md:text-sm text-foreground/85 leading-normal">
                                                            {translations[reply.id] ? (
                                                                <span className="block p-2 bg-yellow-50/50 rounded-lg border-l-2 border-yellow-400 text-xs italic">
                                                                    Translated: {translations[reply.id]}
                                                                </span>
                                                            ) : (
                                                                reply.content
                                                            )}
                                                        </p>
                                                        <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
                                                            <button 
                                                                onClick={() => translateComment(reply.id, reply.content)} 
                                                                className="flex items-center gap-1 hover:text-civic-clay font-semibold"
                                                                disabled={translatingId === reply.id}
                                                            >
                                                                {translatingId === reply.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Globe className="h-3 w-3" />}
                                                                {translations[reply.id] ? 'Show Original' : 'Translate'}
                                                            </button>

                                                            {isReplyAuthor && (
                                                                <button onClick={() => handleDelete(reply.id)} className="flex items-center gap-1 hover:text-destructive font-semibold ml-auto">
                                                                    <Trash2 className="h-3 w-3" /> Delete
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Reply Input Box (In place) */}
                                {replyToId === comment.id && currentUser && (
                                    <form onSubmit={(e) => handleSubmit(e, comment.id)} className="ml-8 p-3 bg-muted/20 border border-border/40 rounded-xl space-y-3 relative">
                                        <div className="relative">
                                            <Textarea 
                                                ref={replyTextareaRef}
                                                placeholder="Write a respectful reply..."
                                                value={replyContent}
                                                onChange={(e) => handleTextareaChange(e, 'reply')}
                                                className="min-h-[60px] text-sm rounded-xl"
                                                required
                                            />
                                            {/* Mention list */}
                                            {showMentions && activeInput === 'reply' && profiles.length > 0 && (
                                                <div className="absolute left-0 bottom-full mb-1 bg-white border rounded-xl shadow-lg z-20 w-48 py-1">
                                                    {profiles.map(p => (
                                                        <button
                                                            key={p.username}
                                                            type="button"
                                                            onClick={() => insertMention(p.username)}
                                                            className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-muted"
                                                        >
                                                            {p.full_name || `@${p.username}`}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <Button type="button" variant="ghost" size="sm" onClick={() => setReplyToId(null)}>Cancel</Button>
                                            <Button type="submit" size="sm" className="bg-civic-green hover:bg-civic-green-dark text-white rounded-full" disabled={isSubmitting}>
                                                Reply
                                            </Button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
