# Historical validation report — version 0.4.0

Executed on Windows on **30 September 2026, Korea time**. JSON logs use UTC. The final page had SHA-256 prefix `702a95fb103f`; the PWA and mobile project included that revision. This is a historical record; see [TEST_REPORT.md](TEST_REPORT.md) for v0.5. Files named `current-*` now describe the latest revision unless explicitly versioned.

| Check | Observed v0.4 result |
|---|---|
| Shared TypeScript and HTML/mobile/PWA generation | Passed |
| Domain, content, assistant, sources, links, and geometry | **87 tests passed** |
| Browser interactions | **71 checks passed**, with no unhandled errors |
| Chromium PWA installability and offline restart | **13 checks passed** |
| WebGL scene | **165,447 vertices**, two draw calls, 50 selectable references |
| Non-WebGL fallback | Passed with the same geometry |
| Mobile TypeScript with installed dependencies | Passed for v0.4 |
| Expo Doctor | **21/21 checks passed** |
| Main Java/System WebView Android APK | **Built**; APK v2/v3 signing, ZIP alignment, and exact final bundled-HTML hash passed |
| Java APK external-link policy | **30 cases passed** |
| Page under APK origin/security policy in desktop Chromium | **6 checks passed**; not Android execution |
| Expo/React Native compilation | No APK; Windows Ninja path limit. See [v0.4 native validation](NATIVE_VALIDATION_V04.md). |
| Compiled/signed native IPA | Not produced; no configured Apple Developer/Expo account or macOS compiler in that environment |
| Physical Android/iPhone installation, sustained FPS, and battery | Not tested |
| HTTPS deployment, upload, or store submission during this validation | Not performed |

## Position and scale

Eleven spatial tests supplemented 76 existing tests. They checked preservation of the 48 original reference markers, their 1,128 pairwise distances in the metric projection, the 300 m scale bar, 46 plan-based placements and their 1,035 pairwise distances, model coverage, and absence of unintended building-area overlaps. Connected blocks may share edges; the model does not insert gaps where the plan shows a connection.

The 46 placements comprise 32 vector envelopes, six parts of connected complexes, and eight outdoor facility outlines: **45 identified associations and one provisional guardhouse association**. Four references retain directory anchors with the limitation disclosed. Six complex polygons preserve concavities and courtyard voids; internal divisions between named buildings within a complex are approximate.

The scale is 300 m / 145.6800537109375 PDF points on both axes and 0.46 scene units per meter. The official plan has 2021 metadata; this does not establish a survey date or present-day conditions. Testing verifies mathematical reproduction of the historical source, **not current field measurements, GPS navigation, or walking routes**. Heights, vegetation, and facade details remain illustrative. See [SPATIAL_REVIEW.md](SPATIAL_REVIEW.md) and [POSITION_EVIDENCE.md](POSITION_EVIDENCE.md).

## Browser interface

Chromium checks covered English/Korean search, building selection, retained selection between 2D/3D, zoom, rotation, favorites, food filters, bus date/direction rules, citations, room codes, unknown answers, offline questions, safe text rendering, and empty event states.

They also covered controls at least 44 px, mobile search access, hidden labels while retaining selection, labels avoiding controls, details below the map, calculated contrast, and 40 visual-reference records. The new check confirmed that the interface identifies the official plan, its historical date, and its 300 m scale bar.

All five tabs were checked at 320, 390, 768, and 1,440 CSS pixels. Non-WebGL checks used projected 3D rendering in Canvas 2D and included 200% text sizing. Standalone HTML was opened directly from disk. This was not a complete accessibility audit or phone performance test.

The original evidence filenames were `current-browser-results.json`, `current-browser-test-output.txt`, `current-domain-tests.txt`, and `current-*.png`; see the version note above and [OVERLAY_CONTRAST.md](OVERLAY_CONTRAST.md).

## Installable web app and offline behavior

