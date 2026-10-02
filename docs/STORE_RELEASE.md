# Android and iPhone release preparation

**Scope:** these instructions cover the optional Expo store-release path in `mobile/`. The primary Android distribution uses the separate Java/System WebView app in `android-standalone/`; see [INSTALL.md](INSTALL.md), [DISTRIBUTION_GUIDE.md](DISTRIBUTION_GUIDE.md) and [V05_NATIVE_CHANGES.md](V05_NATIVE_CHANGES.md). Expo permissions, native libraries and EAS commands below do not describe the Java app. Store policy and toolchain details are retained from the September 2026 preparation record and must be checked again before submission.

This is an **independent student project**, not a university publication. Store acceptance and affiliation are not implied. The package contains a shared React Native / Expo app that embeds the bundled interactive guide and adds native foreground location, persistent favorites, accessibility/lifecycle signals, and controlled external map/source links.

## What is configured

- Expo SDK 57 with React 19.2.3 and the SDK-recommended React Native 0.86.3 patch. `mobile/package-lock.json` records the installed dependency graph. Use Node 22.13 or later; verification used Node 22.19.0.
- No login, paid service, map key, chatbot API key, or content server is required for the bundled campus guide. The source-answering assistant runs locally; it is not a connection to a student's timetable or an online generative AI service.
- Naver native SDK source is retained but **excluded from autolinking by default**. The keyless illustrated map and reviewed external map links are the default. This avoids requiring a map account just to build the app.
- iOS and Android development identifiers are `dev.student.myongjiexplorer`; choose the publisher's permanent identifiers before store upload. No `ac.kr` ownership or university publisher identity is claimed.
- EAS `preview` builds an Android APK for testing. `production` builds an Android App Bundle and signed iOS store archive. `simulator` is an iOS simulator build. Production auto-increments native build versions.
- The production EAS pre-install hook checks publisher configuration, public privacy/support links, and the release icon. This check is deliberately not a substitute for native testing or content review.
- Permissions are foreground-only location. Background location, location foreground services, microphone, and legacy shared-storage permissions are blocked. Location is requested only after a user action and is not persisted by this app.

## Run and reproduce

From the repository root, build the shared guide first using the root README commands. Keep `src/` alongside `mobile/`: this is one source project, not a standalone mobile folder.

```sh
cd mobile
npm ci
npm run typecheck
npm run doctor
npx expo install --check
npm run export:native
npm run prebuild:android
```

Android native builds need an installed JDK compatible with the generated Android Gradle plugin, Android SDK, and accepted SDK licenses. `npm run android` builds and runs a development build on a connected device/emulator. A standalone local release APK is built with the generated Gradle project's `assembleRelease` task; a debug or default development signing key is **not** a store signing identity.

For iOS, run `npm run prebuild:ios` and `npm run ios` on macOS with the required Xcode toolchain, or use EAS's macOS build workers. Generating an iOS project or exporting JavaScript on Windows does not compile Swift, run CocoaPods, produce an IPA, or validate iPhone behavior.

## Publisher setup and store builds

