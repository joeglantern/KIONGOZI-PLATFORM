// Profile header shared by your own profile (ProfileTabScreen) and other people's (PublicProfileScreen).
//
// Two pieces:
// - <ProfileHeader> goes in the list as ListHeaderComponent: cover that stretches when you pull down,
//   big avatar overlapping it with the action buttons on its right, name, handle, bio, meta, counts,
//   "Followed by" and a placeholder where the tabs sit.
// - <ProfileChrome> is rendered over the list: the frosted round buttons on the cover, a top bar that
//   fades in with the name once the cover scrolls away, and the tab bar, which rides along with the
//   content and then sticks under the top bar.
//
// Both are driven by the list's scroll offset on the native thread (RN Animated, same value the
// pull-to-refresh bubble already listens to, so one onScroll feeds everything).
import React, { ReactNode, useMemo } from 'react';
import {
  View, Text, Pressable, StyleSheet, Animated, Image, ActivityIndicator,
  LayoutChangeEvent, useWindowDimensions, PixelRatio,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProfileStoryAvatar } from '../stories/ProfileStoryAvatar';
import { UserAvatar } from './UserAvatar';
import { VerifiedBadge } from './VerifiedBadge';
import { useTheme, AppTheme } from '../../hooks/useTheme';

export const COVER_HEIGHT = 210;
const RING = 4;
const AVATAR_TOTAL = 92; // includes the ring
const AVATAR_SIZE = AVATAR_TOTAL - RING * 2;
const BTN = 36;
export const TAB_HEIGHT = 46;
const BAR = 44; // top bar height below the status bar
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Soft brand tints for profiles without a cover photo; picked per person so profiles don't all match
const TINTS_LIGHT = ['#DCEEDA', '#E3EED6', '#D5EBE2', '#E7EDDA'];
const TINTS_DARK = ['#12241A', '#18241A', '#0F2320', '#1C2417'];

export function formatCount(n?: number | null) {
  const v = typeof n === 'number' && isFinite(n) ? n : 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (v >= 10_000) return `${Math.floor(v / 1000)}K`;
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(v);
}

