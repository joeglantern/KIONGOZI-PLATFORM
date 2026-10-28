// Shrinks uploaded photos so they load fast on small data bundles.
// Every photo becomes a resized WebP (iPhone HEIC included) plus a ~1KB blurred placeholder
// the app shows instantly while the real photo loads. See My Stack/image-pipeline.md.
import sharp from 'sharp';
import { supabaseServiceClient as db } from '../config/supabase';
import UploadService from './UploadService';

// heic-convert has no type definitions
// eslint-disable-next-line @typescript-eslint/no-var-requires
const heicConvert: (o: { buffer: Buffer; format: 'JPEG' | 'PNG'; quality?: number }) => Promise<ArrayBuffer> = require('heic-convert');

export const BOX = {
  post: { w: 1440, h: 1920 },
  story: { w: 1080, h: 1920 },
  avatar: { w: 512, h: 512 },
  banner: { w: 1500, h: 600 },
} as const;
type BoxId = keyof typeof BOX;

const MAX_BYTES = 30 * 1024 * 1024;

/** HEIC/HEIF files start with an "ftyp" box naming the brand. */
export function isHeic(buf: Buffer) {
  if (buf.length < 12 || buf.subarray(4, 8).toString('latin1') !== 'ftyp') return false;
  return ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'].includes(buf.subarray(8, 12).toString('latin1'));
}

const isGif = (buf: Buffer) => buf.subarray(0, 3).toString('latin1') === 'GIF';

/** Any photo → resized WebP + tiny blurred JPEG placeholder (data URI). */
export async function optimizeImage(input: Buffer, box: BoxId) {
  let src = input;
  if (isHeic(src)) {
    // sharp's prebuilt binaries can't decode HEIC, so convert to JPEG first
    try { src = Buffer.from(await heicConvert({ buffer: src, format: 'JPEG', quality: 0.92 })); } catch { /* AVIF etc: sharp reads it */ }
  }
  const { w, h } = BOX[box];
  const { data, info } = await sharp(src, { failOn: 'none' })
    .rotate() // apply the camera's orientation, then drop the metadata
    .resize({ width: w, height: h, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 78, effort: 4 })
    .toBuffer({ resolveWithObject: true });
  const tiny = await sharp(data).resize(24, 24, { fit: 'inside' }).jpeg({ quality: 50 }).toBuffer();
  return { buffer: data, width: info.width, height: info.height, placeholder: `data:image/jpeg;base64,${tiny.toString('base64')}` };
}

async function download(url: string) {
  const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`fetch ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new Error('too large');
  return buf;
}

/** Upload-time helper for files that pass through the server (avatars, banners). Falls back to the original. */
export async function optimizeUpload(buf: Buffer, mime: string, pathNoExt: string, box: BoxId) {
  if (!isGif(buf)) {
    try {
      const o = await optimizeImage(buf, box);
      return await UploadService.uploadFile(o.buffer, 'image/webp', `${pathNoExt}.webp`);
    } catch (e) { console.warn('optimizeUpload failed, keeping original', e); }
  }
  return UploadService.uploadFile(buf, mime, pathNoExt);
}

// Originals are removed a little later, so anyone mid-scroll on the old URL still sees it
function removeLater(path: string | null | undefined) {
  if (!path) return;
  setTimeout(() => { UploadService.deleteFile(path).catch(() => {}); }, 10 * 60 * 1000).unref?.();
}

type Row = { id: string; url: string; storage_path: string | null; placeholder: string | null };

/** Optimise one stored photo row in place: new WebP file, new size, placeholder. */
async function optimizeRow(table: 'post_media' | 'stories', urlCol: 'url' | 'media_url', row: Row, box: BoxId, opts: { keepOriginal?: boolean } = {}) {
  if (row.placeholder || !row.url) return false;
  const original = await download(row.url);
  if (isGif(original)) return false; // keep animation
  const o = await optimizeImage(original, box);
  const base = row.storage_path ? row.storage_path.replace(/\.[a-z0-9]+$/i, '') : `${table === 'stories' ? 'stories' : 'posts'}/opt/${row.id}`;
  const up = await UploadService.uploadFile(o.buffer, 'image/webp', `${base}.opt.webp`);
  const { error } = await db.from(table).update({
    [urlCol]: up.url, storage_path: up.storagePath, width: o.width, height: o.height, placeholder: o.placeholder,
  }).eq('id', row.id);
  if (error) throw new Error(error.message);
  if (!opts.keepOriginal && row.storage_path && row.storage_path !== up.storagePath) removeLater(row.storage_path);
  return { before: original.length, after: o.buffer.length };
}

/** Run after a post is created (in the background). */
export async function optimizePostMedia(postId: string) {
  const { data } = await db.from('post_media').select('id, url, storage_path, placeholder').eq('post_id', postId).eq('media_type', 'image');
  for (const r of (data || []) as Row[]) {
    await optimizeRow('post_media', 'url', r, 'post').catch(e => console.warn('optimize post media failed', r.id, e?.message || e));
  }
}

/** Run after a photo story is created (in the background). */
export async function optimizeStory(storyId: string) {
  const { data } = await db.from('stories').select('id, media_url, storage_path, placeholder, media_type').eq('id', storyId).maybeSingle();
  const s: any = data;
  if (!s || s.media_type !== 'image') return;
  await optimizeRow('stories', 'media_url', { id: s.id, url: s.media_url, storage_path: s.storage_path, placeholder: s.placeholder }, 'story')
    .catch(e => console.warn('optimize story failed', s.id, e?.message || e));
}

/** One-off backfill for photos posted before the pipeline existed. */
export async function optimizeExisting(limit = 500) {
  const { data } = await db.from('post_media').select('id, url, storage_path, placeholder')
    .eq('media_type', 'image').is('placeholder', null).limit(limit);
  let done = 0, failed = 0, before = 0, after = 0;
  for (const r of (data || []) as Row[]) {
    try {
      const res = await optimizeRow('post_media', 'url', r, 'post');
      if (res) { done++; before += res.before; after += res.after; }
    } catch (e: any) { failed++; console.warn('backfill failed', r.id, e?.message || e); }
  }
  return { checked: data?.length || 0, done, failed, mbBefore: +(before / 1e6).toFixed(1), mbAfter: +(after / 1e6).toFixed(1) };
}
