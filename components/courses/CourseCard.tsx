"use client";

import { memo } from 'react';
import { BookOpen, Clock, Users, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

// Hoisted outside component — no re-allocation on every render
const DIFFICULTY_COLORS: Record<string, string> = {
    beginner: 'bg-orange-100 text-orange-700 border-orange-300',
    intermediate: 'bg-blue-100 text-blue-700 border-blue-300',
    advanced: 'bg-orange-500 text-white border-orange-600',
};

interface CourseCardProps {
    course: {
        id: string;
        title: string;
        description: string;
        thumbnail_url?: string;
        difficulty_level: string;
        estimated_duration_hours: number;
        enrollment_count?: number;
        module_categories?: {
            name: string;
            color?: string;
        };
        course_enrollments?: Array<{
            id: string;
            progress_percentage: number;
            status: string;
        }>;
    };
}

export const CourseCard = memo(function CourseCard({ course }: CourseCardProps) {
    const enrollment = course.course_enrollments?.[0];
    const isEnrolled = !!enrollment;
    const progress = enrollment?.progress_percentage || 0;
    const difficultyColor = DIFFICULTY_COLORS[course.difficulty_level] ?? DIFFICULTY_COLORS.beginner;

    return (
        <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 group">
            {/* Thumbnail */}
            <div className="relative h-48 bg-orange-100 overflow-hidden">
                {course.thumbnail_url ? (
                    <Image
                        src={course.thumbnail_url}
                        alt={course.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
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
                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-orange-600 transition-colors">
                    {course.title}
                </h3>

                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {course.description}
                </p>

                {/* Meta Info */}
                <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{course.estimated_duration_hours}h</span>
                    </div>
                    {course.enrollment_count !== undefined && course.enrollment_count > 0 && (
                        <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{course.enrollment_count} enrolled</span>
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
                <Button
                    asChild
                    className={`w-full ${isEnrolled
                        ? 'bg-orange-600 hover:bg-orange-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                        } text-white font-semibold shadow-md hover:shadow-lg transition-all`}
                >
                    <Link href={`/courses/${course.id}`}>
                        {isEnrolled ? 'Continue Learning' : 'View Course'}
                    </Link>
                </Button>
            </div>
        </div>
    );
});
