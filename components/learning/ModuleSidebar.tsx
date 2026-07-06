"use client";

import { CheckCircle, Circle, BookOpen, Play, ArrowLeft, X, FileText } from 'lucide-react';
import Link from 'next/link';

interface Module {
    id: string;
    title: string;
    order_index: number;
    user_progress?: Array<{
        status: string;
    }>;
}

interface ModuleSidebarProps {
    modules: Array<{
        order_index: number;
        learning_modules: Module;
    }>;
    currentModuleId: string;
    courseId: string;
    courseTitle: string;
    slidesUrl?: string | null;
    videoUrl?: string | null;
    deliveryMode: 'text' | 'slides' | 'video';
    onDeliveryModeChange?: (mode: 'text' | 'slides' | 'video') => void;
}

export function ModuleSidebar({
    modules,
    currentModuleId,
    courseId,
    courseTitle,
    slidesUrl,
    videoUrl,
    deliveryMode,
    onDeliveryModeChange,
}: ModuleSidebarProps) {
    const sortedModules = [...modules].sort((a, b) => a.order_index - b.order_index);
    const completedCount = sortedModules.filter((m) => m.learning_modules.user_progress?.[0]?.status === 'completed').length;
    const totalCount = sortedModules.length;
    const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return (
        <div className="h-full bg-white/95 backdrop-blur-xl border-r border-gray-100 flex flex-col shadow-sm">
            {/* Sidebar Header */}
            <div className="p-6 border-b border-gray-100/50">
                <div className="flex items-center justify-between mb-4">
                    <Link
                        href={`/courses/${courseId}`}
                        className="group flex flex-1 items-center space-x-2 text-gray-500 hover:text-orange-600 transition-colors p-2 -ml-2 rounded-xl hover:bg-orange-50"
                    >
                        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                        <span className="text-sm font-bold uppercase tracking-wide">Back to Course</span>
                    </Link>
                </div>

                <h1 className="text-lg font-medium text-gray-900 mb-3 line-clamp-2">
                    {courseTitle}
                </h1>

                {/* Progress Bar */}
                <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                    <div
                        className="bg-orange-500 h-2 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>
                <div className="flex justify-between items-center">
                    <p className="text-xs font-medium text-gray-500">
                        {progressPercentage}% Complete
                    </p>
                    <p className="text-[10px] text-gray-400 font-medium">
                        {completedCount}/{totalCount} Lessons
                    </p>
                </div>

                {/* Format Selector / Learning Path (if slides or video are available) */}
                {(slidesUrl || videoUrl) && (
                    <div className="mt-5 pt-4 border-t border-gray-100/50">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                            Delivery Format
                        </p>
                        <div className="grid grid-cols-3 gap-1 bg-gray-55 p-1 rounded-xl border border-gray-100/80">
                            <button
                                onClick={() => onDeliveryModeChange?.('text')}
                                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all duration-200 ${
                                    deliveryMode === 'text'
                                        ? 'bg-white text-orange-650 shadow-sm border border-gray-100 font-black'
                                        : 'text-gray-400 hover:text-gray-600 border border-transparent font-medium'
                                }`}
                                title="Read Text Lesson"
                            >
                                <BookOpen className="w-4 h-4 mb-0.5" />
                                <span className="text-[9px] uppercase tracking-wider">Text</span>
                            </button>
                            {slidesUrl ? (
                                <button
                                    onClick={() => onDeliveryModeChange?.('slides')}
                                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all duration-200 ${
                                        deliveryMode === 'slides'
                                            ? 'bg-white text-orange-650 shadow-sm border border-gray-100 font-black'
                                            : 'text-gray-400 hover:text-gray-650 border border-transparent font-medium'
                                    }`}
                                    title="View Slide Deck"
                                >
                                    <FileText className="w-4 h-4 mb-0.5" />
                                    <span className="text-[9px] uppercase tracking-wider">Slides</span>
                                </button>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-2 px-1 rounded-lg opacity-30 cursor-not-allowed">
                                    <FileText className="w-4 h-4 mb-0.5 text-gray-300" />
                                    <span className="text-[9px] font-medium uppercase tracking-wider text-gray-300">Slides</span>
                                </div>
                            )}
                            {videoUrl ? (
                                <button
                                    onClick={() => onDeliveryModeChange?.('video')}
                                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all duration-200 ${
                                        deliveryMode === 'video'
                                            ? 'bg-white text-orange-650 shadow-sm border border-gray-100 font-black'
                                            : 'text-gray-450 hover:text-gray-600 border border-transparent font-medium'
                                    }`}
                                    title="Watch Video Course"
                                >
                                    <Play className="w-4 h-4 mb-0.5" />
                                    <span className="text-[9px] uppercase tracking-wider">Video</span>
                                </button>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-2 px-1 rounded-lg opacity-30 cursor-not-allowed">
                                    <Play className="w-4 h-4 mb-0.5 text-gray-300" />
                                    <span className="text-[9px] font-medium uppercase tracking-wider text-gray-300">Video</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Module List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* In this simplified version, we treat all modules as a single list for the sidebar */}
                <div className="space-y-1">
                    {sortedModules.map((courseModule, index) => {
                        const learningModule = courseModule.learning_modules;
                        const isCompleted = learningModule.user_progress?.[0]?.status === 'completed';
                        const isActive = learningModule.id === currentModuleId;

                        return (
                            <Link
                                key={learningModule.id}
                                href={`/courses/${courseId}/modules/${learningModule.id}`}
                                className={`w-full group px-4 py-3 rounded-xl text-left border transition-all duration-200 flex items-center space-x-3 ${isActive
                                    ? 'bg-orange-50 border-orange-100 shadow-sm'
                                    : 'bg-transparent border-transparent hover:bg-gray-50'
                                    }`}
                            >
                                <div className="flex-shrink-0">
                                    {isCompleted ? (
                                        <div className="bg-green-100 rounded-lg p-1">
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                        </div>
                                    ) : isActive ? (
                                        <div className="bg-orange-100 rounded-lg p-1">
                                            <Play className="h-4 w-4 text-orange-600 animate-pulse" />
                                        </div>
                                    ) : (
                                        <div className="bg-gray-100 rounded-lg p-1 group-hover:bg-white transition-colors">
                                            <Circle className="h-4 w-4 text-gray-400" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium truncate ${isActive ? 'text-orange-700' : 'text-gray-700'
                                        }`}>
                                        {learningModule.title}
                                    </p>
                                    <p className="text-[11px] text-gray-400 font-medium">
                                        Lesson {index + 1}
                                    </p>
                                </div>

                                {isActive && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                )}
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Sidebar Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                    <BookOpen className="w-3 h-3" />
                    <span>Learning Mode Active</span>
                </div>
            </div>
        </div>
    );
}