1. Create or use **your own** Apple Developer, App Store Connect, Google Play Console, and Expo accounts. Complete their identity verification. No account was created, authenticated, or charged in this work.
2. Choose permanent bundle/package IDs and set `CAMPUS_IOS_BUNDLE_ID`, `CAMPUS_ANDROID_PACKAGE`, `EXPO_OWNER`, and `EAS_PROJECT_ID`. Copy `mobile/.env.example` for local development; configure corresponding EAS environment values for cloud builds. Keep the IDs identical in store records, signing, and optional provider restrictions.
3. Publish the publisher's support and privacy pages and set `EXPO_PUBLIC_SUPPORT_URL` and `EXPO_PUBLIC_PRIVACY_URL`. They must describe the actual shipped version, including location, local preferences, offline questions, optional content refresh, and external links. A local documentation file is not a public privacy-policy URL.
4. Review the included original geometric campus icon (`mobile/assets/icon.svg`, rendered PNG, and adaptive foreground). It makes no university branding claim. Replace it if desired, then test the installed icon and Android masks. Capture store screenshots from the actual native builds.
5. Keep the Git repository rooted at the **project root**, containing both `src/` and `mobile/`. If working from a source archive without Git metadata, initialize the repository there (`git init`) before running EAS. Do not initialize a separate repository inside `mobile/`, because it would omit the shared source from the upload. Run EAS commands from `mobile/`, as in [Expo's monorepo guide](https://docs.expo.dev/build-reference/build-with-monorepos/). Link the app under your Expo account with `npx eas-cli@24.8.0 init`, then review the resolved public configuration and build archive. Run `npm run check:release` with publisher variables set. Never put signing credentials, an administrator token, or an LLM provider secret in `EXPO_PUBLIC_*` variables.
6. Build with `npx eas-cli@24.8.0 build --platform android --profile preview` for Android testers. After release gates are met, build each store artifact with `npx eas-cli@24.8.0 build --platform android --profile production` and `npx eas-cli@24.8.0 build --platform ios --profile production`. EAS may charge according to the owner's account plan; no cloud build was initiated here.
7. Review signing, store metadata, distribution countries, age/content-rating questionnaires, App Privacy / Data safety declarations, export-compliance responses, and reviewer notes. TestFlight and Play internal/closed testing precede production submission. `eas.json` configures Android submission to the **internal draft** track; no automatic production publish is configured. Submission still needs the owner's store credentials and explicit execution.

Apple's current requirements include Xcode 26 or later with the iOS 26 SDK for uploads since April 28, 2026. Expo 57 documents Xcode 26.4+ and iOS 16.4+ as its toolchain/minimum OS. See [Apple upload requirements](https://developer.apple.com/news/upcoming-requirements/) and the [Expo compatibility table](https://docs.expo.dev/versions/latest/).

New Google Play submissions must target Android 16 / API 36 after August 31, 2026. Expo 57's documented target is API 36; confirm the final AAB manifest. Personal Play accounts created after November 13, 2023 require at least 12 continuously opted-in closed-test participants for 14 days before applying for production access. See [Android target requirements](https://developer.android.com/google/play/requirements/target-sdk) and [Google's testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465). Recheck policies when actually submitting.

## Native and content release gates

The owner must record results, device/OS versions, build IDs, and any failures for:

- Fresh offline launch, restored favorites, English/Korean/Simplified Chinese text, campus switching, tab navigation, keyboard/chat layout, font scaling, VoiceOver/TalkBack, orientation, safe areas, and Android system back behavior.
- 3D/software rendering on physical Android and iPhone hardware: building selection, zoom/pinch/pan/rotation, enough touch targets, low-memory recovery, render-process termination, and actual frame rate / battery behavior. Browser checks do not certify the 30 FPS target on mobile devices.
- Explicit location request; denied, approximate, precise, revoked, timeout, and background cases. Do not draw a fabricated GPS-to-campus route when georeferencing/entrances are unverified.
- External official sources and Naver/Google links, with and without map apps installed. The native bridge permits reviewed source/map hosts and publisher-configured page origins; it does not load remote web apps into the bundled WebView.
- The campus inventory, visual placement, official names, bus timetables, date exceptions, and food status. Source-backed records and schematic building shapes do not establish surveyed footprint/height accuracy. Do not label the illustration a complete surveyed 3D reconstruction.
- Permission/right to redistribute user-supplied reference materials, photographs, logos, and any provider map content. Listing description must state independent student status and describe schematic/unknown information accurately.
- Full source-answering assistant coverage: unknown classes/timetables remain unknown; stale bus schedules do not become real-time arrivals; hours and prices without evidence remain unknown; source links match each answer.
- A release build on both native platforms and an on-campus navigation trial using the reviewed content. Store approval remains Apple's/Google's decision; the app must offer sufficient useful interaction and quality under [Apple's review guidelines](https://developer.apple.com/app-store/review/guidelines/).
- Native-library alignment and a 16 KB Android environment test, following [Android's 16 KB page-size guidance](https://developer.android.com/guide/practices/page-sizes). This app contains native libraries, so JavaScript checks cannot establish binary compatibility.

Complete privacy declarations from the actual final app and bundled third-party libraries using [Apple App Privacy details](https://developer.apple.com/app-store/app-privacy-details/) and [Google Play Data safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469). Do not infer a store questionnaire answer solely from the absence of an account or analytics feature.

## Optional native Naver SDK

Run `npm run naver:enable`, set `CAMPUS_ENABLE_NAVER=1`, and configure the restricted public SDK key. Regenerate both native projects and run full Android/iOS compilation plus device tests. The local Swift/Kotlin wrapper is retained as integration source; it is **not certified by keyless build checks**. Review current official Naver SDK versions and terms before enabling. Use `npm run naver:disable` and `CAMPUS_ENABLE_NAVER=0` to return to the keyless default. An LLM/chat API key is unrelated and must never be added to the client.

## Current verification evidence

See `NATIVE_VALIDATION.md` for commands actually run, their results, and remaining build/device limits. The earlier package's syntax-only checks and browser interaction counts are historical and should not be presented as native build evidence.
