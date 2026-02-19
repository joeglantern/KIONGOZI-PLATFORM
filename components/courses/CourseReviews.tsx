"use client";

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/app/utils/supabase/client';
import { useUser } from '@/app/contexts/UserContext';
import { Star, Send, Loader2, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Review {
    id: string;
    rating: number;
    review_text: string;
    created_at: string;
    profiles?: { full_name: string; first_name: string };
}

interface CourseReviewsProps {
    courseId: string;
}

export function CourseReviews({ courseId }: CourseReviewsProps) {
    const { user } = useUser();
    const supabase = createBrowserClient();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [avgRating, setAvgRating] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [userRating, setUserRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [reviewText, setReviewText] = useState('');
    const [hasReviewed, setHasReviewed] = useState(false);

    useEffect(() => {
        fetchReviews();
    }, [courseId]);

    const fetchReviews = async () => {
        try {
            const { data, error } = await supabase
                .from('course_reviews')
                .select('*, profiles(full_name, first_name)')
                .eq('course_id', courseId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching reviews:', error.message);
                return;
            }

            setReviews(data || []);
            if (data && data.length > 0) {
                const avg = data.reduce((sum: number, r: any) => sum + r.rating, 0) / data.length;
                setAvgRating(Math.round(avg * 10) / 10);
            }

            // Check if current user already reviewed
            if (user) {
                const existing = data?.find((r: any) => r.user_id === user.id);
                if (existing) {
                    setHasReviewed(true);
                    setUserRating(existing.rating);
                    setReviewText(existing.review_text || '');
                }
            }
        } catch (err) {
            console.error('Reviews error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!user || userRating === 0) return;
        try {
            setSubmitting(true);
            const { error } = await supabase
                .from('course_reviews')
                .upsert({
                    course_id: courseId,
                    user_id: user.id,
                    rating: userRating,
                    review_text: reviewText || null,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'course_id, user_id' });

            if (error) throw error;

            setHasReviewed(true);
            await fetchReviews();
        } catch (err: any) {
            console.error('Submit review error:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const StarRating = ({ rating, interactive = false, size = 'w-5 h-5' }: { rating: number; interactive?: boolean; size?: string }) => (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(star => (
                <button
                    key={star}
                    type="button"
                    disabled={!interactive}
                    onClick={() => interactive && setUserRating(star)}
                    onMouseEnter={() => interactive && setHoverRating(star)}
                    onMouseLeave={() => interactive && setHoverRating(0)}
                    className={interactive ? 'cursor-pointer transition-transform hover:scale-110' : 'cursor-default'}
                >
                    <Star
                        className={`${size} transition-colors ${star <= (interactive ? (hoverRating || userRating) : rating)
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-gray-200'
                            }`}
                    />
                </button>
            ))}
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Average Rating Summary */}
            <div className="flex items-center gap-4 p-5 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800/30">
                <div className="text-center">
                    <div className="text-3xl font-black text-gray-900 dark:text-white">{avgRating || '—'}</div>
                    <StarRating rating={avgRating} />
                    <div className="text-xs text-gray-500 mt-1 font-bold">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</div>
                </div>
            </div>

            {/* Write a Review */}
            {user && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-3">
                        {hasReviewed ? 'Update Your Review' : 'Write a Review'}
                    </h4>
                    <div className="mb-3">
                        <StarRating rating={userRating} interactive size="w-7 h-7" />
                    </div>
                    <textarea
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        placeholder="Share your experience with this course..."
                        className="w-full h-24 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 focus:border-orange-500 focus:ring-orange-500 resize-none text-sm"
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={userRating === 0 || submitting}
                        className="mt-3 flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {hasReviewed ? 'Update' : 'Submit'} Review
                    </button>
                </div>
            )}

            {/* Reviews List */}
            <div className="space-y-3">
                <AnimatePresence>
                    {reviews.map((review) => (
                        <motion.div
                            key={review.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                    <User className="w-4 h-4 text-orange-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                                        {review.profiles?.full_name || review.profiles?.first_name || 'Student'}
                                    </p>
                                    <StarRating rating={review.rating} size="w-3 h-3" />
                                </div>
                                <span className="ml-auto text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString()}</span>
                            </div>
                            {review.review_text && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 pl-11">{review.review_text}</p>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
