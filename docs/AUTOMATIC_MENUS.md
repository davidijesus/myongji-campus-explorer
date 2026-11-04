# Official Yongin menus and automatic client refresh

The 0.6.5 source adds a menu feed to the web app and main Java/System WebView Android client. The clients automatically check the published feed; **scheduled recollection of university sources is not enabled**. The current publication path uses the existing `gh-pages` site and an explicitly collected, validated snapshot. The Actions implementation is retained as a non-executing [template](ci/pages-menus.pending.yml), pending workflow-write authorization. Consult the [release record](RELEASE_0.6.5.md) for confirmed live version and feed checks; a prepared file is not deployment evidence.

## Sources and content

Only these official university menu fragments are collected automatically:

| Cafeteria | Official page | Dated fragment |
| --- | --- | --- |
| Myongjin/Library | [명진당 식당](https://www.mju.ac.kr/mjukr/485/subview.do) | `/diet/mjukr/4/view.do?monday=YYYY.MM.DD` |
| Student Union | [학생회관 식당](https://www.mju.ac.kr/mjukr/486/subview.do) | `/diet/mjukr/5/view.do?monday=YYYY.MM.DD` |
| Dormitory/Welfare Building | [생활관 식당](https://www.mju.ac.kr/mjukr/487/subview.do) | `/diet/mjukr/6/view.do?monday=YYYY.MM.DD` |

All fragment URLs use `https://www.mju.ac.kr`. The requested Monday is derived using the IANA timezone `Asia/Seoul`, regardless of the runner's location. The existing parser verifies the cafeteria identity, requested/displayed week, form endpoint, dates, weekdays, meal labels, table structure, UTF-8 and byte limits. Redirects and unexpected HTML are rejected.

The original Korean title, menu text and other information are retained, with line breaks. The automatic path does not summarize, translate or truncate fields to force validation. It does not infer opening hours, restaurant closure, allergens beyond the source text, or publication time. An explicitly empty official table means **no menu was published in that response**, not that the cafeteria is closed.

A 3 November source check found **25 meals for 2-6 November** in the week beginning 2 November: 5 library lunches, 10 Student Union meals and 10 dormitory meals. All three fragments returned HTTP 200 without ETag or Last-Modified; conditional-cache support does not imply that these responses currently offer bandwidth savings. The 4 November publication requires a fresh collection; its actual revision, timestamps and live verification belong in the release record rather than being inferred from this earlier check.

## Feed contract

The intended public URL is:

```text
https://davidijesus.github.io/myongji-campus-explorer/menus/yongin.json
```

The existing snapshot envelope remains `{ schemaVersion: 1, campusId: "yongin", version, updatedAt, updates }`. The automatic record branch has these fields:

| Field | Meaning |
| --- | --- |
| `id`, `sourceId`, `kind: "menu"` | Stable dated meal ID and one of the three allowlisted official sources |
| `originalLanguage: "ko"`, `originalText` | Original Korean fields joined with line breaks; no `summary` or invented EN/ZH translation |
| `meal` | Validated `breakfast`, `lunch` or `dinner` label |
| `sourceUrl` | Exact allowlisted fragment URL selecting the relevant Monday |
| `publishedAt: null`, `reviewedAt: null` | Publication time is not known; automated validation is not human review |
| `observedAt` | When the source body was observed |
| `validatedAt` | Successful source check; may advance on a valid HTTP 304 without rewriting body-observation time |
| `validFrom`, `validThrough` | The same individual meal date, interpreted in Asia/Seoul and within the requested week |

Human-reviewed records retain their existing separate branch and strict validation. The shared TypeScript and Java validators reject unsupported fields, source mismatches, invalid dates/times, duplicate IDs, malformed text and oversize snapshots. The feed is limited to 100 records and 256 KiB; automatic text has a 6,000-code-point/24,000-UTF-8-byte limit. Oversize content fails validation instead of being silently shortened.

Revisions are monotonic: `max(previous.version + 1, current epoch milliseconds)`. This protects existing caches and avoids revision collisions in closely spaced runs. It is a feed revision, not a human review or source publication timestamp.

## Client behavior

The HTTP(S) web app loads its validated local cache, checks the fixed feed on startup/resume, and offers manual refresh. Automatic requests have a minimum 15-minute interval, a timeout, response-size limits, no credentials and no redirects. This interval does not imply continuous background polling. The dedicated native client follows the same approved URL and lifecycle behavior; it cancels pending work on pause and retains the existing manual gesture requirement. WebView network loading remains blocked. The feed is deliberately outside the service worker's immutable offline-shell cache.

Invalid responses, rollback versions, same-version conflicting content, failed fetches and failed cache writes do not replace the last valid data. The UI shows Korean originals as automatic imports, with official links, observation/check times and meal validity. It recalculates expiry in Asia/Seoul on resume, including offline, and does not show past meals as today's menu. Favorites and language preferences are independent of the feed cache.

An existing APK whose endpoint is empty needs one initial updated build. `android-standalone/build.ps1` and Gradle now default to the approved Pages feed; later menus do not require a new APK. The historical Expo variant is not the Android path used here.

## Branch-based publication and manual collection

Until scheduling is authorized, run the collector explicitly and review each snapshot before publishing it to the existing `gh-pages` site. The collector and pending workflow deliberately refuse to initialize implicitly from a missing previous feed. For a reviewed first publication only, create the initial snapshot explicitly:

```sh
npm ci --ignore-scripts
npm test
npm run build:pwa
node scripts/update-official-menu-feed.cjs --initial --output build/menu-initial/yongin.json --capture-dir build/menu-initial/capture --cache-dir build/menu-initial/http-cache --status build/menu-initial/status.json
```

Use a new capture directory for each collection. Inspect the JSON/status, validate the original data and both client parsers, then publish only the approved `yongin.json` as `menus/yongin.json` in the existing `gh-pages` site, preserving unrelated files. A release can publish the reviewed app shell and feed together through that branch without enabling an Actions workflow. Confirm the live bytes/hash. Do not use a 404, redirect, timeout, invalid JSON or failed authentication as permission to create an empty replacement.

For subsequent collections, pass the exact last validated snapshot with `--previous path/to/yongin.json` instead of `--initial`, and choose new output/capture/status paths. The CLI validates the previous snapshot before collection. Do not overwrite the published feed after a failed run. Check the per-source status even when the process exits successfully, because partial success retains the affected sources' previous dated records.

Workflow activation is a separate pending step: after specific authorization, publish the reviewed template at `.github/workflows/pages-menus.yml`, verify the existing live feed, change Pages from branch-based deployment to GitHub Actions, and verify a manually dispatched deployment before relying on scheduling. Do not create credentials or expand access merely to bypass a rejected workflow write. The workflow itself uses GitHub's built-in deployment token and needs no new content server or administrative secret. Do not expose signing keys, admin tokens, raw private review data or local browser profiles in the site artifact.

## Pending recurring workflow and failure handling

The [pending template](ci/pages-menus.pending.yml) proposes pushes to `main`, manual dispatch and daily collection at **07:17, 11:17 and 17:17 Asia/Seoul** (`17 7,11,17 * * *`, explicit `timezone`). **It is outside `.github/workflows`, so none of those triggers is active.** Once separately authorized and enabled, it serializes deployments, installs locked dependencies without lifecycle scripts, runs tests, builds the complete offline shell, refreshes menus and publishes the validated `pwa/` artifact. Build permissions are read-only for repository content/Pages; the deployment job has only the Pages/OIDC permissions it needs.

`scripts/build-pages-menu-feed.cjs` retrieves the previous public feed with a cache-busting query and no-store/no-cache directives, bounds and validates it, and passes it to `scripts/update-official-menu-feed.cjs`. It requires a new `build/pages-menu-run` directory, preventing an interrupted local collection from being mistaken for fresh evidence.

| Outcome | Behavior |
| --- | --- |
| All sources validate | Publish their original records with a new feed revision |
| One or two sources fail | Preserve those sources' last valid records and timestamps; publish successful sources and a degraded-status diagnostic |
| Every source fails | Preserve the previous feed byte-for-byte in staging, return failure and leave the current Pages deployment intact |
| Previous feed is missing, invalid, redirected or unreachable | Stop before collection/deployment; do not initialize implicitly |
| A source explicitly returns a valid empty table | Remove that source's old records; do not infer closure |

The collection status report is separate from the public feed and is retained as a seven-day Actions artifact when available. It identifies source-level outcomes without changing the provenance of retained meals. The workflow does not write to `main`, create an administrative token or collect Instagram content.

GitHub's schedule is best effort: runs can be delayed or dropped during load, and public-repository schedules are disabled after 60 days without repository activity. Check the Actions run history and the feed's actual timestamps; keep expired-data handling enabled rather than promising an exact refresh time. See [GitHub scheduled events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule) and [Pages workflow requirements](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Verification and recovery

The 3 November menu implementation passed **307 Node tests**, covering KST week/date boundaries, original-Korean fields, total/partial source failure, explicit empty tables, byte limits, rollback, corrupted data, previous-feed failures and absence of implicit initialization. Java checks passed for **283 snapshot/interoperability, 164 refresh/cache and 31 origin/location-policy cases**; that day's real 25-menu snapshot survived Java validation/cache roundtrip with all values preserved. Its 33 automatic-menu browser checks passed for EN/KO/ZH, Korean originals, startup/resume refresh, bounded requests, cache retention, offline expiry and failure handling, with no unexpected requests or JavaScript errors. These are prior component results. Final combined-release and live-feed verification are recorded separately in [RELEASE_0.6.5.md](RELEASE_0.6.5.md). No actual scheduled execution is claimed.

To investigate a failure, inspect the workflow step and collection diagnostic before changing the parser or data. Keep the currently published valid feed and any evidence of the rejected response. A source-layout change needs a parser/fixture update and review. Repair and validate the previous snapshot explicitly if it is missing or corrupted; do not suppress the failure by publishing an empty feed. Recovery versions must remain higher than clients' saved versions.

Browser/host-JVM checks do not establish installed Android WebView behavior, system Back, GPS, device performance or upgrade retention. No emulator or physical-device result is asserted by this document.

## Seoul source and limitation

The [official Humanities-campus Student Union menu page](https://www.mju.ac.kr/mjukr/8595/subview.do) exposes `/diet/mjukr/10/view.do?monday=YYYY.MM.DD`, with title `인문캠퍼스 학생회관 식당`. On 3 November its dated fragment contained 14 meals and one explicit empty entry for 2–8 November. The source identifies **Student Union, third floor**.

The [dormitory portal](https://dorm.mju.ac.kr/dorm/6733/subview.do) labels its Seoul link “MCC”, while the destination identifies Student Union. That discrepancy does not establish an MCC/S10 location. This release reports the reliable official source but keeps automated collection and the feed restricted to the three Yongin endpoints; Seoul needs its own allowlist, parser fixtures, client/campus contract and location review before integration.

For the separate administrator-reviewed server and import tools, see [CONTENT_WORKFLOW.md](CONTENT_WORKFLOW.md).
