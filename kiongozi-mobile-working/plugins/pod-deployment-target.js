// Newer Xcode refuses pods that still say they support iOS 11-13. Raise every pod to the app's
// own minimum (15.1) after `pod install`.
const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('@expo/config-plugins');

const MARK = '# kz: pod deployment target';
const SNIPPET = `
    ${MARK}
    installer.pods_project.targets.each do |t|
      t.build_configurations.each do |c|
        if c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < 15.1
          c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
        end
      end
    end`;

module.exports = function withPodDeploymentTarget(config) {
  return withDangerousMod(config, ['ios', async cfg => {
    const file = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
    let src = fs.readFileSync(file, 'utf8');
    if (!src.includes(MARK)) {
      if (!src.includes('post_install do |installer|')) throw new Error('Podfile has no post_install block');
      src = src.replace('post_install do |installer|', `post_install do |installer|${SNIPPET}`);
      fs.writeFileSync(file, src);
    }
    return cfg;
  }]);
};
