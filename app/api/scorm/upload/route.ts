import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { parseManifest } from '@/lib/scorm/manifest-parser';
import { createServiceClient } from '@/lib/supabase/service';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = 'courses';

// Guardrails against memory exhaustion and zip bombs.
const MAX_ARCHIVE_BYTES = 300 * 1024 * 1024;            // compressed upload
const MAX_ENTRIES = 3000;                               // files inside the zip
const MAX_TOTAL_UNCOMPRESSED_BYTES = 500 * 1024 * 1024; // decompressed total

// Reject zip-slip / path-traversal entries: absolute paths, drive letters, or
// any '..' segment that would escape the package's storage folder.
function isUnsafeEntryPath(relativePath: string): boolean {
  if (!relativePath) return true;
  const norm = relativePath.replace(/\\/g, '/');
  if (norm.startsWith('/')) return true;        // absolute
  if (/^[a-zA-Z]:/.test(norm)) return true;     // windows drive
  return norm.split('/').some((seg) => seg === '..');
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
    const supabase = createServiceClient();

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
    if (typeof file.size === 'number' && file.size > MAX_ARCHIVE_BYTES) {
      return NextResponse.json(
        { error: `Archive exceeds the ${Math.round(MAX_ARCHIVE_BYTES / (1024 * 1024))}MB limit` },
        { status: 413 }
      );
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

    const zipFiles = Object.values(zip.files).filter((f) => !f.dir);
    if (zipFiles.length > MAX_ENTRIES) {
      return NextResponse.json(
        { error: `Archive has too many files (max ${MAX_ENTRIES})` },
        { status: 413 }
      );
    }

    // Read and upload in batches so we never hold the whole archive in memory,
    // validating each entry's path and tracking cumulative decompressed size.
    const BATCH_SIZE = 8;
    const uploadErrors: string[] = [];
    let totalUncompressed = 0;

    for (let i = 0; i < zipFiles.length; i += BATCH_SIZE) {
      const batch = zipFiles.slice(i, i + BATCH_SIZE);
      const payloads: { storagePath: string; content: Buffer; contentType: string; name: string }[] = [];

      for (const entry of batch) {
        const relativePath = rootPrefix ? entry.name.slice(rootPrefix.length) : entry.name;
        if (isUnsafeEntryPath(relativePath)) {
          return NextResponse.json(
            { error: `Unsafe path in archive: ${entry.name}` },
            { status: 400 }
          );
        }

        const buf = await entry.async('nodebuffer'); // Node.js Buffer — most reliable
        totalUncompressed += buf.length;
        if (totalUncompressed > MAX_TOTAL_UNCOMPRESSED_BYTES) {
          return NextResponse.json(
            { error: 'Archive contents exceed the decompressed size limit' },
            { status: 413 }
          );
        }

        payloads.push({
          storagePath: `${storagePath}/${relativePath}`,
          content: buf,
          contentType: getContentType(entry.name),
          name: entry.name,
        });
      }

      const results = await Promise.all(
        payloads.map((f) => uploadFile(f.storagePath, f.content, f.contentType))
      );
      results.forEach((err, idx) => {
        if (err) uploadErrors.push(`${payloads[idx].name}: ${err}`);
      });
    }

    // Abort if majority failed — avoids creating a broken package record
    if (uploadErrors.length > zipFiles.length / 2) {
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