The PWA included a relative-scope manifest, standalone display, real 192/512 px icons, an Apple icon, and a service worker caching local content. Chromium reported no manifest or installability errors. A separate profile verified service-worker control, offline reload with 50 references, persistent favorites, local room answers, and no unhandled errors. Navigation to `version.json` was tested to prevent metadata from replacing cached HTML. After Chromium was terminated and reopened with the same profile, a new page loaded all 50 references and favorites without network access. The system installation dialog was not exercised.

The first access must be online and complete caching. External sources still need internet, and the browser/system can remove cached data. Public hosting must use HTTPS; opening HTML via `file://` cannot install the PWA. Chromium results do not validate Safari installation or the React Native iPhone application.

Original evidence filenames: `current-pwa-results.json`, `current-pwa-test-output.txt`, and `current-pwa-offline.png`. The generated `pwa/` folder can be hosted directly. See [INSTALL.md](INSTALL.md) and [DISTRIBUTION_GUIDE.md](DISTRIBUTION_GUIDE.md).

## Source coverage and content limits

The visual register contains 40 structures: ten supported by external photographs, ten by reviewed video frames, 12 only by overview imagery, and eight explicit gaps. All 53 official directory detail pages were consulted. Historical geometry does not certify current appearance, entrances, or rooms. No fictional entries were added to the dataset. See [VISUAL_REFERENCE_AUDIT.md](VISUAL_REFERENCE_AUDIT.md).

Bus data followed the official 2026-2 notice, valid 1 September–14 December, with weekday rules and Korea time. Specific holidays and actual operation remained unknown; the ambiguous final Giheung row was excluded. Tests covered date boundaries, departed services, and absence of confirmed service. See [BUS_TIMETABLE_UPDATE.md](BUS_TIMETABLE_UPDATE.md).

The assistant answers locally from included sources. It cannot access enrollment records, personal timetables, current classes, or a remote AI model. It states limitations when evidence is insufficient.

## Remaining native validation

The v0.4 main installer was `myongji-campus-explorer-v0.4-android.apk`: ID `dev.student.myongjiexplorer.standalone`, version 0.4.0/code 1, minimum API 24, target API 36. It requested no Android permissions, included no `.so` libraries, and needed neither Expo Go nor Metro. Its signature was for demonstration, not publisher production signing. Excluding C/C++ libraries avoided the specific Expo dependency issue but did not replace real 4 KB/16 KB device testing. See the preserved [v0.4 native results](native-v04-results.json) and [Android build instructions](../android-standalone/README.md).

Six desktop Chromium checks applied the wrapper's local HTTPS origin and security headers: 50 references, final geometry, persistent favorites, local room answers, no resource requests, and no errors. They verified page compatibility under those restrictions, not the Android Activity, asset interception, keyboard, or external-link handoff. The original evidence was `current-android-standalone-asset-smoke.json`.

Preliminary inspection of Expo's Android dependencies found precompiled RELRO segment ends without 16 KB alignment. Compatible dependencies or recompilation and fresh verification are required before claiming support. The Java APK uses System WebView and excludes those libraries. See [Android memory-page guidance](https://developer.android.com/guide/practices/page-sizes) and [v0.4 native history](NATIVE_VALIDATION_V04.md).

TypeScript, project generation, and Hermes export do not replace a completed binary or device test. Startup/process recovery, keyboard, gestures, rendering, actual location permissions, external links, screen readers, storage, 16 KB pages, and battery use still need device validation. No paid cloud build or store submission was started.

## Reproduction commands

These commands describe the test workflow. Running them on the current checkout tests its current version; reproducing v0.4 requires the matching historical source.

```sh
npm ci
npm run build:pwa
npm test
npm run preview
# In another terminal, with Chromium available:
npm run test:browser
# Start npm run preview:pwa, then run:
npm run test:pwa
cd mobile
npm ci
npm run typecheck
```

Set `CHROMIUM_EXECUTABLE` to a local Chromium installation when needed. Native installation/release commands are in the [distribution guide](DISTRIBUTION_GUIDE.md).
