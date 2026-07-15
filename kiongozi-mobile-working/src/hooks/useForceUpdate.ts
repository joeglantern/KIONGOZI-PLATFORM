import { useEffect, useState } from 'react';
import { Platform, Linking } from 'react-native';
import Constants from 'expo-constants';
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
        const currentBuild = parseInt(Constants.expoConfig?.android?.versionCode?.toString()
          ?? Constants.expoConfig?.ios?.buildNumber?.toString()
          ?? '0', 10);

        const isAndroid = Platform.OS === 'android';
        const minBuild = isAndroid ? android?.min_version_code : ios?.min_build_number;
        const storeUrl = isAndroid ? android?.store_url : ios?.store_url;

        if (minBuild && currentBuild < minBuild) {
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
