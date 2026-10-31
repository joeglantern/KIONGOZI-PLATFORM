import { supabaseServiceClient } from '../config/supabase';

/**
 * Polls in feed posts (like X). The post text is the question; a poll has 2 to 4 choices
 * and is open from 1 hour to 7 days. One vote per person, final.
 *
 * Everything here tolerates the tables not existing yet (migration 20261031000700_post_polls):
 * reads return posts unchanged, writes say polls are not ready.
 */

export const POLL_MAX_OPTIONS = 4;
export const POLL_OPTION_MAX = 25;
export const POLL_HOURS = [1, 6, 24, 72, 168];

export interface PollView {
  options: { text: string; votes: number }[];
  total: number;
  ends_at: string;
  my_vote: number | null;
}

// Remember a missing table for a minute so feeds don't keep asking.
let missingUntil = 0;
const isMissing = (error: any) =>
  !!error && (error.code === '42P01' || error.code === 'PGRST205' || /does not exist|schema cache/i.test(error.message || ''));
const noteError = (error: any) => { if (isMissing(error)) missingUntil = Date.now() + 60_000; };

/** Validates a poll from the composer. Returns cleaned options and duration, or an error message. */
export function parsePoll(raw: any): { options: string[]; hours: number } | { error: string } {
  if (!raw || typeof raw !== 'object') return { error: 'Invalid poll' };
  const options = Array.isArray(raw.options) ? raw.options.map((o: any) => (typeof o === 'string' ? o.trim() : '')) : [];
  if (options.length < 2 || options.length > POLL_MAX_OPTIONS) return { error: 'A poll needs 2 to 4 choices' };
  if (options.some((o: string) => !o)) return { error: 'Choices cannot be empty' };
  if (options.some((o: string) => [...o].length > POLL_OPTION_MAX)) return { error: `Choices can be up to ${POLL_OPTION_MAX} characters` };
  if (new Set(options.map((o: string) => o.toLowerCase())).size !== options.length) return { error: 'Choices must be different' };
  const hours = Number(raw.duration_hours ?? 24);
  if (!POLL_HOURS.includes(hours)) return { error: 'Invalid poll length' };
  return { options, hours };
}

function view(row: any, myVote: number | null): PollView {
  const opts: string[] = Array.isArray(row.options) ? row.options : [];
  const counts: number[] = Array.isArray(row.votes) ? row.votes : [];
  const options = opts.map((text, i) => ({ text, votes: Math.max(0, Number(counts[i]) || 0) }));
  return {
    options,
    total: options.reduce((s, o) => s + o.votes, 0),
    ends_at: row.ends_at,
    my_vote: typeof myVote === 'number' ? myVote : null,
  };
}

/** Creates the poll for a new post. Returns null with ok=false if polls aren't available. */
export async function createPoll(postId: string, options: string[], hours: number): Promise<{ ok: boolean; poll?: PollView }> {
  const ends_at = new Date(Date.now() + hours * 3600_000).toISOString();
  const { data, error } = await supabaseServiceClient
    .from('post_polls')
    .insert({ post_id: postId, options, ends_at })
    .select('post_id, options, votes, ends_at')
    .single();
  if (error || !data) { noteError(error); return { ok: false }; }
  return { ok: true, poll: view(data, null) };
}

/** Adds `poll` to every post (and the original inside a repost) that has one. Mutates in place. */
export async function attachPolls(posts: any[], userId?: string): Promise<any[]> {
  if (!posts?.length || Date.now() < missingUntil) return posts;
  try {
    const all: any[] = [];
    for (const p of posts) {
      if (p?.id) all.push(p);
      if (p?.repost_of?.id) all.push(p.repost_of);
    }
    const ids = [...new Set(all.map(p => p.id))];
    if (!ids.length) return posts;

    const { data: polls, error } = await supabaseServiceClient
      .from('post_polls')
      .select('post_id, options, votes, ends_at')
      .in('post_id', ids);
    if (error) { noteError(error); return posts; }
    if (!polls?.length) return posts;

    const mine: Record<string, number> = {};
    if (userId) {
      const { data: votes } = await supabaseServiceClient
        .from('post_poll_votes')
        .select('post_id, option')
        .eq('user_id', userId)
        .in('post_id', polls.map((r: any) => r.post_id));
      for (const v of (votes || []) as any[]) mine[v.post_id] = v.option;
    }

    const byId: Record<string, any> = {};
    for (const r of polls as any[]) byId[r.post_id] = r;
    for (const p of all) {
      const r = byId[p.id];
      if (r) p.poll = view(r, mine[p.id] ?? null);
    }
  } catch {
    // never break a feed over polls
  }
  return posts;
}

export async function getPoll(postId: string, userId?: string): Promise<PollView | null> {
  const holder: any[] = [{ id: postId }];
  await attachPolls(holder, userId);
  return holder[0].poll ?? null;
}

/** Records a vote. Votes are final: voting again returns the poll as it stands. */
export async function vote(postId: string, userId: string, option: number): Promise<
  { status: 'ok' | 'already'; poll: PollView } | { status: 'missing' | 'ended' | 'bad_option' | 'unavailable' }
> {
  const { data: row, error } = await supabaseServiceClient
    .from('post_polls')
    .select('post_id, options, votes, ends_at')
    .eq('post_id', postId)
    .maybeSingle();
  if (error) { noteError(error); return { status: isMissing(error) ? 'unavailable' : 'missing' }; }
  if (!row) return { status: 'missing' };
  const count = Array.isArray(row.options) ? row.options.length : 0;
  if (!Number.isInteger(option) || option < 0 || option >= count) return { status: 'bad_option' };

  const { data: existing } = await supabaseServiceClient
    .from('post_poll_votes').select('option').eq('post_id', postId).eq('user_id', userId).maybeSingle();
  if (existing) {
    const poll = await getPoll(postId, userId);
    return { status: 'already', poll: poll ?? view(row, existing.option) };
  }
  if (new Date(row.ends_at).getTime() <= Date.now()) return { status: 'ended' };

  const { error: insErr } = await supabaseServiceClient
    .from('post_poll_votes').insert({ post_id: postId, user_id: userId, option });
  if (insErr && insErr.code !== '23505') return { status: 'unavailable' };

  const poll = await getPoll(postId, userId);
  if (!poll) return { status: 'unavailable' };
  return { status: insErr ? 'already' : 'ok', poll };
}
