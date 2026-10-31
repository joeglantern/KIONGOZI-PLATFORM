const { withAndroidManifest } = require('@expo/config-plugins');

// expo-video declares its playback service as a "mediaPlayback" foreground service (plus the
// permissions) in its own library manifest. We never play in the background and the service
// never calls startForeground, but Play asks for a special declaration when the permission is
// present. Keep the service (every player binds to it) and strip the permissions and the type.
const PERMS = [
  'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
  'android.permission.FOREGROUND_SERVICE',
];
const SERVICE = 'expo.modules.video.playbackService.ExpoVideoPlaybackService';

module.exports = function withRemoveMediaPlaybackPermission(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    manifest.$ = manifest.$ || {};
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    const perms = (manifest['uses-permission'] || []).filter(p => !PERMS.includes(p.$['android:name']));
    for (const name of PERMS) perms.push({ $: { 'android:name': name, 'tools:node': 'remove' } });
    manifest['uses-permission'] = perms;

    const app = manifest.application && manifest.application[0];
    if (app) {
      app.service = (app.service || []).filter(s => s.$['android:name'] !== SERVICE);
      app.service.push({ $: { 'android:name': SERVICE, 'tools:remove': 'android:foregroundServiceType' } });
    }
    return config;
  });
};
