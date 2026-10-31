// In-feed ad, built like Instagram/X ads: it sits in the feed like a post (same columns, type,
// spacing) so it doesn't jar. Labels follow the big apps: a PAID ad is always marked "Sponsored"
// under the name (Instagram, Threads, Facebook); KChat promoting its own features is not an ad
// anyone paid for, so like Meta's own promos it reads "Suggested for you" from verified KChat.
// The call-to-action bar
// under the picture starts quiet and fills with the accent once the ad has been seen for a moment
// (Instagram's trick). The ⋯ menu gives people control: hide, why am I seeing this, report.
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolateColor } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { UserAvatar } from './UserAvatar';
import { VerifiedBadge } from './VerifiedBadge';
import { FitImage } from './media';
import { BottomSheet } from './BottomSheet';
import { useTheme } from '../../hooks/useTheme';
import { useThemeStore } from '../../stores/themeStore';

export interface Ad {
  id: string;
  advertiser_name: string;
  advertiser_avatar_url?: string | null;
  headline: string;
  body?: string | null;
  media_url: string;
  media_type: 'image' | 'video';
  thumbnail_url?: string | null;
  width?: number | null;
  height?: number | null;
  placeholder?: string | null;
  cta_label: string;
  cta_url: string;
  is_house?: boolean;
  why_text?: string | null;
}

export function AdCard({ ad, seen, onOpen, onHide, onReport }: {
  ad: Ad;
  /** true once the ad has been on screen long enough to count as seen */
  seen: boolean;
  onOpen: (ad: Ad) => void;
  onHide: (ad: Ad) => void;
  onReport: (ad: Ad) => void;
}) {
  const T = useTheme();
  const isDark = useThemeStore(s => s.isDark);
  const [menu, setMenu] = useState(false);
  const [why, setWhy] = useState(false);
  const fill = useSharedValue(0);
  useEffect(() => { if (seen) fill.value = withTiming(1, { duration: 450 }); }, [seen, fill]);

  const quiet = isDark ? '#1C1C1E' : '#F2F2F5';
  const ctaBg = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(fill.value, [0, 1], [quiet, T.accent]) }));
  const ctaText = useAnimatedStyle(() => ({ color: interpolateColor(fill.value, [0, 1], [T.text, '#000000']) }));

  const open = () => { Haptics.selectionAsync().catch(() => {}); onOpen(ad); };
  const ratio = ad.width && ad.height ? ad.width / ad.height : 0.8;
  const img = ad.media_type === 'video' ? (ad.thumbnail_url || ad.media_url) : ad.media_url;
  const house = !!ad.is_house;
  const label = house ? 'Suggested for you' : 'Sponsored';
  const name = house ? 'KChat' : ad.advertiser_name;

  return (
    <View style={[s.container, { borderBottomColor: isDark ? '#1C1C1E' : T.borderLight }]}>
      <View style={s.inner}>
        <View style={s.leftCol}>
          <UserAvatar avatarUrl={ad.advertiser_avatar_url || undefined} size={44} name={name} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={s.header}>
            <View style={{ flexShrink: 1 }}>
              <View style={s.nameRow}>
                <Text style={[s.name, { color: T.text }]} numberOfLines={1}>{name}</Text>
                {house && <VerifiedBadge size={14} />}
              </View>
              <Text style={[s.sponsored, { color: T.textMuted }]} accessibilityLabel={label}>{label}</Text>
            </View>
            <Pressable onPress={() => setMenu(true)} hitSlop={10} style={s.more} accessibilityLabel="Ad options">
              <Ionicons name="ellipsis-horizontal" size={18} color={T.textMuted} />
            </Pressable>
          </View>

          <Text style={[s.headline, { color: isDark ? '#F2F2F7' : T.text }]}>
            <Text style={{ fontWeight: '700' }}>{ad.headline}</Text>
            {ad.body ? ` ${ad.body}` : ''}
          </Text>

          {/* Picture and button are one block, like the big apps */}
          <View style={s.block}>
            <FitImage uri={img} ratio={ratio} placeholder={ad.placeholder} onPress={open} bg={T.surface2} radius={0} minRatio={0.8} maxRatio={1.91} />
            <Pressable onPress={open} accessibilityRole="link" accessibilityLabel={ad.cta_label}>
              <Animated.View style={[s.cta, ctaBg]}>
                <Animated.Text style={[s.ctaText, ctaText]} numberOfLines={1}>{ad.cta_label}</Animated.Text>
                <Animated.Text style={[s.ctaText, ctaText]}>›</Animated.Text>
              </Animated.View>
            </Pressable>
          </View>
        </View>
      </View>

      <BottomSheet
        visible={menu}
        onClose={() => setMenu(false)}
        title={label}
        subtitle={house ? 'From KChat' : `From ${ad.advertiser_name}`}
        actions={[
          house
            ? { icon: 'eye-off-outline', label: 'Not interested', onPress: () => { setMenu(false); onHide(ad); } }
            : { icon: 'eye-off-outline', label: 'Hide this ad', onPress: () => { setMenu(false); onHide(ad); } },
          { icon: 'information-circle-outline', label: 'Why am I seeing this?', onPress: () => { setMenu(false); setTimeout(() => setWhy(true), 260); } },
          { icon: 'flag-outline', label: house ? 'Report' : 'Report ad', onPress: () => { setMenu(false); onReport(ad); }, destructive: true },
        ]}
      />
      <BottomSheet
        visible={why}
        onClose={() => setWhy(false)}
        title="Why you’re seeing this"
        subtitle={house
          ? `${ad.why_text || 'KChat suggests its own features to help you get more out of the app.'} Tap Not interested in the menu to see less of this.`
          : `${ad.why_text || 'This ad is shown to people on KChat.'} We never sell your messages or contacts. You can hide any ad from its menu.`}
        actions={[{ icon: 'checkmark', label: 'Got it', onPress: () => setWhy(false) }]}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 14 },
  inner: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 14 },
  leftCol: { width: 44, marginRight: 12, alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { fontWeight: '600', fontSize: 15, flexShrink: 1 },
  sponsored: { fontSize: 12.5, marginTop: 1 },
  more: { marginLeft: 'auto', padding: 8, margin: -8 },
  headline: { fontSize: 15, lineHeight: 21 },
  block: { marginTop: 10, borderRadius: 16, overflow: 'hidden' },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, height: 44 },
  ctaText: { fontSize: 14.5, fontWeight: '700' },
});
