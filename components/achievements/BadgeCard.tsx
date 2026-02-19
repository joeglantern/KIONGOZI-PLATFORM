"use client";

import { motion } from 'framer-motion';
import { Lock, CheckCircle2, Calendar } from 'lucide-react';

interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    color?: string;
}

interface BadgeCardProps {
    badge: Badge;
    isEarned: boolean;
    earnedAt?: string;
    requirementText?: string;
}

export function BadgeCard({ badge, isEarned, earnedAt, requirementText }: BadgeCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5 }}
            className={`relative p-6 rounded-3xl border transition-all duration-300 ${isEarned
                    ? 'bg-white border-orange-100 shadow-sm hover:shadow-md'
                    : 'bg-gray-50/50 border-gray-100 opacity-80'
                }`}
        >
            {/* Status Icon */}
            <div className="absolute top-4 right-4">
                {isEarned ? (
                    <div className="bg-green-100 p-1.5 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    </div>
                ) : (
                    <div className="bg-gray-200 p-1.5 rounded-full">
                        <Lock className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                )}
            </div>

            <div className="flex flex-col items-center text-center">
                {/* Badge Icon */}
                <div className={`text-5xl mb-4 transform transition-all duration-500 ${isEarned ? 'filter drop-shadow-lg scale-110' : 'grayscale brightness-75 opacity-50'
                    }`}>
                    {badge.icon || '🏅'}
                </div>

                {/* Badge Info */}
                <h3 className={`text-lg font-black tracking-tight mb-2 ${isEarned ? 'text-gray-900' : 'text-gray-400'
                    }`}>
                    {badge.name}
                </h3>

                <p className={`text-sm leading-relaxed mb-4 ${isEarned ? 'text-gray-600' : 'text-gray-400'
                    }`}>
                    {badge.description}
                </p>

                {/* Footer Info */}
                {isEarned ? (
                    <div className="flex items-center space-x-1.5 text-[10px] font-bold text-orange-500 uppercase tracking-wider bg-orange-50 px-3 py-1.5 rounded-full">
                        <Calendar className="w-3 h-3" />
                        <span>Earned {earnedAt ? new Date(earnedAt).toLocaleDateString() : 'Recently'}</span>
                    </div>
                ) : (
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-3 py-1.5 rounded-full">
                        {requirementText || 'Requirement Locked'}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
