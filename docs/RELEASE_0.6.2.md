# Campus Explorer 0.6.2

This release combines the action-spacing correction with the university-branded interface redesign and an updated Java/System WebView Android test build. The artifacts and checks below identify the reviewed local release. Publication status must be confirmed against the actual [GitHub Pages site](https://davidijesus.github.io/myongji-campus-explorer/) and its `version.json`; this source document alone is not a deployment receipt.

## Interface and content

The header preserves Myongji University's authentic symbol and Korean/English wordmark as one proportional image, with Campus Explorer on a separate line. Buttons, dialogs, panels and navigation use a consistent restrained navy-and-white treatment, visible interaction states and wrapping source actions. Related dialog actions retain explicit horizontal and vertical separation and mobile touch targets.

The blue launcher icon is a separate architectural illustration inspired by documented features of Creative Arts Hall (Y2). It was generated from text only; no reference photograph or image was sent to the generation service. It is not an official university emblem or a measured reconstruction. The approved 3D maps, horizontal geometry, reference data and existing features are preserved.

Yongin and Seoul remain available in English, Korean and Simplified Chinese, including search, local source-based answers, map actions, saved places, transport and reviewed food/community information. Menu summaries remain dated **12â€“16 October 2026**. No automatic Instagram collection, remote chatbot, staff editing dashboard or deployed content service is added. Source and Naver links open externally.

This is an independent student project. The artwork does not imply university endorsement. Maps, terrain and building appearances are illustrative; entrances, accessibility, room existence and current operating conditions require verification with the university.

## Reviewed web artifact

| Property | Value |
| --- | --- |
| Version | `0.6.2` |
| App hash | `e3b968f148d7` |
| Offline shell hash | `6a8c803e51ddd37e` |
| Standalone HTML SHA-256 | `e3b968f148d76971dd474b3ba885420e2806cb9f28b28f3c74388858f0981455` |

Run the following from the source root with Node.js 22.13 or later:

```sh
npm ci
npm run typecheck
npm test
npm run build:pwa
npm run preview:pwa
```

The complete static distribution is the nine generated files in `pwa/`: `.nojekyll`, `_headers`, `index.html`, `manifest.webmanifest`, `service-worker.js`, `version.json`, `icon-180.png`, `icon-192.png` and `icon-512.png`. The manifest, registration and cache URLs remain relative to the project subpath. The worker verifies all five cached asset digests before a new offline shell becomes ready. Build timestamps may change when the same source is rebuilt.

The existing hosting method publishes these files at the root of `gh-pages`, with Pages configured as **Deploy from a branch / gh-pages / root**. GitHub manages the deployment; pushing `main` alone does not publish. There is no custom deployment workflow in this method. See [the existing hosting guide](PAGES_0.6.1.md) for its branch and cache behavior. Its earlier release hashes and test totals describe 0.6.1 only.

## Android test distribution

The primary Android implementation is [the Java/System WebView wrapper](../android-standalone/README.md), not the historical Expo variant.

| Property | Value |
| --- | --- |
| APK | `myongji-campus-explorer-v0.6.2-development.apk` |
| Package | `dev.student.myongjiexplorer.standalone` |
| Version name / code | `0.6.2` / `14` |
| Minimum / target API | `24` / `36` |
| File size | `1,135,139` bytes |
| APK SHA-256 | `97c46cb61ea4c7e7d388e6c8aea9c001dea9772d0d0d1f894c6d57c787070297` |
| Development certificate SHA-256 | `dc047d342057bbf022d14f94865f186f7a0dc52872275f5777f59b3d5a3dac32` |

The signing identity and package match the preceding 0.6.1/code13 APK; the version code increases to 14. The embedded HTML matches the reviewed standalone SHA-256 above. This is an installable development build, not a store publisher release. Signing keys are not included in source or delivery archives.

The native wrapper serves the page locally, blocks embedded WebView networking and opens reviewed external links outside the page. Its community endpoint is empty. Permissions are INTERNET and optional foreground COARSE/FINE location only; no background location service is added. APK content updates require a new build and installation. Follow the wrapper README for its exact SDK/JDK, existing-key requirements and pinned HTML build procedure.

## Local validation

The final HTML identified above passed TypeScript/build checks and all **257 Node tests**. Desktop Chromium verification passed:

- **3,304** layout, navigation and action checks across **48 scenarios**, covering both campuses, all three languages, narrow/mobile and desktop layouts and enlarged text.
- **641** identity, contrast and interaction checks.
- **16** PWA checks, including offline content and reopening in a fresh browser process.
- **252** saved-event action checks across **36 scenarios**, using an in-memory fixture that is not part of distributed campus data.
- **698** landscape checks across **12 scenarios** at 844 x 390, including all campus/language combinations and 100%/200% app text settings.

These browser suites reported no uncaught JavaScript errors or unintended embedded external-resource requests. Native validation passed **762 host JVM checks** and **6 desktop local-origin/content-security-policy checks**. Android SDK tools verified package/version/permissions, v2/v3 signatures and ZIP alignment. APK entries passed CRC checks; the embedded HTML and approved launcher pixels were verified. No private key, database or unexpected native library is included in the APK.

There was no emulator execution, physical-device installation or Android update test. Desktop checks do not establish actual Android Back/process behavior, launcher rendering, GPS accuracy, external Naver app launch, iPhone/Safari behavior, sustained mobile performance or accessibility with every assistive technology. Device and campus acceptance testing remains a separate step.

The [earlier spacing report](SPACING_0.6.2.md) records the preliminary spacing-only candidate and its different hashes. Its totals do not substitute for the combined release results above.

## Assets and data handling

The official header image is `web/assets/identity/myongji-signature.png`, SHA-256 `30532194ba6ab9d0d69f7bc4d107c340419a3833bc852b46f2c27774894d76bc`, from [Myongji University's published artwork](https://www.mju.ac.kr/sites/mjukr/images/common/logo.png). It retains university ownership and is outside the project's MIT grant. Preserve its proportions and internal spacing according to the [university signature guidance](https://www.mju.ac.kr/us/3475/subview.do).

The original illustrative icon master and its provenance are recorded in [icon-provenance.json](../web/pwa-assets/icon-provenance.json). Proportional distribution sizes are generated locally by `node scripts/generate-pwa-icons.cjs`, which additionally requires Python 3 and Pillow. The app loads no reference photographs, external font or runtime CDN.

Questions are processed locally. Campus, language and favorites persist in local storage; chat memory belongs to the page session. No account, advertising, analytics or remote chatbot is configured. GitHub Pages and user-selected external sites receive ordinary connection requests under their own policies. Offline website reopening requires completed cache preparation; external sources still need internet. The separate APK and browser installations do not synchronize preferences or saved places.
