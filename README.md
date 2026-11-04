# Myongji Campus Explorer

An independent student guide to **Myongji University’s Yongin and Seoul campuses**, with interactive reference maps and an offline, source-based campus assistant.

**English · 한국어 · 简体中文**

[Open the web app](https://davidijesus.github.io/myongji-campus-explorer/) · [Release 0.6.5](docs/RELEASE_0.6.5.md) · [Photos and coverage](docs/BUILDING_PHOTOS.md) · [Official menus](docs/AUTOMATIC_MENUS.md) · [MIT license and third-party material](LICENSE)

## Version 0.6.5: building photos, navigation and official menus

This version brings **20 reviewed official photo assets for 15 buildings** into the offline gallery: 11 assets in Yongin and nine in Seoul. Full source compositions and attribution are retained. Coverage is partial; buildings without an approved photograph keep their missing-photo state, and **Y32 remains excluded**. Existing reviewed Seoul path references, building selection and the return from the map to a retained chat answer are included. The gallery does not turn schematic map geometry into a measured reconstruction.

The web app and a newly configured Android build check the official Yongin menu feed when opened or resumed, with a minimum 15-minute interval between automatic attempts and a manual refresh button. Valid cached menus remain available when the network fails. Meal dates and expired-data labels use **Asia/Seoul**, including after offline reopening.

Menus retain the **original Korean text** and official links. Automatic import does not create English/Chinese translations or claim human review. The interface distinguishes these records from the older reviewed summaries. Seoul has an identified official source, but automatic collection in this version covers Yongin only; see the [source and location limitations](docs/AUTOMATIC_MENUS.md#seoul-source-and-limitation).

**Published on 4 November 2026** through the existing branch-based GitHub Pages site. The live version is **0.6.5**, all ten served app/feed files matched the reviewed artifact bytes, and **64 live-site browser checks passed**, including offline reopening in a new process. The source is [de30a64](https://github.com/davidijesus/myongji-campus-explorer/commit/de30a644a32bce5e702dcd930f04a44708b9e18b), the Pages artifact is [ed934c7](https://github.com/davidijesus/myongji-campus-explorer/commit/ed934c72403be77fe0af630c3bb75b0435558061), and the [Pages build](https://api.github.com/repos/davidijesus/myongji-campus-explorer/pages/builds/1340650648) completed successfully at 12:46:57 UTC. **Scheduled collection is not enabled.** Automatic client refresh reads the latest published snapshot; it does not cause the university sources to be recollected. The proposed Actions schedule remains a non-executing template pending workflow-write authorization. See the [release verification record](docs/RELEASE_0.6.5.md) for exact hashes and coverage.

The university's original symbol and wordmark, circular artwork, reference maps and geometry are unchanged. This is an independent student project, not an official university application.

- Explore Yongin and Seoul, search names or building codes, select places and save favorites. Pan, rotate and zoom the 3D map; the software renderer supports browsers without WebGL.
- Ask campus questions locally, follow citations and jump from answers to places. No remote chatbot, account, advertising or analytics is configured.
- Open the reviewed building-photo gallery, read its source and capture-date limitations, and return to the map or retained answer. Missing photographs are not replaced with invented views.
- Switch between English, Korean and Simplified Chinese. Campus, language and favorites persist locally; chat history lasts for the page session.
- Install the web app when your browser supports it. Load it once online and wait for the app’s offline-ready message before relying on offline reopening. External university and map links still need a connection.
- Read original official Yongin menus from the configured feed, with observation/check times and individual meal dates. Older bundled summaries remain dated evidence; expired meals are not presented as today's menu. Instagram posts are not collected automatically, and this feature needs no content server or administrative secret.

Try **Y9228** in Yongin, **S10303** in Seoul, or ask where to buy coffee. Building-code results do not verify a room’s existence, floor, entrance or current class assignment.

The illustrated scenes are not measured reconstructions. Elevations, building appearance and landscaping are schematic; entrances, walking times and step-free access are not verified. The app does not invent live bus arrivals, opening hours or upcoming events to fill gaps.

## Run locally

Requires **Node.js 22.13 or later**.

```sh
git clone https://github.com/davidijesus/myongji-campus-explorer.git
cd myongji-campus-explorer
npm ci
npm run typecheck
npm test
npm run build:pwa
npm run preview:pwa
```

The generated launcher sizes are included. Regenerating them with `node scripts/generate-pwa-icons.cjs` additionally needs Python 3 and Pillow; this resizes the reviewed master without contacting an image service.

Open `http://127.0.0.1:4174`. The generated `pwa/` directory is the complete web distribution. `preview.html` also works as a local browser preview, but opening a file directly does not install a PWA.

The site uses the existing **`gh-pages` branch deployment**. The [pending Pages workflow template](docs/ci/pages-menus.pending.yml) proposes builds on pushes to `main`, manual dispatch and daily at **07:17, 11:17 and 17:17 Asia/Seoul**. Its location under `docs/ci/` means it does not execute. Activation requires a separately authorized workflow publication and Pages configuration change. The template uses GitHub's built-in deployment token with job-scoped permissions; a missing or invalid previous menu feed stops deployment. See [setup, manual refresh, recovery and scheduling limits](docs/AUTOMATIC_MENUS.md).

## Scope and validation

The final combined 0.6.5 TypeScript/PWA build passed **315 Node tests and 1,020 local browser checks**: 33 menu, 800 gallery/path/offline and 187 chat/map/Back checks. Public HTTP verification confirmed the exact bytes of all ten deployed app/feed files. **Another 64 checks passed on the real site**, including the live menu, navigation in both campuses and EN/KO/ZH, photos/credits and fresh-process offline recovery of the shell, menu, favorite, language and campus. See the [release record](docs/RELEASE_0.6.5.md) for details. Earlier Java component validation passed 283 snapshot/interoperability, 164 refresh/cache and 31 native origin/location-policy cases. Scheduled execution remains blocked by workflow-write authorization.

The current Android implementation is the Java/System WebView wrapper in [android-standalone](android-standalone/README.md). Source configuration is **0.6.5/code 20**. This web/source publication does not assert a newly delivered or installed APK with that version. Existing APKs with an empty content endpoint need one initial app update; later published menu snapshots use the feed without rebuilding the app. The historical Expo directory is not this Android build path. Host Java/browser tests do not establish physical Android, emulator, GPS, iPhone/Safari or store readiness. Signing credentials are excluded from source and delivery archives.

## Sources and license

University sources take precedence over conflicting student guidance. Yongin has 50 selectable references; Seoul has eight buildings plus the sports field, gate and gatehouse. English and Chinese names are descriptive translations, with the original Korean names available. Source links are included in the app; reference photographs and videos are not loaded as map textures.

First-party code and original geometric assets use the [MIT License](LICENSE). **Photographs are not covered by that license**: copyright remains with Myongji University or the credited publisher, and public availability does not establish an open redistribution license. University artwork and other third-party material retain their own terms; source links, credits, borders and watermarks are preserved. See [photo provenance and rights](docs/BUILDING_PHOTOS.md#attribution-and-rights). This independent project is not endorsed by Myongji University, Naver, Apple or Google.
