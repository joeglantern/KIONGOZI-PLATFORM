import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { toolsApi, YouthInput } from '../../utils/toolsApiClient';
import { C, F, shadow } from './theme';

const LOCATIONS = ['Nairobi', 'Kwale', 'Mombasa', 'Kisumu', 'Garissa', 'Other'];

const SENTIMENT: Record<string, { label: string; color: string }> = {
  positive: { label: 'Positive', color: C.pos },
  negative: { label: 'Negative', color: C.neg },
  neutral:  { label: 'Neutral',  color: C.inkFaint },
  mixed:    { label: 'Mixed',    color: C.warn },
};

const TAG_COLORS = [
  { bg: C.ochreSoft, text: C.ochre },
  { bg: C.oliveSoft, text: C.olive },
  { bg: C.claySoft,  text: C.clay  },
];

function RichText({ html }: { html: string }) {
  const parts: { text: string; bold?: boolean; mark?: boolean }[] = [];
  let remaining = html;
  while (remaining.length > 0) {
    const strongStart = remaining.indexOf('<strong>');
    const markStart   = remaining.indexOf('<mark>');
    const next = Math.min(
      strongStart >= 0 ? strongStart : Infinity,
      markStart   >= 0 ? markStart   : Infinity,
    );
    if (next === Infinity) {
      parts.push({ text: remaining }); break;
    }
    if (next > 0) parts.push({ text: remaining.slice(0, next) });
    if (next === strongStart) {
      const end = remaining.indexOf('</strong>', next);
      parts.push({ text: remaining.slice(next + 8, end), bold: true });
      remaining = remaining.slice(end + 9);
    } else {
      const end = remaining.indexOf('</mark>', next);
      parts.push({ text: remaining.slice(next + 6, end), mark: true });
      remaining = remaining.slice(end + 7);
    }
  }
  return (
    <Text style={rt.base}>
      {parts.map((p, i) =>
        p.mark ? (
          <Text key={i} style={rt.mark}>{p.text}</Text>
        ) : (
          <Text key={i} style={p.bold ? rt.bold : undefined}>{p.text}</Text>
        )
      )}
    </Text>
  );
}

const rt = StyleSheet.create({
  base: { fontSize: 14.5, color: C.inkSoft, lineHeight: 23 },
  bold: { color: C.ink, fontWeight: '700' },
  mark: { backgroundColor: C.ochreSoft, color: C.ink, fontWeight: '600' },
});

function Shimmer() {
  return (
    <View style={sh.wrap}>
      <View style={sh.line}>
        <ActivityIndicator size="small" color={C.ochre} />
        <Text style={sh.txt}>Reading your voice</Text>
      </View>
      {[92, 78, 64].map((w) => (
        <View key={w} style={[sh.bar, { width: `${w}%` as any }]} />
      ))}
    </View>
  );
}

