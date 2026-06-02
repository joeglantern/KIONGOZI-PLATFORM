import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Alert, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { toolsApi, Analytics } from '../../utils/toolsApiClient';

function formatKES(n: number) {
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `KES ${(n / 1_000).toFixed(0)}K`;
  return `KES ${n}`;
}

const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#38a169',
  negative: '#e53e3e',
  neutral: '#718096',
  mixed: '#d97706',
};

const BAR_COLORS = ['#1a365d', '#2b6cb0', '#3182ce', '#4299e1', '#63b3ed', '#90cdf4'];

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={statStyles.card}>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
      {sub && <Text style={statStyles.sub}>{sub}</Text>}
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center',
  },
  value: { fontSize: 20, fontWeight: '800', color: '#1a365d', marginBottom: 4 },
  label: { fontSize: 11, color: '#718096', textAlign: 'center' },
  sub: { fontSize: 11, color: '#38a169', fontWeight: '600', marginTop: 2 },
});

function SectorChart({ data }: { data: { sector: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <View style={chartStyles.wrap}>
      {data.slice(0, 6).map((item, i) => (
        <View key={item.sector} style={chartStyles.row}>
          <Text style={chartStyles.label} numberOfLines={1}>{item.sector}</Text>
          <View style={chartStyles.track}>
            <View
              style={[
                chartStyles.bar,
                { width: `${(item.count / max) * 100}%` as any, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] },
              ]}
            />
          </View>
          <Text style={chartStyles.count}>{item.count}</Text>
        </View>
      ))}
    </View>
  );
}

const chartStyles = StyleSheet.create({
  wrap: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { width: 110, fontSize: 12, color: '#4a5568' },
  track: { flex: 1, height: 10, backgroundColor: '#e2e8f0', borderRadius: 5, overflow: 'hidden' },
  bar: { height: 10, borderRadius: 5 },
  count: { width: 24, fontSize: 12, fontWeight: '700', color: '#1a365d', textAlign: 'right' },
});

function FundChart({ data }: { data: { name: string; allocated: number; disbursed: number; status: string }[] }) {
  const total = data.reduce((s, d) => s + d.allocated, 0);
  const STATUS_COLORS: Record<string, string> = { Disbursed: '#38a169', Pending: '#d97706', Audited: '#3182ce' };
  return (
    <View style={fundChartStyles.wrap}>
      {data.slice(0, 5).map((item) => {
        const pct = total > 0 ? (item.allocated / total) * 100 : 0;
        return (
          <View key={item.name} style={fundChartStyles.row}>
            <View style={[fundChartStyles.dot, { backgroundColor: STATUS_COLORS[item.status] ?? '#718096' }]} />
            <Text style={fundChartStyles.name} numberOfLines={1}>{item.name}</Text>
            <Text style={fundChartStyles.pct}>{pct.toFixed(0)}%</Text>
          </View>
        );
      })}
    </View>
  );
}

const fundChartStyles = StyleSheet.create({
  wrap: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  name: { flex: 1, fontSize: 12, color: '#4a5568' },
  pct: { fontSize: 12, fontWeight: '700', color: '#1a365d', width: 36, textAlign: 'right' },
});

