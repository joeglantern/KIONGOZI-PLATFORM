// Small AI helpers that stay out of the way:
//  POST /api/v1/assist/replies   three short reply ideas for a chat (in the chat's own language)
// Photo descriptions for screen readers are made in the background when a post is created
// (see describePostImages below).
import { Router, Request, Response } from 'express';
import OpenAI from 'openai';
import { supabaseServiceClient as db } from '../config/supabase';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Same last message → same suggestions (no repeat model calls while someone reopens a chat)
const cache = new Map<string, { at: number; replies: string[] }>();
const perUser = new Map<string, number[]>();
const CACHE_MS = 15 * 60 * 1000;

function allowed(userId: string) {
  const now = Date.now();
  const recent = (perUser.get(userId) || []).filter(t => now - t < 60_000);
  if (recent.length >= 12) return false;
  recent.push(now);
  perUser.set(userId, recent);
  if (perUser.size > 5000) perUser.clear();
  return true;
}

router.post('/replies', authenticateToken, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const conversationId = String(req.body?.conversationId || '');
  if (!conversationId) { res.status(400).json({ success: false, error: 'conversationId required' }); return; }
  try {
    const { data: member } = await db.from('dm_participants').select('user_id')
      .eq('conversation_id', conversationId).eq('user_id', userId).maybeSingle();
    if (!member) { res.status(403).json({ success: false, error: 'Not in this chat' }); return; }

    const { data: rows } = await db.from('dm_messages').select('id, sender_id, content, media_url, created_at')
      .eq('conversation_id', conversationId).order('created_at', { ascending: false }).limit(10);
    const msgs = (rows || []).reverse();
    const last = msgs[msgs.length - 1];
    // Only suggest when the last message is theirs and has words in it
    if (!last || last.sender_id === userId || !last.content?.trim()) { res.json({ success: true, data: { replies: [] } }); return; }

    const key = `${conversationId}:${last.id}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_MS) { res.json({ success: true, data: { replies: hit.replies } }); return; }
    if (!allowed(userId)) { res.json({ success: true, data: { replies: [] } }); return; }

    const transcript = msgs
      .filter(m => m.content?.trim() || m.media_url)
      .map(m => `${m.sender_id === userId ? 'Me' : 'Them'}: ${m.content?.trim() || '[photo]'}`)
      .join('\n')
      .slice(-1800);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 120,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You suggest quick replies for "Me" in a Kenyan social app chat. Give exactly 3 short, natural replies to the last message from "Them" ' +
            '(2 to 6 words each), in the same language and tone they used (English, Swahili or Sheng). Make the three different ' +
            '(e.g. agree, ask back, light). No hashtags, at most one emoji in total, never anything rude. ' +
            'Reply as JSON: {"replies":["...","...","..."]}',
        },
        { role: 'user', content: transcript },
      ],
    });
    let replies: string[] = [];
    try {
      const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
      replies = (Array.isArray(parsed.replies) ? parsed.replies : [])
        .map((r: unknown) => String(r).trim())
        .filter((r: string) => r && r.length <= 60)
        .slice(0, 3);
    } catch {}
    cache.set(key, { at: Date.now(), replies });
    if (cache.size > 2000) cache.clear();
    res.json({ success: true, data: { replies } });
  } catch (e) {
    console.error('assist/replies failed:', e);
    res.json({ success: true, data: { replies: [] } });
  }
});

/** Writes a one-line description of each new photo (post_media.alt_text) for screen readers. */
export async function describePostImages(postId: string) {
  try {
    const { data: media } = await db.from('post_media').select('id, url, media_type, alt_text')
      .eq('post_id', postId).order('order_index');
    for (const m of media || []) {
      if (m.media_type !== 'image' || m.alt_text) continue;
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 60,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: 'Describe this photo in one plain sentence (max 18 words) for someone who cannot see it. Say what is in it, not how it feels. No "image of".',
          },
          { role: 'user', content: [{ type: 'image_url', image_url: { url: m.url, detail: 'low' } }] as any },
        ],
      });
      const alt = completion.choices[0]?.message?.content?.trim().replace(/^"|"$/g, '').slice(0, 200);
      if (alt) await db.from('post_media').update({ alt_text: alt }).eq('id', m.id);
    }
  } catch {
    // Column not added yet or the model is unavailable: the photo just has no description
  }
}

export default router;
