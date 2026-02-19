"use client";

import { Search, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CourseFiltersProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    selectedCategory: string;
    onCategoryChange: (category: string) => void;
    selectedDifficulty: string;
    onDifficultyChange: (difficulty: string) => void;
    sortBy: string;
    onSortChange: (sort: string) => void;
    categories: Array<{ id: string; name: string }>;
}

export function CourseFilters({
    searchQuery,
    onSearchChange,
    selectedCategory,
    onCategoryChange,
    selectedDifficulty,
    onDifficultyChange,
    sortBy,
    onSortChange,
    categories,
}: CourseFiltersProps) {
    const hasActiveFilters = selectedCategory !== 'all' || selectedDifficulty !== 'all' || searchQuery !== '';

    const clearFilters = () => {
        onSearchChange('');
        onCategoryChange('all');
        onDifficultyChange('all');
    };

    return (
        <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-100">
            {/* Search Bar */}
            <div className="mb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search courses..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap gap-4 items-center">
                {/* Category Filter */}
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                        value={selectedCategory}
                        onChange={(e) => onCategoryChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                        <option value="all">All Categories</option>
                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Difficulty Filter */}
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                    <select
                        value={selectedDifficulty}
                        onChange={(e) => onDifficultyChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                        <option value="all">All Levels</option>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                    </select>
                </div>

                {/* Sort By */}
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                    <select
                        value={sortBy}
                        onChange={(e) => onSortChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                        <option value="newest">Newest First</option>
                        <option value="popular">Most Popular</option>
                        <option value="title">Title (A-Z)</option>
                    </select>
                </div>

                {/* Clear Filters Button */}
                {hasActiveFilters && (
                    <div className="flex items-end">
                        <Button
                            onClick={clearFilters}
                            variant="outline"
                            className="flex items-center gap-2 border-gray-300 hover:bg-gray-50"
                        >
                            <X className="w-4 h-4" />
                            Clear Filters
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