function formatJoined(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return `Joined ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function tintFor(seed: string | undefined, dark: boolean) {
  const list = dark ? TINTS_DARK : TINTS_LIGHT;
  let h = 0;
  for (const ch of seed || '') h = (h * 31 + ch.charCodeAt(0)) | 0;
  return list[Math.abs(h) % list.length];
}

export interface ProfileHeaderProfile {
  id: string;
  full_name?: string | null;
  username?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  is_bot?: boolean;
  is_verified?: boolean;
  is_private?: boolean;
  follower_count?: number | null;
  following_count?: number | null;
  post_count?: number | null;
  created_at?: string;
  county?: string | null;
  location?: string | null;
}

export interface Mutuals {
  users: { id: string; full_name?: string; username: string; avatar_url?: string }[];
  total: number;
}

export interface ProfileTab<K extends string = string> { key: K; label: string }

interface HeaderProps {
  scrollY: Animated.Value;
  profile: ProfileHeaderProfile;
  /** Local override while a new photo uploads */
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  isOwn: boolean;
  /** Own profile: change photo from the avatar menu / camera badge */
  onChangeAvatar?: () => void;
  avatarUploading?: boolean;
  /** Own profile: tap the cover to change it */
  onChangeCover?: () => void;
  coverUploading?: boolean;
  onShare: () => void;
  /** The QR button left of Message / Edit profile (share then lives on the cover, in ProfileChrome) */
  onQrCard?: () => void;
  onEditProfile?: () => void;
  follow?: { label: string; primary: boolean; pending: boolean; onPress: () => void; accessibilityLabel: string };
  onMessage?: () => void;
  messageLoading?: boolean;
  onOpenFollowList: (tab: 'followers' | 'following') => void;
  mutuals?: Mutuals | null;
  /** Extra row under the counts (streak and recap chips on your own profile) */
  extra?: ReactNode;
  /** Leave room for the tab bar (it is drawn by ProfileChrome so it can stick) */
  hasTabs: boolean;
  onTabsLayout?: (y: number) => void;
  /** Content under the tabs (or in their place): saved note, private account wall */
  below?: ReactNode;
}

export function ProfileHeader(props: HeaderProps) {
  const {
    scrollY, profile, isOwn, onChangeAvatar, avatarUploading, onChangeCover, coverUploading,
    onShare, onQrCard, onEditProfile, follow, onMessage, messageLoading, onOpenFollowList, mutuals,
    extra, hasTabs, onTabsLayout, below,
  } = props;
  const T = useTheme();
  const dark = T.bg === '#000000';
  const s = useMemo(() => makeStyles(T), [T]);
  const { width } = useWindowDimensions();

  const banner = props.bannerUrl ?? profile.banner_url;
  const avatar = props.avatarUrl ?? profile.avatar_url;
  const joined = formatJoined(profile.created_at);
  const place = profile.county || profile.location;

  // Pull down: the cover grows from its bottom edge to fill the gap (scale + shift up by half)
  const coverStyle = {
    transform: [
      { translateY: scrollY.interpolate({ inputRange: [-COVER_HEIGHT, 0, 1], outputRange: [-COVER_HEIGHT / 2, 0, 0], extrapolateLeft: 'extend', extrapolateRight: 'clamp' }) },
      { scale: scrollY.interpolate({ inputRange: [-COVER_HEIGHT, 0, 1], outputRange: [2, 1, 1], extrapolateLeft: 'extend', extrapolateRight: 'clamp' }) },
    ],
  };

  // Room right of the avatar; Message turns into a round icon when its pill won't fit
  const fontScale = Math.min(PixelRatio.getFontScale(), 1.15);
  const room = width - 32 - AVATAR_TOTAL - 12;
  const pillW = (label: string) => label.length * 8.8 * fontScale + 30;
  const messageAsPill = !follow || BTN + 8 + pillW('Message') + 8 + pillW(follow.label) <= room;

  const coverFill = banner
    ? <Image source={{ uri: banner }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
    : null;

  const mutualText = (() => {
    if (!mutuals || !mutuals.total || !mutuals.users.length) return null;
    const names = mutuals.users.slice(0, 2).map(u => `@${u.username}`);
    const rest = mutuals.total - names.length;
    if (rest > 0) return `Followed by ${names.join(', ')} and ${rest} ${rest === 1 ? 'other' : 'others'}`;
    return `Followed by ${names.join(' and ')}`;
  })();

  return (
    <View>
      {/* Cover */}
      <View style={s.coverWrap}>
        <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: tintFor(profile.id, dark), overflow: 'hidden' }, coverStyle]}>
          {coverFill}
        </Animated.View>
        {!!onChangeCover && (
          <>
            <Pressable
              style={StyleSheet.absoluteFillObject}
              onPress={onChangeCover}
              disabled={coverUploading}
              accessibilityRole="button"
              accessibilityLabel={banner ? 'Change cover photo' : 'Add cover photo'}
            />
            <Pressable
              onPress={onChangeCover}
              disabled={coverUploading}
              hitSlop={8}
              style={({ pressed }) => [s.coverCamera, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel={banner ? 'Change cover photo' : 'Add cover photo'}
            >
              {coverUploading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="camera-outline" size={17} color="#fff" />}
            </Pressable>
          </>
        )}
      </View>

      <View style={s.body}>
        {/* Avatar + actions */}
        <View style={s.avatarRow}>
          <View>
            <View style={s.avatarRing}>
              <ProfileStoryAvatar
                userId={profile.id}
                avatarUrl={avatar ?? undefined}
                size={AVATAR_SIZE}
                isBot={profile.is_bot}
                isVerified={profile.is_verified}
                name={profile.full_name || profile.username || undefined}
                onChangePhoto={onChangeAvatar}
              />
              {avatarUploading && (
                <View style={s.avatarUploading}>
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              )}
            </View>
            {!!onChangeAvatar && (
              <Pressable
                onPress={onChangeAvatar}
                hitSlop={10}
                style={({ pressed }) => [s.avatarCamera, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel="Change profile photo"
              >
                <Ionicons name="camera" size={14} color={T.bg} />
              </Pressable>
            )}
          </View>

          <View style={s.actions}>
            <Pressable
              onPress={onQrCard ?? onShare}
              style={({ pressed }) => [s.circleBtn, pressed && s.pressed]}
              accessibilityRole="button"
              accessibilityLabel={onQrCard ? 'Profile QR card' : 'Share profile'}
            >
              <Ionicons name={onQrCard ? 'qr-code-outline' : 'share-outline'} size={onQrCard ? 17 : 18} color={T.text} />
            </Pressable>
            {isOwn ? (
              <Pressable
                onPress={onEditProfile}
                style={({ pressed }) => [s.pill, s.pillOutline, pressed && s.pressed]}
                accessibilityRole="button"
              >
                <Text style={s.pillOutlineText} numberOfLines={1} maxFontSizeMultiplier={1.15}>Edit profile</Text>
              </Pressable>
            ) : (
              <>
                {!!onMessage && (
                  <Pressable
                    onPress={onMessage}
                    disabled={messageLoading}
                    style={({ pressed }) => [messageAsPill ? [s.pill, s.pillOutline] : s.circleBtn, pressed && s.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Message"
                  >
                    {messageLoading
                      ? <ActivityIndicator size="small" color={T.text} />
                      : messageAsPill
                        ? <Text style={s.pillOutlineText} numberOfLines={1} maxFontSizeMultiplier={1.15}>Message</Text>
                        : <Ionicons name="mail-outline" size={18} color={T.text} />}
                  </Pressable>
                )}
                {!!follow && (
                  <Pressable
                    onPress={follow.onPress}
                    style={({ pressed }) => [s.pill, follow.primary ? s.pillSolid : s.pillOutline, pressed && s.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={follow.accessibilityLabel}
                  >
                    <Text
                      style={[follow.primary ? s.pillSolidText : s.pillOutlineText, follow.pending && { color: T.textSub }]}
                      numberOfLines={1}
                      maxFontSizeMultiplier={1.15}
                    >
                      {follow.label}
                    </Text>
                  </Pressable>
                )}
              </>
            )}
          </View>
        </View>

        {/* Name */}
        <View style={s.nameRow}>
          <Text style={s.name} numberOfLines={2} maxFontSizeMultiplier={1.3}>
            {profile.full_name || profile.username}
          </Text>
          {profile.is_verified && <VerifiedBadge size={20} />}
        </View>
        <View style={s.handleRow}>
          <Text style={s.handle} numberOfLines={1}>@{profile.username}</Text>
          {profile.is_private && <Ionicons name="lock-closed" size={13} color={T.textSub} />}
        </View>
        {!!profile.bio && <Text style={s.bio}>{profile.bio}</Text>}

        {(!!place || !!joined) && (
          <View style={s.metaRow}>
            {!!place && (
              <View style={s.metaItem}>
                <Ionicons name="location-outline" size={15} color={T.textSub} />
                <Text style={s.metaText} numberOfLines={1}>{place}</Text>
              </View>
            )}
            {!!joined && (
              <View style={s.metaItem}>
                <Ionicons name="calendar-outline" size={14} color={T.textSub} />
                <Text style={s.metaText}>{joined}</Text>
              </View>
            )}
          </View>
        )}

        {/* Counts */}
        <View style={s.countsRow}>
          <View style={s.count}>
            <Text style={s.countNum} maxFontSizeMultiplier={1.3}>{formatCount(profile.post_count)}</Text>
            <Text style={s.countLabel} maxFontSizeMultiplier={1.3}>{profile.post_count === 1 ? 'post' : 'posts'}</Text>
          </View>
          <Pressable
            onPress={() => onOpenFollowList('followers')}
            hitSlop={8}
            style={({ pressed }) => [s.count, pressed && s.pressed]}
            accessibilityRole="button"
          >
            <Text style={s.countNum} maxFontSizeMultiplier={1.3}>{formatCount(profile.follower_count)}</Text>
            <Text style={s.countLabel} maxFontSizeMultiplier={1.3}>{profile.follower_count === 1 ? 'follower' : 'followers'}</Text>
          </Pressable>
          <Pressable
            onPress={() => onOpenFollowList('following')}
            hitSlop={8}
            style={({ pressed }) => [s.count, pressed && s.pressed]}
            accessibilityRole="button"
          >
            <Text style={s.countNum} maxFontSizeMultiplier={1.3}>{formatCount(profile.following_count)}</Text>
            <Text style={s.countLabel} maxFontSizeMultiplier={1.3}>following</Text>
          </Pressable>
        </View>

        {/* Followed by */}
        {!!mutualText && (
          <Pressable
            onPress={() => onOpenFollowList('followers')}
            style={({ pressed }) => [s.mutualRow, pressed && s.pressed]}
            accessibilityRole="button"
          >
            <View style={[s.stack, { width: 20 + (Math.min(mutuals!.users.length, 3) - 1) * 13 }]}>
              {mutuals!.users.slice(0, 3).map((u, i) => (
                <View key={u.id} style={[s.stackItem, { left: i * 13, zIndex: 3 - i }]}>
                  <UserAvatar avatarUrl={u.avatar_url} size={20} name={u.full_name || u.username} />
                </View>
              ))}
            </View>
            <Text style={s.mutualText} numberOfLines={2} maxFontSizeMultiplier={1.3}>{mutualText}</Text>
          </Pressable>
        )}

        {extra}
      </View>

      {hasTabs && (
        <View
          style={{ height: TAB_HEIGHT }}
          onLayout={(e: LayoutChangeEvent) => onTabsLayout?.(e.nativeEvent.layout.y)}
        />
      )}
      {below}
    </View>
  );
}

// ─── Chrome over the list ─────────────────────────────────────────────────────

export interface ChromeButton {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  /** Optional spin (settings gear) */
  rotate?: Animated.AnimatedInterpolation<string | number>;
}

interface ChromeProps<K extends string> {
  scrollY: Animated.Value;
  insetTop: number;
  title?: string | null;
  verified?: boolean;
  left?: ChromeButton[];
  right?: ChromeButton[];
  tabs?: ProfileTab<K>[];
  activeTab?: K;
  onTabPress?: (key: K) => void;
  /** Where the tab placeholder sits inside the list header (0 until measured) */
  tabsY: number;
  /** For the pull-to-refresh bubble: lays out where a classic header would be */
  onBarLayout?: (e: LayoutChangeEvent) => void;
}

export function ProfileChrome<K extends string>({
  scrollY, insetTop, title, verified, left = [], right = [], tabs, activeTab, onTabPress, tabsY, onBarLayout,
}: ChromeProps<K>) {
  const T = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  const barH = insetTop + BAR;

  const solid = scrollY.interpolate({
    inputRange: [COVER_HEIGHT - barH - 40, COVER_HEIGHT - barH],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  // Name shows in the bar once the big name has scrolled under it
  const nameTop = COVER_HEIGHT + AVATAR_TOTAL / 2 + 12;
  const titleIn = scrollY.interpolate({
    inputRange: [nameTop - barH, nameTop - barH + 30],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const titleShift = titleIn.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });
  const frost = solid.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  // Tabs ride with the content, then stop under the bar
  const stick = Math.max(tabsY - barH, 1);
  const tabsShift = scrollY.interpolate({
    inputRange: [0, stick],
    outputRange: [tabsY, tabsY - stick],
    extrapolateLeft: 'extend',
    extrapolateRight: 'clamp',
  });

  const renderBtn = (b: ChromeButton) => {
    const icon = (color: string) => (
      <Animated.View style={b.rotate ? { transform: [{ rotate: b.rotate as any }] } : undefined}>
        <Ionicons name={b.icon} size={20} color={color} />
      </Animated.View>
    );
    return (
      <Pressable
        key={b.key}
        onPress={b.onPress}
        hitSlop={6}
        style={({ pressed }) => [s.chromeBtn, pressed && { opacity: 0.6 }]}
        accessibilityRole="button"
        accessibilityLabel={b.label}
      >
        <Animated.View style={[s.chromeLayer, s.frosted, { opacity: frost }]}>{icon('#FFFFFF')}</Animated.View>
        <Animated.View style={[s.chromeLayer, { opacity: solid }]}>{icon(T.text)}</Animated.View>
      </Pressable>
    );
  };

  return (
    <>
      {!!tabs?.length && tabsY > 0 && (
        <Animated.View style={[s.stickyTabs, { transform: [{ translateY: tabsShift }] }]}>
          <ProfileTabBar tabs={tabs} active={activeTab} onPress={onTabPress} />
        </Animated.View>
      )}

      <Animated.View
        pointerEvents="none"
        onLayout={onBarLayout}
        style={[s.bar, { height: barH, opacity: solid }]}
      >
        <Animated.View style={[s.barTitleWrap, { opacity: titleIn, transform: [{ translateY: titleShift }] }]}>
          <Text style={s.barTitle} numberOfLines={1} maxFontSizeMultiplier={1.2}>{title}</Text>
          {verified && <VerifiedBadge size={15} />}
        </Animated.View>
      </Animated.View>

      <View pointerEvents="box-none" style={[s.chromeRow, { top: insetTop + (BAR - BTN) / 2 }]}>
        <View style={s.chromeGroup}>{left.map(renderBtn)}</View>
        <View style={s.chromeGroup}>{right.map(renderBtn)}</View>
      </View>
    </>
  );
}

export function ProfileTabBar<K extends string>({ tabs, active, onPress }: {
  tabs: ProfileTab<K>[]; active?: K; onPress?: (key: K) => void;
}) {
  const T = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  return (
    <View style={s.tabBar}>
      {tabs.map(({ key, label }) => {
        const on = key === active;
        return (
          <Pressable
            key={key}
            style={s.tab}
            onPress={() => onPress?.(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
          >
            <View style={s.tabInner}>
              <Text
                style={[s.tabLabel, on ? { color: T.text, fontWeight: '700' } : { color: T.textSub }]}
                numberOfLines={1}
                maxFontSizeMultiplier={1.3}
              >
                {label}
              </Text>
              {on && <View style={s.tabUnderline} />}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function makeStyles(T: AppTheme) {
  const dark = T.bg === '#000000';
  return StyleSheet.create({
    pressed: { opacity: 0.6 },

    coverWrap: { height: COVER_HEIGHT },
    coverCamera: {
      position: 'absolute', right: 14, bottom: 12,
      width: 34, height: 34, borderRadius: 17,
      backgroundColor: 'rgba(0,0,0,0.32)', alignItems: 'center', justifyContent: 'center',
    },

    body: { paddingHorizontal: 16, paddingBottom: 18, backgroundColor: T.bg },
    avatarRow: {
      flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
      marginTop: -(AVATAR_TOTAL / 2),
    },
    avatarRing: {
      width: AVATAR_TOTAL, height: AVATAR_TOTAL, borderRadius: AVATAR_TOTAL / 2,
      borderWidth: RING, borderColor: T.bg, backgroundColor: T.bg,
      alignItems: 'center', justifyContent: 'center',
    },
    avatarUploading: {
      position: 'absolute', width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2,
      backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center',
    },
    avatarCamera: {
      position: 'absolute', right: 2, bottom: 2,
      width: 28, height: 28, borderRadius: 14,
      backgroundColor: T.text, borderWidth: 2, borderColor: T.bg,
      alignItems: 'center', justifyContent: 'center',
    },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 12, flexShrink: 1, paddingBottom: 2 },
    circleBtn: {
      width: BTN, height: BTN, borderRadius: BTN / 2,
      borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center',
    },
    pill: {
      minHeight: BTN, paddingHorizontal: 16, borderRadius: BTN / 2,
      alignItems: 'center', justifyContent: 'center', flexShrink: 1,
    },
    pillOutline: { borderWidth: 1, borderColor: T.border },
    pillOutlineText: { fontSize: 15, fontWeight: '700', color: T.text },
    pillSolid: { backgroundColor: T.text },
    pillSolidText: { fontSize: 15, fontWeight: '700', color: T.bg },

    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
    name: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, color: T.text, flexShrink: 1 },
    handleRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
    handle: { fontSize: 15, color: T.textSub, flexShrink: 1 },
    bio: { fontSize: 15, lineHeight: 21, color: T.text, marginTop: 12 },

    metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 14, rowGap: 4, marginTop: 10 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
    metaText: { fontSize: 14, color: T.textSub },

    countsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 18, rowGap: 6, marginTop: 12 },
    count: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
    countNum: { fontSize: 15, fontWeight: '700', color: T.text },
    countLabel: { fontSize: 15, color: T.textSub },

    mutualRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
    stack: { height: 22 },
    stackItem: {
      position: 'absolute', top: 0,
      borderRadius: 12, borderWidth: 1.5, borderColor: T.bg, backgroundColor: T.bg,
    },
    mutualText: { fontSize: 13, lineHeight: 17, color: T.textSub, flexShrink: 1 },

    // Chrome
    bar: {
      position: 'absolute', top: 0, left: 0, right: 0,
      backgroundColor: T.bg, justifyContent: 'flex-end', zIndex: 20, elevation: 20,
    },
    barTitleWrap: {
      height: BAR, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 5, paddingHorizontal: 72,
    },
    barTitle: { fontSize: 17, fontWeight: '700', color: T.text, flexShrink: 1 },
    chromeRow: {
      position: 'absolute', left: 12, right: 12,
      flexDirection: 'row', justifyContent: 'space-between', zIndex: 21, elevation: 21,
    },
    chromeGroup: { flexDirection: 'row', gap: 10 },
    chromeBtn: { width: BTN, height: BTN },
    chromeLayer: {
      ...StyleSheet.absoluteFillObject, borderRadius: BTN / 2,
      alignItems: 'center', justifyContent: 'center',
    },
    frosted: { backgroundColor: 'rgba(0,0,0,0.32)' },

    stickyTabs: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 19, elevation: 19 },
    tabBar: {
      flexDirection: 'row', height: TAB_HEIGHT, backgroundColor: T.bg,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: dark ? '#2A2A2A' : '#D8D8DD',
    },
    tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    tabInner: { height: '100%', justifyContent: 'center', paddingHorizontal: 2 },
    tabLabel: { fontSize: 15, fontWeight: '600' },
    tabUnderline: {
      position: 'absolute', left: 0, right: 0, bottom: 0,
      height: 3, borderRadius: 1.5, backgroundColor: T.text,
    },
  });
}
