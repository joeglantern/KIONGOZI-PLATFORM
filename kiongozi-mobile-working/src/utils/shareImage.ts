// Share a remote photo as a real image file (WhatsApp, Instagram etc. get the picture, not a link).
// Uses Expo's built-in file-system module straight from native, so it works in this build without a
// new package; if it's ever missing, falls back to sharing the link.
import { Share } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { toast } from './alert';

const FS: any = requireOptionalNativeModule('ExponentFileSystem');

export async function shareImageFile(url: string, fallbackMessage?: string) {
  try {
    if (FS?.downloadAsync && FS.cacheDirectory && (await Sharing.isAvailableAsync())) {
      const dir = String(FS.cacheDirectory).replace(/\/?$/, '/');
      const ext = /\.png(\?|$)/i.test(url) ? 'png' : 'jpg';
      const res = await FS.downloadAsync(url, `${dir}kchat_${Date.now()}.${ext}`, { sessionType: 0 });
      if (res?.uri && (!res.status || res.status < 400)) {
        // A photo share can't carry text, so the KChat link in the message used to vanish.
        // Put it on the clipboard so it can be pasted next to the photo (Instagram does the same).
        const link = fallbackMessage?.match(/https:\/\/(?:api\.)?kiongozi\.org\/\S+/)?.[0];
        if (link) {
          await Clipboard.setStringAsync(link).catch(() => {});
          toast('Link copied', { message: 'Paste it with the photo', icon: 'link' });
        }
        await Sharing.shareAsync(res.uri, {
          mimeType: ext === 'png' ? 'image/png' : 'image/jpeg',
          UTI: ext === 'png' ? 'public.png' : 'public.jpeg',
          dialogTitle: 'Share photo',
        });
        return;
      }
    }
  } catch { /* fall through to link share */ }
  await Share.share({ url, message: fallbackMessage ?? url }).catch(() => {});
}
