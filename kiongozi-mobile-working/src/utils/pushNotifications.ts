import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import apiClient from './apiClient';

export async function registerForPushNotifications(): Promise<string | null> {
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

export function setupNotificationHandlers(navigation: any): () => void {
  // Foreground: show banner
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  // Tap on notification → navigate to relevant screen
  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data as any;
    if (!navigation) return;

    // Normalise field names (backend sends snake_case)
    const postId         = data?.post_id          ?? data?.postId;
    const conversationId = data?.conversation_id  ?? data?.conversationId;
    const fromUsername   = data?.from_username;
    const fromUserId     = data?.from_user_id;
    const fromAvatar     = data?.from_avatar_url;

    if (conversationId) {
      navigation.navigate('Notifications', {
        screen: 'DMConversation',
        params: {
          conversationId,
          recipientId:     fromUserId,
          recipientName:   fromUsername,
          recipientAvatar: fromAvatar,
        },
      });
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
  });

  return () => subscription.remove();
}
