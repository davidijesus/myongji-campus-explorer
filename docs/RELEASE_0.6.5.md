# Release 0.6.5 — photographs, navigation and official menus

Prepared on **4 November 2026** for the existing public GitHub Pages site. This record distinguishes the reviewed implementation from live publication. Final combined-build checks and the deployed commit/version still require confirmation before this record is marked published. No production/store Android release is asserted.

## Included changes

- **20 reviewed official photo assets for 15 buildings:** 11 assets for nine Yongin buildings and nine assets for six Seoul buildings. Complete source compositions, captions, attribution and quality/date limitations remain available. Buildings with no approved photograph keep that state; **Y32 remains excluded**. No missing views were invented or generated.
- Existing reviewed Seoul path references and the map/selection/gallery integration, including returning from a chat answer's map action to the retained answer. These references do not establish measured walking routes, accessibility or live location.
- Original Korean menus from the three official Yongin cafeterias, with exact official links, meal dates, observed/validated timestamps and clear expired-data treatment in Asia/Seoul. Automatic import does not imply reviewed EN/ZH translations or human review.
- Automatic client checks on open/resume, with a minimum 15-minute interval between attempts, manual refresh, bounded validation and last-valid cache retention. Favorites, languages and the offline app shell remain independent of the menu feed.

The main Android source is **0.6.5/code 20**, package `dev.student.myongjiexplorer.standalone`, minSdk 24 and targetSdk 36. It remains the Java/System WebView path. This web/source publication does not claim that a new signed APK with that version was delivered or tested on Android.

## Publication scope

The release uses the existing **`gh-pages` branch-based Pages deployment**. The app shell and a freshly collected, validated `menus/yongin.json` snapshot can be published with existing content access. Public runtime version is checked through `version.json`, the actual served HTML and the feed bytes; a successful source push alone is not sufficient evidence.

**Scheduled university-source collection is not enabled.** The proposed schedule is preserved at [`ci/pages-menus.pending.yml`](ci/pages-menus.pending.yml), outside GitHub's executable workflow directory. The recipe proposes 07:17, 11:17 and 17:17 Asia/Seoul and retains previous valid source records on failure, but requires separate workflow-write authorization and a confirmed Pages workflow deployment before activation. There is no active schedule to claim from this file's presence.

Automatic client checks only read the latest published snapshot. Until scheduling is enabled, source recollection/review/publication is explicit; expired data must remain visibly expired. The app does not create freshness by reopening or downloading an unchanged feed.

## Verification record

The 3 November menu component implementation passed TypeScript, 307 Node tests, 33 browser checks and Java checks for 283 snapshot/interoperability, 164 refresh/cache and 31 origin/location-policy cases. A separate development review of the combined photos/navigation/menu application passed 315 Node tests, 850 host-JVM checks and 1,245 desktop-browser checks, including 50 actual chat-to-map/return interactions. These earlier results provide regression evidence; they are not proof of the final public 0.6.5 artifact.

| Release check | Status in this record |
| --- | --- |
| Final combined source/build and tests | TypeScript/PWA build passed; 315 Node tests and 1,020 browser checks passed on the final artifact |
| Fresh 4 November official snapshot | 25 meals; all three sources validated at 12:40:56 UTC; revision 1793796056121 |
| Source commit on public main | Awaiting confirmed remote commit |
| Pages artifact/deployment | Awaiting confirmed commit and successful deployment |
| Served version/HTML/feed | Awaiting live bytes and browser verification |
| Real scheduled collection | Not enabled; no scheduled execution claimed |
| Android device/emulator execution | Not performed |

Browser tests use desktop Chrome with mobile viewports and isolated test profiles. They do not establish Android WebView lifecycle, physical installation, upgrade retention, GPS, launcher behavior, Safari/iPhone support or store readiness. No live user data is used for backup/restore tests.

The final browser checks comprise 33 menu, 800 gallery/path/offline and 187 chat/map/Back checks. No uncaught JavaScript errors or unexpected requests were reported. Preview SHA-256: `aebb45b1ad2228a1bfa971698a18fdda501fcccffce734f62446123e64869658`; PWA HTML SHA-256: `c136c5baa708a7d52defd1b3ed20688c67926cb021e10f96240bb06bac00fe68`; menu SHA-256: `a75d2142778eaf47fbbf34288f0a5d082828efaafa33f8db21311f23813a583e`.

## Sources, coverage and limits

See [building photographs](BUILDING_PHOTOS.md), [Seoul path evidence](SEOUL_PATHS.md), [official menu contract](AUTOMATIC_MENUS.md) and [license](../LICENSE). Copyright in university photographs remains with Myongji University or the credited publisher. The photos are not covered by the application's MIT code license, and their public availability does not establish an open redistribution license. Source links, credits and watermarks are preserved.

The official Seoul Student Union menu source has been identified, but the current feed covers **Yongin only**. Another portal's MCC label conflicts with the source's Student Union identification; no unverified MCC/S10 association was added. Menu collection does not scrape Instagram, invent hours/events, translate automatically into purported reviewed text or infer closure from an empty official table.
