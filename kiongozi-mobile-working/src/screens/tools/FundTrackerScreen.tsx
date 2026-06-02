import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, TextInput, StyleSheet,
  ActivityIndicator, Alert, Modal, ScrollView, Animated, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { toolsApi, WelfareFund } from '../../utils/toolsApiClient';
import { C, F, shadow } from './theme';

function scoreColor(s: number) {
  return s >= 80 ? C.pos : s >= 50 ? C.warn : C.neg;
}

function formatKES(n: number) {
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `KES ${(n / 1_000).toFixed(0)}K`;
  return `KES ${n}`;
}

const STATUS: Record<string, { label: string; bg: string; text: string }> = {
  Disbursed: { label: 'Disbursed', bg: C.oliveSoft, text: C.olive },
  Pending:   { label: 'Pending',   bg: C.ochreSoft, text: C.ochre },
  Audited:   { label: 'Audited',   bg: C.navy100,   text: C.navy  },
};

function AnimatedBar({ pct, color, delay = 0, height = 7 }: { pct: number; color: string; delay?: number; height?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct,
      duration: 800,
      delay,
      useNativeDriver: false,
    }).start();
  }, [pct]);
  return (
    <View style={[bs.track, { height }]}>
      <Animated.View
        style={[bs.fill, { height, backgroundColor: color, width: anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]}
      />
    </View>
  );
}

const bs = StyleSheet.create({
  track: { flex: 1, backgroundColor: C.line, borderRadius: 4, overflow: 'hidden' },
  fill: { borderRadius: 4 },
});

