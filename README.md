# Myongji Campus Explorer

An independent student guide to **Myongji University’s Yongin and Seoul campuses**, with interactive reference maps and an offline, source-based campus assistant.

**English · 한국어 · 简体中文**

[Open the web app](https://davidijesus.github.io/myongji-campus-explorer/) · [Web release 0.6.1](docs/PAGES_0.6.1.md) · [MIT license and third-party material](LICENSE)

## Web release 0.6.1

The web app includes Myongji navy/blue visual identity, mobile layout and dialog improvements, and illustrative Yongin terrain with raised residential ground and roads that follow the terrain. Building selection agrees with the visible ground in both renderers. All 61 campus reference features retain their horizontal geometry; Seoul’s scene is unchanged by the terrain revision. The university signature is shown with an independent-project disclosure.

- Explore Yongin and Seoul, search names or building codes, select places and save favorites. Pan, rotate and zoom the 3D map; the software renderer supports browsers without WebGL.
- Ask campus questions locally, follow citations and jump from answers to places. No remote chatbot, account, advertising or analytics is configured.
- Switch between English, Korean and Simplified Chinese. Campus, language and favorites persist locally; chat history lasts for the page session.
- Install the web app when your browser supports it. Load it once online and wait for the app’s offline-ready message before relying on offline reopening. External university and map links still need a connection.
- Read 25 dated official menu summaries for October 12–16, 2026. Later menus and Instagram posts are not collected automatically. No content server is deployed.

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

Open `http://127.0.0.1:4174`. The generated `pwa/` directory is the complete web distribution. `preview.html` also works as a local browser preview, but opening a file directly does not install a PWA.

The public site is served from the root of the dedicated `gh-pages` branch, which contains only the nine generated PWA files. TypeScript checks, the full 257-test Node suite, a fresh PWA build and an artifact-boundary check run locally before publication. A push to `gh-pages` triggers the GitHub-managed Pages deployment; a push to `main` alone does not publish the site. See [release and hosting details](docs/PAGES_0.6.1.md).

## Scope and validation

Local validation of the 0.6.1 application covered 257 Node tests, 2,655 functional browser checks and 138 scene comparisons. Browser checks included both campuses and all three languages, mobile layouts, chat-to-map actions, favorites, offline reopening and both renderers. These totals describe the reviewed local build; deployed-site checks are separate.

This publication updates the **web app**. The native Android and Expo directories and older release reports remain historical material and are not the source of a newly published Android release. The separately delivered development-signed Android 0.6.1 APK is not included in the Pages distribution. No physical Android device, iPhone or Safari validation, app-store submission or production publisher signing is claimed.

## Sources and license

University sources take precedence over conflicting student guidance. Yongin has 50 selectable references; Seoul has eight buildings plus the sports field, gate and gatehouse. English and Chinese names are descriptive translations, with the original Korean names available. Source links are included in the app; reference photographs and videos are not loaded as map textures.

First-party code and original geometric assets use the [MIT License](LICENSE). University artwork and other third-party material retain their own terms. This independent project is not endorsed by Myongji University, Naver, Apple or Google.
