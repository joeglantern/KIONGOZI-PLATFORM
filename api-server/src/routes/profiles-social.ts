import { Router, Request, Response } from 'express';
import { attachPolls } from '../services/PollService';
import { supabaseServiceClient } from '../config/supabase';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import UploadService from '../services/UploadService';
import multer from 'multer';
import { optimizeUpload } from '../services/ImageOptimizer';
import { renderQrCardArt, qrMatrix, profileQrUrl, isQrTheme, isQrStyle } from '../services/QrCardService';
import { enrichWithUserState } from '../services/FeedService';
import { mediaAlt } from '../config/mediaColumns';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ─── Pinned post + link in bio ───────────────────────────────────────────────
// profiles.website and profiles.pinned_post_id come with migration 20261031000800_pinned_and_link.
// Until it has run, profiles load without them (one failed select turns them off, retried every 10 min).
const PROFILE_COLS = 'id, full_name, username, bio, avatar_url, banner_url, is_bot, is_verified, is_private, follower_count, following_count, post_count, created_at';
const PROFILE_NEW_COLS = ', website, pinned_post_id';
let hasNewCols = true;
let newColsOffAt = 0;

const isMissingColumn = (e: any) => !!e && (
  e.code === '42703' || e.code === 'PGRST204' ||
  /column .* does not exist|could not find the .* column/i.test(String(e.message || ''))
);

async function selectProfile(col: 'id' | 'username', value: string): Promise<{ data: any; error: any }> {
  if (!hasNewCols && Date.now() - newColsOffAt > 10 * 60_000) hasNewCols = true;
  if (hasNewCols) {
    const r = await supabaseServiceClient.from('profiles').select(PROFILE_COLS + PROFILE_NEW_COLS).eq(col, value).maybeSingle();
    if (!isMissingColumn(r.error)) return r;
    hasNewCols = false;
    newColsOffAt = Date.now();
  }
  return supabaseServiceClient.from('profiles').select(PROFILE_COLS).eq(col, value).maybeSingle();
}

const postSelect = () => `
  *,
  profiles:user_id (id, full_name, username, avatar_url, is_bot, is_verified),
  post_media (*),
  repost_of:repost_of_id (
    id, content, visibility, like_count, comment_count, repost_count, view_count,
    is_bot_reply, created_at, updated_at, user_id,
    profiles:user_id (id, full_name, username, avatar_url, is_bot, is_verified),
    post_media (id, media_type, url, width, height, duration_seconds, thumbnail_url, order_index, placeholder${mediaAlt()})
  )
`;

/** The pinned post, joined like the posts list, or null (gone, not theirs, a reply) */
async function loadPinnedPost(postId: string | null | undefined, ownerId: string, viewerId?: string) {
  if (!postId) return null;
  try {
    const { data } = await supabaseServiceClient.from('posts').select(postSelect()).eq('id', postId).maybeSingle();
    const post: any = data;
    if (!post || post.user_id !== ownerId || post.parent_post_id) return null;
    try {
      const [enriched] = await enrichWithUserState([post], viewerId);
      return enriched ?? post;
    } catch {
      return post;
    }
  } catch {
    return null;
  }
}

/** "kiongozi.org" becomes "https://kiongozi.org"; '' clears it (null); false when it isn't a usable http(s) link */
function normaliseWebsite(raw: unknown): string | null | false {
  if (raw === null) return null;
  if (typeof raw !== 'string') return false;
  let v = raw.trim();
  if (!v) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) v = `https://${v}`;
  if (!/^https?:\/\//i.test(v) || /\s/.test(v) || v.length > 100) return false;
  try {
    const u = new URL(v);
    if (!/^https?:$/.test(u.protocol) || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(u.hostname) || u.username || u.password) return false;
  } catch {
    return false;
  }
  return v;
}

