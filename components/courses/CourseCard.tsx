"use client";

import { BookOpen, Clock, Users, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface CourseCardProps {
    course: {
        id: string;
        title: string;
        description: string;
        thumbnail_url?: string;
        difficulty_level: string;
        estimated_duration_hours: number;
        module_categories?: {
            name: string;
            color?: string;
        };
        course_enrollments?: Array<{
            id: string;
            progress_percentage: number;
            status: string;
        }>;
        _count?: {
            enrollments: number;
        };
    };
}

export function CourseCard({ course }: CourseCardProps) {
    const enrollment = course.course_enrollments?.[0];
    const isEnrolled = !!enrollment;
    const progress = enrollment?.progress_percentage || 0;

    const difficultyColors = {
        beginner: 'bg-orange-100 text-orange-700 border-orange-300',
        intermediate: 'bg-blue-100 text-blue-700 border-blue-300',
        advanced: 'bg-orange-500 text-white border-orange-600',
    };

    const difficultyColor = difficultyColors[course.difficulty_level as keyof typeof difficultyColors] || difficultyColors.beginner;

    return (
        <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 group">
            {/* Thumbnail */}
            <div className="relative h-48 bg-orange-100 overflow-hidden">
                {course.thumbnail_url ? (
                    <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-16 h-16 text-orange-300" />
                    </div>
                )}

                {/* Category Badge */}
                {course.module_categories && (
                    <div className="absolute top-3 left-3">
                        <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-700 shadow-sm">
                            {course.module_categories.name}
                        </span>
                    </div>
                )}

                {/* Progress Bar (if enrolled) */}
                {isEnrolled && progress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-200">
                        <div
                            className="h-full bg-orange-500 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-5">
                {/* Title */}
                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-orange-600 transition-colors">
                    {course.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {course.description}
                </p>

                {/* Meta Info */}
                <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{course.estimated_duration_hours}h</span>
                    </div>
                    {course._count?.enrollments !== undefined && (
                        <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{course._count.enrollments} enrolled</span>
                        </div>
                    )}
                    <div className={`px-2 py-0.5 rounded-full border text-xs font-medium ${difficultyColor}`}>
                        {course.difficulty_level}
                    </div>
                </div>

                {/* Progress Info (if enrolled) */}
                {isEnrolled && (
                    <div className="mb-4 flex items-center gap-2 text-sm">
                        <TrendingUp className="w-4 h-4 text-orange-500" />
                        <span className="text-gray-700 font-medium">{progress}% Complete</span>
                    </div>
                )}

                {/* Action Button */}
                <Link href={`/courses/${course.id}`} className="block">
                    <Button
                        className={`w-full ${isEnrolled
                            ? 'bg-orange-600 hover:bg-orange-700'
                            : 'bg-blue-600 hover:bg-blue-700'
                            } text-white font-semibold shadow-md hover:shadow-lg transition-all`}
                    >
                        {isEnrolled ? 'Continue Learning' : 'View Course'}
                    </Button>
                </Link>
            </div>
        </div>
    );
}
