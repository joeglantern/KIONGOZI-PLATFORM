"use client";

import React, { useState, useEffect } from 'react';
import { useCookieConsent, CookiePreferences } from '@/app/contexts/CookieConsentContext';
import { Shield, Cookie, BarChart3, Megaphone, Wrench, X, Check } from 'lucide-react';

interface CategoryInfo {
    key: keyof CookiePreferences;
    label: string;
    description: string;
    icon: React.ReactNode;
    required: boolean;
    color: string;
}

const CATEGORIES: CategoryInfo[] = [
    {
        key: 'essential',
        label: 'Essential',
        description: 'Required for the website to function properly. These include authentication, security, and session management cookies.',
        icon: <Shield className="w-5 h-5" />,
        required: true,
        color: 'text-green-600 bg-green-100 dark:bg-green-900/30',
    },
    {
        key: 'functional',
        label: 'Functional',
        description: 'Enable personalized features like language preferences, theme settings, and remembering your choices across visits.',
        icon: <Wrench className="w-5 h-5" />,
        required: false,
        color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    },
    {
        key: 'analytics',
        label: 'Analytics',
        description: 'Help us understand how visitors interact with our website by collecting anonymized usage data to improve our services.',
        icon: <BarChart3 className="w-5 h-5" />,
        required: false,
        color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
    },
    {
        key: 'marketing',
        label: 'Marketing',
        description: 'Used to deliver relevant advertisements and track the effectiveness of marketing campaigns across platforms.',
        icon: <Megaphone className="w-5 h-5" />,
        required: false,
        color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
    },
];

export function CookiePreferencesModal() {
    const {
        showPreferences,
        setShowPreferences,
        preferences,
        acceptAll,
        rejectAll,
        savePreferences,
        consentTimestamp,
    } = useCookieConsent();

    const [localPrefs, setLocalPrefs] = useState<CookiePreferences>(preferences);

    // Sync local state when modal opens
    useEffect(() => {
        if (showPreferences) {
            setLocalPrefs(preferences);
        }
    }, [showPreferences, preferences]);

    if (!showPreferences) return null;

    const handleToggle = (key: keyof CookiePreferences) => {
        if (key === 'essential') return; // Cannot toggle essential
        setLocalPrefs(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = () => {
        savePreferences(localPrefs);
    };

    const handleAcceptAll = () => {
        acceptAll();
    };

    const handleRejectAll = () => {
        rejectAll();
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000] transition-opacity duration-300"
                onClick={() => setShowPreferences(false)}
                aria-hidden="true"
            />

            {/* Modal */}
            <div
                role="dialog"
                aria-label="Cookie preferences"
                aria-modal="true"
                className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
            >
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg max-h-[90vh] flex flex-col animate-scale-in">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center">
                                <Cookie className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Cookie Preferences</h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Manage your cookie settings</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowPreferences(false)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            aria-label="Close preferences"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Categories */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            Choose which cookie categories you&apos;d like to allow. Essential cookies cannot be disabled
                            as they are required for the site to function.
                        </p>

                        {CATEGORIES.map((category) => (
                            <div
                                key={category.key}
                                className={`rounded-xl border p-4 transition-all duration-200 ${localPrefs[category.key]
                                        ? 'border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20'
                                        : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30'
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${category.color}`}>
                                            {category.icon}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center space-x-2">
                                                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                                                    {category.label}
                                                </h3>
                                                {category.required && (
                                                    <span className="text-[10px] font-bold uppercase bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                                                        Required
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                                                {category.description}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Toggle */}
                                    <button
                                        onClick={() => handleToggle(category.key)}
                                        disabled={category.required}
                                        aria-label={`${localPrefs[category.key] ? 'Disable' : 'Enable'} ${category.label} cookies`}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 flex-shrink-0 mt-1 ${category.required
                                                ? 'bg-green-500 cursor-not-allowed opacity-70'
                                                : localPrefs[category.key]
                                                    ? 'bg-orange-500 cursor-pointer'
                                                    : 'bg-gray-300 dark:bg-gray-600 cursor-pointer hover:bg-gray-400 dark:hover:bg-gray-500'
                                            }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${localPrefs[category.key] ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                        />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Consent Info */}
                        {consentTimestamp && (
                            <div className="text-xs text-gray-400 dark:text-gray-500 text-center pt-2">
                                Last updated: {new Date(consentTimestamp).toLocaleString()}
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                        <div className="flex gap-2">
                            <button
                                onClick={handleAcceptAll}
                                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 hover:shadow-lg active:scale-[0.98] text-sm flex items-center justify-center space-x-1.5"
                            >
                                <Check className="w-4 h-4" />
                                <span>Accept All</span>
                            </button>
                            <button
                                onClick={handleRejectAll}
                                className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 text-sm"
                            >
                                Reject All
                            </button>
                        </div>
                        <button
                            onClick={handleSave}
                            className="w-full border-2 border-orange-200 dark:border-orange-800 hover:border-orange-400 dark:hover:border-orange-600 text-orange-600 dark:text-orange-400 font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 text-sm"
                        >
                            Save My Preferences
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
