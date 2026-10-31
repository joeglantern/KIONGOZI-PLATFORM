// Calm motion presets shared across the app. Everything settles without overshoot:
// sheets glide in on a decelerating curve, springs are critically damped and clamped,
// entrances fade with a short rise instead of a scale pop.
import { Easing as REasing, FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Easing as RNEasing } from 'react-native';

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

/** Layout entrances: fade with a small rise, ease-out, no spring */
export const enterFade = (ms = 220) => FadeIn.duration(ms).easing(EASE_OUT);
export const enterUp = (ms = 260) => FadeInDown.duration(ms).easing(EASE_OUT).withInitialValues({ opacity: 0, transform: [{ translateY: 12 }] });
export const enterDown = (ms = 260) => FadeInUp.duration(ms).easing(EASE_OUT).withInitialValues({ opacity: 0, transform: [{ translateY: -12 }] });
