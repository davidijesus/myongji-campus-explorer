# Release 0.6.5 — photographs, navigation and official menus

## Seoul landscape and direct campus links — 9 November

Seoul now uses seven source-backed planting groups (17 symbolic trees and 12 shrubs), replacing unsupported generic board-edge rows. Four additional internal paved areas extend the original three traces. A short side-stair detail ends at a raised intermediate landing, separately from the ground apron. [Vegetation evidence](SEOUL_VEGETATION.md) and [path/stair evidence](SEOUL_PATHS.md) record official sources, source-image regions and limits. Positions, dimensions, step counts and planting symbols remain schematic; no surveyed navigation or accessibility is claimed.

[Direct campus links](CAMPUS_LINKS.md) use `?campus=seoul` and `?campus=yongin`. Explicit valid links override a different saved campus. Campus selection updates the current URL without reloading or adding history, preserving other parameters and preferences. Invalid or duplicate values defer to saved preferences.

The final local artifact passed TypeScript/PWA compilation, **328 Node tests** and **1,089 browser checks**: 173 visual/campus checks, 800 gallery/path/offline checks, 104 direct-link checks and 12 source-note/zoom checks. Twelve before/after Yongin map screenshots were byte-identical. Independent geometry hashes preserve Yongin terrain, all 50 Yongin models, all 11 Seoul models, directory anchors and the original three Seoul traces. All 20 approved photo files, Y32 exclusion, menu snapshot and PWA cache strategy are unchanged.

Browser execution used desktop Chrome with isolated storage, desktop/mobile viewports, WebGL, top-down and Canvas fallback. Gallery regression included re-opening the verified shell in a new offline browser process, EN/KO/ZH, favorites, search/chat-map/Back, events and photo error recovery. These are not physical-phone or Android-emulator tests. No new APK is asserted.

Version stays **0.6.5**, with app hash `71248dcd5dd1` and offline shell `1bf128d7399dbfe6`. Preview SHA-256: `71248dcd5dd1dcf3d77b1d966c8ddf28a9938855b79d845e9ec1b9d165c30928`. PWA HTML SHA-256: `7a0666dd99bd29d8b23b50193accc4f9c6c81a0381162960dc3a6262e8cd255a`. Public URL and response verification follows authorized publication; the older release records below are historical. No workflow scope, credential, repository permission or Odoo page is changed by this release.


**Published on 4 November 2026** to the existing [public GitHub Pages site](https://davidijesus.github.io/myongji-campus-explorer/). The successful Pages build completed at **12:46:57 UTC**, public HTTP verification confirmed version **0.6.5** with all ten app/feed files matching the reviewed artifact bytes, and **64 live-site browser checks passed at 12:49:10 UTC**. No production/store Android release is asserted.

## Higher-resolution source photographs - 4 November

Seven previously reduced gallery photographs now use the verified larger original resolutions. Five public copies remove private camera/location metadata without recompression; decoded pixels, JPEG scan data and ICC profiles match the originals. The other thirteen images, all credits/captions/source links, building associations and Y12/Y32 absence remain unchanged. Two AI restoration trials were rejected because they invented unverifiable detail. **No AI restoration was accepted or published.** See [the photo-quality review](PHOTO_QUALITY_2026-11-04.md).

Pre-publication verification passed 1832 gallery/navigation checks and 117 comparison/loading/offline checks, plus eight Node photo/PWA tests. Every one of the 20 photos was compared before/after at 760 CSS pixels/DPR 3. All thirteen unchanged photo assets retained exact source bytes; twelve rendered frames matched exactly and Y14 differed only by one color level in 0.00789% of pixels, within the documented capture-rounding tolerance. The cached larger PWA reopened in a new offline Chrome process with all 20 approved photos and isolated favorite/campus/language state retained. A first parallel test run timed out during navigation; the isolated probe and full sequential matrix passed with the original timeouts. Its exact cause remains undetermined. Browser measurements do not establish physical Android performance.

This build keeps version 0.6.5, shell `2c1a3ca1fa2cd998`, preview SHA-256 `0905948d43ececbe30a9c47f4448a12b1d966e46d7c7f2277f87a9bf4b142b2f` and PWA HTML SHA-256 `b8aeba7dbc44836f26188a5cdb6a0a7687e51d443d1cfeda918c0c56a8da0087`. Images total 20,594,636 bytes; this increases the first download compared with the former 6,977,054-byte image set. The menu snapshot is unchanged. No new APK or store release is claimed. The service worker now constructs the cached response from the verified bytes, fixing Chromium Cache.put failures with the larger HTML while retaining mandatory integrity checks. The sections below record earlier 0.6.5 publications.

## Photo frame adjustment - 4 November

The visible "Official photographs" heading is removed. Photographs now fill the entire frame with a centered proportional crop (`object-fit: cover`), without stretching. The accessible gallery label, image alternatives, captions, credits, source links and carousel remain. Names still precede the photographs and action buttons follow them. Original and bundled image bytes are unchanged, and Y12/Y32 still have no approved image.

Pre-publication verification passed **1771 headless Chrome checks**: all 20 approved assets at 320/390/967/1440px in EN/KO/ZH (240 photo cases), 24 missing-photo cases and navigation/favorite checks. Image dimensions, exact embedded bytes, frame coverage, no horizontal overflow, retained attribution and title/photo/button order were checked. Landscape, narrow, composite and small-source images were reviewed visually. These are desktop-browser tests with mobile viewports, not Android device or emulator tests.

This adjustment keeps version 0.6.5 with shell hash `5e2f0ec6e5fef752`, preview SHA-256 `b2cce56974e34ae3b6f8281eae23730ec55bf8c4d3f999d191d486ff68c6ea0d` and PWA HTML SHA-256 `709fede0809c786907e8b4af19943e6e599ff71aa908d574411d34930e31fafa`. The menu snapshot is unchanged. Earlier deployment hashes and full-composition display behavior below are historical records, superseded by this frame adjustment; no new APK is asserted.

## Earlier photo placement correction - 4 November

The building sheet now uses the same vertical order at every viewport: building title and alternate name, photograph gallery (or the existing missing-photo notice), then action buttons. Desktop CSS previously placed the action buttons beside the titles. The correction preserves the gallery controls, credits, full photo composition, favorites, map/chat navigation and panel scrolling. Y12 and Y32 still have no approved photograph.

That placement correction kept version 0.6.5 and has shell hash `d040f009b7c124ec`. Its preview SHA-256 is `a24106bff48c0ff018de46e5c566daedfef81a8e01fa5252d7d4aed25b80acad`, and PWA HTML SHA-256 is `f3ec20a176382a0538cbe01bea6ac9491ff3ee73fa251ac8764be22a6f3df01d`. The menu snapshot and all photo bytes are unchanged. The deployment records and broader verification below describe the initial 0.6.5 publication.

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
