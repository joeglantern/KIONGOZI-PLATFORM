import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { authorizeScormPackageAccess } from '@/lib/scorm/access';

// Proxy SCORM package files from Supabase Storage, keeps everything same-origin
// so window.parent.API is accessible from the SCORM iframe content.
//
// SECURITY (tracked, Kiongozi UX audit 2026-07-16, Critical #11): serving
// untrusted instructor-uploaded content from the app's own origin, combined
// with the iframe's `allow-same-origin` sandbox flag (see ScormPlayer.tsx), is
// a session-hijack vector. The full fix moves this to a cookieless subdomain +
// a postMessage runtime bridge; it is not applied here because it must be
// smoke-tested against real SCORM packages and security-reviewed first (see the
// detailed note in ScormPlayer.tsx). Do not point this serve path off-domain
// until that bridge lands together with it.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = 'courses';

const CONTENT_TYPES: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  htm: 'text/html; charset=utf-8',
  js: 'application/javascript; charset=utf-8',
  mjs: 'application/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  xml: 'application/xml; charset=utf-8',
  xsd: 'application/xml; charset=utf-8',
  json: 'application/json; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  vtt: 'text/vtt; charset=utf-8',
  srt: 'text/plain; charset=utf-8',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  bmp: 'image/bmp',
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  ogv: 'video/ogg',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  pdf: 'application/pdf',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
  eot: 'application/vnd.ms-fontobject',
  wasm: 'application/wasm',
  swf: 'application/x-shockwave-flash',
};

// Sandboxes served SCORM documents: content stays same-origin (so it can reach
// window.parent.API) but cannot exfiltrate to, or pull scripts from, other
// origins. Inline/eval are permitted because legacy SCORM packages rely on them.
const SCORM_CSP = [
  "default-src 'self' data: blob:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' data: blob:",
  "worker-src 'self' blob:",
  "frame-src 'self' blob:",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

// A package launch requests dozens to hundreds of assets. Authorizing each one
// costs several DB round-trips, so remember a successful check briefly.
// Keyed by a hash of the caller's credentials so users never share entries.
type CachedAccess = { storagePath: string; expires: number };
const ACCESS_TTL_MS = 60_000;
const accessCache = new Map<string, CachedAccess>();

function credentialKey(request: NextRequest, packageId: string): string | null {
  const auth = request.headers.get('authorization') || '';
  const cookie = request.headers.get('cookie') || '';
  if (!auth && !cookie) return null;
  return createHash('sha256').update(`${packageId}\n${auth}\n${cookie}`).digest('hex');
}

function rememberAccess(key: string, storagePath: string) {
  if (accessCache.size > 5000) {
    const now = Date.now();
    for (const [k, v] of accessCache) if (v.expires < now) accessCache.delete(k);
    if (accessCache.size > 5000) accessCache.clear();
  }
  accessCache.set(key, { storagePath, expires: Date.now() + ACCESS_TTL_MS });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ packageId: string; path: string[] }> }
) {
  try {
    const { packageId, path: rawPath } = await params;
    // Normalize catch-all segments to their decoded form regardless of how
    // the router hands them over (we re-encode once when calling Storage).
    const path = rawPath.map((seg) => {
      if (!/%[0-9A-Fa-f]{2}/.test(seg)) return seg;
      try { return decodeURIComponent(seg); } catch { return seg; }
    });

    // Reject path-traversal before touching storage.
    if (path.some((seg) => seg === '..' || seg === '.' || seg.includes('\\') || /^[a-zA-Z]:/.test(seg))) {
      return new NextResponse('Invalid path', { status: 400 });
    }
    const filePath = path.join('/');
    if (!filePath || filePath.startsWith('/')) {
      return new NextResponse('Invalid path', { status: 400 });
    }

    let storagePath: string | null = null;
    const key = credentialKey(request, packageId);
    const cached = key ? accessCache.get(key) : undefined;
    if (cached && cached.expires > Date.now()) {
      storagePath = cached.storagePath;
    } else {
      const access = await authorizeScormPackageAccess(request, packageId);
      if ('error' in access) {
        return access.error;
      }
      if (access.pkg.status !== 'active') {
        return new NextResponse('Package archived', { status: 410 });
      }
      storagePath = access.pkg.storage_path;
      if (key) rememberAccess(key, storagePath);
    }

    // Stream from Storage (instead of buffering whole files in memory) and
    // forward Range requests: video/audio seeking needs 206 responses, and iOS
    // Safari will not play media at all without them.
    const objectPath = `${storagePath}/${filePath}`.split('/').map(encodeURIComponent).join('/');
    const range = request.headers.get('range');
    const upstream = await fetch(`${SUPABASE_URL}/storage/v1/object/authenticated/${BUCKET}/${objectPath}`, {
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        ...(range ? { Range: range } : {}),
      },
      cache: 'no-store',
    });

    if (upstream.status === 416) {
      return new NextResponse(null, {
        status: 416,
        headers: { 'Content-Range': upstream.headers.get('content-range') || '' },
      });
    }
    if (!upstream.ok || !upstream.body) {
      return new NextResponse('File not found', { status: upstream.status === 404 || upstream.status === 400 ? 404 : 502 });
    }

    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';
    const isDocument = ext === 'html' || ext === 'htm';

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      // Package files are immutable per package id; cache assets privately so
      // relaunching a lesson doesn't re-download everything. HTML revalidates.
      'Cache-Control': isDocument ? 'private, no-cache' : 'private, max-age=86400',
      'Accept-Ranges': 'bytes',
      // Allow SCORM content to run in a same-origin iframe, but sandbox it.
      'X-Frame-Options': 'SAMEORIGIN',
      'Content-Security-Policy': SCORM_CSP,
      'X-Content-Type-Options': 'nosniff',
    };
    const contentLength = upstream.headers.get('content-length');
    if (contentLength) headers['Content-Length'] = contentLength;
    const contentRange = upstream.headers.get('content-range');
    if (contentRange) headers['Content-Range'] = contentRange;
    const etag = upstream.headers.get('etag');
    if (etag) headers['ETag'] = etag;

    return new NextResponse(upstream.body, {
      status: upstream.status === 206 ? 206 : 200,
      headers,
    });
  } catch (err: any) {
    console.error('SCORM serve error:', err);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
