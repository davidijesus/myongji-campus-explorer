# Direct campus links

Use a single lowercase `campus` query parameter on the deployed Explorer document:

- Seoul: `https://davidijesus.github.io/myongji-campus-explorer/?campus=seoul`
- Yongin: `https://davidijesus.github.io/myongji-campus-explorer/?campus=yongin`

These are the stable target addresses for this revision. A deployment must be verified before presenting them as publicly working. The local browser test checks the same behavior without publishing or editing the referring site.

A valid explicit parameter selects that campus even when another campus was saved previously. Other preferences, including language and favorites, are retained. Reloading keeps the campus named in the URL. Choosing a campus with the existing selector or map buttons updates the URL using `history.replaceState`, without a reload or extra Back entry; other query values, the fragment and history state are preserved.

With no valid parameter, the saved campus is used, falling back to Yongin. Invalid values, uppercase variants and duplicate `campus` parameters are treated as ambiguous and do not override saved preferences. A subsequent explicit choice in the page normalizes the parameter.

Late native preference messages preserve an explicit URL or in-page campus choice while still restoring language and favorites. URL rewriting may be unavailable in an embedded opaque document; campus selection still works in memory. No new permissions, tracking, external redirect or account is introduced.

The PWA service worker serves the same verified offline shell for these query parameters. Its cache identity and asset hashes remain independent of the selected campus.

## Verification

Run `npm test` and, after `npm run build:pwa`, `node tests/campus-url-browser.cjs`. This uses a temporary loopback server and isolated browser profiles. Set `MCE_URL_LIVE_BASE` to the exact public root only after authorized deployment, plus `MCE_EXPECTED_INDEX_SHA256` for the reviewed PWA HTML hash, to test real public responses without fixtures. `MCE_URL_OUTPUT` selects the evidence directory.

The browser matrix covers new visitors, a different saved campus, reload, selector and map-button changes, URL/history preservation, invalid and duplicate parameters, late native preferences and unavailable storage. Public verification records the exact entry URLs and HTML response hashes. It is desktop Chrome testing with mobile viewports, not Android-device testing.
