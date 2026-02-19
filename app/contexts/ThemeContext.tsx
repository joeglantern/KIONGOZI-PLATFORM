"use client";

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    contrast: 'standard' | 'high';
    setContrast: (contrast: 'standard' | 'high') => void;
    fontScale: number;
    setFontScale: (scale: number) => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: 'light',
    toggleTheme: () => { },
    contrast: 'standard',
    setContrast: () => { },
    fontScale: 1,
    setFontScale: () => { }
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>('light');
    const [contrast, setContrastState] = useState<'standard' | 'high'>('standard');
    const [fontScale, setFontScaleState] = useState<number>(1);

    // Load saved settings on mount
    useEffect(() => {
        const savedTheme = localStorage.getItem('kiongozi-theme') as Theme;
        if (savedTheme === 'dark') {
            setTheme('dark');
            document.documentElement.classList.add('dark');
        }

        const savedContrast = localStorage.getItem('kiongozi-contrast') as 'standard' | 'high';
        if (savedContrast === 'high') {
            setContrastState('high');
            document.documentElement.classList.add('high-contrast');
        }

        const savedScale = localStorage.getItem('kiongozi-font-scale');
        if (savedScale) {
            const scale = parseFloat(savedScale);
            setFontScaleState(scale);
            document.documentElement.style.fontSize = `${scale * 100}%`;
        }
    }, []);

    const toggleTheme = useCallback(() => {
        setTheme(prev => {
            const next = prev === 'light' ? 'dark' : 'light';
            localStorage.setItem('kiongozi-theme', next);
            if (next === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
            return next;
        });
    }, []);

    const setContrast = useCallback((val: 'standard' | 'high') => {
        setContrastState(val);
        localStorage.setItem('kiongozi-contrast', val);
        if (val === 'high') {
            document.documentElement.classList.add('high-contrast');
        } else {
            document.documentElement.classList.remove('high-contrast');
        }
    }, []);

    const setFontScale = useCallback((val: number) => {
        setFontScaleState(val);
        localStorage.setItem('kiongozi-font-scale', val.toString());
        document.documentElement.style.fontSize = `${val * 100}%`;
    }, []);

    return (
        <ThemeContext.Provider value={{
            theme,
            toggleTheme,
            contrast,
            setContrast,
            fontScale,
            setFontScale
        }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
