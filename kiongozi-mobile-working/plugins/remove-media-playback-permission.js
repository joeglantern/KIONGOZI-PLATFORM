const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withRemoveMediaPlaybackPermission(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    if (manifest['uses-permission']) {
      manifest['uses-permission'] = manifest['uses-permission'].filter(
        (p) => p.$['android:name'] !== 'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK'
      );
    }
    return config;
  });
};