// GET /api/v1/social/profile/me — Own profile (by auth token, no username needed)
router.get('/profile/me', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: profile, error } = await selectProfile('id', req.user!.id);

    if (error || !profile) {
      res.status(404).json({ success: false, error: 'Profile not found' });
      return;
    }

    const pinned_post = await loadPinnedPost(profile.pinned_post_id, profile.id, req.user!.id);
    res.json({ success: true, data: { ...profile, website: profile.website ?? null, pinned_post_id: pinned_post ? profile.pinned_post_id : null, pinned_post } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

const RESERVED_USERNAMES = ['kiongozi', 'admin', 'support', 'help', 'bot', 'system', 'official'];

// GET /api/v1/social/username/check/:username — Check availability (no auth)
router.get('/username/check/:username', async (req: Request, res: Response): Promise<void> => {
  const { username } = req.params;
  const cleaned = username.toLowerCase().trim();

  if (cleaned.length < 3) {
    res.json({ success: true, available: false, reason: 'Too short' });
    return;
  }

  if (RESERVED_USERNAMES.includes(cleaned)) {
    res.json({ success: true, available: false, reason: 'Reserved' });
    return;
  }

  try {
    const { data } = await supabaseServiceClient
      .from('profiles')
      .select('id')
      .eq('username', cleaned)
      .maybeSingle();

    res.json({ success: true, available: !data });
  } catch {
    res.status(500).json({ success: false, available: false, reason: 'Error' });
  }
});

// GET /api/v1/social/users/:username — Public profile
router.get('/users/:username', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.params;

    const { data: profile, error } = await selectProfile('username', username);

    if (error || !profile) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    // If requester is authenticated, check follow state + block state
    let isFollowing = false;
    let followRequestStatus: string | null = null;
    let isBlockedBy = false;
    if (req.user) {
      const [{ data: follow }, { data: followReq }, { data: blockedByRow }] = await Promise.all([
        supabaseServiceClient
          .from('follows')
          .select('id')
          .eq('follower_id', req.user.id)
          .eq('following_id', profile.id)
          .maybeSingle(),
        supabaseServiceClient
          .from('follow_requests')
          .select('status')
          .eq('requester_id', req.user.id)
          .eq('target_id', profile.id)
          .maybeSingle(),
        supabaseServiceClient
          .from('blocks')
          .select('id')
          .eq('blocker_id', profile.id)
          .eq('blocked_id', req.user.id)
          .maybeSingle(),
      ]);
      isFollowing = !!follow;
      followRequestStatus = followReq?.status ?? null;
      isBlockedBy = !!blockedByRow;
    }

    // If viewer is blocked by this user, return minimal profile only
    if (isBlockedBy) {
      res.json({
        success: true,
        data: {
          id: profile.id,
          full_name: profile.full_name,
          username: profile.username,
          isBlockedBy: true,
        },
      });
      return;
    }

    // The pinned post only for people who can see their posts (private accounts: followers and the owner)
    const canSeePosts = !profile.is_private || isFollowing || req.user?.id === profile.id;
    const pinned_post = canSeePosts ? await loadPinnedPost(profile.pinned_post_id, profile.id, req.user?.id) : null;
    res.json({
      success: true,
      data: {
        ...profile, website: profile.website ?? null,
        pinned_post_id: pinned_post ? profile.pinned_post_id : null, pinned_post,
        isFollowing, followRequestStatus,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

// GET /api/v1/social/users/:username/posts
// ?type=posts (default, no replies) | replies (replies only) | media (posts with media) | videos (posts with a video, the Mitaa tab)
router.get('/users/:username/posts', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const cursor = req.query.cursor as string | undefined;
    const type = (req.query.type as string) || 'posts';

    const { data: profile } = await supabaseServiceClient
      .from('profiles')
      .select('id, is_private')
      .eq('username', username)
      .single();

    if (!profile) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    // If viewer is blocked by this user, return empty
    if (req.user) {
      const { data: blockedByRow } = await supabaseServiceClient
        .from('blocks')
        .select('id')
        .eq('blocker_id', profile.id)
        .eq('blocked_id', req.user.id)
        .maybeSingle();
      if (blockedByRow) {
        res.json({ success: true, data: [], nextCursor: null });
        return;
      }
    }

    // Enforce private account: only followers (and the owner) can see posts
    if (profile.is_private && req.user?.id !== profile.id) {
      if (!req.user) {
        res.status(403).json({ success: false, error: 'This account is private' });
        return;
      }
      const { data: follow } = await supabaseServiceClient
        .from('follows')
        .select('id')
        .eq('follower_id', req.user.id)
        .eq('following_id', profile.id)
        .maybeSingle();
      if (!follow) {
        res.status(403).json({ success: false, error: 'This account is private' });
        return;
      }
    }

    // For media types, overfetch so client-side filtering still yields a full page
    const fetchLimit = type === 'media' || type === 'videos' ? limit * 5 : limit;

    let query = supabaseServiceClient
      .from('posts')
      .select(`
        *,
        profiles:user_id (id, full_name, username, avatar_url, is_bot, is_verified),
        post_media (*),
        repost_of:repost_of_id (
          id, content, visibility, like_count, comment_count, repost_count, view_count,
          is_bot_reply, created_at, updated_at, user_id,
          profiles:user_id (id, full_name, username, avatar_url, is_bot, is_verified),
          post_media (id, media_type, url, width, height, duration_seconds, thumbnail_url, order_index, placeholder)
        )
      `)
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(fetchLimit);

    if (type === 'replies') {
      query = query.not('parent_post_id', 'is', null);
    } else if (type === 'media' || type === 'videos') {
      query = query.is('parent_post_id', null);
    } else {
      query = query.is('parent_post_id', null);
    }

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data: posts, error } = await query;

    if (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch posts' });
      return;
    }

    // Filter client-side for media posts; use the last raw post as the cursor anchor
    const filtered = type === 'media'
      ? (posts || []).filter((p: any) => p.post_media && p.post_media.length > 0).slice(0, limit)
      : type === 'videos'
        ? (posts || []).filter((p: any) => (p.post_media || []).some((m: any) => m.media_type === 'video')).slice(0, limit)
        : posts;

    const list = filtered || [];
    await attachPolls(list, req.user?.id);
    // nextCursor is null only when the raw fetch returned fewer rows than requested
    const rawExhausted = (posts || []).length < fetchLimit;
    const nextCursor = rawExhausted ? null : list[list.length - 1]?.created_at ?? null;
    res.json({ success: true, data: list, nextCursor });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch user posts' });
  }
});

// PATCH /api/v1/social/profile — Update own profile
router.patch(
  '/profile',
  authenticateToken,
  upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'banner', maxCount: 1 }]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { bio, username, full_name } = req.body;
      const files = req.files as Record<string, { buffer: Buffer; mimetype: string; originalname: string; size: number }[]> | undefined;

      const updates: Record<string, any> = {};
      if (bio !== undefined) updates.bio = bio;
      if (full_name !== undefined) updates.full_name = full_name;
      if (req.body.is_private !== undefined) {
        updates.is_private = req.body.is_private === 'true' || req.body.is_private === true;
      }

      if (req.body.website !== undefined) {
        const website = normaliseWebsite(req.body.website);
        if (website === false) {
          res.status(400).json({ success: false, error: "That doesn't look like a link. Try something like kiongozi.org" });
          return;
        }
        updates.website = website;
      }

      if (username !== undefined) {
        // Validate username
        if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
          res.status(400).json({ success: false, error: 'Username must be 3-30 alphanumeric characters or underscores' });
          return;
        }
        updates.username = username.toLowerCase();
      }

      // Handle avatar upload
      if (files?.avatar?.[0]) {
        const file = files.avatar[0];
        const result = await optimizeUpload(file.buffer, file.mimetype, `avatars/${userId}_${Date.now()}`, 'avatar');
        updates.avatar_url = result.url;
      }

      // Handle banner upload
      if (files?.banner?.[0]) {
        const file = files.banner[0];
        const result = await optimizeUpload(file.buffer, file.mimetype, `banners/${userId}_${Date.now()}`, 'banner');
        updates.banner_url = result.url;
      }

      if (Object.keys(updates).length === 0) {
        res.status(400).json({ success: false, error: 'No fields to update' });
        return;
      }

      const UPDATED_COLS = 'id, full_name, username, bio, avatar_url, banner_url, is_verified, is_private';
      let { data, error } = await supabaseServiceClient
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select(UPDATED_COLS + ', website')
        .single();

      // Before the migration: save everything else, and say so if the link was all there was
      if (isMissingColumn(error)) {
        delete updates.website;
        if (Object.keys(updates).length === 0) {
          res.status(503).json({ success: false, error: 'Links are not ready yet. Try again a bit later.' });
          return;
        }
        ({ data, error } = await supabaseServiceClient
          .from('profiles')
          .update(updates)
          .eq('id', userId)
          .select(UPDATED_COLS)
          .single());
      }

      if (error) {
        if (error.code === '23505') {
          res.status(409).json({ success: false, error: 'Username already taken' });
          return;
        }
        res.status(500).json({ success: false, error: 'Failed to update profile' });
        return;
      }

      res.json({ success: true, data });
    } catch (err) {
      console.error('Update profile error:', err);
      res.status(500).json({ success: false, error: 'Failed to update profile' });
    }
  }
);

