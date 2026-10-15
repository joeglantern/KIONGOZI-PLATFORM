"use client";

import { memo } from 'react';
import { Clock, Users, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { getCourseThumbnail } from '@/lib/course-thumbnail';
import { toPlainText } from '@/lib/plain-text';

// Hoisted outside component, no re-allocation on every render
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
    const thumbnail = getCourseThumbnail({
        title: course.title,
        description: course.description,
        categoryName: course.module_categories?.name,
        thumbnailUrl: course.thumbnail_url,
    });

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-800 group flex flex-col">
            {/* Thumbnail */}
            <div className="relative h-48 bg-orange-100 overflow-hidden">
                <Image
                    src={thumbnail}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Category Badge */}
                {course.module_categories && (
                    <div className="absolute top-3 left-3">
                        <span className="px-3 py-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-700 dark:text-gray-200 shadow-sm">
                            {course.module_categories.name}
                        </span>
                    </div>
                )}

                {/* Progress Bar (if enrolled) */}
                {isEnrolled && progress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-200" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label={`${course.title} progress`}>
                        <div
                            className="h-full bg-orange-500 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-orange-600 transition-colors">
                    {course.title}
                </h3>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {toPlainText(course.description)}
                </p>

                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 text-xs text-gray-500 dark:text-gray-400 mt-auto">
                    {course.estimated_duration_hours > 0 && (
                        <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" aria-hidden="true" />
                            <span>{course.estimated_duration_hours}h</span>
                        </div>
                    )}
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
                        <span className="text-gray-700 dark:text-gray-300 font-medium">{progress}% complete</span>
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
