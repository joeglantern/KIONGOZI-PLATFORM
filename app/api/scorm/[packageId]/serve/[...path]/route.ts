import { NextRequest, NextResponse } from 'next/server';
import { authorizeScormPackageAccess } from '@/lib/scorm/access';

// Proxy SCORM package files from Supabase Storage — keeps everything same-origin
// so window.parent.API is accessible from the SCORM iframe content.

const CONTENT_TYPES: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  htm: 'text/html; charset=utf-8',
  js: 'application/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  xml: 'application/xml; charset=utf-8',
  json: 'application/json; charset=utf-8',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
  mp3: 'audio/mpeg',
  pdf: 'application/pdf',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  swf: 'application/x-shockwave-flash',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ packageId: string; path: string[] }> }
) {
  try {
    const { packageId, path } = await params;
    const filePath = path.join('/');
    const access = await authorizeScormPackageAccess(request, packageId);
    if ('error' in access) {
      return access.error;
    }

    const { serviceClient, pkg } = access;

    if (pkg.status !== 'active') {
      return new NextResponse('Package archived', { status: 410 });
    }

    // Fetch file from Supabase Storage
    const storageFilePath = `${pkg.storage_path}/${filePath}`;
    const { data, error } = await serviceClient.storage
      .from('courses')
      .download(storageFilePath);

    if (error || !data) {
      return new NextResponse('File not found', { status: 404 });
    }

    // Determine content type
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';

    const arrayBuffer = await data.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, no-store',
        // Allow SCORM content to run in same-origin iframe
        'X-Frame-Options': 'SAMEORIGIN',
      },
    });
  } catch (err: any) {
    console.error('SCORM serve error:', err);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
