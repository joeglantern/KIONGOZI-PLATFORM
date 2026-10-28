// Link-preview images (1200×630, what WhatsApp / X / Slack show for a shared link).
// Drawn with the same Satori pipeline as the AI share cards (see My Stack/satori-server-images.md).
import { h, renderTree, cardAssets, excerpt } from './ShareCardService';

const W = 1200, H = 630;
const INK = '#0E1116', CREAM = '#F4F1EA', SUB = '#A4A9B6', GREEN = '#5CB85C', LINE = '#232833';

// Small in-memory cache: previews are requested again by every chat app that unfurls the link
const cache = new Map<string, { png: Buffer; at: number }>();
const TTL = 30 * 60 * 1000;
function cached(key: string) {
  const c = cache.get(key);
  return c && Date.now() - c.at < TTL ? c.png : null;
}
function remember(key: string, png: Buffer) {
  if (cache.size > 200) cache.delete(cache.keys().next().value as string);
  cache.set(key, { png, at: Date.now() });
  return png;
}

/** Remote image → data URI (PNG/JPEG only, 7s timeout); null if unusable. */
async function remote(url?: string | null): Promise<string | null> {
  if (!url || !/^https:\/\//.test(url)) return null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 8 * 1024 * 1024) return null;
    // Trust the bytes, not the label: iPhone HEIC photos are often served as image/jpeg
    const type = buf[0] === 0xff && buf[1] === 0xd8 ? 'image/jpeg'
      : buf.subarray(0, 4).toString('hex') === '89504e47' ? 'image/png' : null;
    return type ? `data:${type};base64,${buf.toString('base64')}` : null;
  } catch { return null; }
}

function avatar(src: string | null, name: string, size: number) {
  if (src) return { type: 'img', props: { src, width: size, height: size, style: { width: size, height: size, borderRadius: size / 2, objectFit: 'cover' } } };
  const initials = (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?';
  return h('div', { width: size, height: size, borderRadius: size / 2, backgroundColor: '#2A3A2C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 700, color: CREAM }, initials);
}

/** Green verified badge with a drawn check (fonts may lack the ✓ glyph). */
function badge(size: number) {
  return h('div', { width: size, height: size, borderRadius: size / 2, backgroundColor: GREEN, marginLeft: size * 0.36, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    { type: 'svg', props: { width: size * 0.6, height: size * 0.6, viewBox: '0 0 24 24', children: { type: 'path', props: { d: 'M5 12.5l4.5 4.5L19 7.5', fill: 'none', stroke: INK, strokeWidth: 3.2, strokeLinecap: 'round', strokeLinejoin: 'round' } } } },
  );
}

function brand() {
  const { orb } = cardAssets();
  return h('div', { display: 'flex', alignItems: 'center' },
    { type: 'img', props: { src: orb, width: 44, height: 44, style: { width: 44, height: 44, borderRadius: 22 } } },
    h('div', { fontSize: 28, fontWeight: 700, color: CREAM, marginLeft: 14, letterSpacing: -0.5 }, 'KChat'),
    h('div', { fontSize: 24, fontWeight: 500, color: SUB, marginLeft: 12 }, 'Kiongozi'),
  );
}

const fmt = (n?: number | null) => {
  const v = Number(n || 0);
  return v >= 1e6 ? `${(v / 1e6).toFixed(1).replace(/\.0$/, '')}M` : v >= 1e3 ? `${(v / 1e3).toFixed(1).replace(/\.0$/, '')}K` : String(v);
};

export async function postPreview(p: {
  id: string; content: string; name: string; username: string; avatarUrl?: string | null; imageUrl?: string | null; verified?: boolean;
}): Promise<Buffer> {
  const key = `post:${p.id}`;
  const hit = cached(key);
  if (hit) return hit;
  const [av, img] = await Promise.all([remote(p.avatarUrl), remote(p.imageUrl)]);
  const text = excerpt(p.content, img ? 180 : 260);
  const size = text.length < 90 ? 46 : text.length < 170 ? 38 : 32;

  const tree = h('div', { width: W, height: H, display: 'flex', backgroundColor: INK, fontFamily: 'Grotesk', padding: 56 },
    h('div', { display: 'flex', flexDirection: 'column', width: img ? W - 112 - 470 - 44 : W - 112, height: H - 112, justifyContent: 'space-between' },
      h('div', { display: 'flex', alignItems: 'center' },
        avatar(av, p.name, 72),
        h('div', { display: 'flex', flexDirection: 'column', marginLeft: 20 },
          h('div', { display: 'flex', alignItems: 'center' },
            h('div', { fontSize: 32, fontWeight: 700, color: CREAM }, p.name || p.username),
            ...(p.verified ? [badge(28)] : []),
          ),
          h('div', { fontSize: 24, fontWeight: 500, color: SUB, marginTop: 2 }, `@${p.username}`),
        ),
      ),
      h('div', { display: 'flex', width: '100%', fontSize: size, fontWeight: 500, color: CREAM, lineHeight: 1.35 }, text || ' '),
      brand(),
    ),
    ...(img ? [{ type: 'img', props: { src: img, width: 470, height: 518, style: { width: 470, height: 518, marginLeft: 44, borderRadius: 32, objectFit: 'cover' } } }] : []),
  );
  return remember(key, await renderTree(tree, W, H));
}

export async function profilePreview(p: {
  username: string; name: string; bio?: string | null; avatarUrl?: string | null; followers?: number; posts?: number; verified?: boolean;
}): Promise<Buffer> {
  const key = `profile:${p.username}:${p.followers}:${p.posts}`;
  const hit = cached(key);
  if (hit) return hit;
  const av = await remote(p.avatarUrl);
  const bio = excerpt(p.bio || '', 140);

  const stat = (n: string, label: string) => h('div', { display: 'flex', alignItems: 'baseline', marginRight: 36 },
    h('div', { fontSize: 34, fontWeight: 700, color: CREAM }, n),
    h('div', { fontSize: 24, fontWeight: 500, color: SUB, marginLeft: 10 }, label),
  );

  const tree = h('div', { width: W, height: H, display: 'flex', alignItems: 'center', backgroundColor: INK, fontFamily: 'Grotesk', padding: '56px 72px' },
    h('div', { display: 'flex', width: 300, height: 300, borderRadius: 150, border: `6px solid ${GREEN}`, padding: 8 },
      avatar(av, p.name, 272),
    ),
    h('div', { display: 'flex', flexDirection: 'column', flex: 1, marginLeft: 64 },
      h('div', { display: 'flex', alignItems: 'center' },
        h('div', { fontSize: 54, fontWeight: 700, color: CREAM, letterSpacing: -1.2 }, p.name || p.username),
        ...(p.verified ? [badge(38)] : []),
      ),
      h('div', { fontSize: 30, fontWeight: 500, color: SUB, marginTop: 4 }, `@${p.username}`),
      ...(bio ? [h('div', { display: 'flex', fontSize: 28, fontWeight: 500, color: CREAM, lineHeight: 1.35, marginTop: 22 }, bio)] : []),
      h('div', { display: 'flex', marginTop: 26 }, stat(fmt(p.followers), 'followers'), stat(fmt(p.posts), 'posts')),
      h('div', { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 36, paddingTop: 28, borderTop: `2px solid ${LINE}` },
        brand(),
        h('div', { display: 'flex', fontSize: 24, fontWeight: 700, color: INK, backgroundColor: GREEN, borderRadius: 26, padding: '12px 26px' }, 'Follow on KChat'),
      ),
    ),
  );
  return remember(key, await renderTree(tree, W, H));
}
