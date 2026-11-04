# Release 0.6.5 — photographs, navigation and official menus

**Published on 4 November 2026** to the existing [public GitHub Pages site](https://davidijesus.github.io/myongji-campus-explorer/). The successful Pages build completed at **12:46:57 UTC**, public HTTP verification confirmed version **0.6.5** with all ten app/feed files matching the reviewed artifact bytes, and **64 live-site browser checks passed at 12:49:10 UTC**. No production/store Android release is asserted.

## Photo placement correction — 4 November

The building sheet now uses the same vertical order at every viewport: building title and alternate name, photograph gallery (or the existing missing-photo notice), then action buttons. Desktop CSS previously placed the action buttons beside the titles. The correction preserves the gallery controls, credits, full photo composition, favorites, map/chat navigation and panel scrolling. Y12 and Y32 still have no approved photograph.

The corrected web build keeps version 0.6.5 and has shell hash `d040f009b7c124ec`. Its preview SHA-256 is `a24106bff48c0ff018de46e5c566daedfef81a8e01fa5252d7d4aed25b80acad`, and PWA HTML SHA-256 is `f3ec20a176382a0538cbe01bea6ac9491ff3ee73fa251ac8764be22a6f3df01d`. The menu snapshot and all photo bytes are unchanged. The deployment records and broader verification below describe the initial 0.6.5 publication.

Focused browser verification passed 404 checks across Y31/S10 with photos and Y12/Y32 without approved photos, at 320/390/967/1440px in EN/KO/ZH. It checks measured visual order, accessible action buttons, gallery controls, information, favorites and chat/map return, without photo cropping or unexpected requests.

## Included changes

- **20 reviewed official photo assets for 15 buildings:** 11 assets for nine Yongin buildings and nine assets for six Seoul buildings. Complete source compositions, captions, attribution and quality/date limitations remain available. Buildings with no approved photograph keep that state; **Y32 remains excluded**. No missing views were invented or generated.
- Existing reviewed Seoul path references and the map/selection/gallery integration, including returning from a chat answer's map action to the retained answer. These references do not establish measured walking routes, accessibility or live location.
- Original Korean menus from the three official Yongin cafeterias, with exact official links, meal dates, observed/validated timestamps and clear expired-data treatment in Asia/Seoul. Automatic import does not imply reviewed EN/ZH translations or human review.
- Automatic client checks on open/resume, with a minimum 15-minute interval between attempts, manual refresh, bounded validation and last-valid cache retention. Favorites, languages and the offline app shell remain independent of the menu feed.

The main Android source is **0.6.5/code 20**, package `dev.student.myongjiexplorer.standalone`, minSdk 24 and targetSdk 36. It remains the Java/System WebView path. This web/source publication does not claim that a new signed APK with that version was delivered or tested on Android.

## Publication scope

The release uses the existing **`gh-pages` branch-based Pages deployment**. The app shell and a freshly collected, validated `menus/yongin.json` snapshot were published with existing content access. Public runtime version was verified through `version.json`, the actual served HTML and the feed bytes. Credential scopes, repository permissions and the Pages publishing configuration were not changed.

- Source commit on `main`: [`de30a644a32bce5e702dcd930f04a44708b9e18b`](https://github.com/davidijesus/myongji-campus-explorer/commit/de30a644a32bce5e702dcd930f04a44708b9e18b).
- Pages artifact commit: [`ed934c72403be77fe0af630c3bb75b0435558061`](https://github.com/davidijesus/myongji-campus-explorer/commit/ed934c72403be77fe0af630c3bb75b0435558061).
- [Pages build `1340650648`](https://api.github.com/repos/davidijesus/myongji-campus-explorer/pages/builds/1340650648): `built`, without an error, completed `2026-11-04T12:46:57Z`.
- [Published runtime version](https://davidijesus.github.io/myongji-campus-explorer/version.json): `0.6.5`; shell hash `a21fb5ce339a4a6b`.
- [Published menu snapshot](https://davidijesus.github.io/myongji-campus-explorer/menus/yongin.json): 25 meals, `updatedAt: 2026-11-04T12:40:56.121Z`, revision `1793796056121`.

**Scheduled university-source collection is not enabled.** The proposed schedule is preserved at [`ci/pages-menus.pending.yml`](ci/pages-menus.pending.yml), outside GitHub's executable workflow directory. The recipe proposes 07:17, 11:17 and 17:17 Asia/Seoul and retains previous valid source records on failure, but requires separate workflow-write authorization and a confirmed Pages workflow deployment before activation. There is no active schedule to claim from this file's presence.

Automatic client checks only read the latest published snapshot. Until scheduling is enabled, source recollection/review/publication is explicit; expired data must remain visibly expired. The app does not create freshness by reopening or downloading an unchanged feed.

## Initial release verification record

The 3 November menu component implementation passed TypeScript, 307 Node tests, 33 browser checks and Java checks for 283 snapshot/interoperability, 164 refresh/cache and 31 origin/location-policy cases. A separate development review of the combined photos/navigation/menu application passed 315 Node tests, 850 host-JVM checks and 1,245 desktop-browser checks, including 50 actual chat-to-map/return interactions. These earlier results provide regression evidence; they are not proof of the final public 0.6.5 artifact.

| Release check | Status in this record |
| --- | --- |
| Final combined source/build and tests | TypeScript/PWA build passed; 315 Node tests and 1,020 browser checks passed on the final artifact |
| Fresh 4 November official snapshot | 25 meals; all three sources validated at 12:40:56 UTC; revision 1793796056121 |
| Source commit on public main | Confirmed `de30a644a32bce5e702dcd930f04a44708b9e18b` |
| Pages artifact/deployment | Confirmed `ed934c72403be77fe0af630c3bb75b0435558061`; build `1340650648` succeeded |
| Served version/HTML/feed | HTTP verification passed: all 10 files exactly matched the reviewed bytes; version 0.6.5 and shell hash `a21fb5ce339a4a6b` |
| Live-browser smoke checks | 64/64 passed on the real public site at `2026-11-04T12:49:10Z` |
| Real scheduled collection | Not enabled; no scheduled execution claimed |
| Android device/emulator execution | Not performed |

Browser tests use desktop Chrome with mobile viewports and isolated test profiles. They do not establish Android WebView lifecycle, physical installation, upgrade retention, GPS, launcher behavior, Safari/iPhone support or store readiness. No live user data is used for backup/restore tests.

The final browser checks comprise 33 menu, 800 gallery/path/offline and 187 chat/map/Back checks. No uncaught JavaScript errors or unexpected requests were reported. Preview SHA-256: `aebb45b1ad2228a1bfa971698a18fdda501fcccffce734f62446123e64869658`; PWA HTML SHA-256: `c136c5baa708a7d52defd1b3ed20688c67926cb021e10f96240bb06bac00fe68`; menu SHA-256: `a75d2142778eaf47fbbf34288f0a5d082828efaafa33f8db21311f23813a583e`.

The additional **64 live-site browser checks** confirmed the actual served version/HTML, acceptance and caching of the real 25-meal feed revision `1793796056121`, Y31/S10 photographs and credits in EN/KO/ZH, and chat-to-map/Back in both campuses. A new browser process opened offline recovered the exact published HTML through the service worker and retained the menu, favorite, language and campus. The live run reported no JavaScript errors, warnings or unexpected requests. These checks ran against the public site in desktop Chrome; they do not substitute for Android device/emulator execution.

## Sources, coverage and limits

See [building photographs](BUILDING_PHOTOS.md), [Seoul path evidence](SEOUL_PATHS.md), [official menu contract](AUTOMATIC_MENUS.md) and [license](../LICENSE). Copyright in university photographs remains with Myongji University or the credited publisher. The photos are not covered by the application's MIT code license, and their public availability does not establish an open redistribution license. Source links, credits and watermarks are preserved.

The official Seoul Student Union menu source has been identified, but the current feed covers **Yongin only**. Another portal's MCC label conflicts with the source's Student Union identification; no unverified MCC/S10 association was added. Menu collection does not scrape Instagram, invent hours/events, translate automatically into purported reviewed text or infer closure from an empty official table.
