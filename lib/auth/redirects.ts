/**
 * Validate a `next` redirect target: only same-origin absolute paths are allowed
 * (rejects protocol-relative //evil.com and off-site URLs). Returns null when unsafe.
 */
export function getSafeNext(next: string | null | undefined): string | null {
    if (!next || !next.startsWith('/') || next.startsWith('//')) return null;
    return next;
}

/**
 * Resolve where to send a user after authentication. Honors an explicit safe
 * `next`, routes incomplete profiles to /complete-profile, otherwise falls back
 * per role, defaulting to `fallback` for a plain user (e.g. /dashboard on login,
 * /onboarding on signup).
 */
export function getPostAuthPath(
    next: string | null,
    role: 'user' | 'instructor' | 'admin' | null | undefined,
    isProfileIncomplete: boolean | undefined,
    fallback: string
): string {
    if (isProfileIncomplete) {
        return next ? `/complete-profile?next=${encodeURIComponent(next)}` : '/complete-profile';
    }
    if (next) return next;
    if (role === 'admin') return '/admin/dashboard';
    if (role === 'instructor') return '/instructor/dashboard';
    return fallback;
}
