# Android Java shell - 0.6.3

This folder contains the Java/System WebView wrapper used by the signed 0.6.3 development APK. Package `dev.student.myongjiexplorer.standalone`, minimum API 24 and target/compile API 36 remain unchanged. Version code 15 follows the delivered 0.6.2/code 14. The eight Java production files are unchanged.

Artifact: `myongji-campus-explorer-v0.6.3-development.apk`, **1,143,594 bytes**, SHA-256 `dd589bf70baf3f44a64f52b4c704dd39adf251411a93da1ad2f71cecccd644d6`. Both build scripts pin HTML SHA-256 `0c17dda6e51204a9ac77a82f1760f8269c7dad50e57fa888bad48d0d8f8ea1cf`. The approved circular launcher PNG SHA-256 is `c2b31d621ea838993de48d50edc65ed3fbe00c69af78c02787d78cfc343d75a1`.

The development signing certificate SHA-256 is `dc047d342057bbf022d14f94865f186f7a0dc52872275f5777f59b3d5a3dac32`, matching the previous APK. The private key is not included. This is a signed test installation artifact, not a store publisher release.

## Build

Use the complete frontend source with PowerShell 7, Node 22, JDK 18, Android SDK platform 36 and build-tools 36.0.0. Run `npm ci` and `npm run build` from the project root to create `preview.html` and `build/core`. Review the resulting HTML and update both build-script SHA-256 pins only after approval.

Required source support files include `scripts/naver-fixtures.cjs`, all three JSON files in `docs/v055-validation/community-interop`, and this Android folder's source/tests/resources. Use an existing authorized development keystore outside the source tree; the script will not create or replace it.

```powershell
pwsh -NoProfile -File android-standalone/build.ps1 `
  -Sdk "$env:LOCALAPPDATA\Android\Sdk" `
  -Jdk 'C:\Program Files\Java\jdk-18.0.2.1' `
  -BuildRoot 'C:\Builds\myongji-063-reviewed' `
  -Keystore 'C:\Signing\existing-development.p12' `
  -OutputApk 'C:\Builds\myongji-campus-explorer-v0.6.3-development.apk'
```

Choose a fresh build directory. Omit CommunityEndpoint for the offline release: it defaults to empty. The optional Gradle publisher path uses the same resource graph and HTML pin but is not the delivered development build; it requires the maintainer's explicit publisher identity and signing environment. It has not been executed for this release.

## Circular icon resource contract

`mobile/assets/icon.png` is the approved 1024x1024 RGBA circle with transparent pixels outside its blue artwork. Packaging copies its bytes unchanged to `drawable-nodpi/ic_launcher_art.png` before SDK resource processing.

Default `mipmap/ic_launcher` and `mipmap/ic_launcher_round` aliases point to that artwork. API 24/25 and round-icon consumers receive the transparent legacy PNG. Only normal `ic_launcher` has a `mipmap-anydpi-v26` adaptive override. An explicit non-adaptive API 26 bitmap resource keeps `roundIcon` on the transparent PNG; otherwise AAPT2 can automatically generate a round alias to the adaptive icon. The adaptive foreground uses proportional 21/108 insets on each side, leaving the artwork within the central 66/108 safe circle, over an opaque pale `#F4F7FB` background. The PNG is not painted onto a new blue square.

The adaptive background is intentionally opaque: Android's AdaptiveIconDrawable initializes its internal bitmap with black, so a transparent background can reveal black inside the mask. Its outer silhouette and launcher normalization remain system-controlled. We do not promise a circular outer contour or transparent adaptive corners on every device; supported round-icon consumers use the separate circular legacy resource.

References: [Android adaptive-icon guidance](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive), [Android 16 AdaptiveIconDrawable source](https://raw.githubusercontent.com/aosp-mirror/platform_frameworks_base/android-16.0.0_r1/graphics/java/android/graphics/drawable/AdaptiveIconDrawable.java), and [Android 8 implementation](https://raw.githubusercontent.com/aosp-mirror/platform_frameworks_base/android-8.0.0_r1/graphics/java/android/graphics/drawable/AdaptiveIconDrawable.java).

## Runtime and verification limits

The native wrapper still serves the reviewed local HTML at `https://appassets.androidplatform.net/assets/index.html`. WebView networking and arbitrary embedded remote resources remain blocked. The permission set remains INTERNET plus optional foreground COARSE/FINE location; no background permission or service is added. Native community refresh is explicit and disabled by an empty build-time endpoint. Cache/preferences, Naver navigation, lifecycle and back behavior remain unchanged.

The direct builder executes native JVM policies, signs with the existing development identity, verifies SDK metadata/signature/alignment and exact HTML, and rejects unexpected `.so` libraries. Desktop CSP smoke tests are separate from Android runtime tests. New resource compile/link probes are not installed applications and do not demonstrate launcher appearance. No device installation, emulator test, store publication or new signing key was performed for this release.


## Verification of this artifact

All **762 host JVM checks** passed: 129 external-link, 243 Naver destination/link, 31 native location-policy, 232 snapshot/interoperability and 127 refresh/cache checks. The final HTML passed **6 desktop native-origin/CSP checks**, including map startup, local assistant and favorite persistence after reload, without unexpected network requests or script errors. These checks do not run Android WebView or GPS.

SDK tools verified version 15/0.6.3, API 24/36, the three unchanged permissions, v2/v3 signatures and ZIP alignment. All 11 expected entries passed CRC; no native `.so` library, private key or database is packaged. Embedded HTML exactly matches the pinned input. Packaged icon RGBA pixels exactly match the approved 1024px image: all four corner alpha values are 0 and the center is 255. DEX and all eight Java production files match 0.6.2. Previous 0.6.2 APK bytes were preserved.

The compiled resource graph preserves the pale opaque adaptive background, proportional foreground insets and separate non-adaptive round bitmap. Actual installed update compatibility, launcher rendering and Android runtime behavior still require device or emulator execution; none is claimed here.
