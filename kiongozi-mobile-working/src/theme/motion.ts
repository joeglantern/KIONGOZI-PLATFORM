// Calm motion presets shared across the app. Everything settles without overshoot:
// sheets glide in on a decelerating curve, springs are critically damped and clamped,
// entrances fade with a short rise instead of a scale pop.
import { Easing as REasing, FadeIn, FadeInDown, FadeInUp, ReduceMotion, useReducedMotion } from 'react-native-reanimated';
import { AccessibilityInfo, Easing as RNEasing } from 'react-native';

/** iOS style decelerate: quick start, long soft landing */
export const EASE_OUT = REasing.bezier(0.2, 0.9, 0.3, 1);
/** for things leaving the screen */
export const EASE_IN = REasing.bezier(0.4, 0, 1, 1);

/** Reanimated withTiming configs */
export const SHEET_IN = { duration: 320, easing: EASE_OUT };
export const SHEET_OUT = { duration: 240, easing: EASE_IN };
export const SETTLE = { duration: 240, easing: EASE_OUT };
export const QUICK = { duration: 180, easing: EASE_OUT };

/** Critically damped spring (damping >= 2 * sqrt(stiffness * mass)) with clamping as a guard.
 * Use where a gesture hands over velocity, so it still feels physical but never bounces. */
export const CALM_SPRING = { damping: 32, stiffness: 240, mass: 1, overshootClamping: true };
/** Same idea, a touch slower, for big surfaces (drawers, whole-screen moves) */
export const CALM_SPRING_SOFT = { damping: 30, stiffness: 200, mass: 1, overshootClamping: true };

/** RN Animated equivalents */
export const RN_EASE_OUT = RNEasing.bezier(0.2, 0.9, 0.3, 1);
export const RN_EASE_IN = RNEasing.bezier(0.4, 0, 1, 1);
export const RN_CALM_SPRING = { damping: 32, stiffness: 240, mass: 1, overshootClamping: true };

// ── Reduce Motion (the phone's accessibility setting) ──
// Reanimated already stops its own loops and skips its timings when it's on. What's left is ours:
// entrances become a plain fade (instead of popping in with no transition), sheets fade in place,
// and RN Animated loops (shimmer etc.) stand still. With the setting off nothing changes.
let reduceNow = false;
AccessibilityInfo.isReduceMotionEnabled().then(v => { reduceNow = !!v; }).catch(() => {});
AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v: boolean) => { reduceNow = !!v; });
/** Synchronous read of the Reduce Motion setting (for code outside React) */
export const reduceMotionNow = () => reduceNow;
/** Reduce Motion as a hook (re-renders when the setting changes) */
export const useReduceMotion = (): boolean => useReducedMotion();

/** Layout entrances: fade with a small rise, ease-out, no spring. With Reduce Motion: a plain fade. */
const plainFade = (ms: number) => FadeIn.duration(Math.min(ms, 200)).reduceMotion(ReduceMotion.Never);
export const enterFade = (ms = 220) => (reduceNow ? plainFade(ms) : FadeIn.duration(ms).easing(EASE_OUT));
export const enterUp = (ms = 260) => (reduceNow ? plainFade(ms) : FadeInDown.duration(ms).easing(EASE_OUT).withInitialValues({ opacity: 0, transform: [{ translateY: 12 }] }));
export const enterDown = (ms = 260) => (reduceNow ? plainFade(ms) : FadeInUp.duration(ms).easing(EASE_OUT).withInitialValues({ opacity: 0, transform: [{ translateY: -12 }] }));

/** Distance a sheet travels on entry: the full distance normally, none with Reduce Motion (it fades in place) */
export const sheetTravel = (distance: number) => (reduceNow ? 0 : distance);
