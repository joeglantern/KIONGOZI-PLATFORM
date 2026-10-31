// Profile QR card in cut paper (4:5, 1080×1350). The app draws the same card live from the same numbers
// (kiongozi-mobile-working/src/components/social/qrCardDesign.ts) so what you edit is what gets exported.
// Two styles:
//   paper: the code printed on a torn cream patch, tilted, rounded modules, one brush stroke under the @handle
//   brush: the code on a paper-white card with dot modules, big name with one brush scribble behind it
// Six themes change the background, the code's ink, the brush colour and the two cut-paper shapes together.
// Error correction H; the photo sits in a cleared circle in the middle (well inside what H can repair).
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import { h, renderTree, excerpt } from './ShareCardService';
import { remoteImage } from './ShareCards2';

export const QR_THEMES = {
  coral: { bg: '#F2643D', text: '#1B1712', qr: '#1B1712', brush: '#FBF7EE', shapes: ['star', 'squiggle'] },
  lime: { bg: '#B5DC5C', text: '#1B1712', qr: '#1E7384', brush: '#F2643D', shapes: ['heart', 'sun'] },
  amber: { bg: '#EFA51E', text: '#1B1712', qr: '#6248A8', brush: '#F2643D', shapes: ['squiggle', 'heart'] },
  teal: { bg: '#1E7384', text: '#FBF7EE', qr: '#1E7384', brush: '#EFA51E', shapes: ['sun', 'star'] },
  violet: { bg: '#6248A8', text: '#FBF7EE', qr: '#6248A8', brush: '#B5DC5C', shapes: ['star', 'dots'] },
  ink: { bg: '#1B1712', text: '#F3E9D2', qr: '#1B1712', brush: '#F2643D', shapes: ['sun', 'heart'] },
} as const;
export type QrThemeId = keyof typeof QR_THEMES;
export type QrStyle = 'paper' | 'brush';
export const isQrTheme = (t: any): t is QrThemeId => typeof t === 'string' && t in QR_THEMES;
export const isQrStyle = (s: any): s is QrStyle => s === 'paper' || s === 'brush';

/** What the code opens. The one place the profile link format lives (the app takes it from this API). */
export const PROFILE_QR_BASE = 'https://api.kiongozi.org/u/';
export const profileQrUrl = (username: string) => `${PROFILE_QR_BASE}${encodeURIComponent(username)}`;

const W = 1080, H = 1350;
const INK = '#1B1712', CARD = '#FBF7EE';

/** Module matrix for a URL (error correction H), rows of '0'/'1'. The app draws exactly this. */
export function qrMatrix(url: string): string[] {
  const q = QRCode.create(url, { errorCorrectionLevel: 'H' });
  const n = q.modules.size, d = q.modules.data;
  const rows: string[] = [];
  for (let y = 0; y < n; y++) {
    let r = '';
    for (let x = 0; x < n; x++) r += d[y * n + x] ? '1' : '0';
    rows.push(r);
  }
  return rows;
}

/** Radius (in modules) of the cleared circle the photo sits in */
export const clearRadius = (n: number) => Math.round(n * 0.12 * 2) / 2 + 0.5;

const inFinder = (x: number, y: number, n: number) =>
  (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);

