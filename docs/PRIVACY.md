# Myongji Campus Explorer — privacy draft

Updated 30 September 2026 for version 0.4. **This is a draft for the publisher to review and publish, not an active public policy.** The app is an independent campus-guide project and does not claim university affiliation.

This dated draft is preserved for review. Version 0.5 adds Seoul, Simplified Chinese and a stored campus selection; see [V05_NATIVE_CHANGES.md](V05_NATIVE_CHANGES.md). Publisher review must cover those preferences and the final chosen distribution before adopting this as a policy.

The publisher's legal identity, privacy contact, public policy URL, support URL and effective date have not been supplied. No contact address or hosted policy has been invented. Add those details and verify this text against the final signed build before publication.

## Current app behavior

The delivered Android APK is the Java/System WebView variant in `android-standalone/`: its manifest requests no Android permissions, embedded network requests are blocked, favorites/language use local WebView storage, and reviewed external links open another app. It has no GPS or remote content-refresh feature. The optional native-location/content-service behavior below belongs to the separate Expo source in `mobile/`, not to the delivered Java APK. The publisher must choose the variant before publishing a final policy.

The bundled guide works without an account. Its source contains no advertising, analytics or remote chatbot integration. It does not connect to a student portal, read a personal timetable, request contacts, or access a microphone or camera.

| Information | Use and storage | Transmission by this app |
| --- | --- | --- |
| Language preference and saved place IDs | Stored locally in browser storage or native AsyncStorage; restored on later launches | Not sent to the publisher by the current code |
| Questions and answers | Processed locally using bundled rules and source records; retained only in the current page session, up to 30 exchanges | Not sent to an AI provider, university or content server |
| Campus content cache | If a content service is configured, a validated public dataset is saved locally for offline use | A content request may be made; saved places and chat text are not included |
| Location | The current guide UI does not request GPS. Optional native foreground-location code is retained and can run only after an explicit location request | The code sends a single reading to its local app view; it does not persist a location history or send that reading to the content service |

The app does not ask for background location. Browsing the illustrated map does not require a location permission. If location functionality is enabled in a later build, the publisher must test permission prompts and update its disclosure for that shipped behavior.

## Internet connections and external links

The default bundled guide does not require a content server. If the publisher configures an HTTPS content URL, the native shell requests that public dataset during initialization and on refresh. A server or hosting provider necessarily receives connection information such as an IP address; its logs, retention and operators depend on the chosen deployment. Those details are not yet defined and must be disclosed before that service is released.

The installable web version requests its page, manifest, icons and service worker from the chosen web host. It stores these files locally to support offline reopening. The host receives those network requests even when no optional content service is configured; the publisher must disclose the chosen host's relevant logs and retention. No remote chatbot request is added by installing the PWA.

Opening a source, support page or map link opens an external website or application. That service receives the request and applies its own policy. A map-search link can contain the selected public campus place name. It does not include this app's chat history or saved-place list. External services may request their own permissions separately.

The visual-reference catalogue also links to university photographs, a reviewed YouTube tour, an architect's project page and a public-library publication. They open only when selected. The map uses bundled original geometry; it does not load those photographs or embed a YouTube player automatically.

The native Naver SDK is disabled in the default configuration. Enabling it or adding remote AI, analytics, crash reporting, account features or hosted synchronization requires a fresh data-flow review and an updated policy. Developer tooling used while testing is not a production data-collection feature.

## Retention and controls

- **Clear saved places** in the app's About dialog removes the saved place IDs. The language preference remains until changed or local app/browser data is removed.
- **Clear chat** empties the current conversation. Reloading the page or ending its runtime session also removes chat memory. Merely switching the app to the background may preserve that session.
- Browser site-data controls or the operating system's app-data/removal controls can remove locally stored preferences and cached content. System backups or restoration can affect local data; the publisher must check final platform behavior. Android backup is disabled in the current configuration.
- There is no app account to delete and no publisher-held question history in the current implementation. If the publisher adds any remote retention, it must provide the applicable contact and deletion process.

## Publisher completion checklist

Supply the real publisher identity and privacy contact; choose the public privacy/support URLs and effective date; describe any deployed content-service host, logs, retention and deletion process; inspect the final binary and SDKs; and make the App Store privacy answers and Google Play Data safety declarations match actual behavior. Translate the final notice if required for the app's audience.

Apple and Google require accurate privacy disclosures for submitted apps. Use their current [App Review privacy guidance](https://developer.apple.com/app-store/review/guidelines/#privacy) and [Google Play User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311) when preparing the final policy and store declarations. This draft does not establish legal compliance or store acceptance.
