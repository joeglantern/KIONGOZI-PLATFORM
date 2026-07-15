import { NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/app/utils/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * Resolve the authenticated user for an API request.
 *
 * Prefers an Authorization: Bearer <token> header (validated via the service
 * client), falling back to the cookie-based server session. Returns null when
 * no valid user can be resolved.
 */
export async function getRequestUser(
    request: NextRequest,
    serviceClient: ReturnType<typeof createServiceClient>
) {
    const authHeader = request.headers.get('Authorization');

    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error } = await serviceClient.auth.getUser(token);
        if (error) return null;
        return user;
    }

    const serverClient = await createServerClient();
    const { data: { user } } = await serverClient.auth.getUser();
    return user;
}
