import { NextRequest } from 'next/server';

/**
 * Lightweight in-memory fixed-window rate limiter.
 *
 * Suitable for single-instance / low-scale protection against abuse of costly
 * endpoints (AI calls, transactional email). For multi-instance deployments,
 * swap the store for Upstash/Redis — the `rateLimit()` signature stays the same.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Opportunistic cleanup so the map doesn't grow unbounded.
let lastSweep = 0;
function sweep(now: number) {
    if (now - lastSweep < 60_000) return;
    lastSweep = now;
    for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(key);
    }
}

export interface RateLimitResult {
    success: boolean;
    remaining: number;
    resetAt: number;
    retryAfterSeconds: number;
}

/**
 * Record a hit against `key` and report whether it is within `limit` hits per
 * `windowMs`. Callers should return HTTP 429 when `success` is false.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    sweep(now);

    const existing = buckets.get(key);
    if (!existing || existing.resetAt <= now) {
        const resetAt = now + windowMs;
        buckets.set(key, { count: 1, resetAt });
        return { success: true, remaining: limit - 1, resetAt, retryAfterSeconds: 0 };
    }

    if (existing.count >= limit) {
        return {
            success: false,
            remaining: 0,
            resetAt: existing.resetAt,
            retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
        };
    }

    existing.count += 1;
    return {
        success: true,
        remaining: limit - existing.count,
        resetAt: existing.resetAt,
        retryAfterSeconds: 0,
    };
}

/** Best-effort client IP for anonymous rate-limit keying, behind proxies. */
export function getClientIp(req: NextRequest): string {
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    return req.headers.get('x-real-ip') ?? 'unknown';
}
