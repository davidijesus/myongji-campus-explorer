# Android Java shell - 0.6.2

This folder contains the Java/System WebView wrapper used by the 0.6.2 development APK, continuing the existing Android package and signing identity.

The 0.6.2 configuration uses application ID `dev.student.myongjiexplorer.standalone`, version code **14**, minimum API 24 and target API 36. The previous signed 0.6.1 APK uses code 13. The existing development certificate must be reused for a compatible update; no signing key is included in the source handover, and the direct build script refuses to generate one.

The signed development APK was built and verified with the reviewed HTML SHA-256 `e3b968f148d76971dd474b3ba885420e2806cb9f28b28f3c74388858f0981455`. Both build scripts pin these exact bytes. The 1024px launcher icon uses the approved blue campus illustration, separate from the official symbol and wordmark embedded in the page.

Artifact: `myongji-campus-explorer-v0.6.2-development.apk`, **1,135,139 bytes**, SHA-256 `97c46cb61ea4c7e7d388e6c8aea9c001dea9772d0d0d1f894c6d57c787070297`. Its development signing certificate SHA-256 is `dc047d342057bbf022d14f94865f186f7a0dc52872275f5777f59b3d5a3dac32`, matching 0.6.1. This is a test installation artifact, not a store publisher release.

## Build inputs

Keep this folder with the final web project source. The direct build requires:

- `preview.html`, reviewed and matching the SHA-256 pins in `build.ps1` and `build.gradle`;
- `mobile/assets/icon.png`, the reviewed illustrative application icon;
- `scripts/naver-fixtures.cjs` and the generated `build/core` modules produced by the web build;
- `docs/v055-validation/community-interop/imported.snapshot.json`, `canonical.snapshot.json` and `expected.json`, the synthetic snapshot interoperability fixtures;
- this folder's manifests, styles, eight production Java classes and native tests.

The fixture generator produces test data from the actual final campus modules. Fixtures are not packaged in the APK. The only packaged web asset is the reviewed HTML; the icon is a native resource. Keys, local configuration files, logs, build intermediates, private data and node_modules are not part of the clean source handover.

## Direct development APK build

Use PowerShell 7, JDK 18, Android SDK platform 36, build-tools 36.0.0 and Node.js. The script does not use Expo, Gradle, Maven downloads or the NDK. In the complete web source checkout, run `npm ci` and `npm run build` before native packaging so `preview.html` and `build/core` exist. Review any changed HTML before updating its pinned hash.

Run from the complete project root, selecting a fresh build directory and an existing authorized keystore outside the distributable source:

```powershell
pwsh -NoProfile -File android-standalone/build.ps1 `
  -Sdk "$env:LOCALAPPDATA\Android\Sdk" `
  -Jdk 'C:\Program Files\Java\jdk-18.0.2.1' `
  -BuildRoot 'C:\Builds\myongji-062-reviewed' `
  -Keystore 'C:\Signing\existing-development.p12' `
  -OutputApk 'C:\Builds\myongji-campus-explorer-v0.6.2-development.apk'
```

The configured signing flow is a development build, not a store publisher release. The direct script uses the existing demonstration alias and credentials from the established build flow; it cannot create or rotate signing material. The private key must be supplied separately by its authorized maintainer.

Omit `-CommunityEndpoint` for the offline release. It stays empty by default and is regenerated for every build. Any future configured endpoint must be a fixed canonical HTTPS URL set at build time; the application UI cannot change it. Configuring a URL does not deploy a backend.

The script runs external-link, Naver-map, foreground-location, snapshot and refresh/cache tests on the host JVM. It then builds DEX, packages and aligns the APK, signs and verifies it, inspects the manifest, checks for unexpected native libraries, and verifies exact packaged HTML bytes. `tests/asset-browser.cjs` is a separate desktop Chromium test of the local asset origin and CSP; it requires the complete project's Playwright dependency and is not an Android runtime test. Run it from the project root with `node android-standalone/tests/asset-browser.cjs` after installing the project's Playwright browser.

Validation for this artifact: **762 host JVM checks** (129 external-link, 243 Naver, 31 location-policy, 232 snapshot and 127 refresh/cache), plus **6 desktop local-origin/CSP checks**, all passed. SDK tools verified version metadata, the three permissions, v2/v3 signatures and 16KB ZIP alignment. Every APK entry passed CRC validation; there are exactly eight expected entries, no native `.so` libraries, private signing material or databases. Packaged HTML matches the pinned file, and packaged icon pixels match the approved 1024px PNG. DEX and resource-table bytes match 0.6.1; package, certificate, local origin, cache and preference code remain unchanged. Update compatibility was checked structurally, not by installing an update.

## Runtime and permissions

The page runs only at `https://appassets.androidplatform.net/assets/index.html`, served locally by the native wrapper. WebView network loads, arbitrary navigation and embedded remote resources remain blocked. Reviewed external sources open outside the WebView. The Naver integration uses the existing validated native/web fallback policy.

The permission set remains INTERNET plus optional foreground COARSE/FINE location. There is no background location service. The community client supports explicit manual refresh, conditional ETag requests and validated private caching, but makes no community request when its build-time endpoint is empty. Existing private cache, local-origin storage and preference identifiers remain unchanged.

The theme already uses navy accent `#002E66` and pale blue startup/system-bar background `#F4F7FB`. There is no separate custom splash image in this Java project. The new illustrative launcher resource is separate from the genuine university symbol and wordmark rendered in the web header. Actual launcher and system-startup rendering require Android execution; none is claimed by the desktop validation.

## Optional publisher path

`build.gradle`, `settings.gradle` and `publisher/AndroidManifest.xml` preserve the separate Gradle publisher path with AGP 8.12.0. It is not the direct development build and has not been executed for this release. A maintainer must supply its own authorized publisher configuration through `MCE_APPLICATION_ID`, `MCE_KEYSTORE`, `MCE_KEY_ALIAS`, `MCE_STORE_PASSWORD` and `MCE_KEY_PASSWORD`; the Gradle release task refuses to run without them. The optional `-PcommunityEndpoint=...` has the same fixed-endpoint policy and defaults to empty.

No store publication, device installation or emulator execution was performed for this release.
