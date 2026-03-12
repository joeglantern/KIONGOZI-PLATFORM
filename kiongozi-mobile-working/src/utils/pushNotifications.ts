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
  const subscription = Notifications.addNotificationResponseReceivedListener(
    response => {
      const data = response.notification.request.content.data as any;
      if (!navigation) return;

      if (data?.postId) {
        navigation.navigate('PostDetail', { postId: data.postId });
      } else if (data?.conversationId) {
        navigation.navigate('DMConversation', {
          conversationId: data.conversationId,
          recipientId: data.recipientId,
          recipientName: data.recipientName,
          recipientAvatar: data.recipientAvatar,
        });
      }
    }
  );

  return () => subscription.remove();
}
