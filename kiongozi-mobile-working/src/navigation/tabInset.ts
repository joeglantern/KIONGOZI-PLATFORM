// iPhone uses the native Liquid Glass tab bar, which floats over the screen. Main lists get this
// much room at the bottom so the last row can scroll clear of the glass. Android keeps its own bar.
import { Platform } from 'react-native';
import { initialWindowMetrics } from 'react-native-safe-area-context';

export const NATIVE_TABS = Platform.OS === 'ios';
const bottom = initialWindowMetrics?.insets.bottom ?? 34;
export const TAB_INSET = NATIVE_TABS ? bottom + 58 : 0;
export const TAB_LIST_INSET = NATIVE_TABS
  ? { contentInset: { bottom: TAB_INSET }, scrollIndicatorInsets: { bottom: TAB_INSET } }
  : {};
