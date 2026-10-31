// "Your week" (Wrapped-style story): the week's numbers from GET /social/recap, which slides to show,
// the persona, colours and the 3D assets. Pure data, no React.

export type WeekStats = {
  since: string; until: string;
  posts: number; likes: number; comments: number; followers: number; storyViews: number;
  postViews?: number;
  activeDays: number; streak: number;
  topPost: { id: string; content: string; likes: number; view_count?: number; thumbnail_url?: string | null } | null;
  topTag: string | null;
  topFan?: { id: string; username: string; full_name: string | null; avatar_url: string | null; count: number } | null;
  barazas?: number;
  bestDay?: string | null;
};

// Paper colours: slightly muted, like real card stock (matched to the cut-paper art)
export const INK = '#1B1712';
export const WHITE = '#FFFFFF';
export const PAPER_WHITE = '#FBF7EE';
export const LIME = '#B5DC5C';
export const CORAL = '#F2643D';
export const VIOLET = '#6248A8';
export const TEAL = '#1E7384';
export const AMBER = '#EFA51E';
export const CREAM = '#F3E9D2';
export const PINK = '#F4A3B4';
export const PEACH = '#FFD9A8';

export type SlideId = 'intro' | 'likes' | 'top' | 'followers' | 'fan' | 'streak' | 'baraza' | 'thing' | 'persona' | 'summary';

export const SLIDE_BG: Record<SlideId, string> = {
  intro: INK, likes: CORAL, top: VIOLET, followers: LIME, fan: TEAL,
  streak: AMBER, baraza: CREAM, thing: PINK, persona: VIOLET, summary: CREAM,
};

/** Slides with light backgrounds take ink text and ink progress bars */
export const LIGHT: Partial<Record<SlideId, true>> = { likes: true, followers: true, streak: true, baraza: true, thing: true, summary: true };

/** How long each slide stays before moving on (ms). The summary waits for you. */
export const SLIDE_MS: Record<SlideId, number> = {
  intro: 5000, likes: 6000, top: 7000, followers: 6000, fan: 6500,
  streak: 6500, baraza: 6000, thing: 6000, persona: 6500, summary: 0,
};

export const ART = {
  logo: require('../../../assets/kchat-logo.png'),
};

export const VIDEO = {
  intro: require('../../../assets/wrapped/intro.mp4'),
  introPoster: require('../../../assets/wrapped/intro_poster.jpg'),
  persona: require('../../../assets/wrapped/persona.mp4'),
  personaPoster: require('../../../assets/wrapped/persona_poster.jpg'),
};

/** Which slides this person gets. Nobody sees a "0 likes" slide; intro, persona and summary always show. */
export function visibleSlides(s: WeekStats | null): SlideId[] {
  if (!s) return ['intro'];
  const out: SlideId[] = ['intro'];
  if (s.likes > 0) out.push('likes');
  if (s.topPost) out.push('top');
  if (s.followers > 0) out.push('followers');
  if (s.topFan && s.topFan.count > 0) out.push('fan');
  if (s.activeDays > 0) out.push('streak');
  if ((s.barazas ?? 0) > 0) out.push('baraza');
  if (s.topTag || s.bestDay) out.push('thing');
  out.push('persona', 'summary');
  return out;
}

export type Persona = { name: string; line: string };

export function personaFor(s: WeekStats | null): Persona {
  const st = s || ({} as WeekStats);
  const likes = st.likes || 0, comments = st.comments || 0, stories = st.storyViews || 0;
  if ((st.barazas ?? 0) >= 2) return { name: 'The Voice', line: 'When the stools came out, you spoke up. People pulled up to hear what you had to say.' };
  if (comments > likes * 0.4 && comments >= 5) return { name: 'The Connector', line: 'You start conversations. People did not just like your posts, they replied, and that is rarer.' };
  if (likes >= 20) return { name: 'The Crowd Favourite', line: 'People kept coming back to tap the heart on what you shared. You gave them something worth it.' };
  if (stories >= likes && stories >= 10) return { name: 'The Storyteller', line: 'Your stories pulled people in. They kept watching to see what you would share next.' };
  if ((st.activeDays || 0) >= 5) return { name: 'The Regular', line: 'You showed up day after day. That is how a place starts to feel like home.' };
  return { name: 'The Newcomer', line: 'A quiet week, and that is fine. Pull up a stool and say your piece this week.' };
}

export const fmt = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M` : n >= 1e4 ? `${Math.round(n / 1e3)}K` : n >= 1e3 ? `${(n / 1e3).toFixed(1).replace(/\.0$/, '')}K` : String(n);

const TZ = 'Africa/Nairobi';
const month = (d: Date) => d.toLocaleString('en-GB', { month: 'short', timeZone: TZ });
const dayNum = (d: Date) => Number(d.toLocaleString('en-GB', { day: 'numeric', timeZone: TZ }));

/** "24 to 30 Oct" or "28 Oct to 3 Nov", Nairobi time */
export function rangeLabel(since?: string, until?: string) {
  const end = until ? new Date(until) : new Date();
  const start = since ? new Date(since) : new Date(end.getTime() - 6 * 864e5);
  return month(start) === month(end) ? `${dayNum(start)} to ${dayNum(end)} ${month(end)}` : `${dayNum(start)} ${month(start)} to ${dayNum(end)} ${month(end)}`;
}

/** "24 Oct" */
export function weekOfLabel(since?: string) {
  const d = since ? new Date(since) : new Date(Date.now() - 6 * 864e5);
  return `${dayNum(d)} ${month(d)}`;
}

/** The seven day letters of this week, starting from the first day (Nairobi time) */
export function weekLetters(since?: string) {
  const start = since ? new Date(since) : new Date(Date.now() - 6 * 864e5);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start.getTime() + i * 864e5 + 3 * 3600e3); // Nairobi is UTC+3 all year
    return 'SMTWTFS'[d.getUTCDay()];
  });
}

/** Biggest font size (up to max) that fits text of this many characters into width, for 900-weight digits */
export function fitSize(text: string, width: number, max: number, perChar = 0.6) {
  const n = Math.max(1, text.length);
  return Math.floor(Math.min(max, width / (n * perChar)));
}
