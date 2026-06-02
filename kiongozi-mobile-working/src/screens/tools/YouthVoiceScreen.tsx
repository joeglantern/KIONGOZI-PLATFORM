import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { toolsApi, YouthInput } from '../../utils/toolsApiClient';

const LOCATIONS = ['Nairobi', 'Kwale', 'Mombasa', 'Kisumu', 'Other'];
const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#38a169',
  negative: '#e53e3e',
  neutral: '#718096',
  mixed: '#d97706',
};

const T = {
  en: {
    title: 'Youth Voice',
    placeholder: 'Share a challenge, opinion, or idea about civic life in Kenya...',
    location: 'Your location',
    submit: 'Submit',
    submitting: 'Analysing...',
    recent: 'Recent Submissions',
    aiResult: 'AI Analysis',
    categories: 'Categories',
    sentiment: 'Sentiment',
    summary: 'Summary',
    empty: 'No submissions yet. Be the first to share your voice.',
    lang: 'SW',
  },
  sw: {
    title: 'Sauti ya Vijana',
    placeholder: 'Shiriki changamoto, maoni, au wazo kuhusu maisha ya kiraia Kenya...',
    location: 'Mahali pako',
    submit: 'Wasilisha',
    submitting: 'Inachambua...',
    recent: 'Mawasilisho ya Hivi Karibuni',
    aiResult: 'Uchambuzi wa AI',
    categories: 'Makundi',
    sentiment: 'Hisia',
    summary: 'Muhtasari',
    empty: 'Bado hakuna mawasilisho. Kuwa wa kwanza kushiriki sauti yako.',
    lang: 'EN',
  },
};

