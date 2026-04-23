import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { createClient } from '@supabase/supabase-js';
import { parseManifest } from '@/lib/scorm/manifest-parser';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = 'courses';

function getServiceClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY);
}

// Upload a single file directly via Supabase Storage REST API.
// Bypasses the JS SDK which has reliability issues with large batches in Node.js.
async function uploadFile(
  storagePath: string,
  content: Buffer,
  contentType: string
): Promise<string | null> {
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${storagePath}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: new Uint8Array(content),
    });
    if (!res.ok) {
      const text = await res.text();
      return `HTTP ${res.status}: ${text}`;
    }
    return null; // success
  } catch (err: any) {
    return err?.message || 'fetch failed';
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const supabase = getServiceClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check instructor role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['instructor', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const courseId = formData.get('course_id') as string | null;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (!file.name.endsWith('.zip')) {
      return NextResponse.json({ error: 'File must be a .zip archive' }, { status: 400 });
    }

    // Load ZIP
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Find imsmanifest.xml (may be in root or subdirectory)
    const manifestFile =
      zip.file('imsmanifest.xml') ||
      Object.values(zip.files).find((f) => f.name.endsWith('imsmanifest.xml'));

    if (!manifestFile) {
      return NextResponse.json(
        { error: 'Invalid SCORM package: imsmanifest.xml not found' },
        { status: 400 }
      );
    }

    // Parse manifest
    const manifestXml = await manifestFile.async('text');
    const manifest = parseManifest(manifestXml);

    // Determine the root prefix (if manifest is in a subdirectory)
    const rootPrefix = manifestFile.name.replace('imsmanifest.xml', '');

    // Generate package ID
    const packageId = crypto.randomUUID();
    const storagePath = `scorm/${packageId}`;

    // Read all file contents from ZIP first (in-memory, no network)
    const zipFiles = Object.values(zip.files).filter((f) => !f.dir);
    const filePayloads = await Promise.all(
      zipFiles.map(async (entry) => {
        const buf = await entry.async('nodebuffer'); // Node.js Buffer — most reliable
        const relativePath = rootPrefix
          ? entry.name.slice(rootPrefix.length)
          : entry.name;
        return {
          storagePath: `${storagePath}/${relativePath}`,
          content: buf,
          contentType: getContentType(entry.name),
          name: entry.name,
        };
      })
    );

    // Upload in batches of 8 via direct REST API
    const BATCH_SIZE = 8;
    const uploadErrors: string[] = [];

    for (let i = 0; i < filePayloads.length; i += BATCH_SIZE) {
      const batch = filePayloads.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map((f) => uploadFile(f.storagePath, f.content, f.contentType))
      );
      results.forEach((err, idx) => {
        if (err) uploadErrors.push(`${batch[idx].name}: ${err}`);
      });
    }

    // Abort if majority failed — avoids creating a broken package record
    if (uploadErrors.length > filePayloads.length / 2) {
      console.error('SCORM upload failed:', uploadErrors.slice(0, 5));
      return NextResponse.json(
        { error: `Storage upload failed: ${uploadErrors[0]}` },
        { status: 500 }
      );
    }

    if (uploadErrors.length > 0) {
      console.warn(`SCORM upload: ${uploadErrors.length} files failed:`, uploadErrors);
    }

    // Create scorm_packages record
    const { data: pkg, error: dbError } = await supabase
      .from('scorm_packages')
      .insert({
        id: packageId,
        title: manifest.title,
        version: manifest.version,
        entry_point: manifest.entryPoint,
        storage_path: storagePath,
        manifest_data: manifest as any,
        course_id: courseId || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({
      package: pkg,
      uploadWarnings: uploadErrors.length > 0 ? uploadErrors : undefined,
    });
  } catch (err: any) {
    console.error('SCORM upload error:', err);
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 });
  }
}

function getContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    html: 'text/html',
    htm: 'text/html',
    js: 'application/javascript',
    css: 'text/css',
    xml: 'application/xml',
    json: 'application/json',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    mp4: 'video/mp4',
    mp3: 'audio/mpeg',
    pdf: 'application/pdf',
    swf: 'application/x-shockwave-flash',
    woff: 'font/woff',
    woff2: 'font/woff2',
    ttf: 'font/ttf',
  };
  return map[ext || ''] || 'application/octet-stream';
}
