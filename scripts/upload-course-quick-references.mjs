import { readFile } from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';
import { serviceClient, SUPABASE_URL } from './_supabase.mjs';

const manifestPath = path.resolve('output/pdf/course-quick-references-manifest.json');
const bucket = 'courses';

if (!existsSync(manifestPath)) {
  console.error(`Missing manifest: ${manifestPath}`);
  process.exit(1);
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const uploaded = [];

for (const item of manifest) {
  const localPath = path.resolve(item.local_path);
  if (!existsSync(localPath)) {
    throw new Error(`Missing generated PDF: ${localPath}`);
  }

  const { error } = await serviceClient.storage
    .from(bucket)
    .upload(item.storage_path, createReadStream(localPath), {
      contentType: 'application/pdf',
      cacheControl: '3600',
      duplex: 'half',
      upsert: true,
    });

  if (error) {
    throw new Error(`Upload failed for ${item.storage_path}: ${error.message}`);
  }

  uploaded.push({
    ...item,
    storage_bucket: bucket,
    public_url: `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${item.storage_path}`,
  });
}

const outputPath = path.resolve('output/pdf/course-quick-references-uploaded.json');
await import('node:fs/promises').then(fs =>
  fs.writeFile(outputPath, JSON.stringify(uploaded, null, 2), 'utf8')
);

console.log(JSON.stringify(uploaded, null, 2));
