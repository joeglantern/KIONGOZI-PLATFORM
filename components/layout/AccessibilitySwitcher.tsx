'use client';

import { useState, useRef, useEffect } from 'react';
import { useAccessibility } from '@/app/contexts/AccessibilityProvider';
import { Sliders, Check, Sparkles, Contrast, ZoomIn, Activity } from 'lucide-react';

export default function AccessibilitySwitcher() {
    const {
        highContrast, setHighContrast,
        fontSize, setFontSize,
        lowLatency, setLowLatency
    } = useAccessibility();
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!mounted) {
        return (
            <div className="relative inline-block text-left">
                <button
                    type="button"
                    disabled
                    className="inline-flex items-center justify-center p-2 rounded-xl text-gray-500 opacity-60 cursor-not-allowed"
                >
                    <Sliders className="h-5 w-5" />
                </button>
            </div>
        );
    }

    const sizes = [
        { code: 'sm', label: 'A-', desc: 'Small Text' },
        { code: 'md', label: 'A', desc: 'Standard Text' },
        { code: 'lg', label: 'A+', desc: 'Large Text' },
        { code: 'xl', label: 'A++', desc: 'Extra Large Text' }
    ] as const;

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center justify-center p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:ring-2 focus:ring-orange-500 focus:outline-none"
                title="Accessibility options"
                aria-label="Accessibility options"
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                <Sliders className="h-5 w-5" />
            </button>

            {isOpen && (
                <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl bg-white border border-border/60 shadow-xl p-4 ring-1 ring-black ring-opacity-5 animate-scale-in">
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-civic-green" />
                        Accessibility Options
                    </h3>
                    
                    <div className="space-y-4">
                        {/* Font Size Selector */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                                <ZoomIn className="h-3 w-3" /> Text Size Scaling
                            </label>
                            <div className="grid grid-cols-4 gap-1 bg-muted/40 p-1 rounded-xl border border-border/50">
                                {sizes.map((s) => (
                                    <button
                                        key={s.code}
                                        onClick={() => setFontSize(s.code)}
                                        className={`py-1 text-xs rounded-lg font-bold transition-all ${
                                            fontSize === s.code
                                                ? 'bg-civic-green text-white shadow-sm'
                                                : 'text-foreground hover:bg-muted'
                                        }`}
                                        title={s.desc}
                                        aria-label={s.desc}
                                        aria-pressed={fontSize === s.code}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* High Contrast Toggle */}
                        <div className="flex items-center justify-between py-1 border-t border-border/40 pt-3">
                            <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                                <Contrast className="h-3 w-3" /> High Contrast
                            </span>
                            <button
                                onClick={() => setHighContrast(!highContrast)}
                                role="switch"
                                aria-checked={highContrast}
                                aria-label="Toggle high contrast"
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                    highContrast ? 'bg-civic-green' : 'bg-gray-200'
                                }`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                        highContrast ? 'translate-x-4' : 'translate-x-0'
                                    }`}
                                />
                            </button>
                        </div>

                        {/* Low Latency Mode Toggle */}
                        <div className="flex items-center justify-between py-1 border-t border-border/40 pt-3">
                            <div className="space-y-0.5">
                                <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                                    <Activity className="h-3 w-3" /> Low Latency Mode
                                </span>
                                <p className="text-[9px] text-muted-foreground">Disables animations & transitions</p>
                            </div>
                            <button
                                onClick={() => setLowLatency(!lowLatency)}
                                role="switch"
                                aria-checked={lowLatency}
                                aria-label="Toggle low latency mode"
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                    lowLatency ? 'bg-civic-green' : 'bg-gray-200'
                                }`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                        lowLatency ? 'translate-x-4' : 'translate-x-0'
                                    }`}
                                />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

