"use client";

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/app/utils/supabase/client';
import { Button } from '@/components/ui/button';
import {
    Plus,
    Trash2,
    Save,
    Settings,
    PlusCircle,
    CheckCircle2,
    AlertCircle,
    GripVertical,
    ChevronDown,
    ChevronUp,
    Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QuizBuilderProps {
    courseId: string;
    moduleId?: string;
    quizId?: string;
    onSave?: (quizId: string) => void;
}

interface QuizMetadata {
    title: string;
    description: string;
    passing_score: number;
    time_limit_minutes: number;
}

interface Question {
    id?: string;
    question_text: string;
    question_type: string;
    points: number;
    options: Option[];
    is_new?: boolean;
}

interface Option {
    id?: string;
    option_text: string;
    is_correct: boolean;
    is_new?: boolean;
}

export default function QuizBuilder({ courseId, moduleId, quizId, onSave }: QuizBuilderProps) {
    const supabase = createBrowserClient();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [availableModules, setAvailableModules] = useState<any[]>([]);

    const [metadata, setMetadata] = useState<QuizMetadata & { module_id: string | null }>({
        title: '',
        description: '',
        passing_score: 70,
        time_limit_minutes: 0,
        module_id: moduleId || null
    });

    const [questions, setQuestions] = useState<Question[]>([]);
    const [activeQuestionIdx, setActiveQuestionIdx] = useState<number | null>(0);

    useEffect(() => {
        fetchCourseModules();
        if (quizId) {
            fetchQuizData();
        } else {
            // New quiz, add one default question
            addQuestion();
        }
    }, [quizId]);

    const fetchCourseModules = async () => {
        const { data } = await supabase
            .from('course_modules')
            .select(`
                learning_modules (id, title)
            `)
            .eq('course_id', courseId)
            .order('order_index');

        if (data) {
            setAvailableModules(data.map((m: any) => m.learning_modules));
        }
    };

    const fetchQuizData = async () => {
        try {
            setLoading(true);
            const { data: quizData, error: quizError } = await supabase
                .from('quizzes')
                .select('*')
                .eq('id', quizId)
                .single();

            if (quizError) throw quizError;
            setMetadata({
                title: quizData.title,
                description: quizData.description,
                passing_score: quizData.passing_score,
                time_limit_minutes: quizData.time_limit_minutes,
                module_id: quizData.module_id
            });

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
                id: q.id,
                question_text: q.question_text,
                question_type: q.question_type,
                points: q.points,
                options: q.quiz_options.map((o: any) => ({
                    id: o.id,
                    option_text: o.option_text,
                    is_correct: o.is_correct
                }))
            }));

            setQuestions(formattedQuestions);
        } catch (error) {
            console.error('Error fetching quiz data:', error);
        } finally {
            setLoading(false);
        }
    };

    const addQuestion = () => {
        const newQuestion: Question = {
            question_text: '',
            question_type: 'multiple_choice',
            points: 10,
            is_new: true,
            options: [
                { option_text: '', is_correct: true, is_new: true },
                { option_text: '', is_correct: false, is_new: true }
            ]
        };
        setQuestions([...questions, newQuestion]);
        setActiveQuestionIdx(questions.length);
    };

    const removeQuestion = (idx: number) => {
        const newQuestions = questions.filter((_, i) => i !== idx);
        setQuestions(newQuestions);
        if (activeQuestionIdx === idx) {
            setActiveQuestionIdx(newQuestions.length > 0 ? 0 : null);
        } else if (activeQuestionIdx !== null && activeQuestionIdx > idx) {
            setActiveQuestionIdx(activeQuestionIdx - 1);
        }
    };

    const updateQuestion = (idx: number, updates: Partial<Question>) => {
        const newQuestions = [...questions];
        newQuestions[idx] = { ...newQuestions[idx], ...updates };
        setQuestions(newQuestions);
    };

    const addOption = (qIdx: number) => {
        const newQuestions = [...questions];
        newQuestions[qIdx].options.push({ option_text: '', is_correct: false, is_new: true });
        setQuestions(newQuestions);
    };

    const removeOption = (qIdx: number, oIdx: number) => {
        const newQuestions = [...questions];
        newQuestions[qIdx].options = newQuestions[qIdx].options.filter((_, i) => i !== oIdx);
        setQuestions(newQuestions);
    };

    const updateOption = (qIdx: number, oIdx: number, updates: Partial<Option>) => {
        const newQuestions = [...questions];

        // If setting this option as correct, unset others for MC
        if (updates.is_correct) {
            newQuestions[qIdx].options = newQuestions[qIdx].options.map((o, i) => ({
                ...o,
                is_correct: i === oIdx
            }));
        } else {
            newQuestions[qIdx].options[oIdx] = { ...newQuestions[qIdx].options[oIdx], ...updates };
        }

        setQuestions(newQuestions);
    };

    const handleSave = async () => {
        if (!metadata.title) {
            alert('Please enter a quiz title');
            return;
        }

        try {
            setSaving(true);

            // 1. Create or Update Quiz metadata
            let currentQuizId = quizId;
            if (!currentQuizId) {
                const { data, error } = await supabase
                    .from('quizzes')
                    .insert({
                        course_id: courseId,
                        module_id: metadata.module_id || null,
                        title: metadata.title,
                        description: metadata.description,
                        passing_score: metadata.passing_score,
                        time_limit_minutes: metadata.time_limit_minutes
                    })
                    .select()
                    .single();

                if (error) throw error;
                currentQuizId = data.id;
            } else {
                const { error } = await supabase
                    .from('quizzes')
                    .update({
                        module_id: metadata.module_id || null,
                        title: metadata.title,
                        description: metadata.description,
                        passing_score: metadata.passing_score,
                        time_limit_minutes: metadata.time_limit_minutes
                    })
                    .eq('id', currentQuizId);

                if (error) throw error;
            }

            // 2. Save Questions and Options
            // For simplicity, we'll replace all questions if it's an update (or we could do diffing)
            // But let's try a bit cleaner: if question has ID, update it; if not, insert.

            for (let i = 0; i < questions.length; i++) {
                const q = questions[i];
                let questionId = q.id;

                if (!questionId) {
                    const { data, error } = await supabase
                        .from('quiz_questions')
                        .insert({
                            quiz_id: currentQuizId,
                            question_text: q.question_text,
                            question_type: q.question_type,
                            points: q.points,
                            order_index: i
                        })
                        .select()
                        .single();
                    if (error) throw error;
                    questionId = data.id;
                } else {
                    await supabase
                        .from('quiz_questions')
                        .update({
                            question_text: q.question_text,
                            points: q.points,
                            order_index: i
                        })
                        .eq('id', questionId);
                }

                // Options for this question
                // Wiping and re-inserting options is usually safer for dynamic forms
                await supabase.from('quiz_options').delete().eq('question_id', questionId);

                const optionsToInsert = q.options.map(o => ({
                    question_id: questionId,
                    option_text: o.option_text,
                    is_correct: o.is_correct
                }));

                await supabase.from('quiz_options').insert(optionsToInsert);
            }

            if (onSave) onSave(currentQuizId!);
            alert('Quiz saved successfully!');
        } catch (error) {
            console.error('Error saving quiz:', error);
            alert('Failed to save quiz. Check console for details.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
                <p className="text-gray-500 font-bold animate-pulse">Loading Builder...</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Settings & Questions List */}
            <div className="lg:col-span-4 space-y-6">
                {/* General Settings */}
                <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <Settings className="w-5 h-5 text-gray-400" />
                        <h3 className="font-black text-xs uppercase tracking-widest text-gray-500">Quiz Settings</h3>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Quiz Title</label>
                            <input
                                type="text"
                                value={metadata.title}
                                onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                                placeholder="Final Exam"
                                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Linked Module (Optional)</label>
                            <select
                                value={metadata.module_id || ''}
                                onChange={(e) => setMetadata({ ...metadata, module_id: e.target.value || null })}
                                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 transition-all appearance-none cursor-pointer"
                            >
                                <option value="">General Course Quiz</option>
                                {availableModules.map(m => (
                                    <option key={m.id} value={m.id}>{m.title}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Passing %</label>
                                <input
                                    type="number"
                                    value={metadata.passing_score}
                                    onChange={(e) => setMetadata({ ...metadata, passing_score: parseInt(e.target.value) })}
                                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Time (mins)</label>
                                <input
                                    type="number"
                                    value={metadata.time_limit_minutes}
                                    onChange={(e) => setMetadata({ ...metadata, time_limit_minutes: parseInt(e.target.value) })}
                                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Question Navigator */}
                <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-black text-xs uppercase tracking-widest text-gray-500">Questions</h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={addQuestion}
                            className="h-8 px-3 rounded-lg text-orange-500 hover:text-orange-600 hover:bg-orange-50 font-bold"
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            Add
                        </Button>
                    </div>

                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {questions.map((q, idx) => (
                            <button
                                key={idx}
                                onClick={() => setActiveQuestionIdx(idx)}
                                className={`w-full group flex items-center gap-3 p-4 rounded-2xl text-left border-2 transition-all ${activeQuestionIdx === idx
                                    ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-500/10'
                                    : 'border-transparent bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`}
                            >
                                <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${activeQuestionIdx === idx ? 'bg-orange-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                                    }`}>
                                    {idx + 1}
                                </span>
                                <span className={`flex-1 font-bold truncate ${activeQuestionIdx === idx ? 'text-gray-900 dark:text-white' : 'text-gray-500'
                                    }`}>
                                    {q.question_text || "Untitled Question"}
                                </span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); removeQuestion(idx); }}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 text-red-400 hover:text-red-500 rounded-md transition-all"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </button>
                        ))}
                    </div>
                </div>

                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-gray-900 hover:bg-black text-white py-8 rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Quiz
                </Button>
            </div>

            {/* Right Column: Active Question Editor */}
            <div className="lg:col-span-8">
                <AnimatePresence mode="wait">
                    {activeQuestionIdx !== null ? (
                        <motion.div
                            key={activeQuestionIdx}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-10 md:p-12 shadow-sm"
                        >
                            <div className="flex items-center justify-between mb-10">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 dark:text-white">Edit Question {activeQuestionIdx + 1}</h2>
                                    <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">Configure options and points</p>
                                </div>
                                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-2 rounded-2xl">
                                    <span className="text-[10px] font-black uppercase tracking-tight text-gray-400 ml-2">Points</span>
                                    <input
                                        type="number"
                                        value={questions[activeQuestionIdx].points}
                                        onChange={(e) => updateQuestion(activeQuestionIdx, { points: parseInt(e.target.value) })}
                                        className="w-16 bg-white dark:bg-gray-900 border-none rounded-xl px-3 py-2 font-black text-center text-orange-500 focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 ml-1">Question Content</label>
                                    <textarea
                                        value={questions[activeQuestionIdx].question_text}
                                        onChange={(e) => updateQuestion(activeQuestionIdx, { question_text: e.target.value })}
                                        placeholder="What is the capital of France?"
                                        className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-[1.5rem] p-6 font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 min-h-[120px] resize-none transition-all placeholder:text-gray-300"
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-4 px-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Options</label>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">Pick Correct Answer</span>
                                    </div>

                                    <div className="space-y-3">
                                        {questions[activeQuestionIdx].options.map((option, oIdx) => (
                                            <div key={oIdx} className="flex gap-3 group">
                                                <button
                                                    onClick={() => updateOption(activeQuestionIdx, oIdx, { is_correct: true })}
                                                    className={`w-14 shrink-0 rounded-2xl flex items-center justify-center transition-all ${option.is_correct
                                                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-300 hover:text-gray-400'
                                                        }`}
                                                >
                                                    <CheckCircle2 className="w-6 h-6" />
                                                </button>
                                                <input
                                                    type="text"
                                                    value={option.option_text}
                                                    onChange={(e) => updateOption(activeQuestionIdx, oIdx, { option_text: e.target.value })}
                                                    placeholder={`Option ${oIdx + 1}`}
                                                    className={`flex-1 bg-gray-50 dark:bg-gray-800 border-2 rounded-2xl px-6 py-4 font-bold transition-all ${option.is_correct
                                                        ? 'border-green-500/30 ring-1 ring-green-500/10'
                                                        : 'border-transparent focus:ring-2 focus:ring-orange-500'
                                                        }`}
                                                />
                                                <button
                                                    onClick={() => removeOption(activeQuestionIdx, oIdx)}
                                                    className="w-14 shrink-0 bg-gray-50 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-300 hover:text-red-400 rounded-2xl flex items-center justify-center transition-all"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    <Button
                                        variant="ghost"
                                        onClick={() => addOption(activeQuestionIdx)}
                                        className="w-full mt-4 py-8 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[1.5rem] text-gray-400 hover:text-orange-500 hover:border-orange-500/30 hover:bg-orange-50/50 transition-all font-bold group"
                                    >
                                        <PlusCircle className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                                        Add another option
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="h-full bg-gray-50 dark:bg-gray-900/50 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-[2.5rem] flex flex-col items-center justify-center p-20 text-center">
                            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-3xl flex items-center justify-center text-gray-300 mb-6 font-bold">
                                ?
                            </div>
                            <h3 className="text-xl font-black text-gray-400 mb-2">No question selected</h3>
                            <p className="text-gray-400 text-sm max-w-xs mb-8">Click on a question on the left or add a new one to start building your quiz.</p>
                            <Button onClick={addQuestion} className="bg-orange-500 hover:bg-orange-600 text-white px-8 rounded-xl font-bold">
                                Create first question
                            </Button>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
