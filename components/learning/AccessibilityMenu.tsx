"use client";

import { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import {
    Settings,
    Accessibility,
    Type,
    Shield,
    Check,
    ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function AccessibilityMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const { contrast, setContrast, fontScale, setFontScale } = useTheme();
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fontScales = [
        { label: 'Normal', value: 1.0 },
        { label: 'Large', value: 1.25 },
        { label: 'Extra', value: 1.5 },
    ];

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-2 rounded-xl transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest border ${isOpen
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                title="Accessibility Settings"
            >
                <Accessibility className="w-4 h-4" />
                <span className="hidden sm:inline">Appearance</span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 p-4 z-50 overflow-hidden"
                    >
                        {/* High Contrast Section */}
                        <div className="mb-4">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 mb-2 block">Visual Theme</label>
                            <button
                                onClick={() => setContrast(contrast === 'high' ? 'standard' : 'high')}
                                className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all ${contrast === 'high'
                                        ? 'bg-orange-50 text-orange-600 border border-orange-100'
                                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-transparent'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Shield className="w-4 h-4" />
                                    <span className="text-sm font-bold">High Contrast</span>
                                </div>
                                <div className={`w-10 h-5 rounded-full relative transition-colors ${contrast === 'high' ? 'bg-orange-500' : 'bg-gray-300'}`}>
                                    <motion.div
                                        animate={{ x: contrast === 'high' ? 20 : 2 }}
                                        className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm"
                                    />
                                </div>
                            </button>
                        </div>

                        {/* Font Scaling Section */}
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 mb-2 block">Text Size</label>
                            <div className="grid grid-cols-3 gap-2">
                                {fontScales.map((scale) => (
                                    <button
                                        key={scale.value}
                                        onClick={() => setFontScale(scale.value)}
                                        className={`py-3 rounded-xl border transition-all flex flex-col items-center justify-center gap-1 ${fontScale === scale.value
                                                ? 'bg-gray-900 text-white border-gray-900 shadow-lg'
                                                : 'bg-gray-50 text-gray-500 border-transparent hover:border-gray-200'
                                            }`}
                                    >
                                        <span className="text-[10px] font-black uppercase tracking-tighter">{scale.label}</span>
                                        <span className="text-[8px] opacity-60">{(scale.value * 100).toFixed(0)}%</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-800 text-center">
                            <p className="text-[10px] text-gray-400 font-medium">These settings apply globally to your account.</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