// POST /api/v1/social/posts/:id/pin: pin your own post to your profile (one at a time, replaces the last)
router.post('/posts/:id/pin', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { data: post } = await supabaseServiceClient
      .from('posts').select('id, user_id, parent_post_id').eq('id', req.params.id).maybeSingle();
    if (!post) { res.status(404).json({ success: false, error: 'Post not found' }); return; }
    if (post.user_id !== userId) { res.status(403).json({ success: false, error: 'You can only pin your own posts' }); return; }
    if (post.parent_post_id) { res.status(400).json({ success: false, error: 'Replies cannot be pinned' }); return; }

    const { error } = await supabaseServiceClient.from('profiles').update({ pinned_post_id: post.id }).eq('id', userId);
    if (error) {
      if (isMissingColumn(error)) { res.status(503).json({ success: false, error: 'Pinning is not ready yet. Try again a bit later.' }); return; }
      res.status(500).json({ success: false, error: 'Could not pin the post' });
      return;
    }
    res.json({ success: true, data: { pinned_post_id: post.id } });
  } catch (err) {
    console.error('Pin post error:', err);
    res.status(500).json({ success: false, error: 'Could not pin the post' });
  }
});

// DELETE /api/v1/social/posts/:id/pin: unpin it (only if it is still the pinned one)
router.delete('/posts/:id/pin', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { error } = await supabaseServiceClient
      .from('profiles').update({ pinned_post_id: null }).eq('id', req.user!.id).eq('pinned_post_id', req.params.id);
    if (error) {
      if (isMissingColumn(error)) { res.status(503).json({ success: false, error: 'Pinning is not ready yet. Try again a bit later.' }); return; }
      res.status(500).json({ success: false, error: 'Could not unpin the post' });
      return;
    }
    res.json({ success: true, data: { pinned_post_id: null } });
  } catch (err) {
    console.error('Unpin post error:', err);
    res.status(500).json({ success: false, error: 'Could not unpin the post' });
  }
});

