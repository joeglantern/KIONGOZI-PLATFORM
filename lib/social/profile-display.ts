type ProfileLike = {
    first_name?: string | null;
    last_name?: string | null;
    full_name?: string | null;
    username?: string | null;
} | null | undefined;

function cleanName(value: string | null | undefined) {
    const trimmed = value?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : null;
}

export function getProfileDisplayName(profile: ProfileLike, fallback = 'Anonymous') {
    const fullName = cleanName(profile?.full_name);
    if (fullName) return fullName;

    const composedName = [profile?.first_name, profile?.last_name]
        .map(cleanName)
        .filter(Boolean)
        .join(' ');
    if (composedName) return composedName;

    return cleanName(profile?.username) || fallback;
}

export function getProfileInitials(profile: ProfileLike, fallback = 'AN') {
    const displayName = getProfileDisplayName(profile, fallback);
    const initials = displayName
        .replace(/^@/, '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();

    return initials || fallback.slice(0, 2).toUpperCase();
}
