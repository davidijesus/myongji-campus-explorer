# Validation report — version 0.5.0

Revision: **1 October 2026, Korea time**. Technical logs use the environment's UTC clock. The APK, standalone HTML, and PWA share the same page, SHA-256 `ac300af2c7920983a47809277125d301ae105d4e91d162b34a48b761ec711529`.

| Check | Result |
|---|---|
| Shared TypeScript and HTML/PWA generation | Passed |
| Domain, content, languages, sources, and geometry | **100 tests passed** |
| Browser regressions, WebGL, and fallback | **71 checks passed** |
| Campus switching, languages, and data isolation | **43 checks passed** |
| PWA, offline operation, and browser restart | **16 checks passed** |
| Mobile TypeScript with installed dependencies | Passed |
| Java/Dex compilation and Android APK 0.5.0/code 2 | Passed |
| APK v2/v3 signatures, content hash, and ZIP alignment | Passed |
| Android link policy | **30 cases passed** |
| APK-extracted HTML under the wrapper origin/CSP in desktop Chromium | **6 checks passed** |
| Physical/emulated Android installation, update, and execution | Not performed |
| IPA/TestFlight, iPhone device, and store submissions | Not performed |

## Scope of this revision

The campus selector switches between 50 Yongin references and 11 Seoul references. Language, campus, and favorites survive reload. The assistant isolates conversation history by campus and translates responses when the language changes. Yongin content updates do not replace the Seoul view. Chinese-name searches, map actions, sources, and the transport notice were exercised.

Selectors were checked in English, Korean, and Simplified Chinese at widths of 320, 390, 768, and 1,440 pixels, with text at 100% and 200%. Both scenes were exercised with WebGL and the fallback renderer. No unhandled UI errors occurred. Screenshots: `current-seoul-chinese.png` and `current-seoul-fallback.png`.

The PWA reopened offline after restarting Chromium and retained favorites. Switching to Seoul and Chinese, reloading again, and asking the assistant also worked offline. This does not validate the operating system's installation dialog, Safari, or native iPhone execution.

The APK uses the same signing certificate as v0.4 and increments its version code to 2. This prepares it for an update but does not replace installing it over the earlier version on a device. It requests no Android permissions and contains no `.so` libraries. Its signature is for demonstration, not publisher production signing.

## Content limitations

Seoul preserves the relative positions of the official markers. Outlines, heights, and landscaping are schematic, not a measured survey. No entrances, routes, or walking times were invented. Yongin's Notion content is not applied to Seoul. See [Seoul evidence](SEOUL_EVIDENCE.md).

The official 30 September notice ends the experimental Seoul–Yongin and Sadang–Yongin routes from 1 October. Seoul shows that notice and public-transit guidance without inventing departure tables. Yongin's five regular timetables retain their own source.

Yongin's historical shape and scale are unchanged from v0.4; see the [historical report](TEST_REPORT_V04.md). A complete human review of the Chinese translations by a native speaker has not been performed.

## Evidence and reproduction

Results: `current-domain-tests.txt`, `current-browser-results.json`, `current-campus-browser-results.json`, `current-pwa-results.json`, `current-android-standalone-results.json`, `current-android-standalone-asset-smoke.json`, and `native-v05-typecheck.txt`.

```sh
npm ci
npm run build:pwa
npm test
npm run preview
# In another terminal, with Chromium configured:
npm run test:browser
npm run test:campuses
# Start npm run preview:pwa, then run:
npm run test:pwa
cd mobile
npm ci
npx tsc --noEmit
```

See [distribution instructions](DISTRIBUTION_GUIDE.md) and the remaining [native validation](NATIVE_VALIDATION.md).
