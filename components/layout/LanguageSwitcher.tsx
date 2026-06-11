'use client';

import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { Globe, ChevronDown, Check } from 'lucide-react';

export default function LanguageSwitcher() {
    const { language, setLanguage } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const languages = [
        { code: 'en', label: 'English' },
        { code: 'sw', label: 'Kiswahili' },
        { code: 'ar', label: 'العربية (Arabic)' },
        { code: 'sheng', label: 'Sheng (Mtaa)' }
    ] as const;

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
                    className="inline-flex items-center justify-between gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-border/80 rounded-xl text-foreground opacity-60 cursor-not-allowed shadow-sm"
                >
                    <Globe className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline-block">English</span>
                    <ChevronDown className="h-3 w-3" />
                </button>
            </div>
        );
    }

    const currentLanguage = languages.find(l => l.code === language) || languages[0];

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center justify-between gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-border/80 rounded-xl hover:border-civic-green/30 hover:bg-civic-green/5 text-foreground hover:text-civic-green transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                <Globe className="h-3.5 w-3.5" />
                <span className="hidden sm:inline-block">
                    {currentLanguage.label}
                </span>
                <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 z-50 mt-2 w-48 rounded-xl bg-white border border-border/60 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none animate-fadeIn select-none">
                    <div className="py-1" role="menu" aria-orientation="vertical">
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => {
                                    setLanguage(lang.code);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-4 py-2 text-xs text-left text-foreground hover:bg-civic-green/5 hover:text-civic-green font-medium transition-colors ${
                                    language === lang.code ? 'bg-civic-green/10 text-civic-green font-bold' : ''
                                }`}
                                role="menuitem"
                            >
                                <span className="flex items-center gap-2">
                                    <span>{lang.label}</span>
                                </span>
                                {language === lang.code && (
                                    <Check className="h-3.5 w-3.5 text-civic-green" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

