"use client";

import { CheckCircle, Lock, Clock, FileText } from 'lucide-react';

interface Module {
    id: string;
    title: string;
    description?: string;
    estimated_duration_minutes?: number;
    order_index: number;
    user_progress?: Array<{
        completed: boolean;
    }>;
}

interface ModuleListProps {
    modules: Array<{
        order_index: number;
        is_required: boolean;
        learning_modules: Module;
    }>;
    isEnrolled: boolean;
    courseId: string;
}

export function ModuleList({ modules, isEnrolled, courseId }: ModuleListProps) {
    const sortedModules = [...modules].sort((a, b) => a.order_index - b.order_index);

    return (
        <div className="space-y-3">
            {sortedModules.map((courseModule, index) => {
                const learningModule = courseModule.learning_modules;
                const isCompleted = learningModule.user_progress?.[0]?.completed || false;
                const moduleNumber = index + 1;

                return (
                    <div
                        key={learningModule.id}
                        className={`bg-white rounded-lg border-2 p-4 transition-all ${isEnrolled
                            ? 'border-gray-200 hover:border-orange-300 hover:shadow-md cursor-pointer'
                            : 'border-gray-100 opacity-75'
                            }`}
                        onClick={() => {
                            if (isEnrolled) {
                                window.location.href = `/courses/${courseId}/modules/${learningModule.id}`;
                            }
                        }}
                    >
                        <div className="flex items-start gap-4">
                            {/* Module Number/Status */}
                            <div className="flex-shrink-0">
                                {isCompleted ? (
                                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                    </div>
                                ) : isEnrolled ? (
                                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                                        <span className="text-sm font-bold text-orange-600">{moduleNumber}</span>
                                    </div>
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                        <Lock className="w-5 h-5 text-gray-400" />
                                    </div>
                                )}
                            </div>

                            {/* Module Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                    <h4 className={`font-semibold ${isEnrolled ? 'text-gray-900' : 'text-gray-500'}`}>
                                        {learningModule.title}
                                    </h4>
                                    {courseModule.is_required && (
                                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-medium flex-shrink-0">
                                            Required
                                        </span>
                                    )}
                                </div>

                                {learningModule.description && (
                                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{learningModule.description}</p>
                                )}

                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                    {learningModule.estimated_duration_minutes && (
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>{learningModule.estimated_duration_minutes} min</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1">
                                        <FileText className="w-3.5 h-3.5" />
                                        <span>Lesson {moduleNumber}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
