// Where you're logged in: every phone and browser signed in to your account, with "Sign out"
// for a lost or old one, and "Sign out everywhere else".
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import apiClient from '../../utils/apiClient';
import { appAlert, toast } from '../../utils/alert';
import { Section, Card, Row, useKitColors } from '../../components/settings/SettingsKit';

type Device = {
  id: string; device: string; kind: 'phone' | 'computer' | 'unknown';
  current: boolean; signed_in_at: string; last_active_at: string; ip?: string | null;
};

function ago(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 120) return 'Active now';
  if (s < 3600) return `Active ${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `Active ${Math.floor(s / 3600)} h ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'Active yesterday' : `Active ${d} days ago`;
}

const since = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export default function DevicesScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const C = useKitColors();
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const r: any = await apiClient.getSessions();
    if (r?.success && Array.isArray(r.data)) { setDevices(r.data); setFailed(false); }
    else setFailed(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  const signOut = (d: Device) => {
    appAlert(`Sign out ${d.device}?`, `${ago(d.last_active_at)}. It will need your password to get back in.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive', onPress: async () => {
          setDevices(prev => prev?.filter(x => x.id !== d.id) ?? prev);
          const r: any = await apiClient.signOutSession(d.id);
          if (r?.success) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); toast(`${d.device} signed out`, { kind: 'success' }); }
          else { toast('Couldn’t sign that device out', { kind: 'error', message: r?.error }); load(); }
        },
      },
    ]);
  };

  const others = (devices || []).filter(d => !d.current);
  const signOutOthers = () => {
    appAlert('Sign out everywhere else?', `${others.length} other ${others.length === 1 ? 'device' : 'devices'} will be signed out. This phone stays signed in.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out others', style: 'destructive', onPress: async () => {
          const r: any = await apiClient.signOutOtherSessions();
          if (r?.success) { toast('Signed out everywhere else', { kind: 'success' }); setDevices(prev => prev?.filter(x => x.current) ?? prev); }
          else toast('Couldn’t sign the others out', { kind: 'error' });
        },
      },
    ]);
  };

  const icon = (d: Device) => (d.kind === 'computer' ? 'laptop-outline' : d.kind === 'phone' ? 'phone-portrait-outline' : 'help-circle-outline') as any;
  const current = (devices || []).find(d => d.current);

  return (
    <View style={{ flex: 1, backgroundColor: C.page }}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [styles.back, pressed && { opacity: 0.5 }]} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={26} color={C.T.text} />
        </Pressable>
        <Text style={[styles.title, { color: C.T.text }]}>Where you’re logged in</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={C.T.textMuted} />}
      >
        {devices === null && !failed ? (
          <Section order={0}><Card>{[0, 1].map(i => <View key={i} style={[styles.skeleton, { backgroundColor: C.tile }]} />)}</Card></Section>
        ) : failed && !devices ? (
          <Section order={0} note="Check your connection and pull down to try again.">
            <Card><Row icon="cloud-offline-outline" title="Couldn’t load your devices" /></Card>
          </Section>
        ) : (
          <>
            {current ? (
              <Section title="This phone" order={0}>
                <Card>
                  <Row icon={icon(current)} title={current.device} sub={`Signed in since ${since(current.signed_in_at)}`} />
                </Card>
              </Section>
            ) : null}

            <Section
              title="Other devices"
              order={1}
              note={others.length ? 'Don’t recognise one? Sign it out, then change your password.' : undefined}
            >
              <Card>
                {others.length ? others.map(d => (
                  <Row
                    key={d.id}
                    icon={icon(d)}
                    title={d.device}
                    sub={`${ago(d.last_active_at)} · since ${since(d.signed_in_at)}${d.ip ? ` · ${d.ip}` : ''}`}
                    right={<Text style={[styles.signOut, { color: C.T.error }]}>Sign out</Text>}
                    onPress={() => signOut(d)}
                    a11y={`${d.device}, ${ago(d.last_active_at)}. Sign out`}
                  />
                )) : (
                  <Row icon="checkmark-circle-outline" title="Only this phone" sub="You’re not signed in anywhere else" />
                )}
              </Card>
            </Section>

            {others.length > 1 ? (
              <Section order={2}>
                <Card>
                  <Row icon="log-out-outline" title="Sign out everywhere else" danger onPress={signOutOthers} />
                </Card>
              </Section>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6, paddingBottom: 6 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700' },
  signOut: { fontSize: 14, fontWeight: '600', marginLeft: 8 },
  skeleton: { height: 52, borderRadius: 12, margin: 6 },
});
