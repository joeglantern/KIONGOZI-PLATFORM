'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useTheme } from './ThemeContext';

type FontSize = 'sm' | 'md' | 'lg' | 'xl';

interface AccessibilityContextType {
    highContrast: boolean;
    setHighContrast: (val: boolean) => void;
    fontSize: FontSize;
    setFontSize: (size: FontSize) => void;
    lowLatency: boolean;
    setLowLatency: (val: boolean) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
    const { contrast, setContrast, fontScale, setFontScale } = useTheme();
    const [lowLatency, setLowLatencyState] = useState(false);

    // Sync highContrast to theme contrast
    const highContrast = contrast === 'high';
    const setHighContrast = (val: boolean) => {
        setContrast(val ? 'high' : 'standard');
        localStorage.setItem('access-high-contrast', String(val));
    };

    // Map theme fontScale (numeric) to accessibility fontSize (string)
    const fontSize = useMemo<FontSize>(() => {
        if (fontScale <= 0.85) return 'sm';
        if (fontScale >= 1.3) return 'xl';
        if (fontScale >= 1.15) return 'lg';
        return 'md';
    }, [fontScale]);

    const setFontSize = (size: FontSize) => {
        const scaleMap = {
            sm: 0.85,
            md: 1.0,
            lg: 1.15,
            xl: 1.3
        };
        setFontScale(scaleMap[size]);
        localStorage.setItem('access-font-size', size);
    };

    const setLowLatency = (val: boolean) => {
        setLowLatencyState(val);
        localStorage.setItem('access-low-latency', String(val));
    };

    // Load low latency and perform migration on mount
    useEffect(() => {
        // Load low latency
        const savedLatency = localStorage.getItem('access-low-latency') === 'true';
        setLowLatencyState(savedLatency);

        // One-time legacy local storage migration to theme context keys
        if (!localStorage.getItem('kiongozi-contrast') && localStorage.getItem('access-high-contrast')) {
            const isHigh = localStorage.getItem('access-high-contrast') === 'true';
            setContrast(isHigh ? 'high' : 'standard');
        }
        if (!localStorage.getItem('kiongozi-font-scale') && localStorage.getItem('access-font-size')) {
            const size = localStorage.getItem('access-font-size') as FontSize;
            const scaleMap = { sm: 0.85, md: 1.0, lg: 1.15, xl: 1.3 };
            if (scaleMap[size]) setFontScale(scaleMap[size]);
        }
    }, [setContrast, setFontScale]);

    // Apply document class modifications
    useEffect(() => {
        const root = document.documentElement;

        // Apply font size class
        root.classList.remove('text-sm-size', 'text-md-size', 'text-lg-size', 'text-xl-size');
        root.classList.add(`text-${fontSize}-size`);

        // Apply low latency (disable animations)
        if (lowLatency) {
            root.classList.add('low-latency-mode');
        } else {
            root.classList.remove('low-latency-mode');
        }
    }, [fontSize, lowLatency]);

    return (
        <AccessibilityContext.Provider value={{
            highContrast, setHighContrast,
            fontSize, setFontSize,
            lowLatency, setLowLatency
        }}>
            {children}
        </AccessibilityContext.Provider>
    );
}

export function useAccessibility() {
    const context = useContext(AccessibilityContext);
    if (context === undefined) {
        throw new Error('useAccessibility must be used within an AccessibilityProvider');
    }
    return context;
}