/** The code as SVG: styled modules, styled eyes, a hole in the middle for the photo */
function qrSvg(rows: string[], ink: string, style: QrStyle) {
  const n = rows.length, c = n / 2, R = clearRadius(n);
  const parts: string[] = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (rows[y][x] !== '1' || inFinder(x, y, n)) continue;
    if (Math.hypot(x + 0.5 - c, y + 0.5 - c) < R) continue;
    parts.push(style === 'brush'
      ? `<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.48"/>`
      : `<rect x="${x + 0.03}" y="${y + 0.03}" width="0.94" height="0.94" rx="0.3"/>`);
  }
  for (const [fx, fy] of [[0, 0], [n - 7, 0], [0, n - 7]]) {
    const ro = style === 'brush' ? 2.6 : 1.7, ri = style === 'brush' ? 1.4 : 0.9;
    parts.push(`<rect x="${fx + 0.5}" y="${fy + 0.5}" width="6" height="6" rx="${ro}" fill="none" stroke="${ink}" stroke-width="1"/>`);
    parts.push(`<rect x="${fx + 2}" y="${fy + 2}" width="3" height="3" rx="${ri}"/>`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="geometricPrecision"><g fill="${ink}">${parts.join('')}</g></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// ── Art: the paper pieces (assets/qr, made from the app's cut-paper kit), tinted and shadowed once per process
type Art = { uri: string; w: number; h: number };
const DIR = path.join(process.cwd(), 'assets', 'qr');
const base = new Map<string, Art>();
const tinted = new Map<string, Art>();
function piece(name: string): Art {
  let a = base.get(name);
  if (!a) {
    const buf = fs.readFileSync(path.join(DIR, `${name}.png`));
    a = { uri: `data:image/png;base64,${buf.toString('base64')}`, w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
    base.set(name, a);
  }
  return a;
}
/** The piece's silhouette in one flat colour (brush marks in the theme colour, shadows in ink) */
async function tint(name: string, color: string): Promise<Art> {
  const key = `${name}|${color}`;
  const hit = tinted.get(key);
  if (hit) return hit;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const sharp = require('sharp');
  const file = path.join(DIR, `${name}.png`);
  const meta = await sharp(file).metadata();
  const alpha = await sharp(file).ensureAlpha().extractChannel(3).toBuffer();
  const n = parseInt(color.slice(1), 16);
  const buf: Buffer = await sharp({ create: { width: meta.width, height: meta.height, channels: 3, background: { r: n >> 16, g: (n >> 8) & 255, b: n & 255 } } })
    .joinChannel(alpha).png().toBuffer();
  const a = { uri: `data:image/png;base64,${buf.toString('base64')}`, w: meta.width, h: meta.height };
  tinted.set(key, a);
  return a;
}
let logoUri: string | null = null;
const logo = () => (logoUri ??= `data:image/png;base64,${fs.readFileSync(path.join(process.cwd(), 'assets', 'cards', 'kchat.png')).toString('base64')}`);

const img = (src: string, w: number, ht: number, style: Record<string, any> = {}) =>
  ({ type: 'img', props: { src, width: w, height: ht, style: { width: w, height: ht, ...style } } });
const abs = (x: number, y: number, extra: Record<string, any> = {}) => ({ position: 'absolute', left: x, top: y, display: 'flex', ...extra });

/** A cutout with its edge-following shadow (same as the app's Cutout) */
async function cutout(name: string, x: number, y: number, w: number, rot: number) {
  const a = piece(name), sh = await tint(name, INK);
  const ht = Math.round(w * a.h / a.w);
  return h('div', abs(x, y, { width: w + 12, height: ht + 14, transform: `rotate(${rot}deg)` }),
    img(sh.uri, w, ht, { position: 'absolute', left: 8, top: 10, opacity: 0.22 }),
    img(a.uri, w, ht, { position: 'absolute', left: 0, top: 0 }),
  );
}

const initials = (name: string) =>
  (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?';

/** Name size steps (shared with the app) */
export const nameSize = (name: string, big: number, maxW: number) =>
  Math.max(40, Math.min(big, Math.floor(maxW / (Math.max(1, name.length) * 0.6))));
/** Rough text width for Space Grotesk Bold (so the brush stroke fits the @handle in both renderers) */
export const textWidth = (t: string, size: number) => Math.round(t.length * size * 0.6);

// Layout numbers (board px). The app copies these.
export const QR_LAYOUT = {
  paper: { patch: { x: 150, y: 396, w: 780, h: 860, rot: -2 }, qr: { x: 100, y: 96, size: 580 }, caption: 722, shapes: [{ x: 806, y: 54, w: 220, rot: 12 }, { x: 34, y: 1128, w: 200, rot: -10 }] },
  brush: { card: { x: 190, y: 170, size: 700, radius: 44 }, qr: 580, name: 924, handle: 1090, foot: 1222, shapes: [{ x: 36, y: 64, w: 180, rot: -12 }, { x: 878, y: 1110, w: 170, rot: 10 }] },
} as const;

export async function renderQrCardArt(u: {
  name: string; username: string; avatarUrl?: string | null; url: string; theme?: string; style?: string;
}, previewWidth?: number): Promise<{ png: Buffer; width: number; height: number }> {
  const t = QR_THEMES[isQrTheme(u.theme) ? u.theme : 'coral'];
  const style: QrStyle = isQrStyle(u.style) ? u.style : 'paper';
  const rows = qrMatrix(u.url);
  const n = rows.length;
  const name = excerpt(u.name || u.username, 26);
  const handle = `@${u.username}`;
  const av = await remoteImage(u.avatarUrl, 300);
  const grain = piece('grain');
  const [s1, s2] = t.shapes;

  /** The code with the photo in its middle; `paperColor` rings the photo */
  const code = (size: number, paperColor: string) => {
    const m = size / n, R = clearRadius(n);
    const d = Math.round((R - 0.5) * 2 * m);
    const ring = Math.round(m * 0.45);
    const photo = av
      ? img(av, d, d, { borderRadius: d / 2, objectFit: 'cover' })
      : h('div', { width: d, height: d, borderRadius: d / 2, backgroundColor: t.qr, color: CARD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: d * 0.38, fontWeight: 700 }, initials(name));
    return h('div', { display: 'flex', position: 'relative', width: size, height: size },
      img(qrSvg(rows, t.qr, style), size, size),
      h('div', abs(size / 2 - d / 2 - ring, size / 2 - d / 2 - ring, {
        width: d + ring * 2, height: d + ring * 2, borderRadius: d / 2 + ring, backgroundColor: paperColor, alignItems: 'center', justifyContent: 'center',
      }), photo),
    );
  };

  const mark = (color: string) => h('div', { display: 'flex', alignItems: 'center' },
    img(logo(), 58, 58, { borderRadius: 15 }),
    h('div', { fontSize: 36, fontWeight: 700, color, marginLeft: 16, letterSpacing: -0.5 }, 'KChat'),
  );

  let body: any[];
  if (style === 'paper') {
    const L = QR_LAYOUT.paper;
    const patch = piece('patch');
    const pw = L.patch.w, ph = L.patch.h;
    const pshadow = await tint('patch', INK);
    const nSize = nameSize(name, 92, 720);
    const hw = Math.min(860, textWidth(handle, 46) + 40);
    const brush = await tint('underline', t.brush);
    body = [
      h('div', abs(80, 76), mark(t.text)),
      h('div', abs(80, 168, { width: 720, fontSize: nSize, fontWeight: 700, color: t.text, letterSpacing: -3, lineHeight: 1 }), name),
      img(brush.uri, hw, 40, { position: 'absolute', left: 64, top: 316, transform: 'rotate(-2deg)' }),
      h('div', abs(80, 268, { fontSize: 46, fontWeight: 700, color: t.text }), handle),
      // the torn patch with the code printed on it
      img(pshadow.uri, pw, ph, { position: 'absolute', left: L.patch.x + 14, top: L.patch.y + 20, opacity: 0.24, transform: `rotate(${L.patch.rot}deg)` }),
      h('div', abs(L.patch.x, L.patch.y, { width: pw, height: ph, transform: `rotate(${L.patch.rot}deg)` }),
        img(patch.uri, pw, ph, { position: 'absolute', left: 0, top: 0 }),
        h('div', abs(L.qr.x, L.qr.y), code(L.qr.size, '#EFE6D0')),
        h('div', abs(0, L.caption, { width: pw, justifyContent: 'center', fontSize: 34, fontWeight: 700, color: INK }), 'Scan to follow me on KChat'),
      ),
      await cutout(s1, L.shapes[0].x, L.shapes[0].y, L.shapes[0].w, L.shapes[0].rot),
      await cutout(s2, L.shapes[1].x, L.shapes[1].y, L.shapes[1].w, L.shapes[1].rot),
    ];
  } else {
    const L = QR_LAYOUT.brush;
    const c = L.card, inset = (c.size - L.qr) / 2;
    const nSize = nameSize(name, 96, 1000);
    const sw = Math.min(900, textWidth(name, nSize) + 40);
    const scrib = await tint('scribble', t.brush);
    body = [
      // the card and its shadow
      h('div', abs(c.x + 14, c.y + 20, { width: c.size, height: c.size, borderRadius: c.radius, backgroundColor: INK, opacity: 0.24 })),
      h('div', abs(c.x, c.y, { width: c.size, height: c.size, borderRadius: c.radius, backgroundColor: CARD }),
        h('div', abs(inset, inset), code(L.qr, CARD)),
      ),
      img(scrib.uri, sw, 58, { position: 'absolute', left: (W - sw) / 2, top: L.name + Math.round(nSize * 0.86) }),
      h('div', abs(40, L.name, { width: W - 80, justifyContent: 'center', fontSize: nSize, fontWeight: 700, color: t.text, letterSpacing: -3, lineHeight: 1 }), name),
      h('div', abs(40, L.handle, { width: W - 80, justifyContent: 'center', fontSize: 44, fontWeight: 700, color: t.text, opacity: 0.86 }), handle),
      h('div', abs(0, L.foot, { width: W, justifyContent: 'center' }), mark(t.text)),
      await cutout(s1, L.shapes[0].x, L.shapes[0].y, L.shapes[0].w, L.shapes[0].rot),
      await cutout(s2, L.shapes[1].x, L.shapes[1].y, L.shapes[1].w, L.shapes[1].rot),
    ];
  }

  const tree = h('div', { width: W, height: H, display: 'flex', position: 'relative', backgroundColor: t.bg, fontFamily: 'Grotesk', overflow: 'hidden' },
    img(grain.uri, W, H, { position: 'absolute', left: 0, top: 0, objectFit: 'cover', opacity: t.text === INK ? 0.7 : 0.9 }),
    ...body,
  );
  return { png: await renderTree(tree, W, H, previewWidth), width: W, height: H };
}
