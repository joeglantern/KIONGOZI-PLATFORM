// More branded cards drawn with the same Satori pipeline as the AI share cards (ShareCardService):
//  - renderMinutesCard: baraza minutes, 4:5 (1080×1350), light sky header with the cloud and the stick
//  - renderPostShareCard: a post as a dark 9:16 story image (1080×1920)
//  (the profile QR card moved to QrCardService)
// Layouts follow the ShareCards and Profile boards (board px × 3).
import fs from 'fs';
import path from 'path';
import { h, renderTree, excerpt } from './ShareCardService';

const CARDS = path.join(process.cwd(), 'assets', 'cards');

// Loaded once per process
let pics: { logo: string; cloud: string; stick: string } | null = null;
function art() {
  if (pics) return pics;
  const uri = (f: string) => `data:image/png;base64,${fs.readFileSync(path.join(CARDS, f)).toString('base64')}`;
  pics = { logo: uri('kchat.png'), cloud: uri('cloud.png'), stick: uri('stick.png') };
  return pics;
}

const img = (src: string, w: number, ht: number, style: Record<string, any> = {}) =>
  ({ type: 'img', props: { src, width: w, height: ht, style: { width: w, height: ht, ...style } } });

/** Remote image → data URI (PNG/JPEG as is, anything else converted by sharp); null if unusable. */
export async function remoteImage(url?: string | null, maxSide = 1080): Promise<string | null> {
  if (!url || !/^https:\/\//.test(url)) return null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!r.ok) return null;
    let buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 12 * 1024 * 1024) return null;
    const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
    const isPng = buf.subarray(0, 4).toString('hex') === '89504e47';
    if (!isJpeg && !isPng) {
      // WebP / HEIC etc: Satori and resvg only read PNG and JPEG
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const sharp = require('sharp');
        buf = await sharp(buf).rotate().resize({ width: maxSide, height: maxSide, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 86 }).toBuffer();
        return `data:image/jpeg;base64,${buf.toString('base64')}`;
      } catch { return null; }
    }
    return `data:${isJpeg ? 'image/jpeg' : 'image/png'};base64,${buf.toString('base64')}`;
  } catch { return null; }
}

