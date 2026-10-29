// When one screen breaks, only that screen shows a calm card; the rest of the app keeps working.
// The error is sent to crash reports with the screen's name.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/useTheme';
import { reportError } from '../utils/crash';

type Props = { name?: string; onBack?: () => void; children: React.ReactNode; fullScreen?: boolean };
type State = { error: Error | null; tries: number };

export class ScreenErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, tries: 0 };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    reportError(error, { screen: this.props.name ?? 'unknown', componentStack: info.componentStack?.slice(0, 2000) });
  }

  retry = () => {
    Haptics.selectionAsync().catch(() => {});
    this.setState(s => ({ error: null, tries: s.tries + 1 }));
  };

  render() {
    if (!this.state.error) {
      // A new key after "Try again" rebuilds the screen from scratch
      return <React.Fragment key={this.state.tries}>{this.props.children}</React.Fragment>;
    }
    return <ErrorCard onRetry={this.retry} onBack={this.props.onBack} retried={this.state.tries > 0} />;
  }
}

function ErrorCard({ onRetry, onBack, retried }: { onRetry: () => void; onBack?: () => void; retried: boolean }) {
  const T = useTheme();
  const bg = T.bg, text = T.text, sub = T.textSub, surface = T.surface;
  return (
    <View style={[styles.wrap, { backgroundColor: bg }]}>
      <View style={[styles.icon, { backgroundColor: surface }]}>
        <Ionicons name="bandage-outline" size={26} color={text} />
      </View>
      <Text style={[styles.title, { color: text }]}>This screen hit a snag</Text>
      <Text style={[styles.body, { color: sub }]}>
        {retried
          ? 'Still not working. We’ve been sent the details and we’re on it. Go back and try again in a bit.'
          : 'We’ve been sent the details. Try again, or go back. Everything else still works.'}
      </Text>
      <Pressable onPress={onRetry} style={({ pressed }) => [styles.primary, { backgroundColor: text, opacity: pressed ? 0.85 : 1 }]}>
        <Text style={[styles.primaryText, { color: bg }]}>Try again</Text>
      </Pressable>
      {onBack ? (
        <Pressable onPress={onBack} style={({ pressed }) => [styles.secondary, { borderColor: surface, opacity: pressed ? 0.7 : 1 }]}>
          <Text style={[styles.secondaryText, { color: text }]}>Go back</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  icon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  title: { fontSize: 19, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  body: { fontSize: 14.5, lineHeight: 21, textAlign: 'center', marginBottom: 26, maxWidth: 320 },
  primary: { alignSelf: 'stretch', height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', maxWidth: 340, width: '100%' },
  primaryText: { fontSize: 15.5, fontWeight: '600' },
  secondary: { alignSelf: 'stretch', height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 10, borderWidth: 1.5, maxWidth: 340, width: '100%' },
  secondaryText: { fontSize: 15.5, fontWeight: '600' },
});