export default function AdvocacyLabScreen() {
  const navigation = useNavigation<any>();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [brief, setBrief] = useState<string | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);

  useEffect(() => {
    toolsApi.getAnalytics()
      .then(setAnalytics)
      .catch(() => Alert.alert('Error', 'Could not load analytics.'))
      .finally(() => setLoading(false));
  }, []);

  const handleGenerateBrief = async () => {
    setBriefLoading(true);
    try {
      const res = await toolsApi.generateBrief();
      setBrief(res.brief);
    } catch {
      Alert.alert('Error', 'Could not generate brief. Ensure the backend is running.');
    } finally {
      setBriefLoading(false);
    }
  };

  const handleShare = async () => {
    if (!brief) return;
    try {
      await Share.share({
        message: `KIONGOZI POLICY BRIEF\n\n${brief}`,
        title: 'Kiongozi Policy Brief',
      });
    } catch {}
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={22} color="#1a202c" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Advocacy Lab</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading || !analytics ? (
          <ActivityIndicator color="#1a365d" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Stats row */}
            <View style={styles.statsRow}>
              <StatCard label="Youth Inputs" value={String(analytics.total_inputs)} />
              <StatCard label="Funds Tracked" value={String(analytics.total_funds)} />
              <StatCard
                label="Disbursed"
                value={`${analytics.disbursement_rate}%`}
                sub={formatKES(analytics.total_disbursed_kes)}
              />
            </View>

            {/* Sector chart */}
            {analytics.sector_distribution.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Issues by Sector</Text>
                  <Text style={styles.sectionSub}>{analytics.total_inputs} inputs</Text>
                </View>
                <SectorChart data={analytics.sector_distribution} />
              </View>
            )}

            {/* Sentiment */}
            {analytics.sentiment_distribution.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Sentiment Breakdown</Text>
                <View style={styles.sentimentRow}>
                  {analytics.sentiment_distribution.map((s) => (
                    <View key={s.sentiment} style={[styles.sentimentCard, { borderTopColor: SENTIMENT_COLORS[s.sentiment] ?? '#718096' }]}>
                      <Text style={[styles.sentimentValue, { color: SENTIMENT_COLORS[s.sentiment] ?? '#718096' }]}>{s.count}</Text>
                      <Text style={styles.sentimentLabel}>{s.sentiment}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Fund distribution */}
            {analytics.fund_distribution.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Fund Distribution</Text>
                  <Text style={styles.sectionSub}>{formatKES(analytics.total_allocated_kes)} total</Text>
                </View>
                <FundChart data={analytics.fund_distribution} />
              </View>
            )}

            {/* Generate brief */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Policy Brief</Text>
              <Text style={styles.briefSubtitle}>
                Generate an AI policy recommendation memo based on all collected youth inputs and fund data.
              </Text>
              <TouchableOpacity
                style={[styles.generateBtn, briefLoading && styles.generateBtnDisabled]}
                onPress={handleGenerateBrief}
                disabled={briefLoading}
                accessibilityRole="button"
                accessibilityLabel="Generate Policy Brief"
              >
                {briefLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={16} color="#fff" />
                    <Text style={styles.generateBtnText}>Generate Policy Brief</Text>
                  </>
                )}
              </TouchableOpacity>

              {brief && (
                <View style={styles.briefCard}>
                  <View style={styles.briefCardHeader}>
                    <Text style={styles.briefCardTitle}>Policy Recommendation Memo</Text>
                    <TouchableOpacity
                      onPress={handleShare}
                      style={styles.shareBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Share policy brief"
                    >
                      <Ionicons name="share-outline" size={16} color="#2b6cb0" />
                      <Text style={styles.shareText}>Share</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.briefText}>{brief}</Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
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
  scroll: { padding: 16, paddingBottom: 60 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  section: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 14,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a202c', marginBottom: 12 },
  sectionSub: { fontSize: 12, color: '#a0aec0' },
  sentimentRow: { flexDirection: 'row', gap: 10 },
  sentimentCard: {
    flex: 1, alignItems: 'center', padding: 12, backgroundColor: '#f7f9fc',
    borderRadius: 12, borderTopWidth: 3,
  },
  sentimentValue: { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  sentimentLabel: { fontSize: 11, color: '#718096' },
  briefSubtitle: { fontSize: 13, color: '#718096', lineHeight: 19, marginTop: -8, marginBottom: 14 },
  generateBtn: {
    backgroundColor: '#1a365d', borderRadius: 12, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  generateBtnDisabled: { backgroundColor: '#a0aec0' },
  generateBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  briefCard: {
    backgroundColor: '#f7f9fc', borderRadius: 12, padding: 16,
    marginTop: 16, borderWidth: 1, borderColor: '#e2e8f0',
  },
  briefCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  briefCardTitle: { fontSize: 13, fontWeight: '700', color: '#1a202c' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  shareText: { fontSize: 13, color: '#2b6cb0', fontWeight: '600' },
  briefText: { fontSize: 13, color: '#4a5568', lineHeight: 21 },
});
