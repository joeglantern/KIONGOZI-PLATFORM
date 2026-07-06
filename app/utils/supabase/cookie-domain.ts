/**
 * Single source of truth for the auth-cookie domain, shared by the browser
 * client, the server client, and the middleware. Keeping these identical avoids
 * a class of session bugs where the browser and server set cookies on different
 * domains.
 *
 * Prefers an explicit NEXT_PUBLIC_COOKIE_DOMAIN; in production, falls back to the
 * app's apex domain so auth works across subdomains. In development it is
 * undefined (host-only cookies on localhost).
 */
export function getCookieDomain(): string | undefined {
    return (
        process.env.NEXT_PUBLIC_COOKIE_DOMAIN ||
        (process.env.NODE_ENV === 'production' ? '.kiongozi.org' : undefined)
    );
}
