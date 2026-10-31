// Cut-paper QR card: themes and layout numbers (board px on a 1080×1350 card).
// These mirror api-server/src/services/QrCardService.ts, which renders the exported PNG,
// so the card you edit in the app is the card that gets shared. Change both together.

export type QrThemeId = 'coral' | 'lime' | 'amber' | 'teal' | 'violet' | 'ink';
export type QrStyle = 'paper' | 'brush';
export type QrShape = 'star' | 'squiggle' | 'heart' | 'sun' | 'dots';

export const QR_THEMES: Record<QrThemeId, { bg: string; text: string; qr: string; brush: string; shapes: [QrShape, QrShape] }> = {
  coral: { bg: '#F2643D', text: '#1B1712', qr: '#1B1712', brush: '#FBF7EE', shapes: ['star', 'squiggle'] },
  lime: { bg: '#B5DC5C', text: '#1B1712', qr: '#1E7384', brush: '#F2643D', shapes: ['heart', 'sun'] },
  amber: { bg: '#EFA51E', text: '#1B1712', qr: '#6248A8', brush: '#F2643D', shapes: ['squiggle', 'heart'] },
  teal: { bg: '#1E7384', text: '#FBF7EE', qr: '#1E7384', brush: '#EFA51E', shapes: ['sun', 'star'] },
  violet: { bg: '#6248A8', text: '#FBF7EE', qr: '#6248A8', brush: '#B5DC5C', shapes: ['star', 'dots'] },
  ink: { bg: '#1B1712', text: '#F3E9D2', qr: '#1B1712', brush: '#F2643D', shapes: ['sun', 'heart'] },
};
export const QR_THEME_ORDER: QrThemeId[] = ['coral', 'lime', 'amber', 'teal', 'violet', 'ink'];

export const QR_INK = '#1B1712';
export const QR_CARD = '#FBF7EE';
export const QR_PATCH_RING = '#EFE6D0';
export const BOARD_W = 1080;
export const BOARD_H = 1350;

export const QR_LAYOUT = {
  paper: {
    patch: { x: 150, y: 396, w: 780, h: 860, rot: -2 },
    qr: { x: 100, y: 96, size: 580 },
    caption: 722,
    shapes: [{ x: 806, y: 54, w: 220, rot: 12 }, { x: 34, y: 1128, w: 200, rot: -10 }],
  },
  brush: {
    card: { x: 190, y: 170, size: 700, radius: 44 },
    qr: 580, name: 924, handle: 1090, foot: 1222,
    shapes: [{ x: 36, y: 64, w: 180, rot: -12 }, { x: 878, y: 1110, w: 170, rot: 10 }],
  },
} as const;

/** Radius (in modules) of the cleared circle the photo sits in */
export const clearRadius = (n: number) => Math.round(n * 0.12 * 2) / 2 + 0.5;
export const inFinder = (x: number, y: number, n: number) =>
  (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);

/** Rough Space Grotesk Bold width, used for the brush stroke length and name size */
export const textWidth = (t: string, size: number) => Math.round(t.length * size * 0.6);
/** Name size: as big as `big`, smaller when the name would not fit `maxW` on one line */
export const nameSize = (name: string, big: number, maxW: number) =>
  Math.max(40, Math.min(big, Math.floor(maxW / (Math.max(1, name.length) * 0.6))));
/** Same cut as the server (names over 26 characters end with …) */
export const cardName = (name: string) => {
  const t = (name || '').trim();
  return t.length <= 26 ? t : t.slice(0, 26).replace(/\s+\S*$/, '') + '…';
};
