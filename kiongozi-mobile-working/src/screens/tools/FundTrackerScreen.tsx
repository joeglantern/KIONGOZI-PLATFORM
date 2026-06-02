import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, TextInput,
  StyleSheet, ActivityIndicator, Modal, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { toolsApi, WelfareFund } from '../../utils/toolsApiClient';

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  Disbursed: { bg: '#f0fff4', text: '#276749', label: 'Disbursed' },
  Pending:   { bg: '#fffbeb', text: '#92400e', label: 'Pending' },
  Audited:   { bg: '#ebf8ff', text: '#1e4e8c', label: 'Audited' },
};

function formatKES(n: number) {
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `KES ${(n / 1_000).toFixed(0)}K`;
  return `KES ${n}`;
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? '#38a169' : score >= 50 ? '#d97706' : '#e53e3e';
  return (
    <View style={scoreStyles.wrap}>
      <View style={scoreStyles.track}>
        <View style={[scoreStyles.fill, { width: `${score}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[scoreStyles.label, { color }]}>{score}</Text>
    </View>
  );
}

const scoreStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  track: { flex: 1, height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  label: { fontSize: 12, fontWeight: '700', minWidth: 22, textAlign: 'right' },
});

interface FlagModalProps {
  fund: WelfareFund | null;
  onClose: () => void;
}

function FlagModal({ fund, onClose }: FlagModalProps) {
  const [desc, setDesc] = useState('');
  const [severity, setSeverity] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!fund || desc.trim().length < 10) {
      Alert.alert('Too short', 'Please describe the issue in at least 10 characters.');
      return;
    }
    setLoading(true);
    try {
      await toolsApi.reportFund({ fund_id: fund.id, reporter_name: name || undefined, description: desc, severity });
      Alert.alert('Submitted', 'Your report has been submitted. Thank you for keeping funds accountable.');
      onClose();
    } catch {
      Alert.alert('Error', 'Could not submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={!!fund} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={flagStyles.safe} edges={['top']}>
        <View style={flagStyles.header}>
          <Text style={flagStyles.title}>Flag an Issue</Text>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close">
            <Ionicons name="close" size={22} color="#1a202c" />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={flagStyles.body} keyboardShouldPersistTaps="handled">
          <View style={flagStyles.fundRef}>
            <Ionicons name="warning-outline" size={14} color="#d97706" />
            <Text style={flagStyles.fundRefText} numberOfLines={1}>{fund?.fund_name}</Text>
          </View>

          <Text style={flagStyles.label}>Your name (optional)</Text>
          <TextInput
            style={flagStyles.input}
            placeholder="Anonymous"
            placeholderTextColor="#a0aec0"
            value={name}
            onChangeText={setName}
          />

          <Text style={flagStyles.label}>Severity</Text>
          <View style={flagStyles.severityRow}>
            {(['Low', 'Medium', 'High'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[flagStyles.sevChip, severity === s && flagStyles.sevChipActive]}
                onPress={() => setSeverity(s)}
                accessibilityRole="radio"
                accessibilityState={{ selected: severity === s }}
              >
                <Text style={[flagStyles.sevText, severity === s && flagStyles.sevTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={flagStyles.label}>Describe the issue *</Text>
          <TextInput
            style={[flagStyles.input, flagStyles.textArea]}
            multiline
            numberOfLines={4}
            placeholder="Describe what seems anomalous about this fund..."
            placeholderTextColor="#a0aec0"
            value={desc}
            onChangeText={setDesc}
            maxLength={1000}
            textAlignVertical="top"
          />
          <Text style={flagStyles.charCount}>{desc.length} / 1000</Text>

          <TouchableOpacity
            style={[flagStyles.submitBtn, (loading || desc.trim().length < 10) && flagStyles.submitDisabled]}
            onPress={submit}
            disabled={loading || desc.trim().length < 10}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={flagStyles.submitText}>Submit Report</Text>}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const flagStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  title: { fontSize: 17, fontWeight: '700', color: '#1a202c' },
  body: { padding: 20, paddingBottom: 60 },
  fundRef: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fffbeb', padding: 10, borderRadius: 10, marginBottom: 20,
    borderWidth: 1, borderColor: '#fcd34d',
  },
  fundRefText: { fontSize: 13, color: '#92400e', flex: 1 },
  label: { fontSize: 12, fontWeight: '600', color: '#718096', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 },
  input: {
    backgroundColor: '#f7f9fc', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#1a202c', marginBottom: 16,
  },
  textArea: { minHeight: 100, paddingTop: 12 },
  charCount: { fontSize: 11, color: '#a0aec0', textAlign: 'right', marginTop: -12, marginBottom: 16 },
  severityRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  sevChip: {
    flex: 1, paddingVertical: 9, borderRadius: 10,
    backgroundColor: '#f7f9fc', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center',
  },
  sevChipActive: { backgroundColor: '#1a365d', borderColor: '#1a365d' },
  sevText: { fontSize: 13, fontWeight: '600', color: '#4a5568' },
  sevTextActive: { color: '#fff' },
  submitBtn: { backgroundColor: '#e53e3e', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  submitDisabled: { backgroundColor: '#a0aec0' },
  submitText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

export default function FundTrackerScreen() {
  const navigation = useNavigation<any>();
  const [funds, setFunds] = useState<WelfareFund[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [flagTarget, setFlagTarget] = useState<WelfareFund | null>(null);

  useEffect(() => {
    toolsApi.getFunds()
      .then(setFunds)
      .catch(() => Alert.alert('Error', 'Could not load fund data.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return funds;
    const q = search.toLowerCase();
    return funds.filter(
      (f) =>
        f.fund_name.toLowerCase().includes(q) ||
        (f.beneficiary_ylo || '').toLowerCase().includes(q) ||
        f.status.toLowerCase().includes(q)
    );
  }, [funds, search]);

  const renderItem = ({ item }: { item: WelfareFund }) => {
    const st = STATUS_STYLES[item.status] ?? STATUS_STYLES.Pending;
    const pct = item.total_allocated > 0 ? (item.disbursed_amount / item.total_allocated) * 100 : 0;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.fundName} numberOfLines={2}>{item.fund_name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
            <Text style={[styles.statusText, { color: st.text }]}>{st.label}</Text>
          </View>
        </View>

        {item.beneficiary_ylo && (
          <View style={styles.yloRow}>
            <Ionicons name="people-outline" size={12} color="#a0aec0" />
            <Text style={styles.yloText}>{item.beneficiary_ylo}</Text>
          </View>
        )}

        <View style={styles.amountsRow}>
          <View style={styles.amountCol}>
            <Text style={styles.amountLabel}>Allocated</Text>
            <Text style={styles.amountValue}>{formatKES(item.total_allocated)}</Text>
          </View>
          <View style={styles.amountDivider} />
          <View style={styles.amountCol}>
            <Text style={styles.amountLabel}>Disbursed</Text>
            <Text style={[styles.amountValue, { color: '#276749' }]}>{formatKES(item.disbursed_amount)}</Text>
          </View>
          <View style={styles.amountDivider} />
          <View style={styles.amountCol}>
            <Text style={styles.amountLabel}>Rate</Text>
            <Text style={styles.amountValue}>{pct.toFixed(0)}%</Text>
          </View>
        </View>

        <View style={styles.scoreRow}>
          <Text style={styles.scoreLabel}>Accountability</Text>
          <ScoreBar score={item.accountability_score} />
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.disbursementTrack}>
            <View style={[styles.disbursementFill, { width: `${Math.min(pct, 100)}%` as any }]} />
          </View>
          <TouchableOpacity
            style={styles.flagBtn}
            onPress={() => setFlagTarget(item)}
            accessibilityRole="button"
            accessibilityLabel={`Flag issue for ${item.fund_name}`}
          >
            <Ionicons name="flag-outline" size={13} color="#e53e3e" />
            <Text style={styles.flagText}>Flag</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={22} color="#1a202c" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fund Tracker</Text>
        <View style={{ width: 30 }} />
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color="#a0aec0" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search funds, YLOs, or status..."
          placeholderTextColor="#a0aec0"
          value={search}
          onChangeText={setSearch}
          accessibilityLabel="Search funds"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={16} color="#a0aec0" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color="#1a365d" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {search ? 'No funds match your search.' : 'No fund data available.'}
            </Text>
          }
          ListFooterComponent={
            <Text style={styles.footer}>{filtered.length} fund{filtered.length !== 1 ? 's' : ''} shown</Text>
          }
        />
      )}

      <FlagModal fund={flagTarget} onClose={() => setFlagTarget(null)} />
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
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    marginHorizontal: 16, marginTop: 12, marginBottom: 4, borderRadius: 12,
    borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12, paddingVertical: 10,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#1a202c' },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 10 },
  fundName: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1a202c', lineHeight: 21 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  yloRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  yloText: { fontSize: 12, color: '#a0aec0' },
  amountsRow: {
    flexDirection: 'row', backgroundColor: '#f7f9fc', borderRadius: 10,
    padding: 12, marginBottom: 12,
  },
  amountCol: { flex: 1, alignItems: 'center' },
  amountDivider: { width: 1, backgroundColor: '#e2e8f0' },
  amountLabel: { fontSize: 11, color: '#a0aec0', marginBottom: 4 },
  amountValue: { fontSize: 13, fontWeight: '700', color: '#1a202c' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  scoreLabel: { fontSize: 12, color: '#718096', width: 90 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  disbursementTrack: {
    flex: 1, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, overflow: 'hidden',
  },
  disbursementFill: { height: 4, backgroundColor: '#1a365d', borderRadius: 2 },
  flagBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    backgroundColor: '#fff5f5', borderWidth: 1, borderColor: '#fed7d7',
  },
  flagText: { fontSize: 12, color: '#e53e3e', fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#a0aec0', fontSize: 14, paddingTop: 40 },
  footer: { textAlign: 'center', color: '#a0aec0', fontSize: 12, marginTop: 8 },
});
