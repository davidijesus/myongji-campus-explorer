# Campus Explorer 0.6.3

This release removes the visible Campus Explorer subtitle from the header and gives the existing blue architectural icon a circular presentation. Myongji University's authentic symbol and Korean/English wordmark remain intact. The map scenes, geometry, reference records and existing features are preserved.

The artifacts and results below identify the reviewed local release. This source document is not a deployment receipt. Confirm publication through the [website](https://davidijesus.github.io/myongji-campus-explorer/) and its `version.json`.

## Interface and icon

The header now contains the university signature without a separate visible Campus Explorer caption. The application name remains in installation and release metadata. The navy-and-white buttons, navigation, dialogs and wrapping source actions introduced in 0.6.2 are retained.

The approved icon export applies a local circular alpha mask to the existing blue architectural illustration. It preserves the original 1254-pixel master, its colors and the campus-inspired motif; it does not create a new building illustration. Web favicon/install icons and legacy Android icon resources have transparent pixels outside the circle. Android also defines `roundIcon` and API 26+ adaptive-icon resources: a safely inset foreground over the pale `#F4F7FB` background. The operating system or launcher controls the adaptive outer mask and may add its own presentation. The adaptive background is intentionally opaque; universal transparency or a circular outer shape on every Android launcher is not promised.

The illustration is distinct from the official university symbol. Its original 0.6.2 master was generated from text only, inspired by documented features of Creative Arts Hall (Y2), without sending a reference image or photograph to the image service. The 0.6.3 circle is a deterministic local derivative. Provenance and export details are recorded in [icon-provenance.json](../web/pwa-assets/icon-provenance.json).

## Content and privacy

Yongin and Seoul remain available in English, Korean and Simplified Chinese, with search, local source-based answers, map actions, saved places, transport and reviewed food/community information. Menu summaries remain dated **12-16 October 2026**. There is no automatic Instagram collection, remote chatbot, staff editing dashboard or deployed content service. Source and Naver links open externally.

This is an independent student project, not an official university application. Artwork does not imply endorsement. The maps, terrain and buildings are schematic; entrances, step-free access, room existence and current operating conditions require verification with the university.

Campus, language and saved places persist locally; chat is held in memory for the page session. No account, analytics or advertising is configured. GitHub Pages and user-selected external sites receive ordinary connection requests under their own policies. Browser and APK installations do not synchronize saved places. Website offline use requires successful cache preparation; external sources still need internet.

## Reviewed web artifact

| Property | Value |
| --- | --- |
| Version | `0.6.3` |
| App hash | `0c17dda6e512` |
| Offline shell hash | `ba002ccb77495ad7` |
| Standalone HTML SHA-256 | `0c17dda6e51204a9ac77a82f1760f8269c7dad50e57fa888bad48d0d8f8ea1cf` |
| PWA index SHA-256 | `37a76202da4d3a0b147b39f5f194ec8f7aebed549dbb4bf67d3c0931a5def530` |
| Reviewed build timestamp | `2026-10-14T03:35:32.644Z` |

Use Node.js 22.13 or later and run from the source root:

```sh
npm ci
npm run typecheck
npm test
npm run build:pwa
npm run preview:pwa
```

The static distribution consists of nine generated files in `pwa/`: `.nojekyll`, `_headers`, `index.html`, `manifest.webmanifest`, `service-worker.js`, `version.json`, `icon-180.png`, `icon-192.png` and `icon-512.png`. Keep the relative URLs and service-worker scope. The worker verifies the five cached asset digests before a new offline shell becomes ready.

Publish these files at the root of the existing `gh-pages` branch, with Pages configured as **Deploy from a branch / gh-pages / root**. GitHub manages this deployment; pushing `main` alone does not publish. See the [hosting guide](PAGES_0.6.1.md) for the method; its earlier hashes and test totals describe 0.6.1 only. Build timestamps can differ on a rebuild of the same source.

## Android test distribution

The primary Android build remains the [Java/System WebView wrapper](../android-standalone/README.md), not the historical Expo variant. Version 0.6.3 uses code **15**, package `dev.student.myongjiexplorer.standalone`, minimum API **24** (Android 7.0) and target API **36**. The existing development signing identity is retained.

| Property | Value |
| --- | --- |
| APK | `myongji-campus-explorer-v0.6.3-development.apk` |
| File size | `1,143,594` bytes |
| APK SHA-256 | `dd589bf70baf3f44a64f52b4c704dd39adf251411a93da1ad2f71cecccd644d6` |

The existing certificate SHA-256 is `dc047d342057bbf022d14f94865f186f7a0dc52872275f5777f59b3d5a3dac32`. Matching package and certificate with a higher code preserves the structural update path from 0.6.2/code14; an actual installed update is not claimed. Signing keys are excluded from source and delivery archives. This is a development-signed test distribution, not an app-store publisher release.

The native wrapper serves its page locally and blocks embedded WebView network loads. Reviewed external links open outside the page. The community endpoint stays empty. Permissions are INTERNET and optional foreground COARSE/FINE location only; no background location service is added. APK content updates require a new build and installation. Follow the native README for the pinned HTML, SDK/JDK and existing-keystore requirements.

## Validation

TypeScript/build checks and all **257 Node tests** passed. Completed desktop Chromium checks total **5,126**:

- **4,186** layout/navigation checks across **60 scenarios**: both campuses, EN/KO/ZH, five viewports and 100%/200% text. Viewports are 320x700, 390x844, 844x390, 1440x1000 and 1914x814.
- **252** event-action fixture checks across **36 scenarios**. The synthetic event fixture is not distributed campus content.
- **672** identity, alpha, contrast and interaction checks, including the removed header caption, preserved university signature, transparent circular exports and favicon readability at small sizes.
- **16** PWA checks, including initial offline preparation, offline content and reopening in a fresh browser process.

The browser suites reported no uncaught JavaScript errors or unintended external-resource requests. Earlier 0.6.2 results are not included in these totals. Local PWA preparation and restart checks do not establish an upgrade of an existing installed public-site profile.

Native validation passed **762 host JVM checks** and **6 desktop local-origin/content-security-policy checks**. Android SDK tools verified the package, version, three permissions, v2/v3 signatures and ZIP alignment. All **11** expected APK entries passed CRC validation. Embedded HTML matches the reviewed standalone SHA-256, and packaged RGBA icon pixels match the approved 1024px source, with transparent corners and an opaque center. DEX bytes match 0.6.2; no signing key, private database or unexpected native library is packaged.

No physical-device installation or emulator execution is claimed. Desktop checks do not establish real Android Back/process behavior, installed updates, launcher rendering, GPS accuracy, external Naver app launch, iPhone/Safari behavior, sustained mobile performance or accessibility with every assistive technology. Device and campus acceptance checks remain necessary.

## Artwork and licensing

The official signature is `web/assets/identity/myongji-signature.png`, SHA-256 `30532194ba6ab9d0d69f7bc4d107c340419a3833bc852b46f2c27774894d76bc`, from [Myongji University's published artwork](https://www.mju.ac.kr/sites/mjukr/images/common/logo.png). Preserve its proportions and internal spacing under the [university signature guidance](https://www.mju.ac.kr/us/3475/subview.do). University artwork retains its owner's rights and is outside the project's MIT grant.

The unchanged original icon master has SHA-256 `466bd3b9d35900ab3b0aff283251b350a82ed1fbf6727b76aaa1d795994821dc`. The local export applies a centered circular alpha mask at 98% diameter, with 4x supersampling and LANCZOS antialiasing, then proportional LANCZOS resizing. Original master bytes and RGB pixels at the mask stage remain unchanged. The approved 1024px RGBA launcher PNG has SHA-256 `c2b31d621ea838993de48d50edc65ed3fbe00c69af78c02787d78cfc343d75a1`; the provenance record lists all four generated sizes and digests.

The app does not load reference photographs, external fonts or a runtime CDN. First-party code and original geometric assets use the included MIT license; third-party content retains its own terms.
