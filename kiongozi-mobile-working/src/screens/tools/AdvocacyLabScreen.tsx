import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Alert, Share, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { toolsApi, Analytics } from '../../utils/toolsApiClient';
import { C, F, shadow } from './theme';

function formatKES(n: number) {
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `KES ${(n / 1_000).toFixed(0)}K`;
  return `KES ${n}`;
}

const SENTIMENT_STYLES: Record<string, { color: string; label: string }> = {
  positive: { color: C.pos,    label: 'Positive' },
  negative: { color: C.neg,    label: 'Negative' },
  neutral:  { color: C.inkFaint, label: 'Neutral' },
  mixed:    { color: C.warn,   label: 'Mixed'    },
};

const BAR_COLORS = [C.navy, C.ochre, C.olive, C.clay, C.plum];

function useCountUp(target: number, duration = 1100) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    let raf: number;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return value;
}

function BigStat({ value, suffix = '', label, sub }: { value: number; suffix?: string; label: string; sub?: string }) {
  const n = useCountUp(value);
  return (
    <View style={bs.card}>
      <Text style={bs.val}>{n.toLocaleString()}{suffix}</Text>
      <Text style={bs.label}>{label}</Text>
      {sub && <Text style={bs.sub}>{sub}</Text>}
    </View>
  );
}

const bs = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: C.surface, borderRadius: 22, padding: 15,
    borderWidth: 1, borderColor: C.line, ...shadow.sm,
  },
  val: { fontSize: 24, fontWeight: '800', color: C.navy, letterSpacing: -0.5, marginBottom: 3 },
  label: { fontSize: 11, color: C.inkSoft, lineHeight: 15 },
  sub: { fontFamily: F.mono, fontSize: 10.5, color: C.olive, marginTop: 4 },
});

function AnimatedBar({ pct, color, delay = 0 }: { pct: number; color: string; delay?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: pct, duration: 800, delay, useNativeDriver: false }).start();
  }, [pct]);
  return (
    <View style={bar.track}>
      <Animated.View
        style={[bar.fill, { backgroundColor: color, width: anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]}
      />
    </View>
  );
}

const bar = StyleSheet.create({
  track: { flex: 1, height: 9, backgroundColor: C.line, borderRadius: 5, overflow: 'hidden' },
  fill: { height: 9, borderRadius: 5 },
});

function BriefShimmer() {
  return (
    <View style={brief.shimWrap}>
      <View style={brief.shimLine}>
        <ActivityIndicator size="small" color={C.ochre} />
        <Text style={brief.shimTxt}>Drafting from the data</Text>
      </View>
      {[88, 95, 70, 82, 60].map((w, i) => (
        <View key={i} style={[brief.shim, { width: `${w}%` as any }]} />
      ))}
    </View>
  );
}

