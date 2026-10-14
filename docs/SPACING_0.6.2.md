# Campus Explorer 0.6.2 spacing update

This is the historical spacing-only phase of 0.6.2, prepared before the combined interface redesign and Android rebuild. The statements, hashes and test totals below describe that earlier local candidate at the time of review. For the combined release, use [Campus Explorer 0.6.2](RELEASE_0.6.2.md); this report does not describe current deployment status.

## Layout changes

The official campus map button and site-plan source previously touched, with a measured horizontal gap of 0 pixels. Related dialog actions now use 12 pixels between columns and 8 pixels between wrapped rows, with aligned controls and a minimum height of 44 pixels. Long translated labels can wrap within the available width.

The same grouping covers Yongin and Seoul map sources, building-source actions, About controls, community-source dialogs and transport sources. Saved-event venue and source actions use the existing card-action layout. Button behavior, source URLs, campus data and map geometry are unchanged.

Existing food cards, answer citations, map controls, filters, source lists and other toolbars retain their established spacing. Their widths and control overlap are included in the browser audit.

## Local verification

TypeScript checks, the PWA build and all 257 Node tests passed. The Node tests that use a local HTTP server require loopback access in a restricted execution environment.

The spacing audit passed all 2,446 checks across 36 scenarios: both campuses, English, Korean and Simplified Chinese, widths of 320, 390 and 1440 pixels, and the app's 100% and 200% text sizes. It checked action separation, label and container overflow, citations, chat-to-map navigation, Back, dialog focus and unchanged action destinations. No uncaught JavaScript errors or external resource requests occurred. Browser results are retained separately from this source document.

The existing PWA browser suite passed 16 checks for the same generated release. These include service-worker control, manifest and icon validation, Chromium installation eligibility, offline answers and favorites, reopening in a fresh browser process, and persistent Seoul/Chinese preferences. No app was installed as part of these checks.

A separate in-memory event fixture passed 252 checks across the same 36 layout scenarios, covering the venue/source action group and map navigation. The fixture was not written to distributed data. Together, the three browser runs passed 2,714 checks.

Run the audit with `SPACING_MATRIX=1` and `node tests/spacing-browser.cjs`. Set `CHROMIUM_EXECUTABLE` to the installed Chromium/Chrome executable. `SPACING_PHASE=before` and `SPACING_HTML` can select a preserved prior HTML file; `SPACING_CAPTURE=1` adds related-area captures. The default output is under `build/spacing-062/`. `SPACING_REVIEW_DIR` optionally selects a separate screenshot folder.

## Prepared web artifact

The release contains exactly the nine generated PWA files documented in [the existing hosting guide](PAGES_0.6.1.md). The standalone manifest remains relative to the project path. All five cached asset digests and the resulting service-worker shell hash match the generated files.

- Version: `0.6.2`
- App hash: `28d6ded7da82`
- Shell hash: `bf05ae9a2c41fc9e`

This update does not build or distribute a new Android APK. The native Android and Expo directories remain outside this web-only change. Local desktop Chromium checks do not establish physical-phone or Safari behavior. Deployment requires a separate authorized publication step.
