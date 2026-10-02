# Standalone Android shell — v0.5.0

This small, independent Java/WebView app packages the exact frozen browser application for direct Android installation. It does not use Expo or bundle C/C++ libraries. Android's installed System WebView supplies the rendering engine.

The delivered APK is **development-signed**, with application ID `dev.student.myongjiexplorer.standalone`, version `0.5.0` / code `1`, minimum API 24 and target API 36. It is not a store-ready publisher release. See [the recorded checks](../docs/current-android-standalone-results.json).

## What was verified

The direct SDK build compiled Java and DEX, passed 30 external-link policy cases, verified the APK v2/v3 signature and ZIP alignment, found **zero bundled `.so` files and zero requested Android permissions**, and compared the packaged HTML byte-for-byte with the frozen source:

`ac300af2c7920983a47809277125d301ae105d4e91d162b34a48b761ec711529`

No emulator or physical device was available. Installation, first launch, WebView behavior, gestures, accessibility, process recovery, external browser handoff, keyboard/insets and sustained performance remain untested on Android. Removing bundled native libraries avoids the other shell's native-library alignment issue; it does not substitute for testing a real 16 KB-page device. A separate desktop Chromium smoke check exercises the new asset-origin/CSP restrictions; it is not an Android WebView test. Reproduce it after root `npm ci` with `node android-standalone/tests/asset-browser.cjs` (Playwright Chromium required).

## Behavior and privacy

- Only the fixed local asset `https://appassets.androidplatform.net/assets/index.html` is served inside the WebView. An interception handler returns the APK asset; it does not fetch that hostname. All other embedded requests are denied. File/content access, mixed content, geolocation, camera/microphone requests and arbitrary intent schemes are disabled.
- JavaScript and DOM storage support the frozen app's browser fallback. Favorites and language use the WebView's local storage. Chat stays in memory for the session. Android backup is disabled; there is no account, telemetry or advertising code.
- Reviewed HTTPS source/map links open in another app through a restrictive allowlist mirroring `mobile/linkPolicy.ts`. Unknown hosts, credentials, nonstandard ports, `javascript:`, `file:`, `content:`, `intent:` and `nmap:` are rejected. The frozen guide uses HTTPS map searches; this shell does not add native Naver navigation.
- There is no React Native bridge, GPS access, remote content refresh or background service. The HTML is not modified. The shell sends lifecycle, reduced-motion and font-scale signals through the existing `MCE.receive` API after loading.
- The source handles system bars/display cutouts/keyboard insets, Android back navigation and a WebView process-crash reload prompt. These paths compiled but require device validation.

Android references: [secure local WebView content](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content), [file-access risks](https://developer.android.com/privacy-and-security/risks/webview-unsafe-file-inclusion), and [edge-to-edge insets](https://developer.android.com/develop/ui/views/layout/edge-to-edge).

## Reproduce the demonstration APK

Requirements: **PowerShell 7**, JDK 18, Android SDK platform 36 and build-tools 36.0.0. No Gradle, Maven dependency download or native NDK is needed for this path.

From the delivered project root:

```powershell
pwsh -File android-standalone/build.ps1 `
  -Sdk "$env:LOCALAPPDATA\Android\Sdk" `
  -Jdk 'C:\Program Files\Java\jdk-18.0.2.1' `
  -BuildRoot 'C:\Builds\mce-demo' `
  -Keystore 'C:\Signing\mce-demo-development.p12' `
  -OutputApk 'C:\Builds\myongji-campus-explorer-v0.5-android.apk'
```

Choose your own paths. The script runs `javac`, `d8`, `aapt2`, `zipalign` and `apksigner`, then verifies the artifact. It copies the original project icon and the frozen `preview.html` into temporary build assets. Generated files and signing keys default outside the delivered source tree. A missing demonstration key is generated with alias `standalone-demo`, known development password `android`, and a certificate explicitly naming an independent student development build. The private key is **not included** in the source package. Keep the same key to update an installed copy; a different key requires uninstalling the old copy, which removes its stored preferences.

The output's bytes/signature can differ on another machine or with another key. Reproducibility here means building the same source and verifying the pinned HTML, manifest and library constraints, not promising a bit-for-bit identical APK.

## Publisher APK / Android App Bundle

**EAS builds the separate Expo project. It does not build this Java-only variant.** The supplemental `build.gradle`, `settings.gradle` and `publisher/AndroidManifest.xml` define a conventional Android application with Android Gradle Plugin 8.12.0. This alternate release path was supplied but **not executed** for this delivery; no publisher AAB has been produced.

Use Gradle compatible with AGP 8.12 (8.13 or later per its release notes), JDK 17 or later and SDK 36. Provide your own application ID and upload key outside this source tree. Set these environment variables in a private shell/CI secret store: `MCE_APPLICATION_ID`, `MCE_KEYSTORE`, `MCE_KEY_ALIAS`, `MCE_STORE_PASSWORD`, `MCE_KEY_PASSWORD`. The Gradle release task refuses to run without them. The current Java package/namespace may remain unchanged when the installed application ID changes.

```powershell
# With publisher variables and ANDROID_HOME/JAVA_HOME configured:
gradle -p android-standalone bundleRelease
# Or build a publisher-signed direct-install APK:
gradle -p android-standalone assembleRelease
```

The AAB appears under `android-standalone/build/outputs/bundle/release/`; the APK under `android-standalone/build/outputs/apk/release/`. Never ship the demonstration identity/key as a publisher release. Increment `versionCode`, review final permissions/privacy/support pages/store assets, configure Play App Signing, and validate the produced APKs on devices before submission. AAB files are publishing inputs, not files users can directly install.

Official instructions: [AGP 8.12 compatibility](https://developer.android.com/build/releases/past-releases/agp-8-12-0-release-notes), [build an app bundle](https://developer.android.com/build/building-cmdline#build_bundle), [sign an app](https://developer.android.com/studio/publish/app-signing).
