// Renders a Kiongozi AI answer as a branded PNG card (story 9:16 or post 4:5).
// Layout: Satori (flexbox → SVG); raster: resvg. Backgrounds are flat illustrated "skins"
// with a calm centre; each skin fixes its own text colours, so cards look the same in any app theme.
import fs from 'fs';
import path from 'path';
import { Resvg } from '@resvg/resvg-js';

const ASSETS = path.join(process.cwd(), 'assets');

export const SKINS = {
  mchanga: { file: 'mchanga.jpg', panel: '#FFFDF8', text: '#1F2430', sub: '#5A5F6B', accent: '#3E9A3E' },
  usiku: { file: 'usiku.jpg', panel: '#1C2438', text: '#F4F1EA', sub: '#AEB3C2', accent: '#F5B83D' },
  jua: { file: 'jua.jpg', panel: '#FFF6DF', text: '#1F2430', sub: '#5C5444', accent: '#E07B12' },
  msitu: { file: 'msitu.jpg', panel: '#173F24', text: '#F4F1EA', sub: '#BFD6C4', accent: '#F5B83D' },
} as const;
export type SkinId = keyof typeof SKINS;

const SIZES = { story: { w: 1080, h: 1920 }, post: { w: 1080, h: 1350 } } as const;
export type CardFormat = keyof typeof SIZES;

// Loaded once per process
let cache: { fonts: any[]; skins: Record<string, string>; orb: string } | null = null;
function load() {
  if (cache) return cache;
  const font = (f: string) => fs.readFileSync(path.join(ASSETS, 'fonts', f));
  const dataUri = (f: string, mime: string) => `data:${mime};base64,${fs.readFileSync(path.join(ASSETS, 'cards', f)).toString('base64')}`;
  cache = {
    fonts: [
      { name: 'Grotesk', data: font('SpaceGrotesk_500Medium.ttf'), weight: 500, style: 'normal' },
      { name: 'Grotesk', data: font('SpaceGrotesk_700Bold.ttf'), weight: 700, style: 'normal' },
    ],
    skins: Object.fromEntries(Object.entries(SKINS).map(([k, v]) => [k, dataUri(v.file, 'image/jpeg')])),
    orb: dataUri('orb.png', 'image/png'),
  };
  return cache;
}

/** Markdown → plain sentences, cut at a sentence end near `max` chars. */
export function excerpt(md: string, max: number) {
  let t = String(md || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/^\s*(\d+)[.)]\s+/gm, '$1. ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('.\n'), cut.lastIndexOf('\n'));
  const out = (end > max * 0.55 ? cut.slice(0, end + 1) : cut.replace(/\s+\S*$/, '') + '…').trim();
  // Never end on a bare list marker ("3.", "•") or a 1–2 word scrap of a list item
  const ls = out.split('\n');
  while (ls.length > 1 && /^(\d+\.|•)?\s*\S{0,12}…?$/.test(ls[ls.length - 1].trim())) ls.pop();
  return ls.join('\n').trim();
}

// Tiny element helper so we don't need JSX in the server build
const h = (type: string, style: Record<string, any>, ...children: any[]) => ({
  type,
  props: { style, children: children.length <= 1 ? children[0] : children },
});

export async function renderShareCard(opts: {
  question: string; answer: string; skin?: string; format?: string; username?: string | null; previewWidth?: number;
}): Promise<{ png: Buffer; width: number; height: number }> {
  const { fonts, skins, orb } = load();
  const skinId: SkinId = (opts.skin && opts.skin in SKINS ? opts.skin : 'mchanga') as SkinId;
  const fmt: CardFormat = opts.format === 'post' ? 'post' : 'story';
  const S = SKINS[skinId];
  const { w, h: H } = SIZES[fmt];
  const story = fmt === 'story';

  const question = excerpt(opts.question, story ? 130 : 100);
  const answer = excerpt(opts.answer, story ? 420 : 210);
  // Shorter answers get bigger type
  const aSize = story ? (answer.length < 200 ? 42 : answer.length < 330 ? 37 : 34) : (answer.length < 140 ? 36 : 32);
  const qSize = story ? (question.length < 60 ? 56 : 48) : (question.length < 60 ? 46 : 40);

  const lines = answer.split('\n').filter(Boolean);
  const tree = h('div', { width: w, height: H, display: 'flex', position: 'relative', fontFamily: 'Grotesk' },
    { type: 'img', props: { src: skins[skinId], width: w, height: H, style: { position: 'absolute', left: 0, top: 0, width: w, height: H, objectFit: 'cover' } } },
    h('div', {
      position: 'absolute', left: 0, top: 0, width: w, height: H, display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center', padding: story ? '200px 72px 220px' : '120px 84px 130px',
    },
    h('div', {
      display: 'flex', flexDirection: 'column', width: '100%', backgroundColor: S.panel, borderRadius: 48,
      padding: story ? '64px 60px 68px' : '48px 52px 52px',
    },
      // brand row
      h('div', { display: 'flex', alignItems: 'center', marginBottom: story ? 48 : 36 },
        { type: 'img', props: { src: orb, width: 64, height: 64, style: { width: 64, height: 64, borderRadius: 32 } } },
        h('div', { display: 'flex', flexDirection: 'column', marginLeft: 20 },
          h('div', { fontSize: 34, fontWeight: 700, color: S.text, letterSpacing: -0.5 }, 'Kiongozi AI'),
          h('div', { fontSize: 26, fontWeight: 500, color: S.sub, marginTop: 2 }, opts.username ? `@${opts.username} asked` : 'on KChat'),
        ),
      ),
      h('div', { fontSize: qSize, fontWeight: 700, color: S.text, lineHeight: 1.15, letterSpacing: -1.2 }, question),
      h('div', { width: 72, height: 8, borderRadius: 4, backgroundColor: S.accent, marginTop: story ? 44 : 32, marginBottom: story ? 40 : 30 }),
      h('div', { display: 'flex', flexDirection: 'column' },
        ...lines.map((l, i) => h('div', { fontSize: aSize, fontWeight: 500, color: S.text, lineHeight: 1.42, marginTop: i ? 14 : 0 }, l)),
      ),
    )),
    // footer
    h('div', {
      position: 'absolute', left: 0, bottom: story ? 120 : 56, width: w, display: 'flex', justifyContent: 'center',
    },
      h('div', { fontSize: 26, fontWeight: 700, color: S.text, letterSpacing: 2, backgroundColor: S.panel, borderRadius: 30, padding: '12px 28px' }, 'ASK KIONGOZI AI ON KCHAT'),
    ),
  );

  // satori is ESM-only; a native dynamic import keeps it working from this CommonJS build
  const satori = (await (new Function('m', 'return import(m)'))('satori')).default;
  const svg: string = await satori(tree as any, { width: w, height: H, fonts });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: opts.previewWidth || w } }).render().asPng();
  return { png: Buffer.from(png), width: w, height: H };
}
