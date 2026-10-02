import type { ExpoConfig, ConfigContext } from 'expo/config';

// Development identifiers make no university ownership claim. Set publisher-owned
// identifiers before the first store upload; store identifiers become permanent.
const iosId = process.env.CAMPUS_IOS_BUNDLE_ID || 'dev.student.myongjiexplorer';
const androidId = process.env.CAMPUS_ANDROID_PACKAGE || 'dev.student.myongjiexplorer';
const naverEnabled = process.env.CAMPUS_ENABLE_NAVER === '1';
const naverKey = process.env.EXPO_PUBLIC_NAVER_KEY_ID || '';
const projectId = process.env.EAS_PROJECT_ID;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Myongji Campus Explorer', slug: 'myongji-campus-explorer', version: '0.5.0',
  platforms: ['ios', 'android'],
  icon: './assets/icon.png',
  description: 'An independent student guide to Myongji University’s Yongin and Seoul campuses. Not an official university app.',
  ...(process.env.EXPO_OWNER ? { owner: process.env.EXPO_OWNER } : {}),
  orientation: 'default', scheme: 'myongjiexplorer', userInterfaceStyle: 'light',
  ios: {
    bundleIdentifier: iosId, buildNumber: '2', supportsTablet: false,
    infoPlist: {
      LSApplicationQueriesSchemes: ['nmap'],
      ...(naverEnabled && naverKey ? { NMFNcpKeyId: naverKey } : {}),
      NSLocationWhenInUseUsageDescription: 'Use your location only when you request it to help choose a campus starting point. Your location is not recorded or sent to our server.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: androidId, versionCode: 2, allowBackup: false,
    adaptiveIcon: { foregroundImage: './assets/adaptive-foreground.png', backgroundColor: '#164b42' },
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
    blockedPermissions: ['android.permission.ACCESS_BACKGROUND_LOCATION', 'android.permission.FOREGROUND_SERVICE_LOCATION', 'android.permission.RECORD_AUDIO', 'android.permission.READ_EXTERNAL_STORAGE', 'android.permission.WRITE_EXTERNAL_STORAGE', 'android.permission.SYSTEM_ALERT_WINDOW'],
  },
  plugins: [
    'expo-status-bar',
    ['expo-location', { locationWhenInUsePermission: 'Use your location only when you request it. You can browse without granting permission.', isIosBackgroundLocationEnabled: false, isAndroidBackgroundLocationEnabled: false, isAndroidForegroundServiceEnabled: false }],
    ['./plugins/withNaver.cjs', { keyId: naverEnabled ? naverKey : '', enabled: naverEnabled }],
  ],
  extra: {
    appKind: 'independent-student-guide', naverKeyConfigured: naverEnabled && !!naverKey,
    ...(process.env.EXPO_PUBLIC_CONTENT_URL ? { contentUrl: process.env.EXPO_PUBLIC_CONTENT_URL } : {}),
    ...(process.env.EXPO_PUBLIC_PRIVACY_URL ? { privacyUrl: process.env.EXPO_PUBLIC_PRIVACY_URL } : {}),
    ...(process.env.EXPO_PUBLIC_SUPPORT_URL ? { supportUrl: process.env.EXPO_PUBLIC_SUPPORT_URL } : {}),
    ...(projectId ? { eas: { projectId } } : {}),
  },
});
