'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { MessageSquare, Heart, Share2, MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { createClient } from '@/app/utils/supabase/client';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface PostProps {
    post: any;
    currentUserId?: string;
}

export default function PostCard({ post, currentUserId }: PostProps) {
    const [likesCount, setLikesCount] = useState(post.likes_count || 0);
    const [isLiked, setIsLiked] = useState(false);
    const [isLiking, setIsLiking] = useState(false);
    const { toast } = useToast();

    const handleLike = async (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent link click if wrapped
        e.stopPropagation();

        if (!currentUserId) {
            toast({
                title: "Join the Movement",
                description: "Please log in to support this cause.",
            });
            // Ideally trigger login modal here
            return;
        }

        if (isLiking) return;
        setIsLiking(true);

        const supabase = createClient();
        const newIsLiked = !isLiked;

        // Optimistic update
        setIsLiked(newIsLiked);
        setLikesCount((prev: number) => newIsLiked ? prev + 1 : prev - 1);

        try {
            if (newIsLiked) {
                const { error } = await supabase
                    .from('social_likes')
                    .insert({ post_id: post.id, user_id: currentUserId });
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('social_likes')
                    .delete()
                    .eq('post_id', post.id)
                    .eq('user_id', currentUserId);
                if (error) throw error;
            }
        } catch (error: any) {
            // Revert
            setIsLiked(!newIsLiked);
            setLikesCount((prev: number) => !newIsLiked ? prev + 1 : prev - 1);
            toast({
                title: "Error",
                description: "Failed to update like. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsLiking(false);
        }
    };

    // Check if user already liked the post
    useEffect(() => {
        if (!currentUserId || !post.id) return;

        const checkLike = async () => {
            const supabase = createClient();
            const { data } = await supabase
                .from('social_likes')
                .select('user_id')
                .eq('post_id', post.id)
                .eq('user_id', currentUserId)
                .maybeSingle();

            if (data) setIsLiked(true);
        };

        checkLike();
    }, [currentUserId, post.id]);

    const handleShare = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const url = `${window.location.origin}/community/post/${post.id}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Post by @${post.profiles?.username || 'anonymous'} on Kiongozi`,
                    text: post.content.slice(0, 100) + '...',
                    url: url,
                });
            } catch (err) {
                console.error('Error sharing:', err);
            }
        } else {
            try {
                await navigator.clipboard.writeText(url);
                toast({
                    title: "Link copied",
                    description: "Post link copied to clipboard",
                });
            } catch (err) {
                toast({ variant: "destructive", title: "Error", description: "Failed to copy link" });
            }
        }
    };

    return (
        <Card className="group hover:shadow-md transition-all duration-300 border-civic-earth/10 hover:border-civic-green/30 bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3 p-4">
                <div className="flex items-center gap-3">
                    <Link href={`/community/profile/${post.user_id || 'anonymous'}`}>
                        <Avatar className="h-10 w-10 ring-2 ring-background border border-civic-earth/20 transition-transform group-hover:scale-105">
                            <AvatarImage src={post.profiles?.avatar_url || ''} alt={post.profiles?.username || 'Anonymous'} />
                            <AvatarFallback className="bg-civic-green text-white font-bold">
                                {(post.profiles?.username || post.anonymous_name || 'AN').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                    </Link>
                    <div className="grid gap-0.5">
                        <div className="flex items-center gap-2">
                            <Link href={`/community/profile/${post.user_id || 'anonymous'}`} className="font-semibold text-sm hover:text-civic-green transition-colors">
                                @{post.profiles?.username || post.anonymous_name || 'anonymous'}
                            </Link>
                            <span className="text-xs text-muted-foreground">
                                • {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                            </span>
                        </div>
                        {post.social_topics && (
                            <Link
                                href={`/community/topic/${post.social_topics.slug}`}
                                className="text-[10px] font-medium bg-civic-green/10 text-civic-green-dark px-2 py-0.5 rounded-full w-fit hover:bg-civic-green/20 transition-colors"
                            >
                                {post.social_topics.name}
                            </Link>
                        )}
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-civic-earth">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">More options</span>
                </Button>
            </CardHeader>
            <CardContent className="px-4 pb-3">
                <Link href={`/community/post/${post.id}`} className="block">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 group-hover:text-foreground transition-colors">
                        {post.content}
                    </p>
                </Link>
            </CardContent>
            <CardFooter className="flex justify-between border-t border-civic-earth/10 p-2 bg-muted/5">
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                        "gap-1.5 h-8 px-3 rounded-full transition-colors",
                        isLiked
                            ? "text-civic-clay bg-civic-clay/10 hover:bg-civic-clay/20"
                            : "text-muted-foreground hover:text-civic-clay hover:bg-civic-clay/5"
                    )}
                    onClick={handleLike}
                    disabled={isLiking}
                >
                    <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
                    <span className="text-xs font-medium">{likesCount || "Like"}</span>
                </Button>

                <Link href={`/community/post/${post.id}`}>
                    <Button variant="ghost" size="sm" className="gap-1.5 h-8 px-3 rounded-full text-muted-foreground hover:text-civic-green hover:bg-civic-green/5">
                        <MessageSquare className="h-4 w-4" />
                        <span className="text-xs font-medium">{post.comments_count || "Comment"}</span>
                    </Button>
                </Link>

                <Button variant="ghost" size="sm" className="gap-1.5 h-8 px-3 rounded-full text-muted-foreground hover:text-civic-earth hover:bg-civic-earth/5 ml-auto" onClick={handleShare}>
                    <Share2 className="h-4 w-4" />
                    <span className="text-xs font-medium">Share</span>
                </Button>
            </CardFooter>
        </Card>
    );
}
