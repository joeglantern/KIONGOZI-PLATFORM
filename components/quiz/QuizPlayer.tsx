"use client";

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/app/utils/supabase/client';
import { Button } from '@/components/ui/button';
import {
    ChevronRight,
    ChevronLeft,
    CheckCircle2,
    XCircle,
    Timer,
    Trophy,
    RefreshCw,
    Loader2,
    AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

interface QuizPlayerProps {
    quizId: string;
    courseId: string;
    onComplete?: (score: number, passed: boolean) => void;
}

interface QuizData {
    id: string;
    title: string;
    description: string;
    passing_score: number;
    time_limit_minutes: number;
}

interface Question {
    id: string;
    question_text: string;
    question_type: string;
    points: number;
    options: Option[];
}

interface Option {
    id: string;
    option_text: string;
    is_correct: boolean;
}

export default function QuizPlayer({ quizId, courseId, onComplete }: QuizPlayerProps) {
    const supabase = createBrowserClient();
    const [loading, setLoading] = useState(true);
    const [quiz, setQuiz] = useState<QuizData | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
    const [submitted, setSubmitted] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [score, setScore] = useState(0);
    const [passed, setPassed] = useState(false);

    useEffect(() => {
        fetchQuizData();
    }, [quizId]);

    useEffect(() => {
        if (timeLeft !== null && timeLeft > 0 && !submitted) {
            const timer = setInterval(() => {
                setTimeLeft(prev => (prev !== null ? prev - 1 : null));
            }, 1000);
            return () => clearInterval(timer);
        } else if (timeLeft === 0 && !submitted) {
            handleSubmit();
        }
    }, [timeLeft, submitted]);

    const fetchQuizData = async () => {
        try {
            setLoading(true);
            // Fetch quiz metadata
            const { data: quizData, error: quizError } = await supabase
                .from('quizzes')
                .select('*')
                .eq('id', quizId)
                .single();

            if (quizError) throw quizError;
            setQuiz(quizData);

            if (quizData.time_limit_minutes > 0) {
                setTimeLeft(quizData.time_limit_minutes * 60);
            }

            // Fetch questions and options
            const { data: questionsData, error: questionsError } = await supabase
                .from('quiz_questions')
                .select(`
                    id,
                    question_text,
                    question_type,
                    points,
                    quiz_options (
                        id,
                        option_text,
                        is_correct
                    )
                `)
                .eq('quiz_id', quizId)
                .order('order_index');

            if (questionsError) throw questionsError;

            const formattedQuestions = questionsData.map((q: any) => ({
                ...q,
                options: q.quiz_options
            }));

            setQuestions(formattedQuestions);
        } catch (error) {
            console.error('Error fetching quiz:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOptionSelect = (questionId: string, optionId: string) => {
        if (submitted) return;
        setUserAnswers(prev => ({ ...prev, [questionId]: optionId }));
    };

    const handleSubmit = async () => {
        if (submitted) return;
        setSubmitted(true);

        let totalPoints = 0;
        let earnedPoints = 0;

        questions.forEach(q => {
            totalPoints += q.points;
            const selectedOptionId = userAnswers[q.id];
            const correctOption = q.options.find(o => o.is_correct);
            if (correctOption && selectedOptionId === correctOption.id) {
                earnedPoints += q.points;
            }
        });

        const finalScore = Math.round((earnedPoints / totalPoints) * 100);
        const didPass = finalScore >= (quiz?.passing_score || 70);

        setScore(finalScore);
        setPassed(didPass);

        if (didPass) {
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#f97316', '#fbbf24', '#ffffff']
            });
        }

        // Record attempt
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('quiz_attempts').insert({
                    quiz_id: quizId,
                    user_id: user.id,
                    score: finalScore,
                    passed: didPass
                });

                // Award XP if passed
                if (didPass) {
                    // Fetch existing XP
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('xp')
                        .eq('id', user.id)
                        .single();

                    const xpToAward = 50; // Quizzes award 50 XP
                    await supabase
                        .from('profiles')
                        .update({ xp: (profile?.xp || 0) + xpToAward })
                        .eq('id', user.id);
                }
            }
        } catch (error) {
            console.error('Error recording attempt:', error);
        }

        if (onComplete) onComplete(finalScore, didPass);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
                <p className="text-gray-500 font-bold animate-pulse">Loading Quiz...</p>
            </div>
        );
    }

    if (!quiz || questions.length === 0) {
        return (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-8 rounded-3xl text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-black text-red-900 dark:text-red-400 mb-2">Quiz not found</h3>
                <p className="text-red-700 dark:text-red-300">We couldn't load the questions for this quiz. Please contact your instructor.</p>
            </div>
        );
    }

    if (submitted) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-10 md:p-16 shadow-2xl text-center relative overflow-hidden"
            >
                {passed && (
                    <div className="absolute top-0 left-0 w-full h-2 bg-orange-500 animate-pulse" />
                )}

                <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg ${passed ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'}`}>
                    {passed ? <Trophy className="w-12 h-12" /> : <XCircle className="w-12 h-12" />}
                </div>

                <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-4">
                    {passed ? "Congratulations!" : "Keep learning!"}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-lg mb-10 max-w-md mx-auto">
                    {passed
                        ? `You passed the quiz with a score of ${score}%! You've earned 50 XP.`
                        : `You scored ${score}%, which is below the ${quiz.passing_score}% required to pass. Take another look at the material and try again!`}
                </p>

                <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-10">
                    <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Your Score</p>
                        <p className={`text-3xl font-black ${passed ? 'text-green-600' : 'text-red-600'}`}>{score}%</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                        <p className={`text-xl font-black uppercase tracking-tighter ${passed ? 'text-green-600' : 'text-red-600'}`}>
                            {passed ? "Passed" : "Failed"}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    {!passed && (
                        <Button
                            onClick={() => window.location.reload()}
                            className="bg-orange-500 hover:bg-orange-600 text-white px-10 py-7 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Retake Quiz
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        onClick={() => window.history.back()}
                        className="border-2 border-gray-200 dark:border-gray-700 px-10 py-7 rounded-2xl font-black uppercase tracking-widest text-xs active:scale-95 transition-all"
                    >
                        Back to Lesson
                    </Button>
                </div>
            </motion.div>
        );
    }

    const currentQuestion = questions[currentQuestionIdx];
    const progress = ((currentQuestionIdx + 1) / questions.length) * 100;

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header / Meta */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">{quiz.title}</h2>
                    <div className="flex items-center gap-4 text-sm font-bold text-gray-400">
                        <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-orange-500" />
                            <span>Question {currentQuestionIdx + 1} of {questions.length}</span>
                        </div>
                        <div className="w-1 h-1 bg-gray-300 rounded-full" />
                        <span>{quiz.passing_score}% required to pass</span>
                    </div>
                </div>

                {timeLeft !== null && (
                    <div className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl font-black transition-colors ${timeLeft < 60 ? 'bg-red-50 text-red-600 dark:bg-red-950/40 animate-pulse' : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
                        <Timer className="w-4 h-4" />
                        <span>{formatTime(timeLeft)}</span>
                    </div>
                )}
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full mb-10 p-1">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-orange-500 rounded-full shadow-sm"
                />
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={currentQuestion.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-8 md:p-12 shadow-xl"
                >
                    <div className="mb-10">
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white leading-tight mb-4">
                            {currentQuestion.question_text}
                        </h3>
                        <div className="h-1 w-20 bg-orange-100 dark:bg-orange-950 rounded-full" />
                    </div>

                    <div className="space-y-4">
                        {currentQuestion.options.map((option) => (
                            <button
                                key={option.id}
                                onClick={() => handleOptionSelect(currentQuestion.id, option.id)}
                                className={`w-full group flex items-start gap-4 p-6 rounded-3xl border-2 text-left transition-all ${userAnswers[currentQuestion.id] === option.id
                                    ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-500/10'
                                    : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30'
                                    }`}
                            >
                                <div className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${userAnswers[currentQuestion.id] === option.id
                                    ? 'border-orange-500 bg-orange-500'
                                    : 'border-gray-300 dark:border-gray-600 group-hover:border-orange-400'
                                    }`}>
                                    {userAnswers[currentQuestion.id] === option.id && (
                                        <div className="w-2 h-2 bg-white rounded-full" />
                                    )}
                                </div>
                                <span className={`font-bold transition-colors ${userAnswers[currentQuestion.id] === option.id
                                    ? 'text-orange-900 dark:text-white'
                                    : 'text-gray-600 dark:text-gray-400'
                                    }`}>
                                    {option.option_text}
                                </span>
                            </button>
                        ))}
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8">
                <Button
                    variant="ghost"
                    disabled={currentQuestionIdx === 0}
                    onClick={() => setCurrentQuestionIdx(prev => prev - 1)}
                    className="rounded-2xl px-6 py-6 font-black text-xs uppercase tracking-widest text-gray-400 hover:text-gray-900 disabled:opacity-0 transition-all"
                >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                </Button>

                {currentQuestionIdx === questions.length - 1 ? (
                    <Button
                        disabled={!userAnswers[currentQuestion.id]}
                        onClick={handleSubmit}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-10 py-7 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
                    >
                        Submit Quiz
                        <CheckCircle2 className="w-4 h-4 ml-2" />
                    </Button>
                ) : (
                    <Button
                        disabled={!userAnswers[currentQuestion.id]}
                        onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
                        className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 px-8 py-7 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all"
                    >
                        Next Question
                        <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                )}
            </div>
        </div>
    );
}
