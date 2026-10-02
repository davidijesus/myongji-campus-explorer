const fs = require('node:fs');
const path = require('node:path');
const localEnv = path.join(__dirname, '..', '.env');
if (fs.existsSync(localEnv)) process.loadEnvFile(localEnv);
if (process.argv.includes('--eas-hook') && process.env.EAS_BUILD_PROFILE !== 'production') process.exit(0);
const errors = [];
for (const name of ['CAMPUS_IOS_BUNDLE_ID', 'CAMPUS_ANDROID_PACKAGE']) {
  const value = process.env[name] || '';
  if (!/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*){2,}$/.test(value) || value === 'dev.student.myongjiexplorer') errors.push(`${name}: set a publisher-owned identifier.`);
}
if (!process.env.EXPO_OWNER) errors.push('EXPO_OWNER: set your Expo account or organization.');
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(process.env.EAS_PROJECT_ID || '')) errors.push('EAS_PROJECT_ID: link the app to your Expo project.');
for (const name of ['EXPO_PUBLIC_PRIVACY_URL', 'EXPO_PUBLIC_SUPPORT_URL']) {
  try {
    const url = new URL(process.env[name] || '');
    if (url.protocol !== 'https:' || url.username || url.password || /(^|\.)example\.(com|org|net)$/.test(url.hostname) || url.hostname === 'localhost') throw new Error();
  } catch { errors.push(`${name}: provide your public HTTPS page.`); }
}
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const excluded = pkg.expo.autolinking.exclude.includes('campus-naver');
if (process.env.CAMPUS_ENABLE_NAVER === '1' && (excluded || !process.env.EXPO_PUBLIC_NAVER_KEY_ID)) errors.push('Naver enabled: run npm run naver:enable and configure a restricted key.');
if (process.env.CAMPUS_ENABLE_NAVER !== '1' && !excluded) errors.push('Naver SDK linked while disabled: run npm run naver:disable.');
if (!fs.existsSync(path.join(__dirname, '..', 'assets', 'icon.png'))) errors.push('The configured icon at mobile/assets/icon.png is missing.');
if (errors.length) { console.error('Release configuration is incomplete:\n' + errors.map(e => `- ${e}`).join('\n')); process.exit(1); }
console.log('Publisher configuration present. This does not certify native tests, store policy compliance, content rights, or store approval.');