// GET /api/v1/social/users/:username/qr-card?theme=coral&style=paper[&render=0]: the profile's cut-paper QR card
// (4:5 PNG, uploaded once per look). The app draws the card live from `qr` (the module matrix) and the same
// layout numbers, then asks for the PNG of the theme and style the person picked.
// render=0 skips the image (the app's first call, so the live card can appear at once).
// → { url?, width, height, profile_url, theme, style, name, username, avatar_url, qr: string[] }
const qrCards = new Map<string, { url: string; at: number }>();
router.get('/users/:username/qr-card', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: profile } = await supabaseServiceClient
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .eq('username', req.params.username)
      .maybeSingle();
    if (!profile?.username) { res.status(404).json({ success: false, error: 'User not found' }); return; }
    if (req.user && req.user.id !== profile.id) {
      const { data: blocked } = await supabaseServiceClient.from('blocks').select('id')
        .or(`and(blocker_id.eq.${profile.id},blocked_id.eq.${req.user.id}),and(blocker_id.eq.${req.user.id},blocked_id.eq.${profile.id})`).limit(1);
      if (blocked?.length) { res.status(404).json({ success: false, error: 'User not found' }); return; }
    }
    const theme = isQrTheme(req.query.theme) ? req.query.theme : 'coral';
    const style = isQrStyle(req.query.style) ? req.query.style : 'paper';
    const profileUrl = profileQrUrl(profile.username);
    const out: Record<string, any> = {
      width: 1080, height: 1350, profile_url: profileUrl, theme, style,
      name: profile.full_name || profile.username, username: profile.username, avatar_url: profile.avatar_url || null,
      qr: qrMatrix(profileUrl),
    };
    if (req.query.render !== '0') {
      // A new name, photo, theme or style makes a new file; the same look reuses the uploaded one
      const key = `${profile.username}|${profile.full_name || ''}|${profile.avatar_url || ''}|${theme}|${style}`;
      let hash = 0;
      for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
      const tag = (hash >>> 0).toString(36);
      let hit = qrCards.get(key);
      if (!hit || Date.now() - hit.at > 24 * 3600_000) {
        const card = await renderQrCardArt({
          name: profile.full_name || profile.username, username: profile.username, avatarUrl: profile.avatar_url, url: profileUrl, theme, style,
        });
        const up = await UploadService.uploadFile(card.png, 'image/png', `posts/${profile.id}/qrcard_${tag}.png`);
        hit = { url: up.url, at: Date.now() };
        if (qrCards.size > 500) qrCards.delete(qrCards.keys().next().value as string);
        qrCards.set(key, hit);
      }
      out.url = hit.url;
    }
    res.json({ success: true, data: out });
  } catch (err) {
    console.error('QR card error:', err);
    res.status(500).json({ success: false, error: 'Could not make the QR card' });
  }
});

export default router;