export default function YouthVoiceScreen() {
  const navigation = useNavigation<any>();
  const [lang, setLang] = useState<'en' | 'sw'>('en');
  const [text, setText] = useState('');
  const [location, setLocation] = useState('Nairobi');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<YouthInput | null>(null);
  const [history, setHistory] = useState<YouthInput[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const t = T[lang];

  useEffect(() => {
    toolsApi.getInputs()
      .then(setHistory)
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (text.trim().length < 10) {
      Alert.alert('Too short', 'Please write at least 10 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await toolsApi.submitInput({ raw_text: text.trim(), location, language: lang });
      setResult(res);
      setText('');
      setHistory((prev) => [res, ...prev]);
    } catch {
      Alert.alert('Error', 'Could not submit. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={22} color="#1a202c" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t.title}</Text>
          <TouchableOpacity
            style={styles.langToggle}
            onPress={() => setLang(lang === 'en' ? 'sw' : 'en')}
            accessibilityLabel={`Switch to ${t.lang}`}
          >
            <Text style={styles.langText}>{t.lang}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Input card */}
          <View style={styles.inputCard}>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={5}
              placeholder={t.placeholder}
              placeholderTextColor="#a0aec0"
              value={text}
              onChangeText={setText}
              maxLength={2000}
              accessibilityLabel="Input text area"
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{text.length} / 2000</Text>

            {/* Location row */}
            <Text style={styles.sectionLabel}>{t.location}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.locationRow}>
              {LOCATIONS.map((loc) => (
                <TouchableOpacity
                  key={loc}
                  style={[styles.locationChip, location === loc && styles.locationChipActive]}
                  onPress={() => setLocation(loc)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: location === loc }}
                >
                  <Text style={[styles.locationChipText, location === loc && styles.locationChipTextActive]}>
                    {loc}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitBtn, (loading || text.trim().length < 10) && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading || text.trim().length < 10}
              accessibilityRole="button"
              accessibilityLabel={t.submit}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.submitText}>{t.submit}</Text>}
            </TouchableOpacity>
          </View>

          {/* AI Result */}
          {result && (
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Ionicons name="sparkles" size={16} color="#2b6cb0" />
                <Text style={styles.resultTitle}>{t.aiResult}</Text>
              </View>

              <Text style={styles.sectionLabel}>{t.categories}</Text>
              <View style={styles.chips}>
                {result.ai_categories.map((cat) => (
                  <View key={cat} style={styles.categoryChip}>
                    <Text style={styles.categoryChipText}>{cat}</Text>
                  </View>
                ))}
              </View>

              {result.ai_sentiment && (
                <>
                  <Text style={styles.sectionLabel}>{t.sentiment}</Text>
                  <View style={[styles.sentimentBadge, { backgroundColor: `${SENTIMENT_COLORS[result.ai_sentiment]}15` }]}>
                    <View style={[styles.sentimentDot, { backgroundColor: SENTIMENT_COLORS[result.ai_sentiment] }]} />
                    <Text style={[styles.sentimentText, { color: SENTIMENT_COLORS[result.ai_sentiment] }]}>
                      {result.ai_sentiment.charAt(0).toUpperCase() + result.ai_sentiment.slice(1)}
                    </Text>
                  </View>
                </>
              )}

              {result.ai_summary && (
                <>
                  <Text style={styles.sectionLabel}>{t.summary}</Text>
                  <Text style={styles.summaryText}>{result.ai_summary}</Text>
                </>
              )}
            </View>
          )}

          {/* History */}
          <Text style={styles.historyTitle}>{t.recent}</Text>
          {historyLoading ? (
            <ActivityIndicator color="#1a365d" style={{ marginTop: 16 }} />
          ) : history.length === 0 ? (
            <Text style={styles.emptyText}>{t.empty}</Text>
          ) : (
            history.slice(0, 10).map((item) => (
              <View key={item.id} style={styles.historyCard}>
                <Text style={styles.historyText} numberOfLines={2}>{item.raw_text}</Text>
                <View style={styles.historyMeta}>
                  <Text style={styles.historyLocation}>{item.location}</Text>
                  {item.ai_sentiment && (
                    <View style={[styles.miniSentiment, { backgroundColor: `${SENTIMENT_COLORS[item.ai_sentiment]}15` }]}>
                      <Text style={[styles.miniSentimentText, { color: SENTIMENT_COLORS[item.ai_sentiment] }]}>
                        {item.ai_sentiment}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.chips}>
                  {(item.ai_categories || []).slice(0, 3).map((cat) => (
                    <View key={cat} style={styles.categoryChipSmall}>
                      <Text style={styles.categoryChipTextSmall}>{cat}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f7f9fc' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1a202c' },
  langToggle: {
    backgroundColor: '#ebf8ff', paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: '#bee3f8',
  },
  langText: { fontSize: 12, fontWeight: '700', color: '#2b6cb0' },
  scroll: { padding: 16, paddingBottom: 60 },
  inputCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16,
  },
  textArea: {
    minHeight: 120, fontSize: 15, color: '#1a202c', lineHeight: 22,
    paddingTop: 0,
  },
  charCount: { fontSize: 11, color: '#a0aec0', textAlign: 'right', marginTop: 4, marginBottom: 12 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: '#718096', marginBottom: 8, letterSpacing: 0.3, textTransform: 'uppercase' },
  locationRow: { marginBottom: 16 },
  locationChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, marginRight: 8,
    backgroundColor: '#f7f9fc', borderWidth: 1, borderColor: '#e2e8f0',
  },
  locationChipActive: { backgroundColor: '#1a365d', borderColor: '#1a365d' },
  locationChipText: { fontSize: 13, color: '#4a5568', fontWeight: '500' },
  locationChipTextActive: { color: '#fff' },
  submitBtn: {
    backgroundColor: '#1a365d', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 4,
  },
  submitBtnDisabled: { backgroundColor: '#a0aec0' },
  submitText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  resultCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#bee3f8', borderLeftWidth: 4,
    borderLeftColor: '#2b6cb0', marginBottom: 24,
  },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  resultTitle: { fontSize: 14, fontWeight: '700', color: '#2b6cb0' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  categoryChip: {
    backgroundColor: '#ebf8ff', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: '#bee3f8',
  },
  categoryChipText: { fontSize: 12, color: '#2b6cb0', fontWeight: '600' },
  sentimentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, marginBottom: 12,
  },
  sentimentDot: { width: 7, height: 7, borderRadius: 4 },
  sentimentText: { fontSize: 13, fontWeight: '600' },
  summaryText: { fontSize: 14, color: '#4a5568', lineHeight: 21 },
  historyTitle: { fontSize: 16, fontWeight: '700', color: '#1a202c', marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#a0aec0', textAlign: 'center', paddingVertical: 24 },
  historyCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  historyText: { fontSize: 14, color: '#2d3748', lineHeight: 20, marginBottom: 8 },
  historyMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  historyLocation: { fontSize: 12, color: '#a0aec0' },
  miniSentiment: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  miniSentimentText: { fontSize: 11, fontWeight: '600' },
  categoryChipSmall: {
    backgroundColor: '#f7f9fc', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0',
  },
  categoryChipTextSmall: { fontSize: 11, color: '#718096' },
});
