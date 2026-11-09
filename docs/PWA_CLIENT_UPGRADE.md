# Existing-client campus-link upgrade

This correction changes only the hosted PWA update lifecycle. Campus data, maps,
photographs, native Android bundle, preferences and menu snapshots are unchanged.

## Reproduced regression

The November 4 release (`c58ce1a`, application hash `0905948d43ec`, shell
`2c1a3ca1fa2cd998`) does not interpret the `campus` query parameter. Its worker
serves its cached `index.html` for app navigations, including URLs with queries.

In an isolated persistent Chromium profile, two open tabs kept that worker active
while the November 9 release (`411b9c4`, application hash `71248dcd5dd1`, shell
`1bf128d7399dbfe6`) waited. Both opening `?campus=seoul` and reloading returned the
exact old HTML and displayed saved Yongin. Closing both app tabs and reopening
the same profile activated the newer document and correctly displayed Seoul,
without clearing any storage.

This reproduces a concrete cause compatible with the reported Odoo-browser
symptom. It does **not** identify the affected browser's old release retrospectively:
its active/waiting worker hashes and original tab count were not captured before
the symptom stopped occurring. A fresh-profile URL test alone does not cover this
upgrade path.

## Correction and safety boundary

The new worker calls `skipWaiting()` only after every offline asset has passed its
SHA-256 check and every cache write has completed. Worker policy `strategy:5`
creates a distinct cache even if the application content is unchanged. Failed
download/verification keeps the old release; a failed write removes only the
incomplete candidate cache. Activation claims clients and deletes only older
shells belonging to this app's URL scope.

Other app tabs may remain open. The next navigation or reload receives the new
shell, and the existing URL parser gives one valid `campus=seoul` or
`campus=yongin` parameter priority over saved campus preferences. Favorites,
language, menu cache and unrelated site storage are not rewritten or cleared.

There is deliberately no automatic document reload or `clients.navigate()`.
An already loaded legacy page may contain a chat session or unsent question that
cannot be recovered by the worker. That document stays visible until the next
explicit navigation/reload **after the verified update finishes**. A first visit
during the download can therefore still show the old document. No client-side
fix can change the behavior of an already-installed old worker before its new
release has downloaded and activated. No workaround requires clearing site data.

The EN/KO/ZH installation help now describes this lifecycle. The Android APK uses
its existing native lifecycle and is not rebuilt by this PWA-only correction.

## Verification

Validated with Chrome 156.0.8078.80 on Windows, including a mobile viewport;
no physical phone or Safari validation is claimed.

- Build and TypeScript compilation passed. The standalone/native HTML remains
  byte-identical to `411b9c4` (SHA-256 `71248dcd5dd1dcf3d77b1d966c8ddf28a9938855b79d845e9ec1b9d165c30928`).
- All 332 Node tests passed, including deferred cache writes, invalid bytes,
  failed cache writes, scoped rollback and absence of forced navigation.
- All 104 fresh-profile URL checks passed using the final PWA HTML: desktop/mobile,
  previous opposite campus, EN/KO/ZH preferences, reload and invalid parameters.
- All 20 final migration checks passed: November 4 active -> November 9 already
  waiting -> hotfix; a deliberate 503 before a valid retry; two old app tabs kept
  open; saved language/favorites/menu/unrelated storage and session chat/draft
  retained; both direct links and reload; offline navigation and a fresh offline
  browser process. Cache HTML and loaded inline-script fingerprints were verified.

**Activation was not instant:** the final migration observed it after 300,453 ms
(about five minutes), without closing either old tab. Earlier 60-second checks
timed out with a complete candidate still waiting. Removing network routing and
extra DevTools capture did not remove that delay. The final run observed the full
transition; it does not prove which internal Chrome event kept the old worker busy.
The specification permits activation to wait for outstanding events, and Chromium's
current source has a five-minute retirement grace. Those sources explain a
compatible mechanism, not a retrospective diagnosis of the original Odoo browser.

One subsequent test failed during initial old-shell setup while the disk had about
1.5 GB free. Setup succeeded after deleting only this investigation's disposable
browser profiles. No quota error was captured, so disk pressure remains a possible
contributor, not a proven cause. Reports and screenshots were retained.

Reproduce the upgrade with immutable copies of the old PWA directories, including
their `menus/yongin.json`, and the freshly generated candidate `pwa/`:

```powershell
$env:MCE_UPGRADE_OLD = '<November 4 PWA directory>'
$env:MCE_UPGRADE_INTERMEDIATE = '<November 9 pre-hotfix PWA directory>'
$env:CHROMIUM_EXECUTABLE = '<installed Chrome executable>'
node tests/pwa-upgrade-browser.cjs
```

The test defaults to a 330-second activation deadline, uses a synthetic persistent
profile, serves the actual immutable packages from a loopback origin, and preserves
its JSON evidence. It never opens or clears the user's browser profile. The menu
network failure is injected only into test pages; worker downloads are not mocked.
An optional `MCE_UPGRADE_DIAG_INITIAL=1` observes worker errors during initial setup
and detaches before migration. The final run used that option.

The reviewed hotfix shell is `dc739552a9676afc`; PWA HTML SHA-256 is
`18ee3b762de915a212572df56df5a70a774e24ea01c6f27a130e23601a685f6e`.
Public deployment verification is a separate step after these local checks.

The service-worker lifecycle behavior is documented by
[MDN](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) and
[skipWaiting()](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/skipWaiting).
