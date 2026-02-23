"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface ToastAction {
    id: string;
    message: string;
    xpAwarded?: number;
    icon?: React.ReactNode;
}

interface AnimatedToastProps {
    action: ToastAction | null;
    onClose: () => void;
}

export function AnimatedToast({ action, onClose }: AnimatedToastProps) {
    useEffect(() => {
        if (action) {
            const timer = setTimeout(() => {
                onClose();
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [action, onClose]);

    return (
        <AnimatePresence>
            {action && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="fixed bottom-6 right-6 z-[100] flex items-center space-x-4 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 min-w-[300px]"
                >
                    {/* Icon Container with subtle pulse */}
                    <div className="relative">
                        <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                            className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-500"
                        >
                            {action.icon || <Trophy className="w-6 h-6" />}
                        </motion.div>
                        {action.xpAwarded && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: -5 }}
                                transition={{ delay: 0.3, type: "spring" }}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center shadow-sm"
                            >
                                <Sparkles className="w-3 h-3 text-yellow-900" />
                            </motion.div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                        <p className="text-gray-900 dark:text-white font-bold text-sm">
                            {action.message}
                        </p>
                        {action.xpAwarded && (
                            <motion.p
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 }}
                                className="text-orange-600 dark:text-orange-400 text-xs font-black mt-0.5 tracking-wide"
                            >
                                +{action.xpAwarded} XP Earned
                            </motion.p>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
