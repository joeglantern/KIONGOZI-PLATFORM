// iPhone uses the native Liquid Glass tab bar, which floats over the screen. Main lists get this
// much room at the bottom so the last row can scroll clear of the glass. Android keeps its own bar.
import { Platform } from 'react-native';
import { initialWindowMetrics } from 'react-native-safe-area-context';
import * as Updates from 'expo-updates';

// Only builds 2.1.0+ have the native tab bar inside them; older installs keep the JS bar
const rt = (Updates.runtimeVersion || '0').split('.').map(n => parseInt(n, 10) || 0);
const hasNativeTabs = rt[0] > 2 || (rt[0] === 2 && rt[1] >= 1);
export const NATIVE_TABS = Platform.OS === 'ios' && hasNativeTabs;
const bottom = initialWindowMetrics?.insets.bottom ?? 34;
export const TAB_INSET = NATIVE_TABS ? bottom + 58 : 0;
export const TAB_LIST_INSET = NATIVE_TABS
  ? { contentInset: { bottom: TAB_INSET }, scrollIndicatorInsets: { bottom: TAB_INSET } }
  : {};
