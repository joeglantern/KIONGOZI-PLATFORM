// Muted words: words, phrases and #tags someone never wants to see. Feeds drop matching posts,
// notifications drop matching rows and pushes. Backed by public.muted_words (migration
// 20261031000900); before it runs everything here returns "nothing muted".
import { prisma } from '../config/prisma';

export type MutedWord = { id: string; phrase: string; expires_at: Date | null; created_at: Date };

const TTL = 60_000;
const cache = new Map<string, { words: MutedWord[]; at: number }>();
let missingUntil = 0;

const isMissingTable = (e: any) => /42P01|does not exist/i.test(String(e?.message || '') + String(e?.meta?.code || ''));

export async function listMutedWords(userId: string, fresh = false): Promise<MutedWord[] | null> {
  if (Date.now() < missingUntil) return null;
  const hit = cache.get(userId);
  if (!fresh && hit && Date.now() - hit.at < TTL) return hit.words;
  try {
    const words = await prisma.$queryRaw<MutedWord[]>`
      select id::text, phrase, expires_at, created_at from public.muted_words
      where user_id = ${userId}::uuid and (expires_at is null or expires_at > now())
      order by created_at desc limit 200`;
    if (cache.size > 20_000) cache.clear();
    cache.set(userId, { words, at: Date.now() });
    return words;
  } catch (e) {
    if (isMissingTable(e)) missingUntil = Date.now() + 5 * 60_000;
    else console.error('muted words: list failed:', (e as any)?.message || e);
    return null;
  }
}

export function forgetMutedWords(userId: string) { cache.delete(userId); }

export function isTableMissing() { return Date.now() < missingUntil; }
export function noteMissing(e: any) { if (isMissingTable(e)) { missingUntil = Date.now() + 5 * 60_000; return true; } return false; }

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** One regex per person: whole words, any case; "#tag" also matches the bare word and vice versa */
function matcher(words: MutedWord[]): RegExp | null {
  const parts = words
    .map(w => w.phrase.trim().toLowerCase().replace(/^#/, ''))
    .filter(Boolean)
    .map(p => escape(p).replace(/\s+/g, '\\s+'));
  if (!parts.length) return null;
  return new RegExp(`(^|[^\\p{L}\\p{N}_])#?(${parts.join('|')})(?=$|[^\\p{L}\\p{N}_])`, 'iu');
}

const matcherCache = new WeakMap<MutedWord[], RegExp | null>();
function compiled(words: MutedWord[]) {
  if (!matcherCache.has(words)) matcherCache.set(words, matcher(words));
  return matcherCache.get(words) || null;
}

export function textMatches(words: MutedWord[] | null, ...texts: (string | null | undefined)[]): boolean {
  if (!words?.length) return false;
  const re = compiled(words);
  return !!re && texts.some(t => typeof t === 'string' && t && re.test(t));
}

/** Drop posts (or reposts of posts) whose text has a muted word. Never throws. */
export async function dropMutedPosts<T extends Record<string, any>>(posts: T[], userId?: string): Promise<T[]> {
  if (!userId || !posts?.length) return posts;
  const words = await listMutedWords(userId);
  if (!words?.length) return posts;
  return posts.filter(p => p.user_id === userId || !textMatches(words, p.content, p.repost_of?.content));
}

/** For a push about to go out: does its text hit one of the recipient's muted words? */
export async function hitsMutedWord(userId: string, ...texts: (string | null | undefined)[]): Promise<boolean> {
  const words = await listMutedWords(userId);
  return textMatches(words, ...texts);
}
