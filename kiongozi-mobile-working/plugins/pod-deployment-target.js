// Newer Xcode refuses pods that still say they support iOS 11-13. Raise every pod to the app's
// own minimum (15.1) after `pod install`. It goes at the end of post_install, after
// react_native_post_install, so nothing that runs there can set a lower target again.
const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('@expo/config-plugins');

const MARK = '# kz: pod deployment target';
const snippet = indent => [
  `${indent}${MARK}`,
  `${indent}installer.pods_project.targets.each do |t|`,
  `${indent}  t.build_configurations.each do |c|`,
  `${indent}    if c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < 15.1`,
  `${indent}      c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'`,
  `${indent}    end`,
  `${indent}  end`,
  `${indent}end`,
];

/** Podfile text with the snippet just before the `end` closing post_install (same indent). */
function addSnippet(src) {
  if (src.includes(MARK)) return src;
  const nl = src.includes('\r\n') ? '\r\n' : '\n';
  const lines = src.split(/\r?\n/);
  const start = lines.findIndex(l => /^\s*post_install do \|installer\|\s*$/.test(l));
  if (start < 0) throw new Error('Podfile has no post_install block');
  const indent = lines[start].match(/^\s*/)[0];
  const close = lines.findIndex((l, i) => i > start && l === `${indent}end`);
  if (close < 0) throw new Error('Could not find the end of the post_install block');
  lines.splice(close, 0, '', ...snippet(`${indent}  `));
  return lines.join(nl);
}

module.exports = function withPodDeploymentTarget(config) {
  return withDangerousMod(config, ['ios', async cfg => {
    const file = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
    const src = fs.readFileSync(file, 'utf8');
    const out = addSnippet(src);
    if (out !== src) fs.writeFileSync(file, out);
    return cfg;
  }]);
};
module.exports.addSnippet = addSnippet;
