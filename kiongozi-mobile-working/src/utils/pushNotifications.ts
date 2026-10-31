import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import apiClient from './apiClient';
import { useStoryStore } from '../stores/storyStore';
import { whenNavReady, openInApp } from './links';

export async function registerForPushNotifications(): Promise<string | null> {
  // Remote push notifications were removed from Expo Go on Android in SDK 53.
  // Skip silently in that environment — works normally in development builds and production.
  if (Platform.OS === 'android' && Constants.appOwnership === 'expo') {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.warn('No EAS project ID found — push token may not work in production');
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenData.data;

    await apiClient.registerPushToken(token, Platform.OS);
    return token;
  } catch (err) {
    console.error('Failed to get push token:', err);
    return null;
  }
}

export async function unregisterPushNotifications(token: string): Promise<void> {
  try {
    await apiClient.unregisterPushToken(token);
  } catch (err) {
    console.error('Failed to unregister push token:', err);
  }
}

export function setupNotificationHandlers(): () => void {
  if (Platform.OS === 'android' && Constants.appOwnership === 'expo') {
    return () => {};
  }

  // Foreground banners stay off, as every build so far has shipped (this setup never ran before, so no
  // handler was ever set): Activity and chats update live while the app is open. To turn them on, set
  // Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true,
  // shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true }) }) here.

  // Tap on notification → the screen it is about. The navigator may not exist yet (cold start from the
  // notification, or signed out), so the tap waits for it (utils/links.ts).
  const handled = new Set<string>();
  const onTap = (response: Notifications.NotificationResponse | null) => {
    if (!response) return;
    const key = `${response.notification.request.identifier}:${response.actionIdentifier}`;
    if (handled.has(key)) return;
    handled.add(key);
    const data = response.notification.request.content.data as any;
    whenNavReady(navigation => routeNotification(navigation, data));
  };
  const subscription = Notifications.addNotificationResponseReceivedListener(onTap);
  // The tap that launched the app (the listener above can miss it on a cold start)
  Notifications.getLastNotificationResponseAsync().then(onTap).catch(() => {});

  return () => subscription.remove();
}

function routeNotification(navigation: any, data: any) {
  // Normalise field names (backend sends snake_case)
  const postId         = data?.post_id          ?? data?.postId;
  const conversationId = data?.conversation_id  ?? data?.conversationId;
  const fromUsername   = data?.from_username;
  const fromUserId     = data?.from_user_id;
  const fromAvatar     = data?.from_avatar_url;

  // A push can carry a KChat link (https://api.kiongozi.org/p/<id> etc.): it opens like a shared link
  if (typeof data?.url === 'string' && openInApp(data.url)) return;

  // New sign-in alert: straight to "Where you're logged in"
  if (data?.kind === 'new_login') {
    navigation.navigate('Profile', { screen: 'Devices', initial: false });
    return;
  }

  if (data?.baraza_id) {
    try { require('../stores/barazaStore').useBarazaStore.getState().open(data.baraza_id); } catch {}
  } else if (data?.type === 'recap') {
    navigation.navigate('Profile', { screen: 'ProfileMain', params: { openRecap: Date.now() } });
  } else if (data?.type === 'milestone' && data?.milestone) {
    // "Your post passed 100 likes": open the moment card on Activity
    navigation.navigate('Notifications', {
      screen: 'NotificationsMain',
      params: { milestone: { milestone: data.milestone, value: Number(data.value) || 0, post_id: postId, snippet: data.snippet } },
    });
  } else if (data?.type === 'reengage' && data?.screen === 'home') {
    // "Wanjiru and 3 others you follow posted while you were away": the feed
    navigation.navigate('Feed');
  } else if (conversationId) {
    // The chat screen reads participant*; it used to get recipient* and opened without a name or photo
    navigation.navigate('Notifications', {
      screen: 'DMConversation',
      params: {
        conversationId,
        participantId:       fromUserId,
        participantName:     data?.from_name || fromUsername,
        participantUsername: fromUsername,
        participantAvatar:   fromAvatar,
      },
    });
  } else if (data?.story_id && fromUserId) {
    // Story mention / countdown reminder: open their stories, or their profile once they've expired
    useStoryStore.getState().openUser(fromUserId).then(ok => {
      if (!ok && fromUsername) navigation.navigate('Notifications', { screen: 'PublicProfile', params: { username: fromUsername } });
    }).catch(() => {});
  } else if (postId) {
    navigation.navigate('Notifications', {
      screen: 'PostDetail',
      params: { postId },
    });
  } else if (fromUsername) {
    // follow notification — no postId, navigate to profile
    navigation.navigate('Notifications', {
      screen: 'PublicProfile',
      params: { username: fromUsername },
    });
  } else {
    // fallback — open Notifications tab
    navigation.navigate('Notifications');
  }
}