const initials = (name: string) =>
  (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?';

function avatar(src: string | null, name: string, size: number, border?: string) {
  const ring = border ? { border: `${Math.round(size * 0.045)}px solid ${border}` } : {};
  if (src) return img(src, size, size, { borderRadius: size / 2, objectFit: 'cover', ...ring });
  return h('div', {
    width: size, height: size, borderRadius: size / 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundImage: 'linear-gradient(135deg, #3FA845, #86BD2E)', color: '#FFFFFF', fontSize: size * 0.4, fontWeight: 700, ...ring,
  }, initials(name));
}

/** Drawn check mark (the brand font has no ✓ glyph). */
const check = (size: number, color: string) => ({
  type: 'svg',
  props: { width: size, height: size, viewBox: '0 0 24 24', children: { type: 'path', props: { d: 'M5 12.5l4.5 4.5L19 7.5', fill: 'none', stroke: color, strokeWidth: 3.4, strokeLinecap: 'round', strokeLinejoin: 'round' } } },
});

const nairobiDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Africa/Nairobi' });

// ─────────────────────────────── Minutes 4:5 ───────────────────────────────

export async function renderMinutesCard(m: {
  title: string;
  keyPoints: string[];
  ahadi?: { who: string; text: string } | null;
  host: string;            // username, no @
  date: string;            // ISO
  people: number;
}, previewWidth?: number): Promise<{ png: Buffer; width: number; height: number }> {
  const W = 1080, H = 1350;
  const { logo, cloud, stick } = art();
  const title = excerpt(m.title, 80);
  const tSize = title.length < 34 ? 66 : title.length < 56 ? 56 : 48;

  // Two key points and one promise (three points when nobody promised anything)
  const points = m.keyPoints.filter(Boolean).slice(0, m.ahadi ? 2 : 3).map(p => excerpt(p, 112));
  const badge = (bg: string, child: any) => h('div', {
    width: 66, height: 66, borderRadius: 33, backgroundColor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 36, fontWeight: 700, color: '#000000', flexShrink: 0,
  }, child);
  const row = (b: any, ...text: any[]) => h('div', { display: 'flex', marginBottom: 30 },
    b, h('div', { display: 'flex', flexDirection: 'column', flex: 1, marginLeft: 30, marginTop: 4 }, ...text));
  const line = (t: string, bold = false) => h('div', { fontSize: 42, lineHeight: 1.36, fontWeight: bold ? 700 : 500, color: '#000000' }, t);

  const tree = h('div', { width: W, height: H, display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF', fontFamily: 'Grotesk' },
    // sky header
    h('div', {
      width: W, height: 450, position: 'relative', display: 'flex', overflow: 'hidden',
      backgroundImage: 'linear-gradient(180deg, #B9B4F0 0%, #E3CBEA 55%, #FBD3B0 100%)',
    },
      img(cloud, 450, Math.round(450 * 207 / 360), { position: 'absolute', right: -18, top: 24 }),
      img(stick, 51, Math.round(51 * 420 / 171), { position: 'absolute', right: 234, top: 96, transform: 'rotate(14deg)' }),
      h('div', { position: 'absolute', left: 54, top: 54, width: W - 54 - 480, display: 'flex', flexDirection: 'column' },
        h('div', { fontSize: 36, fontWeight: 700, color: 'rgba(40,24,70,0.6)', letterSpacing: 1 }, 'BARAZA MINUTES'),
        h('div', { fontSize: tSize, lineHeight: 1.14, fontWeight: 700, color: '#1E1236', marginTop: 12, letterSpacing: -1 }, title),
      ),
    ),
    // points
    h('div', { display: 'flex', flexDirection: 'column', flex: 1, padding: '48px 54px 18px', overflow: 'hidden' },
      ...points.map((p, i) => row(badge('#F2F2F7', String(i + 1)), line(p))),
      ...(m.ahadi ? [row(badge('#FFF3D6', check(36, '#B7791F')),
        line(`@${m.ahadi.who.replace(/^@/, '')} promised`, true),
        line(excerpt(m.ahadi.text, 100)))] : []),
      ...(!points.length && !m.ahadi ? [line('The full minutes are on KChat.')] : []),
    ),
    // footer
    h('div', {
      height: 180, display: 'flex', alignItems: 'center', padding: '0 48px', borderTop: '2px solid rgba(60,60,67,0.18)',
    },
      img(logo, 96, 96, { borderRadius: 24 }),
      h('div', { display: 'flex', flexDirection: 'column', flex: 1, marginLeft: 30 },
        h('div', { fontSize: 40, fontWeight: 700, color: '#000000' }, `Hosted by @${m.host} on KChat`),
        h('div', { fontSize: 34, fontWeight: 500, color: 'rgba(60,60,67,0.7)', marginTop: 4 },
          `${nairobiDate(m.date)} · ${m.people} ${m.people === 1 ? 'person was' : 'people were'} there`),
      ),
      h('div', {
        height: 84, borderRadius: 42, backgroundColor: '#007AFF', color: '#FFFFFF', fontWeight: 700, fontSize: 38,
        padding: '0 36px', display: 'flex', alignItems: 'center', marginLeft: 20,
      }, 'OPEN'),
    ),
  );
  return { png: await renderTree(tree, W, H, previewWidth), width: W, height: H };
}

// ─────────────────────────────── Post 9:16 ───────────────────────────────

export async function renderPostShareCard(p: {
  name: string; username: string; avatarUrl?: string | null;
  content: string;
  mediaUrl?: string | null;  // first image, or a video's thumbnail
  isVideo?: boolean;
}, previewWidth?: number): Promise<{ png: Buffer; width: number; height: number }> {
  const W = 1080, H = 1920;
  const k = W / 340; // board scale
  const { logo } = art();
  const [av, media] = await Promise.all([remoteImage(p.avatarUrl, 200), remoteImage(p.mediaUrl, 1080)]);
  const side = Math.round(22 * k);
  const boxTop = Math.round(70 * k), boxBottom = Math.round(150 * k);
  const boxW = W - side * 2, boxH = H - boxTop - boxBottom;
  const white60 = 'rgba(255,255,255,0.6)';

  // With media the picture fills the box and the text becomes a two-line caption;
  // a text post is the box itself, in big type.
  const text = excerpt(p.content || '', media ? 96 : 300);
  const tSize = text.length < 80 ? 78 : text.length < 160 ? 64 : 54;

  const box = h('div', {
    position: 'absolute', left: side, top: boxTop, width: boxW, height: boxH, borderRadius: Math.round(20 * k),
    backgroundColor: '#2A2A30', display: 'flex', overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
  },
    ...(media ? [
      img(media, boxW, boxH, { objectFit: 'cover' }),
      ...(p.isVideo ? [h('div', {
        position: 'absolute', left: boxW / 2 - 70, top: boxH / 2 - 70, width: 140, height: 140, borderRadius: 70,
        backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }, { type: 'svg', props: { width: 64, height: 64, viewBox: '0 0 24 24', children: { type: 'path', props: { d: 'M8 5v14l11-7z', fill: '#FFFFFF' } } } })] : []),
    ] : [
      h('div', { display: 'flex', flexDirection: 'column', width: '100%', padding: '0 72px' },
        h('div', { fontSize: 120, lineHeight: 0.8, fontWeight: 700, color: '#86BD2E', marginBottom: 20 }, '“'),
        ...text.split('\n').filter(Boolean).map((l, i) =>
          h('div', { fontSize: tSize, lineHeight: 1.25, fontWeight: 700, color: '#FFFFFF', letterSpacing: -1, marginTop: i ? 18 : 0 }, l)),
      ),
    ]),
  );

  const tree = h('div', { width: W, height: H, display: 'flex', position: 'relative', backgroundColor: '#111114', fontFamily: 'Grotesk' },
    box,
    // who posted it
    h('div', { position: 'absolute', left: side, top: Math.round(26 * k), display: 'flex', alignItems: 'center' },
      avatar(av, p.name || p.username, 96),
      h('div', { display: 'flex', flexDirection: 'column', marginLeft: 26 },
        h('div', { fontSize: 44, fontWeight: 700, color: '#FFFFFF' }, p.name || p.username),
        h('div', { fontSize: 38, fontWeight: 500, color: white60 }, `@${p.username}`),
      ),
    ),
    // caption (media posts only)
    ...(media && text ? [h('div', {
      position: 'absolute', left: side, width: boxW, bottom: Math.round(84 * k) - 20, display: 'flex',
      fontSize: 46, lineHeight: 1.33, fontWeight: 500, color: '#FFFFFF', maxHeight: 46 * 1.33 * 2 + 4, overflow: 'hidden',
    }, text.replace(/\n/g, ' '))] : []),
    // brand bar
    h('div', {
      position: 'absolute', left: 0, bottom: 0, width: W, height: Math.round(64 * k), display: 'flex', alignItems: 'center',
      padding: `0 ${Math.round(18 * k)}px`, backgroundColor: '#1D1D20', borderTop: '2px solid rgba(255,255,255,0.12)',
    },
      img(logo, 102, 102, { borderRadius: 25 }),
      h('div', { display: 'flex', flexDirection: 'column', flex: 1, marginLeft: 32 },
        h('div', { fontSize: 44, fontWeight: 700, color: '#FFFFFF' }, 'KChat'),
        h('div', { fontSize: 38, fontWeight: 500, color: white60 }, 'See more on the app'),
      ),
      h('div', {
        height: 89, borderRadius: 45, backgroundColor: '#FFFFFF', color: '#111114', fontWeight: 700, fontSize: 40,
        padding: '0 38px', display: 'flex', alignItems: 'center',
      }, 'GET'),
    ),
  );
  return { png: await renderTree(tree, W, H, previewWidth), width: W, height: H };
}
