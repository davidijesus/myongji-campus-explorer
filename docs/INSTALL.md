# Install on Android and iPhone

**Myongji Campus Explorer 0.5.0 is an independent student project.** The Android installer and the web app added to a home screen are separate options. No signed native iOS IPA was produced: this build environment had no configured Apple Developer/Expo account or macOS compiler. The immediate iPhone option is the web app served over HTTPS.

| Artifact | Purpose and status |
|---|---|
| `myongji-campus-explorer-v0.5-android.apk` | Main Android APK, **184,867 bytes**. Built with Java and System WebView, with the guide included. Development signature and package structure verified; physical-device installation remains untested. See [native validation](NATIVE_VALIDATION.md). |
| Expo project in `mobile/` | Source for future cross-platform work. **No Expo APK was produced.** The Windows build hit Ninja path limits, and precompiled dependencies have a known 16 KB compatibility limitation. |
| `myongji-campus-explorer-web-installable-v0.5.zip` | Extract and publish the contents on HTTPS hosting. The source repository also includes the ready-to-host `pwa/` folder. This is not a native iOS installer. |
| Source code | Editable build inputs. Opening the source ZIP does not install the app. |

The final web content has SHA-256 prefix `ac300af2c792`. See [TEST_REPORT.md](TEST_REPORT.md) for browser/PWA checks. Installation and use on physical phones remain unverified; Chromium testing does not validate Safari on iPhone.

## Install the Android APK

1. Download or copy `myongji-campus-explorer-v0.5-android.apk` to the phone, then open **Files → Downloads** and tap it.
2. If prompted, open **Settings → Install unknown apps** and allow installation for the browser or file manager being used. Menu names vary by manufacturer.
3. Return to the installer, tap **Install**, then **Open**.
4. Open the map, search for `Y9`, select a building, save a favorite, and ask `Where is classroom Y9228?`. Close the app, enable airplane mode, and reopen it to check the bundled guide and saved preference.

The `android-standalone/` project uses minimum API 24 (Android 7), target API 36, and application ID `dev.student.myongjiexplorer.standalone`. It uses System WebView and contains no React Native C++ libraries. This avoids the particular bundled-library issue found in the Expo variant, but real-device testing, including a 16 KB device, is still required. An APK cannot be installed on iPhone.

The APK has a **development signature**, not the publisher's production identity. APK v2/v3 signatures, ZIP alignment, absence of permissions and `.so` libraries, and the exact bundled HTML were checked. All 30 link-policy cases passed. These checks do not replace launching the APK on a device. The guide is bundled and requires neither Expo Go nor a development server.

SHA-256: `433d697358fc1f5fd3598a733e3632a76c88d54c8d36bdc0a466473c8bb7557f`.

Check a downloaded copy in PowerShell:

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath .\myongji-campus-explorer-v0.5-android.apk
```

See [android-standalone/README.md](../android-standalone/README.md) to reproduce the build and prepare publisher signing. This demonstration APK is not a production AAB for Google Play.

The Expo project in `mobile/` uses a different identifier, `dev.student.myongjiexplorer`; future installations of that variant will have separate storage. Its known 16 KB limitation must be fixed and validated before production. See [Android's 16 KB guidance](https://developer.android.com/guide/practices/page-sizes).

If installation fails, record the exact message, phone model, Android version, and APK filename. An older app with the same identifier but a different signature can prevent an update. Uninstalling it permits a clean installation but removes local favorites. File-based updates require compatible identity and signing. See [alternative distribution](https://developer.android.com/distribute/marketing-tools/alternative-distribution) and [app signing](https://developer.android.com/studio/publish/app-signing).

## Publish the installable web app

1. Extract `myongji-campus-explorer-web-installable-v0.5.zip`, or use the supplied `myongji-campus-explorer-pwa` folder. From source, `npm run build:pwa` generates `pwa/`.
2. Check that the folder contains `index.html`, `manifest.webmanifest`, `service-worker.js`, `version.json`, PNG icons, and `_headers`.
3. Publish **the contents of that folder at the site root**, preserving names. Do not upload the source ZIP or only the standalone HTML. The home page must open over HTTPS.
4. One manual option is [Netlify Drop](https://app.netlify.com/drop): sign in to your account and drag in the folder containing `index.html`. Save the resulting HTTPS URL. See [Netlify deployment instructions](https://docs.netlify.com/deploy/create-deploys/).
5. Open that URL online and let the initial load and cache complete before installation. A local `file://` page cannot install this PWA.

A ready-to-host ZIP does not mean the site has already been deployed. Use a supplied site URL only when its publication has been confirmed.

## Add the web app to an iPhone home screen

1. Open the published HTTPS URL in **Safari**.
2. Open the page menu or **Share** menu.
3. Choose **Add to Home Screen**. If missing, check **Edit Actions**.
4. Enable **Open as Web App**, when offered, and tap **Add**.
5. Open the new icon. After the initial online load and completed cache, close it, enable airplane mode, and reopen it to test the map and local assistant.

See [Apple's web-app instructions](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios). This remains a web app; it is not an App Store release, compiled IPA, or validation of the native iPhone project.

## Add the web app to an Android home screen

Open the HTTPS URL in **Chrome → ⋮ → Install and create shortcut → Install**, then follow the dialog. Some versions label the option **Add to Home screen**. Open the new icon and repeat the offline check. See [Chrome's instructions](https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid&hl=en).

Installing both the APK and PWA is optional. Their favorites are stored separately.

## Update and identify the web version

Publish the new complete folder **at the same address**, including the service worker. Open online, close all site tabs and web-app windows, then reopen. There is no explicit update-complete button or notice; the browser controls activation. Repeat the offline test. See [service-worker updates](https://web.dev/learn/pwa/service-workers).

Open `version.json` next to the app URL (for example, `/version.json` for a site published at the root) and compare it with the package. This revision has `version: 0.5.0`, `appHash: ac300af2c792`, and `native: false`. These values identify the version **served by the site**, not necessarily the code running in an old open window.

Offline availability depends on the browser retaining its cache. External sources, videos, and Naver search need a network connection. Clearing site data may erase favorites. Bus information is a published timetable, not live arrival tracking; the historical map is not validated GPS navigation.

See [DISTRIBUTION_GUIDE.md](DISTRIBUTION_GUIDE.md) for developer accounts, production keys, AAB, TestFlight, and store release preparation.
