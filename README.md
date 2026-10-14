# Myongji Campus Explorer

An independent student guide to **Myongji Universityâ€™s Yongin and Seoul campuses**, with interactive reference maps and an offline, source-based campus assistant.

**English Â· í•œêµ­ì–´ Â· ç®€ä½“ä¸­æ–‡**

[Open the web app](https://davidijesus.github.io/myongji-campus-explorer/) Â· [Release 0.6.2](docs/RELEASE_0.6.2.md) Â· [MIT license and third-party material](LICENSE)

## Release 0.6.2

Version 0.6.2 uses the university's original symbol and wordmark intact, with Campus Explorer on a separate line. The surrounding interface has consistent buttons, quieter panels, underlined navigation and wrapping source actions. A separate blue campus-inspired architectural illustration replaces the green launcher icon. The approved Yongin and Seoul maps, geometry and content remain unchanged. This is an independent student project, not an official university application.

- Explore Yongin and Seoul, search names or building codes, select places and save favorites. Pan, rotate and zoom the 3D map; the software renderer supports browsers without WebGL.
- Ask campus questions locally, follow citations and jump from answers to places. No remote chatbot, account, advertising or analytics is configured.
- Switch between English, Korean and Simplified Chinese. Campus, language and favorites persist locally; chat history lasts for the page session.
- Install the web app when your browser supports it. Load it once online and wait for the appâ€™s offline-ready message before relying on offline reopening. External university and map links still need a connection.
- Read 25 dated official menu summaries for October 12â€“16, 2026. Later menus and Instagram posts are not collected automatically. No content server is deployed.

Try **Y9228** in Yongin, **S10303** in Seoul, or ask where to buy coffee. Building-code results do not verify a roomâ€™s existence, floor, entrance or current class assignment.

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

The public site is served from the root of the dedicated `gh-pages` branch, which contains only the nine generated PWA files. TypeScript checks, the full 257-test Node suite, a fresh PWA build and an artifact-boundary check run locally before publication. A push to `gh-pages` triggers the GitHub-managed Pages deployment; a push to `main` alone does not publish the site. See [release details](docs/RELEASE_0.6.2.md) and the [existing hosting method](docs/PAGES_0.6.1.md).

## Scope and validation

The release is checked with TypeScript, the complete 257-test Node suite and browser checks covering both campuses, all three languages, narrow mobile screens, enlarged text, keyboard focus, chat-to-map actions, favorites and offline reopening. Exact release hashes and validation results are recorded in the release details.

The current Android implementation is the Java/System WebView wrapper in [android-standalone](android-standalone/README.md). The separately delivered 0.6.2 APK retains its existing development signing identity and increments the Android version code. The historical Expo directory is not the Android build path for this release. No physical Android device, iPhone/Safari validation, app-store submission or production publisher signing is claimed. Signing credentials are excluded from source and delivery archives.

## Sources and license

University sources take precedence over conflicting student guidance. Yongin has 50 selectable references; Seoul has eight buildings plus the sports field, gate and gatehouse. English and Chinese names are descriptive translations, with the original Korean names available. Source links are included in the app; reference photographs and videos are not loaded as map textures.

First-party code and original geometric assets use the [MIT License](LICENSE). University artwork and other third-party material retain their own terms. This independent project is not endorsed by Myongji University, Naver, Apple or Google.
