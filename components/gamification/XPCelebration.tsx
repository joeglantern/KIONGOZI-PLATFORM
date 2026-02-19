"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Star, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

interface XPCelebrationProps {
    xp: number;
    show: boolean;
    onComplete?: () => void;
}

export function XPCelebration({ xp, show, onComplete }: XPCelebrationProps) {
    const [elements, setElements] = useState<{ id: number; x: number; y: number; delay: number }[]>([]);

    useEffect(() => {
        if (show) {
            // Generate random positions for the particles
            const newElements = Array.from({ length: 12 }).map((_, i) => ({
                id: i,
                x: (Math.random() - 0.5) * 400, // Spread horizontal
                y: -Math.random() * 300 - 100,  // Move up
                delay: Math.random() * 0.5
            }));
            setElements(newElements);

            // Auto-cleanup
            const timer = setTimeout(() => {
                if (onComplete) onComplete();
            }, 3000);
            return () => clearTimeout(timer);
        } else {
            setElements([]);
        }
    }, [show, onComplete]);

    return (
        <AnimatePresence>
            {show && (
                <div className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center">
                    {/* Main XP Text */}
                    <motion.div
                        initial={{ scale: 0, y: 50, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 1.5, y: -100, opacity: 0 }}
                        transition={{ type: "spring", damping: 12, stiffness: 200 }}
                        className="relative"
                    >
                        <div className="bg-orange-500 text-white px-10 py-6 rounded-[2.5rem] shadow-2xl flex flex-col items-center">
                            <motion.div
                                animate={{ rotate: [0, 10, -10, 0] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                            >
                                <Zap className="w-12 h-12 fill-current mb-2" />
                            </motion.div>
                            <span className="text-5xl font-black tracking-tighter">+{xp} XP</span>
                            <span className="text-sm font-bold uppercase tracking-widest mt-1 opacity-80">Module Complete!</span>
                        </div>

                        {/* Particle Effects */}
                        {elements.map((el) => (
                            <motion.div
                                key={el.id}
                                initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                                animate={{
                                    x: el.x,
                                    y: el.y,
                                    opacity: [0, 1, 1, 0],
                                    scale: [0, 1.5, 1, 0.5],
                                    rotate: Math.random() * 360
                                }}
                                transition={{
                                    duration: 2,
                                    delay: el.delay,
                                    ease: "easeOut"
                                }}
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                            >
                                {el.id % 3 === 0 ? (
                                    <Star className="w-6 h-6 text-amber-400 fill-current" />
                                ) : el.id % 3 === 1 ? (
                                    <Sparkles className="w-5 h-5 text-orange-400 fill-current" />
                                ) : (
                                    <div className="w-3 h-3 bg-orange-500 rounded-full" />
                                )}
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* Full screen flash */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.1, 0] }}
                        className="absolute inset-0 bg-orange-400"
                    />
                </div>
            )}
        </AnimatePresence>
    );
}
