"use client";

import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import QuizPlayer from '@/components/quiz/QuizPlayer';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function StudentQuizPage() {
    const params = useParams();
    const router = useRouter();
    const courseId = params.id as string;
    const quizId = params.quizId as string;

    return (
        <ProtectedRoute allowedRoles={['user', 'instructor', 'admin']}>
            <div className="min-h-screen bg-gray-50 dark:bg-black pb-20">
                {/* Minimal Header */}
                <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-30">
                    <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                        <Link
                            href={`/courses/${courseId}`}
                            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors group"
                        >
                            <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <ArrowLeft className="w-4 h-4" />
                            </div>
                            <span className="font-black text-[10px] uppercase tracking-widest">Back to Course</span>
                        </Link>

                        <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                            <span className="font-black text-[10px] uppercase tracking-widest text-gray-400">Assessment in Progress</span>
                        </div>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto px-6 pt-12">
                    <QuizPlayer
                        quizId={quizId}
                        courseId={courseId}
                        onComplete={(score, passed) => {
                            console.log(`Quiz completed with score: ${score}, Passed: ${passed}`);
                            // Optional: additional logic on completion
                        }}
                    />
                </div>
            </div>
        </ProtectedRoute>
    );
}
