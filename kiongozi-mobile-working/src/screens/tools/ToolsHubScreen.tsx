import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const TOOLS = [
  {
    route: 'YouthVoice',
    icon: 'mic' as const,
    iconBg: '#ebf8ff',
    iconColor: '#2b6cb0',
    label: 'Youth Voice',
    description: 'Submit civic challenges and opinions — our AI categorises and analyses your input.',
    tag: 'AI-Powered',
  },
  {
    route: 'FundTracker',
    icon: 'stats-chart' as const,
    iconBg: '#f0fff4',
    iconColor: '#276749',
    label: 'Fund Tracker',
    description: 'Track welfare fund allocations, disbursements, and accountability scores.',
    tag: 'Transparency',
  },
  {
    route: 'AdvocacyLab',
    icon: 'document-text' as const,
    iconBg: '#fff5f5',
    iconColor: '#c53030',
    label: 'Advocacy Lab',
    description: 'View aggregated insights and generate a policy brief from real youth data.',
    tag: 'Policy',
  },
];

export default function ToolsHubScreen() {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Civic Tools</Text>
          <Text style={styles.subtitle}>
            Powered by AFOSI — for Kenya's next generation of change-makers.
          </Text>
        </View>

        <View style={styles.tools}>
          {TOOLS.map((tool) => (
            <TouchableOpacity
              key={tool.route}
              style={styles.card}
              onPress={() => navigation.navigate(tool.route)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Open ${tool.label}`}
            >
              <View style={styles.cardTop}>
                <View style={[styles.iconWrap, { backgroundColor: tool.iconBg }]}>
                  <Ionicons name={tool.icon} size={22} color={tool.iconColor} />
                </View>
                <View style={[styles.tagBadge, { backgroundColor: tool.iconBg }]}>
                  <Text style={[styles.tagText, { color: tool.iconColor }]}>{tool.tag}</Text>
                </View>
              </View>
              <Text style={styles.cardLabel}>{tool.label}</Text>
              <Text style={styles.cardDesc}>{tool.description}</Text>
              <View style={styles.cardFooter}>
                <Text style={[styles.openText, { color: tool.iconColor }]}>Open</Text>
                <Ionicons name="arrow-forward" size={14} color={tool.iconColor} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.footer}>
          Data collected is used to inform AFOSI policy recommendations and is never sold.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f7f9fc' },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 24 },
  title: { fontSize: 26, fontWeight: '700', color: '#1a202c', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#718096', marginTop: 6, lineHeight: 20 },
  tools: { gap: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  tagBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  tagText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  cardLabel: { fontSize: 17, fontWeight: '700', color: '#1a202c', marginBottom: 6 },
  cardDesc: { fontSize: 13, color: '#718096', lineHeight: 19 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 14 },
  openText: { fontSize: 13, fontWeight: '600' },
  footer: { fontSize: 12, color: '#a0aec0', textAlign: 'center', marginTop: 32, lineHeight: 18 },
});
