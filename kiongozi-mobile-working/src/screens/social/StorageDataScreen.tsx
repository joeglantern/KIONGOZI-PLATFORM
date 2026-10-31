// Settings > Storage and data: how videos play, how big your uploads are, and a way to clear
// what the app keeps on the phone. Every row says its current state in the subtitle.
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { useTheme, AppTheme } from '../../hooks/useTheme';
import { usePrefs } from '../../stores/prefsStore';
import { Section, Card, Row, Segmented, useKitColors } from '../../components/settings/SettingsKit';
import { clearSnaps } from '../../utils/snapshot';
import { toast } from '../../utils/alert';

export default function StorageDataScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const T = useTheme();
  const K = useKitColors();
  const styles = useMemo(() => makeStyles(T), [T]);
  const autoplay = usePrefs(s => s.autoplay);
  const setAutoplay = usePrefs(s => s.setAutoplay);
  const uploadQuality = usePrefs(s => s.uploadQuality);
  const setUploadQuality = usePrefs(s => s.setUploadQuality);
  const lowData = usePrefs(s => s.lowData);
  const [cleared, setCleared] = useState(false);

  // No expo-file-system in this build, so the cache has no size to show: this clears the offline
  // snapshots (feed, chats, stories, drafts) the app keeps in AsyncStorage. Nothing on the server changes.
  const clearCache = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setCleared(true);
    try { await clearSnaps(); toast('Cache cleared'); } catch { setCleared(false); toast("Couldn't clear the cache", { kind: 'error' }); }
  };

  return (
    <View style={[styles.container, { backgroundColor: K.page }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 4, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 12) + 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={({ pressed }) => [styles.backBtn, { backgroundColor: K.tile }, pressed && { opacity: 0.6 }]} accessibilityRole="button" accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={20} color={T.text} />
          </Pressable>
        </View>
        <Text style={styles.bigTitle} maxFontSizeMultiplier={1.2} accessibilityRole="header">Storage and data</Text>

        <Section title="Videos" order={0} note={lowData ? 'Low-data mode is on, so videos wait for a tap whatever you pick here.' : undefined}>
          <Card>
            <Row
              icon="play-circle-outline"
              color="#34C759"
              title="Auto-play videos"
              sub={autoplay === 'always' ? 'Always · videos play as you scroll' : 'Never · tap a video to play it'}
            />
            {/* Wi-Fi only is left out on purpose: the app does not know the connection type yet */}
            <Segmented
              label="Auto-play videos"
              value={autoplay}
              onChange={setAutoplay}
              options={[{ id: 'always', label: 'Always' }, { id: 'never', label: 'Never' }]}
            />
          </Card>
        </Section>

        <Section title="Uploads" order={1} note="HD keeps photos as they are. Standard trims them a little so posts go up faster on slow connections.">
          <Card>
            <Row
              icon="image-outline"
              color="#30B0C7"
              title="Media upload quality"
              sub={uploadQuality === 'hd' ? 'HD · full size, bigger uploads' : 'Standard · lighter, uploads faster'}
            />
            <Segmented
              label="Media upload quality"
              value={uploadQuality}
              onChange={setUploadQuality}
              options={[{ id: 'standard', label: 'Standard' }, { id: 'hd', label: 'HD' }]}
            />
          </Card>
        </Section>

        <Section title="Storage" order={2} note="Clears the copies of your feed, chats and stories kept for opening the app offline. They come back as you use it.">
          <Card>
            <Row
              icon="trash-outline"
              color="#8E8E93"
              title="Clear cache"
              sub={cleared ? 'Cleared' : 'Offline copies of feed, chats and stories'}
              onPress={cleared ? undefined : clearCache}
              chevron={!cleared}
            />
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
