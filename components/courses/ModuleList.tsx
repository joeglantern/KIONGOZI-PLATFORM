"use client";

import Link from 'next/link';
import { CheckCircle, Lock, Clock, FileText, Play } from 'lucide-react';

export type CourseContentItem = {
    id: string;
    type: 'module' | 'scorm';
    title: string;
    description?: string;
    durationMinutes?: number;
    href: string;
    isCompleted: boolean;
    isRequired: boolean;
};

interface ModuleListProps {
    items: CourseContentItem[];
    isAccessible: boolean;
}

export function ModuleList({ items, isAccessible }: ModuleListProps) {
    return (
        <div className="space-y-3">
            {items.map((item, index) => {
                const lessonNumber = index + 1;
                const Icon = item.type === 'scorm' ? Play : FileText;
                const lessonLabel = item.type === 'scorm' ? `Interactive ${lessonNumber}` : `Lesson ${lessonNumber}`;

                const content = (
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                            {item.isCompleted ? (
                                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                </div>
                            ) : isAccessible ? (
                                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                                    <span className="text-sm font-bold text-orange-600">{lessonNumber}</span>
                                </div>
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                    <Lock className="w-5 h-5 text-gray-400" />
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                                <h4 className={`font-semibold ${isAccessible ? 'text-gray-900' : 'text-gray-500'}`}>
                                    {item.title}
                                </h4>
                                {item.isRequired && (
                                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-medium flex-shrink-0">
                                        Required
                                    </span>
                                )}
                            </div>

                            {item.description && (
                                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
                            )}

                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                {item.durationMinutes && (
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>{item.durationMinutes} min</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-1">
                                    <Icon className="w-3.5 h-3.5" />
                                    <span>{lessonLabel}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );

                if (!isAccessible) {
                    return (
                        <div
                            key={`${item.type}:${item.id}`}
                            className="bg-white rounded-lg border-2 border-gray-100 opacity-75 p-4 transition-all"
                        >
                            {content}
                        </div>
                    );
                }

                return (
                    <Link
                        key={`${item.type}:${item.id}`}
                        href={item.href}
                        className="block bg-white rounded-lg border-2 border-gray-200 hover:border-orange-300 hover:shadow-md cursor-pointer p-4 transition-all"
                    >
                        {content}
                    </Link>
                );
            })}
        </div>
    );
}
