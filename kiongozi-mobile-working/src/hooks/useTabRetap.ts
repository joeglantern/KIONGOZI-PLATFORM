// Tap the tab you're already on (Instagram / X): the first tap glides the list to the top, a tap while
// already at the top refreshes. Only the first screen of a tab's stack listens; deeper screens (a chat,
// a post) keep the usual behaviour of popping back to that list.
import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

function scrollListToTop(list: any) {
  if (!list) return;
  if (typeof list.scrollToOffset === 'function') { list.scrollToOffset({ offset: 0, animated: true }); return; }
  const responder = typeof list.getScrollResponder === 'function' ? list.getScrollResponder() : null;
  if (responder && typeof responder.scrollTo === 'function') { responder.scrollTo({ y: 0, animated: true }); return; }
  if (typeof list.scrollTo === 'function') list.scrollTo({ y: 0, animated: true });
}

/**
 * Give the returned ref to the screen's main list. `scrollY` is the list's scroll offset (an Animated.Value
 * fed by its onScroll), `refresh` runs when the tab is tapped while the list is already at the top.
 */
export function useTabRetap(scrollY: Animated.Value, refresh: () => unknown) {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const listRef = useRef<any>(null);
  const y = useRef(0);
  const run = useRef(refresh);
  run.current = refresh;

  useEffect(() => {
    const id = scrollY.addListener(({ value }) => { y.current = value; });
    return () => scrollY.removeListener(id);
  }, [scrollY]);

  useEffect(() => {
    const tabs = navigation.getParent?.();
    if (!tabs) return;
    return tabs.addListener('tabPress', () => {
      if (!navigation.isFocused()) return;
      const st = navigation.getState?.();
      if (st?.routes?.[0]?.key && st.routes[0].key !== route.key) return;
      if (y.current > 4) scrollListToTop(listRef.current);
      else run.current();
    });
  }, [navigation, route.key]);

  return listRef;
}
