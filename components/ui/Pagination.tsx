"use client";

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
    if (totalPages <= 1) return null;

    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

    return (
        <div className="flex items-center justify-center space-x-2 mt-12 pb-8">
            <button
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2.5 rounded-2xl bg-white border border-gray-100 shadow-sm text-gray-400 hover:text-orange-500 disabled:opacity-30 disabled:hover:text-gray-400 transition-all active:scale-90"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-[2rem] border border-gray-100 shadow-sm">
                {pages.map((page) => (
                    <button
                        key={page}
                        onClick={() => onPageChange(page)}
                        className={`relative w-10 h-10 rounded-xl text-sm font-black transition-all ${currentPage === page
                            ? 'text-white'
                            : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                    >
                        {currentPage === page && (
                            <motion.div
                                layoutId="active-page"
                                className="absolute inset-0 bg-orange-500 rounded-xl shadow-lg shadow-orange-500/20"
                            />
                        )}
                        <span className="relative z-10">{page}</span>
                    </button>
                ))}
            </div>

            <button
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2.5 rounded-2xl bg-white border border-gray-100 shadow-sm text-gray-400 hover:text-orange-500 disabled:opacity-30 disabled:hover:text-gray-400 transition-all active:scale-90"
            >
                <ChevronRight className="w-5 h-5" />
            </button>
        </div>
    );
}
