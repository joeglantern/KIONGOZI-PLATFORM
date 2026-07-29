import { useEffect, useState } from 'react';
import { Platform, Linking } from 'react-native';
import apiClient from '../utils/apiClient';

export interface ForceUpdateState {
  required: boolean;
  message: string;
  storeUrl: string;
}

export function useForceUpdate(): ForceUpdateState {
  const [state, setState] = useState<ForceUpdateState>({
    required: false,
    message: '',
    storeUrl: '',
  });

  useEffect(() => {
    const check = async () => {
      try {
        const res = await apiClient.getAppConfig();
        if (!res.success || !res.data) return;

        const { android, ios, force_update_message } = res.data as any;
        const isAndroid = Platform.OS === 'android';
        const platform = isAndroid ? android : ios;

        // Server sets force_update_required: true to block all clients immediately
        // Fallback: compare build numbers if the flag isn't present
        const required = platform?.force_update_required === true;
        const storeUrl = isAndroid ? android?.store_url : ios?.store_url;

        if (required) {
          setState({
            required: true,
            message: force_update_message || 'Please update the app to continue.',
            storeUrl: storeUrl || '',
          });
        }
      } catch {
        // Network error — don't block the user
      }
    };

    check();
  }, []);

  return state;
}

export function openStore(url: string) {
  if (url) Linking.openURL(url);
}
