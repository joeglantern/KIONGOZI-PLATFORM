// Invite friends: your personal link (?ref=you). People who join through it are credited to you
// and follow you automatically. The link opens a rich preview in WhatsApp etc.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, Share, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { UserAvatar } from '../../components/social/UserAvatar';
import apiClient from '../../utils/apiClient';
import { useTheme, AppTheme } from '../../hooks/useTheme';

type Invites = { link: string; count: number; recent: { id: string; username: string; full_name?: string; avatar_url?: string }[] };

export default function InviteScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const T = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);
  const [data, setData] = useState<Invites | null>(null);
  const [copied, setCopied] = useState(false);

  useFocusEffect(useCallback(() => {
    apiClient.getInvites().then((r: any) => { if (r?.success) setData(r.data); }).catch(() => {});
  }, []));

  useEffect(() => { if (!copied) return; const t = setTimeout(() => setCopied(false), 1600); return () => clearTimeout(t); }, [copied]);

  const copy = async () => {
    if (!data) return;
    await Clipboard.setStringAsync(data.link).catch(() => {});
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setCopied(true);
  };

  const share = () => {
    if (!data) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Share.share({ message: `Join me on KChat, the app for young Kenyans who lead 🇰🇪\n${data.link}`, url: data.link }).catch(() => {});
  };

  const shown = (data?.recent || []).slice(0, 4);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.5 }]} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={26} color={T.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>Invite friends</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 24 }]} showsVerticalScrollIndicator={false}>
        <Image source={require('../../../assets/social/invite.png')} style={styles.art} accessibilityIgnoresInvertColors accessible={false} />
        <Text style={styles.title}>Bring your people{'\n'}to KChat</Text>
        <Text style={styles.lead}>Send your link. When friends join through it, they show up here and follow you straight away.</Text>

        <View style={styles.joined}>
          {shown.length > 0 && (
            <View style={styles.faces}>
              {shown.map((u, i) => (
                <View key={u.id} style={[styles.face, { marginLeft: i ? -10 : 0 }]}>
                  <UserAvatar avatarUrl={u.avatar_url} name={u.full_name || u.username} size={30} />
                </View>
              ))}
            </View>
          )}
          <View style={{ flex: 1 }}>
            {data ? (
              <>
                <Text style={styles.joinedTitle}>{data.count === 0 ? 'No one yet' : `${data.count} friend${data.count === 1 ? '' : 's'} joined`}</Text>
                <Text style={styles.joinedSub}>{data.count === 0 ? 'Your first invite is one share away' : 'through your link'}</Text>
              </>
            ) : <ActivityIndicator color={T.textSub} style={{ alignSelf: 'flex-start' }} />}
          </View>
        </View>

        <View style={styles.linkRow}>
          <Text style={styles.link} numberOfLines={1}>{data ? data.link.replace(/^https:\/\//, '') : ' '}</Text>
          <Pressable onPress={copy} disabled={!data} style={({ pressed }) => [styles.copy, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel="Copy invite link">
            <Text style={styles.copyText}>{copied ? 'Copied' : 'Copy'}</Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 16) }}>
        <Pressable onPress={share} disabled={!data} style={({ pressed }) => [styles.primary, (pressed || !data) && { opacity: 0.85 }]} accessibilityRole="button">
          <Ionicons name="paper-plane-outline" size={19} color="#0E1116" />
          <Text style={styles.primaryText}>Share invite link</Text>
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(T: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: T.bg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, backgroundColor: T.bg },
    backBtn: { width: 44, height: 50, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontFamily: 'SpaceGrotesk_600SemiBold', color: T.text },
    body: { paddingHorizontal: 20, alignItems: 'stretch' },
    art: { width: 240, height: 240, alignSelf: 'center', marginTop: 4 },
    title: { fontSize: 28, lineHeight: 31, fontFamily: 'SpaceGrotesk_700Bold', color: T.text, textAlign: 'center', letterSpacing: -0.6, marginTop: 4 },
    lead: { fontSize: 15, lineHeight: 22, color: T.textSub, textAlign: 'center', marginTop: 10, marginHorizontal: 8 },
    joined: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.surface, borderRadius: 18, padding: 14, marginTop: 22 },
    faces: { flexDirection: 'row' },
    face: { borderRadius: 17, borderWidth: 2, borderColor: T.surface },
    joinedTitle: { fontSize: 15, fontWeight: '700', color: T.text },
    joinedSub: { fontSize: 13, color: T.textSub, marginTop: 1 },
    linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: T.border, borderRadius: 16, height: 50, paddingLeft: 14, paddingRight: 6, marginTop: 12 },
    link: { flex: 1, fontSize: 14, color: T.textSub },
    copy: { height: 38, paddingHorizontal: 14, borderRadius: 12, backgroundColor: T.surface2, alignItems: 'center', justifyContent: 'center' },
    copyText: { fontSize: 14, fontWeight: '600', color: T.text },
    primary: { height: 54, borderRadius: 27, backgroundColor: '#5CB85C', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    primaryText: { fontSize: 16, fontWeight: '700', color: '#0E1116' },
  });
}
