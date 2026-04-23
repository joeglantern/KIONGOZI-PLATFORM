import { NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';

function getSafeNext(next: string | null) {
    if (!next || !next.startsWith('/') || next.startsWith('//')) {
        return null;
    }

    return next;
}

function pickText(...values: Array<string | null | undefined>) {
    for (const value of values) {
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }

    return null;
}

function splitFullName(fullName: string | null) {
    if (!fullName) {
        return { firstName: null, lastName: null };
    }

    const parts = fullName
        .split(/\s+/)
        .map((part) => part.trim())
        .filter(Boolean);

    if (parts.length === 0) {
        return { firstName: null, lastName: null };
    }

    return {
        firstName: parts[0] ?? null,
        lastName: parts.length > 1 ? parts.slice(1).join(' ') : null,
    };
}

function normalizeUsername(value: string | null) {
    if (!value) {
        return null;
    }

    const normalized = value
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 20);

    return normalized || null;
}

async function ensureUniqueUsername(supabase: Awaited<ReturnType<typeof createClient>>, preferred: string | null, userId: string) {
    const base = normalizeUsername(preferred);

    if (!base) {
        return null;
    }

    for (let attempt = 0; attempt < 10; attempt += 1) {
        const suffix = attempt === 0 ? '' : `${attempt + 1}`;
        const candidate = `${base.slice(0, Math.max(1, 20 - suffix.length))}${suffix}`;
        const { data, error } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', candidate)
            .maybeSingle();

        if (error) {
            console.error('Error checking username availability during OAuth sync:', error);
            return base;
        }

        if (!data || data.id === userId) {
            return candidate;
        }
    }

    return `${base.slice(0, 14)}_${userId.slice(0, 5)}`;
}

async function syncOAuthProfile() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }

    const metadata = user.user_metadata ?? {};
    const existingProfileQuery = await supabase
        .from('profiles')
        .select('id, email, full_name, first_name, last_name, avatar_url, username, role, status, total_xp, level')
        .eq('id', user.id)
        .maybeSingle();

    if (existingProfileQuery.error) {
        console.error('Error loading profile during OAuth sync:', existingProfileQuery.error);
    }

    const existingProfile = existingProfileQuery.data;
    const metadataFullName = pickText(
        typeof metadata.full_name === 'string' ? metadata.full_name : null,
        typeof metadata.name === 'string' ? metadata.name : null
    );
    const nameParts = splitFullName(pickText(existingProfile?.full_name, metadataFullName));
    const email = user.email ?? existingProfile?.email ?? null;
    const username = await ensureUniqueUsername(
        supabase,
        existingProfile?.username ??
            (typeof metadata.preferred_username === 'string' ? metadata.preferred_username : null) ??
            (typeof metadata.user_name === 'string' ? metadata.user_name : null) ??
            (email ? email.split('@')[0] : null),
        user.id
    );

    const profilePayload = {
        id: user.id,
        email,
        full_name: pickText(existingProfile?.full_name, metadataFullName, email ? email.split('@')[0] : null),
        first_name: pickText(
            existingProfile?.first_name,
            typeof metadata.first_name === 'string' ? metadata.first_name : null,
            typeof metadata.given_name === 'string' ? metadata.given_name : null,
            nameParts.firstName
        ),
        last_name: pickText(
            existingProfile?.last_name,
            typeof metadata.last_name === 'string' ? metadata.last_name : null,
            typeof metadata.family_name === 'string' ? metadata.family_name : null,
            nameParts.lastName
        ),
        avatar_url: pickText(
            existingProfile?.avatar_url,
            typeof metadata.avatar_url === 'string' ? metadata.avatar_url : null,
            typeof metadata.picture === 'string' ? metadata.picture : null
        ),
        username,
        role: existingProfile?.role ?? 'user',
        status: existingProfile?.status ?? 'active',
        total_xp: existingProfile?.total_xp ?? 0,
        level: existingProfile?.level ?? 1,
    };

    const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' });

    if (upsertError) {
        console.error('Error syncing OAuth profile:', upsertError);
    }

    return existingProfile?.role ?? profilePayload.role;
}

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = getSafeNext(searchParams.get('next'));

    if (code) {
        try {
            const supabase = await createClient();
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (!error) {
                const role = await syncOAuthProfile();
                const destination = next
                    ?? (role === 'admin'
                        ? '/admin/dashboard'
                        : role === 'instructor'
                            ? '/instructor/dashboard'
                            : '/dashboard');
                const forwardedHost = request.headers.get('x-forwarded-host'); // original origin before load balancer
                const isLocalEnv = origin.startsWith('http://localhost');
                if (isLocalEnv) {
                    return NextResponse.redirect(`${origin}${destination}`);
                } else if (forwardedHost) {
                    return NextResponse.redirect(`https://${forwardedHost}${destination}`);
                } else {
                    return NextResponse.redirect(`${origin}${destination}`);
                }
            }
            console.error('Auth callback error:', error);
        } catch (e) {
            console.error('Auth callback exception:', e);
        }
    }

    // return the user to an error page with instructions
    const errorUrl = new URL('/auth/auth-code-error', origin);
    if (next) {
        errorUrl.searchParams.set('next', next);
    }

    return NextResponse.redirect(errorUrl);
}