const sh = StyleSheet.create({
  wrap: { padding: 18, gap: 12 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  txt: { fontSize: 13.5, fontWeight: '600', color: C.inkSoft },
  bar: { height: 10, borderRadius: 5, backgroundColor: C.line },
});

export default function YouthVoiceScreen() {
  const navigation = useNavigation<any>();
  const [lang, setLang] = useState<'en' | 'sw'>('en');
  const [text, setText] = useState('');
  const [location, setLocation] = useState('Nairobi');
  const [phase, setPhase] = useState<'idle' | 'thinking' | 'done'>('idle');
  const [result, setResult] = useState<YouthInput | null>(null);
  const [history, setHistory] = useState<YouthInput[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  React.useEffect(() => {
    toolsApi.getInputs().then((d) => { setHistory(d); setHistoryLoaded(true); }).catch(() => setHistoryLoaded(true));
  }, []);

  const handleSubmit = async () => {
    if (text.trim().length < 10) { Alert.alert('Too short', 'Please write at least 10 characters.'); return; }
    setPhase('thinking');
    setResult(null);
    try {
      const res = await toolsApi.submitInput({ raw_text: text.trim(), location, language: lang });
      setResult(res);
      setHistory((h) => [res, ...h]);
      setPhase('done');
      setText('');
    } catch {
      Alert.alert('Error', 'Could not submit. Check your connection.');
      setPhase('idle');
    }
  };

  const placeholder = lang === 'en'
    ? 'Share a challenge, an opinion, or an idea about civic life in Kenya.'
    : 'Shiriki changamoto, maoni, au wazo kuhusu maisha ya kiraia Kenya.';

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.topbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn} accessibilityLabel="Go back">
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>{lang === 'en' ? 'Youth Voice' : 'Sauti ya Vijana'}</Text>
        <TouchableOpacity
          style={s.langPill}
          onPress={() => setLang(lang === 'en' ? 'sw' : 'en')}
          accessibilityLabel="Toggle language"
        >
          <Text style={s.langTxt}>{lang === 'en' ? 'SW' : 'EN'}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <View style={s.field}>
            <TextInput
              style={s.textarea}
              multiline
              placeholder={placeholder}
              placeholderTextColor={C.inkFaint}
              value={text}
              onChangeText={setText}
              maxLength={2000}
              textAlignVertical="top"
              accessibilityLabel="Input text area"
            />
            <Text style={s.charCount}>{text.length} / 2000</Text>

            <Text style={s.fieldLabel}>{lang === 'en' ? 'YOUR LOCATION' : 'MAHALI PAKO'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {LOCATIONS.map((l) => (
                  <TouchableOpacity
                    key={l}
                    style={[s.chip, location === l && s.chipOn]}
                    onPress={() => setLocation(l)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: location === l }}
                  >
                    <Text style={[s.chipTxt, location === l && s.chipTxtOn]}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={s.hint}>
              <Text style={s.hintTxt}>
                {lang === 'en'
                  ? 'We group your words by theme so leaders can act on patterns, not single posts.'
                  : 'Tunapanga maneno yako kwa mada ili viongozi watende kwa mifumo, si chapisho moja.'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[s.submitBtn, (phase === 'thinking' || text.trim().length < 10) && s.submitDisabled]}
            onPress={handleSubmit}
            disabled={phase === 'thinking' || text.trim().length < 10}
            accessibilityRole="button"
          >
            {phase === 'thinking'
              ? <><ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} /><Text style={s.submitTxt}>{lang === 'en' ? 'Reading your voice' : 'Tunasoma sauti yako'}</Text></>
              : <Text style={s.submitTxt}>{lang === 'en' ? 'Send for analysis  →' : 'Tuma kwa uchambuzi  →'}</Text>}
          </TouchableOpacity>

          {phase === 'thinking' && (
            <View style={s.analysisCard}>
              <Shimmer />
            </View>
          )}

          {phase === 'done' && result && (
            <View style={s.analysisCard}>
              <View style={s.analysisHead}>
                <View style={s.analysisBadge}>
                  <Text style={s.analysisBadgeTxt}>✓</Text>
                </View>
                <Text style={s.analysisTitle}>{lang === 'en' ? 'What we heard' : 'Tulichosikia'}</Text>
              </View>

              <View style={s.analysisBody}>
                <Text style={s.blockLabel}>{lang === 'en' ? 'THEMES' : 'MADA'}</Text>
                <View style={s.tagWrap}>
                  {(result.ai_categories || []).map((cat, i) => {
                    const col = TAG_COLORS[i % TAG_COLORS.length];
                    return (
                      <View key={cat} style={[s.tag, { backgroundColor: col.bg }]}>
                        <Text style={[s.tagTxt, { color: col.text }]}>{cat}</Text>
                      </View>
                    );
                  })}
                </View>

                {result.ai_sentiment && (() => {
                  const sent = SENTIMENT[result.ai_sentiment] ?? SENTIMENT.neutral;
                  return (
                    <View style={{ marginTop: 16 }}>
                      <Text style={s.blockLabel}>{lang === 'en' ? 'TONE' : 'HISIA'}</Text>
                      <View style={[s.sentiBadge, { backgroundColor: sent.color + '22' }]}>
                        <View style={[s.sentiDot, { backgroundColor: sent.color }]} />
                        <Text style={[s.sentiTxt, { color: sent.color }]}>{sent.label}</Text>
                      </View>
                    </View>
                  );
                })()}

                {result.ai_summary && (
                  <View style={{ marginTop: 16 }}>
                    <Text style={s.blockLabel}>{lang === 'en' ? 'IN SHORT' : 'KWA KIFUPI'}</Text>
                    <Text style={s.summaryTxt}>{result.ai_summary}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          <Text style={s.recentTitle}>{lang === 'en' ? 'Recent submissions' : 'Mawasilisho ya hivi karibuni'}</Text>

          {!historyLoaded ? (
            <ActivityIndicator color={C.navy} style={{ marginTop: 16 }} />
          ) : history.length === 0 ? (
            <Text style={s.emptyTxt}>{lang === 'en' ? 'No submissions yet. Be the first to share your voice.' : 'Bado hakuna mawasilisho. Kuwa wa kwanza kushiriki.'}</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {history.slice(0, 8).map((item) => {
                const sent = SENTIMENT[item.ai_sentiment ?? 'neutral'] ?? SENTIMENT.neutral;
                return (
                  <View key={item.id} style={s.subCard}>
                    <Text style={s.subText} numberOfLines={3}>{item.raw_text}</Text>
                    <View style={s.subMeta}>
                      <Text style={s.subLoc}>  {item.location}</Text>
                      <View style={[s.miniSenti, { backgroundColor: sent.color + '20' }]}>
                        <View style={[s.miniDot, { backgroundColor: sent.color }]} />
                        <Text style={[s.miniSentiTxt, { color: sent.color }]}>{sent.label}</Text>
                      </View>
                      {(item.ai_categories ?? []).slice(0, 2).map((c) => (
                        <View key={c} style={s.miniTag}>
                          <Text style={s.miniTagTxt}>{c}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  iconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backArrow: { fontSize: 20, color: C.ink },
  title: { fontSize: 17, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
  langPill: {
    height: 34, paddingHorizontal: 13, borderRadius: 999,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.lineStrong,
    justifyContent: 'center', alignItems: 'center',
  },
  langTxt: { fontSize: 12.5, fontWeight: '700', color: C.ink, letterSpacing: 0.2 },

  scroll: { padding: 18, paddingBottom: 56, gap: 14 },

  field: {
    backgroundColor: C.surface, borderRadius: 22, padding: 16,
    borderWidth: 1, borderColor: C.line, ...shadow.sm,
  },
  textarea: { fontSize: 16, color: C.ink, lineHeight: 25, minHeight: 120, paddingTop: 0 },
  charCount: { fontFamily: F.mono, fontSize: 11, color: C.inkFaint, textAlign: 'right', marginTop: 4, marginBottom: 14 },
  fieldLabel: { fontFamily: F.mono, fontSize: 10.5, letterSpacing: 1.2, color: C.inkFaint, marginBottom: 8 },
  chip: {
    height: 36, paddingHorizontal: 14, borderRadius: 999,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.lineStrong,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: C.navy, borderColor: C.navy },
  chipTxt: { fontSize: 13, fontWeight: '600', color: C.inkSoft },
  chipTxtOn: { color: '#fff' },
  hint: { marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.line },
  hintTxt: { fontSize: 12.5, color: C.inkSoft, lineHeight: 19 },

  submitBtn: {
    height: 52, borderRadius: 14, backgroundColor: C.navy,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row',
    shadowColor: C.navy, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 14, elevation: 6,
  },
  submitDisabled: { backgroundColor: C.inkFaint, shadowOpacity: 0 },
  submitTxt: { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: 0.1 },

  analysisCard: {
    backgroundColor: C.surface, borderRadius: 22, borderWidth: 1, borderColor: C.line, overflow: 'hidden',
    ...shadow.md,
  },
  analysisHead: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 15, borderBottomWidth: 1, borderBottomColor: C.line,
    backgroundColor: C.surface2,
  },
  analysisBadge: {
    width: 30, height: 30, borderRadius: 9, backgroundColor: C.navy,
    justifyContent: 'center', alignItems: 'center',
  },
  analysisBadgeTxt: { fontSize: 14, fontWeight: '800', color: '#fff' },
  analysisTitle: { fontSize: 16, fontWeight: '800', color: C.ink, letterSpacing: -0.2 },
  analysisBody: { padding: 18, gap: 0 },

  blockLabel: { fontFamily: F.mono, fontSize: 10.5, letterSpacing: 1.2, color: C.inkFaint, marginBottom: 10 },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  tag: { height: 28, paddingHorizontal: 11, borderRadius: 999, justifyContent: 'center' },
  tagTxt: { fontSize: 12.5, fontWeight: '600' },
  sentiBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'flex-start', height: 34, paddingHorizontal: 14, borderRadius: 999,
  },
  sentiDot: { width: 9, height: 9, borderRadius: 5 },
  sentiTxt: { fontSize: 13.5, fontWeight: '700' },
  summaryTxt: { fontSize: 14.5, color: C.inkSoft, lineHeight: 23 },

  recentTitle: { fontSize: 17, fontWeight: '800', color: C.ink, letterSpacing: -0.3, marginTop: 4 },
  emptyTxt: { fontSize: 14, color: C.inkFaint, textAlign: 'center', paddingVertical: 24 },

  subCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 15,
    borderWidth: 1, borderColor: C.line, ...shadow.sm,
  },
  subText: { fontSize: 14, color: C.ink, lineHeight: 21, marginBottom: 10 },
  subMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
  subLoc: { fontSize: 12, color: C.inkFaint },
  miniSenti: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  miniDot: { width: 7, height: 7, borderRadius: 4 },
  miniSentiTxt: { fontSize: 11.5, fontWeight: '600' },
  miniTag: {
    backgroundColor: C.navy100, paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 999,
  },
  miniTagTxt: { fontSize: 11, color: C.navy, fontWeight: '600' },
});
