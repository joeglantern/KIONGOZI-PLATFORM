"use client";

import { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';

interface CourseSearchProps {
    onSearch: (query: string) => void;
    onFilterChange: (filters: SearchFilters) => void;
    categories: { id: string; name: string }[];
}

export interface SearchFilters {
    difficulty: string;
    category: string;
    sortBy: 'newest' | 'popular' | 'az';
}

export function CourseSearchFilter({ onSearch, onFilterChange, categories }: CourseSearchProps) {
    const [query, setQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<SearchFilters>({
        difficulty: 'all',
        category: 'all',
        sortBy: 'newest',
    });

    useEffect(() => {
        const timer = setTimeout(() => onSearch(query), 300);
        return () => clearTimeout(timer);
    }, [query]);

    const updateFilter = (key: keyof SearchFilters, value: string) => {
        const newFilters = { ...filters, [key]: value } as SearchFilters;
        setFilters(newFilters);
        onFilterChange(newFilters);
    };

    const clearFilters = () => {
        const defaults: SearchFilters = { difficulty: 'all', category: 'all', sortBy: 'newest' };
        setFilters(defaults);
        onFilterChange(defaults);
        setQuery('');
        onSearch('');
    };

    const hasActiveFilters = filters.difficulty !== 'all' || filters.category !== 'all' || query.length > 0;

    return (
        <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search courses..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    />
                    {query && (
                        <button
                            onClick={() => { setQuery(''); onSearch(''); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                            <X className="w-4 h-4 text-gray-400" />
                        </button>
                    )}
                </div>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-4 py-3 rounded-2xl border font-bold text-sm flex items-center gap-2 transition-all ${showFilters || hasActiveFilters
                            ? 'bg-orange-500 border-orange-500 text-white'
                            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-orange-300'
                        }`}
                >
                    <SlidersHorizontal className="w-4 h-4" />
                    Filters
                    {hasActiveFilters && (
                        <span className="w-2 h-2 bg-white rounded-full" />
                    )}
                </button>
            </div>

            {/* Filter Panel */}
            {showFilters && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex flex-wrap gap-6">
                    {/* Difficulty */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Difficulty</label>
                        <div className="flex gap-2">
                            {['all', 'beginner', 'intermediate', 'advanced'].map(level => (
                                <button
                                    key={level}
                                    onClick={() => updateFilter('difficulty', level)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors ${filters.difficulty === level
                                            ? 'bg-orange-500 text-white'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                                        }`}
                                >
                                    {level === 'all' ? 'All Levels' : level}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Category */}
                    {categories.length > 0 && (
                        <div>
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Category</label>
                            <select
                                value={filters.category}
                                onChange={(e) => updateFilter('category', e.target.value)}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 dark:bg-gray-800 border-0 text-gray-700 dark:text-gray-300"
                            >
                                <option value="all">All Categories</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Sort */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Sort By</label>
                        <div className="flex gap-2">
                            {[
                                { key: 'newest', label: 'Newest' },
                                { key: 'popular', label: 'Popular' },
                                { key: 'az', label: 'A–Z' },
                            ].map(option => (
                                <button
                                    key={option.key}
                                    onClick={() => updateFilter('sortBy', option.key)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${filters.sortBy === option.key
                                            ? 'bg-orange-500 text-white'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                                        }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Clear All */}
                    {hasActiveFilters && (
                        <div className="flex items-end">
                            <button
                                onClick={clearFilters}
                                className="text-xs font-bold text-red-500 hover:text-red-600 underline"
                            >
                                Clear All
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
