// Crash reports (Sentry).
// The key (DSN) comes from the server (/health/app-config → sentry_dsn) and is remembered on the
// phone, so reporting can be switched on or off without an app update. Builds made before Sentry
// was added have no native Sentry module: there we report JavaScript errors only, over the network.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, TurboModuleRegistry } from 'react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

const DSN_KEY = 'kchat.sentryDsn';
let Sentry: any = null;
let started = false;

function nativeSentry(): boolean {
  try {
    return !!((TurboModuleRegistry as any)?.get?.('RNSentry') || (NativeModules as any).RNSentry);
  } catch {
    return false;
  }
}

function start(dsn: string | null | undefined) {
  if (started || !dsn || !dsn.startsWith('https://') || __DEV__) return;
  try {
    // Loaded lazily so a problem inside the library can never stop the app from opening
    Sentry = require('@sentry/react-native');
    const native = nativeSentry();
    const updateId = Updates.updateId ?? 'embedded';
    Sentry.init({
      dsn,
      enableNative: native,
      enableNativeCrashHandling: native,
      enableAutoSessionTracking: true,
      tracesSampleRate: 0, // errors only: cheap on data and on the Sentry quota
      sendDefaultPii: false,
      environment: 'production',
      release: `kchat@${Constants.expoConfig?.version ?? '0'}`,
      dist: updateId,
    });
    Sentry.setTag('ota_update', updateId);
    Sentry.setTag('channel', Updates.channel ?? 'none');
    Sentry.setTag('native_sdk', native ? 'yes' : 'no');
    started = true;
  } catch {
    Sentry = null;
  }
}

/** Call once at launch, before the app renders. Uses the key saved from the last launch. */
export async function bootCrashReports() {
  const fromBuild = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (fromBuild) return start(fromBuild);
  try {
    start(await AsyncStorage.getItem(DSN_KEY));
  } catch {}
}

/** Called with the server's config: saves the key for next launch and starts reporting now. */
export function applyCrashConfig(dsn: unknown) {
  if (typeof dsn !== 'string') return;
  if (!dsn) {
    AsyncStorage.removeItem(DSN_KEY).catch(() => {});
    return;
  }
  AsyncStorage.setItem(DSN_KEY, dsn).catch(() => {});
  start(dsn);
}

export function reportError(error: unknown, context?: Record<string, unknown>) {
  if (!started || !Sentry) return;
  try {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  } catch {}
}

export function setCrashUser(id: string | null) {
  if (!started || !Sentry) return;
  try {
    Sentry.setUser(id ? { id } : null);
  } catch {}
}

/** A short trail of what happened before an error (screen opened, action taken) */
export function crumb(message: string, data?: Record<string, unknown>) {
  if (!started || !Sentry) return;
  try {
    Sentry.addBreadcrumb({ message, data, level: 'info' });
  } catch {}
}