function FlagSheet({ fund, onClose }: { fund: WelfareFund; onClose: () => void }) {
  const [name, setName] = useState('');
  const [severity, setSeverity] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [desc, setDesc] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const slide = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    Animated.timing(slide, { toValue: 0, duration: 360, useNativeDriver: true }).start();
  }, []);

  const close = () => {
    Animated.timing(slide, { toValue: 300, duration: 260, useNativeDriver: true }).start(() => onClose());
  };

  const submit = async () => {
    if (desc.trim().length < 10) { Alert.alert('Too short', 'Describe the issue in at least 10 characters.'); return; }
    setLoading(true);
    try {
      await toolsApi.reportFund({ fund_id: fund.id, reporter_name: name || undefined, description: desc, severity });
      setDone(true);
    } catch {
      Alert.alert('Error', 'Could not submit. Please try again.');
    } finally { setLoading(false); }
  };

  const SEVS: { key: 'Low' | 'Medium' | 'High'; color: string }[] = [
    { key: 'Low',    color: C.olive },
    { key: 'Medium', color: C.warn  },
    { key: 'High',   color: C.clay  },
  ];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <Pressable style={fl.scrim} onPress={close}>
        <Animated.View style={[fl.sheet, { transform: [{ translateY: slide }] }]}>
          <Pressable onPress={() => {}}>
            <View style={fl.grip} />
            {done ? (
              <View style={fl.doneWrap}>
                <View style={fl.doneIcon}><Text style={{ fontSize: 22, color: C.olive }}>✓</Text></View>
                <Text style={fl.doneTitle}>Report received</Text>
                <Text style={fl.doneSub}>Thank you for keeping funds honest.</Text>
                <TouchableOpacity style={fl.doneBtn} onPress={close}><Text style={fl.doneBtnTxt}>OK</Text></TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={fl.head}>
                  <Text style={fl.headTitle}>Flag an issue</Text>
                  <TouchableOpacity onPress={close} style={fl.closeBtn}><Text style={fl.closeX}>✕</Text></TouchableOpacity>
                </View>
                <ScrollView style={fl.body} showsVerticalScrollIndicator={false}>
                  <View style={fl.fundRef}>
                    <Text style={fl.fundRefTxt} numberOfLines={1}>{fund.fund_name}</Text>
                  </View>

                  <Text style={fl.label}>YOUR NAME</Text>
                  <TextInput style={fl.input} value={name} onChangeText={setName} placeholder="Anonymous (optional)" placeholderTextColor={C.inkFaint} />

                  <Text style={fl.label}>HOW SERIOUS</Text>
                  <View style={fl.sevRow}>
                    {SEVS.map((sv) => (
                      <TouchableOpacity
                        key={sv.key}
                        style={[fl.sev, severity === sv.key && { backgroundColor: sv.color, borderColor: sv.color }]}
                        onPress={() => setSeverity(sv.key)}
                      >
                        <Text style={[fl.sevTxt, severity === sv.key && { color: '#fff' }]}>{sv.key}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={fl.label}>DESCRIBE WHAT LOOKS WRONG</Text>
                  <TextInput
                    style={[fl.input, fl.textarea]}
                    value={desc}
                    onChangeText={setDesc}
                    placeholder="Tell us what seems off about this fund."
                    placeholderTextColor={C.inkFaint}
                    multiline
                    maxLength={1000}
                    textAlignVertical="top"
                  />
                  <Text style={fl.charCount}>{desc.length} / 1000</Text>

                  <TouchableOpacity
                    style={[fl.submitBtn, (loading || desc.trim().length < 10) && { opacity: 0.45 }]}
                    onPress={submit}
                    disabled={loading || desc.trim().length < 10}
                  >
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={fl.submitTxt}>Submit report</Text>}
                  </TouchableOpacity>
                  <View style={{ height: 40 }} />
                </ScrollView>
              </>
            )}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const fl = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(34,28,21,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.surface, borderRadius: 26, borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
    paddingBottom: 20, maxHeight: '92%', ...shadow.lg,
  },
  grip: { width: 40, height: 4, borderRadius: 4, backgroundColor: C.lineStrong, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  headTitle: { fontSize: 19, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
  closeBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  closeX: { fontSize: 16, color: C.inkSoft },
  body: { paddingHorizontal: 20 },
  fundRef: { backgroundColor: C.ochreSoft, padding: 12, borderRadius: 12, marginBottom: 4 },
  fundRefTxt: { fontSize: 13, fontWeight: '600', color: C.ochre },
  label: { fontFamily: F.mono, fontSize: 10.5, letterSpacing: 1, color: C.inkFaint, marginTop: 16, marginBottom: 8 },
  input: {
    height: 48, paddingHorizontal: 14, borderRadius: 12,
    backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line,
    fontSize: 15, color: C.ink,
  },
  textarea: { height: 96, paddingTop: 13, paddingBottom: 13, lineHeight: 22 },
  charCount: { fontFamily: F.mono, fontSize: 11, color: C.inkFaint, textAlign: 'right', marginTop: 4 },
  sevRow: { flexDirection: 'row', gap: 9 },
  sev: {
    flex: 1, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
    backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line,
  },
  sevTxt: { fontSize: 13.5, fontWeight: '700', color: C.inkSoft },
  submitBtn: {
    height: 52, borderRadius: 14, backgroundColor: C.clay,
    justifyContent: 'center', alignItems: 'center', marginTop: 20,
    shadowColor: C.clay, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 5,
  },
  submitTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
  doneWrap: { alignItems: 'center', padding: 30, gap: 12 },
  doneIcon: {
    width: 58, height: 58, borderRadius: 29, backgroundColor: C.oliveSoft,
    justifyContent: 'center', alignItems: 'center',
  },
  doneTitle: { fontSize: 20, fontWeight: '800', color: C.ink },
  doneSub: { fontSize: 14, color: C.inkSoft, lineHeight: 21, textAlign: 'center', maxWidth: 260 },
  doneBtn: {
    marginTop: 8, height: 48, paddingHorizontal: 32, borderRadius: 14,
    backgroundColor: C.navy, justifyContent: 'center', alignItems: 'center',
  },
  doneBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

function FundCard({ item, index, onFlag }: { item: WelfareFund; index: number; onFlag: () => void }) {
  const pct = item.total_allocated > 0 ? (item.disbursed_amount / item.total_allocated) * 100 : 0;
  const st = STATUS[item.status] ?? STATUS.Pending;
  return (
    <View style={fc.card}>
      <View style={fc.head}>
        <Text style={fc.name} numberOfLines={2}>{item.fund_name}</Text>
        <View style={[fc.badge, { backgroundColor: st.bg }]}>
          <Text style={[fc.badgeTxt, { color: st.text }]}>{st.label}</Text>
        </View>
      </View>

      {item.beneficiary_ylo && (
        <Text style={fc.ylo} numberOfLines={1}>  {item.beneficiary_ylo}</Text>
      )}

      <View style={fc.amts}>
        {[
          { label: 'Allocated', val: formatKES(item.total_allocated) },
          { label: 'Disbursed', val: formatKES(item.disbursed_amount), green: true },
          { label: 'Rate',      val: `${pct.toFixed(0)}%` },
        ].map((a, i) => (
          <View key={a.label} style={[fc.amt, i > 0 && fc.amtBorder]}>
            <Text style={fc.amtLabel}>{a.label}</Text>
            <Text style={[fc.amtVal, a.green && { color: C.olive }]}>{a.val}</Text>
          </View>
        ))}
      </View>

      <View style={fc.scoreRow}>
        <Text style={fc.scoreLabel}>Accountability</Text>
        <AnimatedBar pct={item.accountability_score} color={scoreColor(item.accountability_score)} delay={index * 45 + 120} />
        <Text style={[fc.scoreVal, { color: scoreColor(item.accountability_score) }]}>{item.accountability_score}</Text>
      </View>

      <View style={fc.foot}>
        <AnimatedBar pct={Math.min(pct, 100)} color={C.navy} delay={index * 45 + 160} height={5} />
        <TouchableOpacity style={fc.flagBtn} onPress={onFlag} accessibilityRole="button" accessibilityLabel={`Flag issue for ${item.fund_name}`}>
          <Text style={fc.flagTxt}>  Flag</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const fc = StyleSheet.create({
  card: {
    backgroundColor: C.surface, borderRadius: 22, padding: 16,
    borderWidth: 1, borderColor: C.line, ...shadow.sm,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  name: { flex: 1, fontSize: 16, fontWeight: '800', color: C.ink, letterSpacing: -0.2, lineHeight: 21 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeTxt: { fontSize: 11.5, fontWeight: '700' },
  ylo: { fontSize: 12, color: C.inkFaint, marginBottom: 12 },
  amts: {
    flexDirection: 'row', backgroundColor: C.surface2, borderRadius: 12, padding: 12, marginBottom: 12,
  },
  amt: { flex: 1, alignItems: 'center' },
  amtBorder: { borderLeftWidth: 1, borderLeftColor: C.line },
  amtLabel: { fontSize: 10, color: C.inkFaint, letterSpacing: 0.3 },
  amtVal: { fontSize: 14, fontWeight: '700', color: C.ink, marginTop: 3 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  scoreLabel: { fontSize: 12, color: C.inkSoft, width: 94 },
  scoreVal: { fontSize: 13, fontWeight: '800', minWidth: 26, textAlign: 'right' },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flagBtn: {
    height: 34, paddingHorizontal: 13, borderRadius: 10,
    backgroundColor: C.claySoft, justifyContent: 'center',
  },
  flagTxt: { fontSize: 12.5, fontWeight: '700', color: C.clay },
});

export default function FundTrackerScreen() {
  const navigation = useNavigation<any>();
  const [funds, setFunds] = useState<WelfareFund[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sort, setSort] = useState<'rate' | 'score' | 'amount'>('rate');
  const [flagTarget, setFlagTarget] = useState<WelfareFund | null>(null);

  useEffect(() => {
    toolsApi.getFunds().then(setFunds).catch(() => Alert.alert('Error', 'Could not load fund data.')).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let r = funds.filter((f) => {
      const okS = statusFilter === 'All' || f.status === statusFilter;
      const q = search.trim().toLowerCase();
      const okQ = !q || f.fund_name.toLowerCase().includes(q) || (f.beneficiary_ylo ?? '').toLowerCase().includes(q);
      return okS && okQ;
    });
    return [...r].sort((a, b) =>
      sort === 'rate'   ? (b.disbursed_amount / b.total_allocated) - (a.disbursed_amount / a.total_allocated) :
      sort === 'score'  ? b.accountability_score - a.accountability_score :
                          Number(b.total_allocated) - Number(a.total_allocated)
    );
  }, [funds, search, statusFilter, sort]);

  const totAlloc = funds.reduce((s, f) => s + Number(f.total_allocated), 0);
  const totDisb  = funds.reduce((s, f) => s + Number(f.disbursed_amount), 0);
  const avgScore = funds.length ? Math.round(funds.reduce((s, f) => s + f.accountability_score, 0) / funds.length) : 0;

  const FILTERS = ['All', 'Disbursed', 'Pending', 'Audited'];
  const SORTS: { key: 'rate' | 'score' | 'amount'; label: string }[] = [
    { key: 'rate', label: 'Disbursement' },
    { key: 'score', label: 'Accountability' },
    { key: 'amount', label: 'Amount' },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.topbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn} accessibilityLabel="Go back">
          <Text style={s.back}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>Fund Tracker</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.toolbar}>
        <View style={s.searchBox}>
          <Text style={s.searchIcon}>⌕</Text>
          <TextInput
            style={s.searchInput}
            placeholder="Search funds or groups"
            placeholderTextColor={C.inkFaint}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}><Text style={s.clearTxt}>✕</Text></TouchableOpacity>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {FILTERS.map((f) => (
              <TouchableOpacity key={f} style={[s.chip, statusFilter === f && s.chipOn]} onPress={() => setStatusFilter(f)}>
                <Text style={[s.chipTxt, statusFilter === f && s.chipOnTxt]}>{f}</Text>
              </TouchableOpacity>
            ))}
            <View style={s.divider} />
            {SORTS.map((sv) => (
              <TouchableOpacity key={sv.key} style={[s.chip, sort === sv.key && s.chipOn]} onPress={() => setSort(sv.key)}>
                <Text style={[s.chipTxt, sort === sv.key && s.chipOnTxt]}>{sv.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator color={C.navy} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.list}
          ListHeaderComponent={
            <View style={s.statsRow}>
              {[
                { val: formatKES(totAlloc), label: 'Total allocated' },
                { val: formatKES(totDisb),  label: 'Disbursed', green: true },
                { val: String(avgScore),    label: 'Avg. score', scoreColor: scoreColor(avgScore) },
              ].map((st) => (
                <View key={st.label} style={s.statCard}>
                  <Text style={[s.statVal, st.green && { color: C.olive }, st.scoreColor && { color: st.scoreColor }]}>{st.val}</Text>
                  <Text style={s.statLabel}>{st.label}</Text>
                </View>
              ))}
            </View>
          }
          renderItem={({ item, index }) => (
            <FundCard item={item} index={index} onFlag={() => setFlagTarget(item)} />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={<Text style={s.empty}>{search ? 'No funds match your search.' : 'No fund data available.'}</Text>}
          ListFooterComponent={<Text style={s.footer}>{filtered.length} fund{filtered.length !== 1 ? 's' : ''} shown</Text>}
        />
      )}

      {flagTarget && <FlagSheet fund={flagTarget} onClose={() => setFlagTarget(null)} />}
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

  toolbar: {
    backgroundColor: C.surface, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: C.line,
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    height: 46, paddingHorizontal: 14,
    backgroundColor: C.paper, borderWidth: 1, borderColor: C.lineStrong, borderRadius: 13,
  },
  searchIcon: { fontSize: 18, color: C.inkFaint },
  searchInput: { flex: 1, fontSize: 15, color: C.ink },
  clearTxt: { fontSize: 14, color: C.inkFaint },
  chip: {
    height: 36, paddingHorizontal: 14, borderRadius: 999,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.lineStrong,
    justifyContent: 'center', alignItems: 'center',
  },
  chipOn: { backgroundColor: C.navy, borderColor: C.navy },
  chipTxt: { fontSize: 13, fontWeight: '600', color: C.inkSoft },
  chipOnTxt: { color: '#fff' },
  divider: { width: 1, backgroundColor: C.line, marginVertical: 4 },

  list: { padding: 16, paddingBottom: 40 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: {
    flex: 1, backgroundColor: C.surface, borderRadius: 16, padding: 13,
    borderWidth: 1, borderColor: C.line, ...shadow.sm,
  },
  statVal: { fontSize: 16, fontWeight: '800', color: C.ink, letterSpacing: -0.3, marginBottom: 3 },
  statLabel: { fontSize: 10.5, color: C.inkFaint, lineHeight: 14 },

  empty: { textAlign: 'center', color: C.inkFaint, fontSize: 14, paddingTop: 40 },
  footer: { textAlign: 'center', color: C.inkFaint, fontSize: 12, fontFamily: F.mono, marginTop: 10, paddingBottom: 10 },
});
