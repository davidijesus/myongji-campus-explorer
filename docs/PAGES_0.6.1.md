# Campus Explorer 0.6.1 — web publication

This release publishes the reviewed static Campus Explorer web app through GitHub Pages at:

https://davidijesus.github.io/myongji-campus-explorer/

The reviewed application source is on `main`. The nine generated PWA files are published at the root of `gh-pages`, configured as the GitHub Pages branch source. Each push to `gh-pages` triggers the GitHub-managed Pages deployment; pushes to `main` alone do not deploy. No custom workflow file is part of this method. The Pages deployment result and actual site are the authority for deployment status; committing this document alone does not prove a successful deployment.

## Release content

Version **0.6.1** includes responsive Myongji navy/blue styling, accessible dialogs, English/Korean/Simplified Chinese interfaces, campus-specific local answers and map actions, saved places, and the offline installation guide. The university signature is unchanged and accompanied by an independent-project disclosure.

Yongin’s qualitative terrain revision adds connected wooded slopes and a residential terrace, settles structures on the ground, follows the terrain with roads and aligns canvas picking with the displayed height. Horizontal building footprints, paths and geographic calibration remain unchanged. Seoul’s rendered scene is unchanged by this revision. Elevations are illustrative, not survey data. No reference photograph is included in the published app or repository update.

The bundled official menu summaries are dated October 12–16, 2026. They do not establish availability outside that period. No automatic Instagram collection or content-service deployment is part of this release.

## Publication boundary and reproducibility

Run `npm ci`, `npm run typecheck`, `npm test` and `npm run build:pwa` with Node.js 22.13 or later. The build regenerates the following nine local files in `pwa/`:

- `.nojekyll` and `_headers`
- `index.html`, `manifest.webmanifest`, `service-worker.js`, `version.json`
- `icon-180.png`, `icon-192.png`, `icon-512.png`

Copy exactly these nine files to the root of `gh-pages`, including the empty `.nojekyll` marker so the existing static output is served without Jekyll processing. Configure Pages as **Deploy from a branch**, branch **gh-pages**, folder **/(root)**. `_headers` is retained for other static hosts but is not interpreted by GitHub Pages. The HTML contains its own content security policy.

The manifest’s `id`, `start_url` and `scope` use `./`; service-worker registration and cached asset URLs remain within the project subpath. The worker validates complete asset hashes before a new offline release becomes ready. `version.json` identifies the app version, app hash and shell hash. Its build timestamp changes when the same application is rebuilt.

Reviewed source-page SHA-256:

`a7539f334d12d97f4129a48aa77b2a81c040d3b1b11eb4bc4e0eefa49c386c30`

Reviewed generated PWA HTML SHA-256:

`d3869c9dd955003463cadea7d1d5ab6652f35045e3f6976d3b489ce79ee57dac`

App hash: `a7539f334d12`. Shell hash: `809f6c2fd719a306`.

No signing keys, credentials, private photographs, databases, local profiles, APK delivery receipts or native build products are part of this publication. Existing historical repository material remains available; the Android and Expo wrappers are outside this web-only source update. This Pages publication neither builds nor distributes an APK.

## Validation and limits

Before publication, the reviewed local build passed TypeScript/build checks, **257 Node tests**, **2,655 functional browser checks**, and **138 scene comparisons**. Checks covered both campuses, all three languages, 320-pixel and larger mobile layouts, zoom, local questions and map actions, saved places, browser back/reopening, offline behavior and WebGL/software rendering. Scene comparisons preserved all 50 Yongin and 11 Seoul horizontal references. Seoul’s scene buffer was unchanged.

Before each publication, run the complete Node suite and build locally, then verify the exact nine-file boundary, absence of private files, manifest subpath and service-worker asset hashes. This branch method does not add a custom CI workflow or automatically repeat the application tests on GitHub. GitHub manages the Pages deployment itself. A successful deployment still requires verification of the actual HTTPS URL, version, service-worker scope and offline reopening.

Desktop browser testing does not establish physical Android or iPhone behavior, Safari installation, actual GPS accuracy, external Naver app launch, accessibility on every assistive technology, battery usage or sustained mobile frame rate. No app-store release is made here.

## Data handling in the web app

Questions are answered locally. Language, campus and saved places use local browser storage; the current conversation stays in memory and clears when the page session ends. Offline shell files are held in the browser cache. Browser site-data controls can remove the preferences and cache.

Loading the hosted app makes normal requests to GitHub Pages. The host can receive connection metadata, such as an IP address, under its own policies. The application does not add analytics or send chat history or saved-place lists to a content service. External source and map links open only when selected and are governed by those services’ policies. Loading once online is required before offline use, and the app must report that offline preparation is complete.

First-party code remains under the repository [MIT License](../LICENSE); the Myongji University signature is third-party artwork and is not relicensed by this project.
