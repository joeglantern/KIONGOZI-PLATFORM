import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { C, F, shadow } from './theme';

const TOOLS = [
  {
    route: 'YouthVoice',
    num: '01',
    accent: C.ochre,
    accentSoft: C.ochreSoft,
    name: 'Youth Voice',
    desc: 'Share what civic life is really like where you are. We group it into themes leaders can act on.',
  },
  {
    route: 'FundTracker',
    num: '02',
    accent: C.olive,
    accentSoft: C.oliveSoft,
    name: 'Fund Tracker',
    desc: 'Follow welfare funds from allocation to the ground, with an accountability score for each.',
  },
  {
    route: 'AdvocacyLab',
    num: '03',
    accent: C.clay,
    accentSoft: C.claySoft,
    name: 'Advocacy Lab',
    desc: 'See the patterns across every voice and fund, then draft a policy brief in one tap.',
  },
];

function useCountUp(target: number, duration = 1100) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    let raf: number;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function SnapStat({ target, label, suffix = '' }: { target: number; label: string; suffix?: string }) {
  const n = useCountUp(target);
  return (
    <View style={s.snapCell}>
      <Text style={s.snapVal}>{n.toLocaleString()}{suffix}</Text>
      <Text style={s.snapLabel}>{label}</Text>
    </View>
  );
}

export default function ToolsHubScreen() {
  const navigation = useNavigation<any>();
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 380, useNativeDriver: true }).start();
  }, []);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <Animated.ScrollView
        style={{ opacity: fade }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.hero}>
          <Text style={s.kicker}>AFOSI · CIVIC TOOLS</Text>
          <Text style={s.head}>Tools that turn youth voice into accountability.</Text>
          <Text style={s.sub}>Built with and for Kenya's next generation of change-makers.</Text>
        </View>

        <View style={s.snapshot}>
          <Text style={s.snapKicker}>THIS MONTH</Text>
          <SnapStat target={1284} label="voices heard" />
          <SnapStat target={8} label="funds tracked" />
          <SnapStat target={71} label="avg. accountability" suffix="%" />
        </View>

        <View style={s.toolList}>
          {TOOLS.map((tool, i) => (
            <TouchableOpacity
              key={tool.route}
              style={s.tool}
              onPress={() => navigation.navigate(tool.route)}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel={`Open ${tool.name}`}
            >
              <View style={[s.glyph, { backgroundColor: tool.accentSoft }]}>
                <Text style={[s.glyphNum, { color: tool.accent }]}>{tool.num}</Text>
              </View>
              <Text style={s.toolNum}>{tool.num}</Text>
              <Text style={s.toolName}>{tool.name}</Text>
              <Text style={s.toolDesc}>{tool.desc}</Text>
              <View style={s.toolRow}>
                <Text style={[s.open, { color: tool.accent }]}>Open  →</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.footNote}>
          Data you share informs AFOSI policy work. It is never sold.
        </Text>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper },
  scroll: { paddingBottom: 48 },

  hero: { padding: 20, paddingTop: 18, paddingBottom: 10 },
  kicker: { fontFamily: F.mono, fontSize: 10.5, letterSpacing: 1.4, color: C.inkFaint, marginBottom: 14 },
  head: { fontSize: 28, fontWeight: '800', color: C.ink, letterSpacing: -0.6, lineHeight: 33, marginBottom: 12 },
  sub: { fontSize: 14.5, color: C.inkSoft, lineHeight: 22 },

  snapshot: {
    marginHorizontal: 20, marginBottom: 6, padding: 18,
    borderRadius: 22, backgroundColor: C.navy,
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    ...shadow.md,
  },
  snapKicker: { width: '100%', fontFamily: F.mono, fontSize: 10, letterSpacing: 1.6, color: 'rgba(255,255,255,0.7)', marginBottom: 6 },
  snapCell: { flex: 1, minWidth: 80 },
  snapVal: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.4 },
  snapLabel: { fontSize: 10.5, color: 'rgba(255,255,255,0.75)', marginTop: 2, lineHeight: 14 },

  toolList: { paddingHorizontal: 20, paddingTop: 18, gap: 14 },
  tool: {
    backgroundColor: C.surface, borderRadius: 22, padding: 18,
    borderWidth: 1, borderColor: C.line, position: 'relative',
    overflow: 'hidden', ...shadow.sm,
  },
  glyph: {
    position: 'absolute', right: -8, top: -8,
    width: 88, height: 88, borderRadius: 100,
    justifyContent: 'center', alignItems: 'center',
  },
  glyphNum: { fontSize: 28, fontWeight: '800', letterSpacing: -1 },
  toolNum: { fontFamily: F.mono, fontSize: 11, letterSpacing: 1, color: C.inkFaint, marginBottom: 8 },
  toolName: { fontSize: 20, fontWeight: '800', color: C.ink, letterSpacing: -0.4, marginBottom: 7 },
  toolDesc: { fontSize: 13.5, color: C.inkSoft, lineHeight: 20, maxWidth: 260 },
  toolRow: { marginTop: 16 },
  open: { fontSize: 13.5, fontWeight: '700' },

  footNote: { textAlign: 'center', color: C.inkFaint, fontSize: 12, lineHeight: 18, padding: 24 },
});
