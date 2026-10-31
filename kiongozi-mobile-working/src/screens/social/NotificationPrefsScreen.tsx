// Settings > Notifications > What you get: one switch per kind of notification.
// Saved on the phone for now (prefsStore.notify); the server / PushService check that actually
// filters pushes by these comes later.
import React, { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme, AppTheme } from '../../hooks/useTheme';
import { usePrefs, NotifyKey } from '../../stores/prefsStore';
import { Section, Card, Row, Toggle, useKitColors } from '../../components/settings/SettingsKit';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const KINDS: { key: NotifyKey; title: string; sub: string; icon: IconName; color: string }[] = [
  { key: 'likes', title: 'Likes', sub: 'When someone likes your post or reply', icon: 'heart-outline', color: '#FF3040' },
  { key: 'replies', title: 'Replies', sub: 'Replies to your posts and your replies', icon: 'chatbubble-outline', color: '#5CB85C' },
  { key: 'follows', title: 'Follows', sub: 'New followers and follow requests', icon: 'person-add-outline', color: '#7C5CFF' },
  { key: 'messages', title: 'Messages', sub: 'New direct messages', icon: 'paper-plane-outline', color: '#3B82F6' },
  { key: 'mentions', title: 'Mentions', sub: 'When someone tags you in a post or story', icon: 'at-outline', color: '#F5B83D' },
  { key: 'stories', title: 'Stories', sub: 'Replies and reactions to your stories', icon: 'aperture-outline', color: '#FF9500' },
  { key: 'baraza', title: 'Baraza live', sub: 'When a Baraza you follow goes live', icon: 'radio-outline', color: '#FF3B30' },
];

export default function NotificationPrefsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const T = useTheme();
  const K = useKitColors();
  const styles = useMemo(() => makeStyles(T), [T]);
  const notify = usePrefs(s => s.notify);
  const setNotify = usePrefs(s => s.setNotify);
  const offCount = KINDS.filter(k => !notify[k.key]).length;

  return (
    <View style={[styles.container, { backgroundColor: K.page }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 4, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 12) + 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={({ pressed }) => [styles.backBtn, { backgroundColor: K.tile }, pressed && { opacity: 0.6 }]} accessibilityRole="button" accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={20} color={T.text} />
          </Pressable>
        </View>
        <Text style={styles.bigTitle} maxFontSizeMultiplier={1.2} accessibilityRole="header">What you get</Text>

        <Section
          title="Notifications"
          order={0}
          note={offCount ? `${offCount} ${offCount === 1 ? 'kind is' : 'kinds are'} off. You still see everything in Activity.` : 'Everything is on. Turn off what you do not want a push for.'}
        >
          <Card>
            {KINDS.map(k => (
              <Row
                key={k.key}
                icon={k.icon}
                color={k.color}
                title={k.title}
                sub={notify[k.key] ? k.sub : 'Off'}
                right={<Toggle value={notify[k.key]} onChange={v => setNotify(k.key, v)} label={`${k.title} notifications`} />}
              />
            ))}
          </Card>
        </Section>
      </ScrollView>
    </View>
  );
}

function makeStyles(T: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: T.bg },
    header: { flexDirection: 'row', alignItems: 'center' },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    bigTitle: { fontSize: 34, fontWeight: '800', letterSpacing: 0.37, color: T.text, marginTop: 14, marginLeft: 4 },
  });
}
