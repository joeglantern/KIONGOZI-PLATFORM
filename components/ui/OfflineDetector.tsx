"use client";

import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Shows a toast when the browser goes offline and a recovery toast when it reconnects.
 */
export function OfflineDetector() {
    const [isOffline, setIsOffline] = useState(false);
    const [showReconnected, setShowReconnected] = useState(false);

    useEffect(() => {
        const handleOffline = () => setIsOffline(true);
        const handleOnline = () => {
            setIsOffline(false);
            setShowReconnected(true);
            setTimeout(() => setShowReconnected(false), 3000);
        };

        // Check initial state
        if (!navigator.onLine) setIsOffline(true);

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, []);

    return (
        <AnimatePresence>
            {isOffline && (
                <motion.div
                    initial={{ y: -60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -60, opacity: 0 }}
                    className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-red-600 text-white px-5 py-3 rounded-2xl shadow-2xl shadow-red-500/30 font-bold text-sm"
                >
                    <WifiOff className="w-4 h-4" />
                    You're offline. Some features may not work.
                </motion.div>
            )}
            {showReconnected && (
                <motion.div
                    initial={{ y: -60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -60, opacity: 0 }}
                    className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-green-600 text-white px-5 py-3 rounded-2xl shadow-2xl shadow-green-500/30 font-bold text-sm"
                >
                    <Wifi className="w-4 h-4" />
                    Back online!
                </motion.div>
            )}
        </AnimatePresence>
    );
}
