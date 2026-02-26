"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────
export type CookieCategory = 'essential' | 'analytics' | 'marketing' | 'functional';

export interface CookiePreferences {
    essential: boolean;   // Always true, non-toggleable
    analytics: boolean;
    marketing: boolean;
    functional: boolean;
}

export interface ConsentRecord {
    preferences: CookiePreferences;
    consentGiven: boolean;
    consentTimestamp: string;
    version: string;
}

interface CookieConsentContextType {
    /** Whether the context has loaded from localStorage */
    hydrated: boolean;
    /** Whether the user has made any consent decision */
    consentGiven: boolean;
    /** Current cookie preferences per category */
    preferences: CookiePreferences;
    /** Timestamp of last consent action */
    consentTimestamp: string | null;
    /** Whether the preferences modal is open */
    showPreferences: boolean;
    /** Open/close the preferences modal */
    setShowPreferences: (show: boolean) => void;
    /** Accept all cookie categories */
    acceptAll: () => void;
    /** Reject all non-essential categories */
    rejectAll: () => void;
    /** Save specific category preferences */
    savePreferences: (prefs: Partial<CookiePreferences>) => void;
    /** Reset all consent (shows banner again) */
    resetConsent: () => void;
    /** Check if a specific category is consented */
    hasConsent: (category: CookieCategory) => boolean;
}

const STORAGE_KEY = 'kiongozi_cookie_consent';
const CONSENT_VERSION = '1.0';

const DEFAULT_PREFERENCES: CookiePreferences = {
    essential: true,
    analytics: false,
    marketing: false,
    functional: false,
};

// ─── Context ─────────────────────────────────────────────────────────────────
const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────
export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
    const [consentGiven, setConsentGiven] = useState(false);
    const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES);
    const [consentTimestamp, setConsentTimestamp] = useState<string | null>(null);
    const [showPreferences, setShowPreferences] = useState(false);
    const [hydrated, setHydrated] = useState(false);

    // Load stored consent on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const record: ConsentRecord = JSON.parse(stored);
                if (record.consentGiven && record.version === CONSENT_VERSION) {
                    setPreferences({ ...record.preferences, essential: true });
                    setConsentGiven(true);
                    setConsentTimestamp(record.consentTimestamp);
                }
            }
        } catch {
            // Corrupted data — treat as no consent
            localStorage.removeItem(STORAGE_KEY);
        }
        setHydrated(true);
    }, []);

    const persistConsent = useCallback((prefs: CookiePreferences) => {
        const timestamp = new Date().toISOString();
        const record: ConsentRecord = {
            preferences: prefs,
            consentGiven: true,
            consentTimestamp: timestamp,
            version: CONSENT_VERSION,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
        setPreferences(prefs);
        setConsentGiven(true);
        setConsentTimestamp(timestamp);
        setShowPreferences(false);

        // Log consent event for auditing
        console.info('[Cookie Consent]', {
            action: 'consent_updated',
            preferences: prefs,
            timestamp,
            version: CONSENT_VERSION,
        });
    }, []);

    const acceptAll = useCallback(() => {
        persistConsent({
            essential: true,
            analytics: true,
            marketing: true,
            functional: true,
        });
    }, [persistConsent]);

    const rejectAll = useCallback(() => {
        persistConsent({
            essential: true,
            analytics: false,
            marketing: false,
            functional: false,
        });
    }, [persistConsent]);

    const savePreferences = useCallback((prefs: Partial<CookiePreferences>) => {
        persistConsent({
            ...preferences,
            ...prefs,
            essential: true, // Always enforce essential
        });
    }, [preferences, persistConsent]);

    const resetConsent = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setPreferences(DEFAULT_PREFERENCES);
        setConsentGiven(false);
        setConsentTimestamp(null);
        setShowPreferences(false);

        console.info('[Cookie Consent]', {
            action: 'consent_withdrawn',
            timestamp: new Date().toISOString(),
        });
    }, []);

    const hasConsent = useCallback((category: CookieCategory) => {
        if (category === 'essential') return true;
        return preferences[category];
    }, [preferences]);

    return (
        <CookieConsentContext.Provider
            value={{
                hydrated,
                consentGiven,
                preferences,
                consentTimestamp,
                showPreferences,
                setShowPreferences,
                acceptAll,
                rejectAll,
                savePreferences,
                resetConsent,
                hasConsent,
            }}
        >
            {children}
        </CookieConsentContext.Provider>
    );
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useCookieConsent() {
    const context = useContext(CookieConsentContext);
    if (context === undefined) {
        throw new Error('useCookieConsent must be used within a CookieConsentProvider');
    }
    return context;
}

