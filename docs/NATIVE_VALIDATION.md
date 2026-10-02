# Native validation — version 0.5.0

Revision: 1 October 2026 (Korea).

**Built:** `myongji-campus-explorer-v0.5-android.apk`, 184,867 bytes, minimum Android API 24/target API 36, application ID `dev.student.myongjiexplorer.standalone`, version 0.5.0/code 2. It includes Yongin and Seoul, with English, Korean, and Simplified Chinese.

SHA-256: `433d697358fc1f5fd3598a733e3632a76c88d54c8d36bdc0a466473c8bb7557f`.

Java/Dex compilation, 30 link-policy tests, ZIP alignment, APK v2/v3 signatures, and exact bundled-HTML matching passed. The certificate is the same as v0.4. The private key is excluded from the distributed source. The APK contains no C/C++ libraries and requests no Android permissions. Content runs in System WebView; favorites, campus, and language are stored locally.

The HTML extracted from the APK passed six desktop Chromium checks under the wrapper's origin and CSP. This verifies content and network restrictions in a desktop browser; it does not execute the Android Activity. Installation, updating, startup, keyboard, gestures, screen readers, external links, lifecycle, battery use, and performance were not tested on a physical device or emulator. Actual runtime compatibility on devices with 16 KB memory pages remains untested.

The Expo variant also passed TypeScript checks for the v0.5 source. Its native build was not repeated for this release. The v0.4 record documents Windows Ninja path-limit failures and incompatible RELRO segment alignment in precompiled dependencies for 16 KB pages. See [v0.4 native history](NATIVE_VALIDATION_V04.md). The delivered Java/System WebView variant does not contain those libraries.

**Not produced:** publisher AAB or iOS IPA. No store submission or paid cloud build was performed. Native iPhone distribution requires Apple Developer configuration, signing, and a macOS/Xcode or cloud build. The included PWA can be hosted over HTTPS and added to a home screen; Safari installation still needs testing.

Before a store release, choose permanent publisher identifiers, maintain a production signing key, publish support and privacy pages, test on devices, and follow the [distribution guide](DISTRIBUTION_GUIDE.md). The current APK is a locally signed demonstration.

Evidence: [consolidated results](current-native-results.json), [APK inspection](current-android-standalone-results.json), [release changes](V05_NATIVE_CHANGES.md), and [test report](TEST_REPORT.md).