function BriefBody({ text }: { text: string }) {
  const lines = text.split('\n').filter((l) => l.trim());
  return (
    <View style={brief.body}>
      {lines.map((line, i) => {
        const isH3 = line.match(/^#{1,2}\s/) || /^[A-Z][A-Z\s]+$/.test(line.trim()) && line.trim().length < 40;
        const isH4 = line.match(/^\d+\.\s/) || line.match(/^[A-Z][A-Z\s]+:/);
        const isLi = line.match(/^[-•*]\s/);
        const clean = line.replace(/^#{1,3}\s/, '').replace(/^[-•*]\s/, '').replace(/\*\*(.*?)\*\*/g, '$1');
        if (isH3) return <Text key={i} style={brief.h3}>{clean}</Text>;
        if (isH4) return <Text key={i} style={brief.h4}>{clean}</Text>;
        if (isLi) return (
          <View key={i} style={brief.li}>
            <View style={brief.liBullet} />
            <Text style={brief.liTxt}>{clean}</Text>
          </View>
        );
        if (line.trim().startsWith('"') || line.trim().startsWith('“')) {
          return <View key={i} style={brief.quote}><Text style={brief.quoteTxt}>{clean}</Text></View>;
        }
        return <Text key={i} style={brief.para}>{clean}</Text>;
      })}
    </View>
  );
}

const brief = StyleSheet.create({
  shimWrap: { padding: 18, gap: 12 },
  shimLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  shimTxt: { fontSize: 13.5, fontWeight: '600', color: C.inkSoft },
  shim: { height: 10, borderRadius: 5, backgroundColor: C.line },
  body: { padding: 18, gap: 6 },
  h3: { fontSize: 19, fontWeight: '800', color: C.ink, letterSpacing: -0.4, marginTop: 4, marginBottom: 2 },
  h4: { fontSize: 14.5, fontWeight: '700', color: C.navy, marginTop: 14, marginBottom: 6 },
  para: { fontSize: 14, color: C.inkSoft, lineHeight: 22 },
  li: { flexDirection: 'row', gap: 10, marginLeft: 4 },
  liBullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.ochre, marginTop: 8, flexShrink: 0 },
  liTxt: { flex: 1, fontSize: 14, color: C.inkSoft, lineHeight: 22 },
  quote: { borderLeftWidth: 3, borderLeftColor: C.clay, paddingLeft: 14, marginVertical: 4 },
  quoteTxt: { fontSize: 14, color: C.inkSoft, fontStyle: 'italic', lineHeight: 22 },
});

export default function AdvocacyLabScreen() {
  const navigation = useNavigation<any>();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [briefText, setBriefText] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'thinking' | 'done'>('idle');
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    toolsApi.getAnalytics()
      .then((d) => { setAnalytics(d); Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }).start(); })
      .catch(() => Alert.alert('Error', 'Could not load analytics.'))
      .finally(() => setLoading(false));
  }, []);

  const handleGenerate = async () => {
    setPhase('thinking');
    try {
      const res = await toolsApi.generateBrief();
      setBriefText(res.brief);
      setPhase('done');
    } catch {
      Alert.alert('Error', 'Could not generate brief. Ensure the backend is running.');
      setPhase('idle');
    }
  };

  const handleShare = async () => {
    if (!briefText) return;
    try { await Share.share({ message: `KIONGOZI POLICY BRIEF\n\n${briefText}`, title: 'Kiongozi Policy Brief' }); } catch {}
  };

  if (loading || !analytics) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.topbar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}><Text style={s.back}>←</Text></TouchableOpacity>
          <Text style={s.title}>Advocacy Lab</Text>
          <View style={{ width: 40 }} />
        </View>
        <ActivityIndicator color={C.navy} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  const maxSector = Math.max(...analytics.sector_distribution.map((d) => d.count), 1);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.topbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn} accessibilityLabel="Go back">
          <Text style={s.back}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>Advocacy Lab</Text>
        <View style={{ width: 40 }} />
      </View>

      <Animated.ScrollView style={{ opacity: fade }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.statsRow}>
          <BigStat value={analytics.total_inputs} label="Youth inputs" />
          <BigStat value={analytics.total_funds} label="Funds tracked" />
          <BigStat value={analytics.disbursement_rate} suffix="%" label="Disbursed" sub={formatKES(analytics.total_disbursed_kes)} />
        </View>

        {analytics.sector_distribution.length > 0 && (
          <View style={s.panel}>
            <View style={s.panelHead}>
              <Text style={s.panelTitle}>Issues by sector</Text>
              <Text style={s.panelSub}>{analytics.total_inputs.toLocaleString()} inputs</Text>
            </View>
            <View style={{ gap: 13 }}>
              {analytics.sector_distribution.slice(0, 6).map((item, i) => (
                <View key={item.sector} style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <Text style={s.sectorName}>{item.sector}</Text>
                    <Text style={s.sectorCount}>{item.count}</Text>
                  </View>
                  <AnimatedBar pct={(item.count / maxSector) * 100} color={BAR_COLORS[i % BAR_COLORS.length]} delay={i * 70} />
                </View>
              ))}
            </View>
          </View>
        )}

        {analytics.sentiment_distribution.length > 0 && (
          <View style={s.panel}>
            <Text style={s.panelTitle}>How youth feel</Text>
            <View style={s.sentiRow}>
              {analytics.sentiment_distribution.map((item) => {
                const st = SENTIMENT_STYLES[item.sentiment] ?? { color: C.inkFaint, label: item.sentiment };
                const total = analytics.sentiment_distribution.reduce((sum, x) => sum + x.count, 0);
                const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                return (
                  <View key={item.sentiment} style={[s.sentiCard, { borderTopColor: st.color }]}>
                    <Text style={[s.sentiVal, { color: st.color }]}>{pct}%</Text>
                    <Text style={s.sentiLabel}>{st.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {analytics.fund_distribution.length > 0 && (
          <View style={s.panel}>
            <View style={s.panelHead}>
              <Text style={s.panelTitle}>Where money goes</Text>
              <Text style={s.panelSub}>{formatKES(analytics.total_allocated_kes)}</Text>
            </View>
            <View style={{ gap: 12 }}>
              {analytics.fund_distribution.slice(0, 5).map((item, i) => {
                const pct = analytics.total_allocated_kes > 0 ? Math.round((item.allocated / analytics.total_allocated_kes) * 100) : 0;
                return (
                  <View key={item.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[s.distDot, { backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }]} />
                    <Text style={s.distName} numberOfLines={1}>{item.name}</Text>
                    <Text style={s.distPct}>{pct}%</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={s.panel}>
          <Text style={s.panelTitle}>Policy brief</Text>
          <Text style={s.briefSub}>Turn the patterns above into a one-page memo leaders can read in two minutes.</Text>

          {phase !== 'done' && (
            <TouchableOpacity
              style={[s.genBtn, phase === 'thinking' && { opacity: 0.65 }]}
              onPress={handleGenerate}
              disabled={phase === 'thinking'}
              accessibilityRole="button"
              accessibilityLabel="Generate policy brief"
            >
              {phase === 'thinking'
                ? <><ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} /><Text style={s.genTxt}>Drafting from the data</Text></>
                : <Text style={s.genTxt}>Draft the brief</Text>}
            </TouchableOpacity>
          )}

          {phase === 'thinking' && (
            <View style={s.briefCard}>
              <BriefShimmer />
            </View>
          )}

          {phase === 'done' && briefText && (
            <View style={s.briefCard}>
              <View style={s.briefCardHead}>
                <Text style={s.briefCardLabel}>POLICY RECOMMENDATION MEMO</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity style={s.miniBtn} onPress={handleShare} accessibilityRole="button" accessibilityLabel="Share brief">
                    <Text style={s.miniBtnTxt}>Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.miniBtn} onPress={handleGenerate} accessibilityRole="button" accessibilityLabel="Regenerate brief">
                    <Text style={s.miniBtnTxt}>Regenerate</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <BriefBody text={briefText} />
            </View>
          )}
        </View>

      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper },
  topbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 12,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.line,
  },
  iconBtn: { width: 40, height: 40, justifyContent: 'center' },
  back: { fontSize: 20, color: C.ink },
  title: { fontSize: 17, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
  scroll: { padding: 16, paddingBottom: 60, gap: 14 },

  statsRow: { flexDirection: 'row', gap: 10 },

  panel: {
    backgroundColor: C.surface, borderRadius: 22, padding: 17,
    borderWidth: 1, borderColor: C.line, ...shadow.sm,
  },
  panelHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 },
  panelTitle: { fontSize: 17, fontWeight: '800', color: C.ink, letterSpacing: -0.3, marginBottom: 14 },
  panelSub: { fontFamily: F.mono, fontSize: 11, color: C.inkFaint },

  sectorName: { fontSize: 13.5, fontWeight: '600', color: C.ink },
  sectorCount: { fontFamily: F.mono, fontSize: 12, color: C.inkSoft },

  sentiRow: { flexDirection: 'row', gap: 10 },
  sentiCard: {
    flex: 1, alignItems: 'center', padding: 14, borderRadius: 14,
    backgroundColor: C.surface2, borderTopWidth: 3,
  },
  sentiVal: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  sentiLabel: { fontSize: 11.5, color: C.inkSoft, marginTop: 3 },

  distDot: { width: 11, height: 11, borderRadius: 3, flexShrink: 0 },
  distName: { flex: 1, fontSize: 13.5, color: C.ink },
  distPct: { fontFamily: F.mono, fontWeight: '600', fontSize: 13, color: C.inkSoft },

  briefSub: { fontSize: 13.5, color: C.inkSoft, lineHeight: 20, marginTop: -10, marginBottom: 14 },
  genBtn: {
    height: 52, borderRadius: 14, backgroundColor: C.navy,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: C.navy, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 14, elevation: 6,
  },
  genTxt: { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: 0.1 },

  briefCard: {
    marginTop: 14, borderRadius: 16, borderWidth: 1, borderColor: C.line,
    backgroundColor: C.surface2, overflow: 'hidden',
  },
  briefCardHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: C.surface,
  },
  briefCardLabel: { fontFamily: F.mono, fontSize: 10.5, letterSpacing: 1, color: C.inkSoft },
  miniBtn: {
    height: 32, paddingHorizontal: 11, borderRadius: 9,
    backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line, justifyContent: 'center',
  },
  miniBtnTxt: { fontSize: 12, fontWeight: '700', color: C.navy },
});
