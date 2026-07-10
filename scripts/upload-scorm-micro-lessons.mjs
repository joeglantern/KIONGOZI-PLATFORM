import { readFile, readdir } from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';
import { serviceClient, SUPABASE_URL } from './_supabase.mjs';

const manifestPath = path.resolve('output/scorm/scorm-micro-lessons-manifest.json');
const bucket = 'courses';

const contentTypes = {
  html: 'text/html',
  xml: 'application/xml',
  css: 'text/css',
  js: 'application/javascript',
  json: 'application/json',
};

if (!existsSync(manifestPath)) {
  console.error(`Missing SCORM manifest: ${manifestPath}`);
  process.exit(1);
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const uploaded = [];

for (const pkg of manifest) {
  const localDir = path.resolve(pkg.local_dir);
  const files = await readdir(localDir);

  for (const file of files) {
    const localPath = path.join(localDir, file);
    const ext = file.split('.').pop()?.toLowerCase() || '';
    const storagePath = `${pkg.storage_path}/${file}`;

    const { error } = await serviceClient.storage
      .from(bucket)
      .upload(storagePath, createReadStream(localPath), {
        contentType: contentTypes[ext] || 'application/octet-stream',
        cacheControl: '3600',
        duplex: 'half',
        upsert: true,
      });

    if (error) {
      throw new Error(`Upload failed for ${storagePath}: ${error.message}`);
    }
  }

  uploaded.push({
    ...pkg,
    storage_bucket: bucket,
    public_url: `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${pkg.storage_path}/${pkg.entry_point}`,
    launch_path: `/lms/scorm/${pkg.id}`,
  });
}

const outputPath = path.resolve('output/scorm/scorm-micro-lessons-uploaded.json');
await import('node:fs/promises').then(fs =>
  fs.writeFile(outputPath, JSON.stringify(uploaded, null, 2), 'utf8')
);

console.log(JSON.stringify(uploaded, null, 2));
