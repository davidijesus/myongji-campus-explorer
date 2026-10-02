# Installation and distribution guide

**Version 0.5 — 1 October 2026:** the Android APK includes Yongin and Seoul, persistent campus selection, and English, Korean, and Simplified Chinese. It retains the v0.4 application ID and certificate, with version code 2. Preference-preserving updates are prepared but have not been verified on a device.

This is an independent student project, not an official university application. Platform rules and prices below record the guidance consulted on **30 September 2026**; check the linked official requirements before a future submission. A source project or build command is not evidence of a completed APK or IPA.

## Available distribution options

The immediate options are the **Android demonstration APK** and the **installable web app for Android/iPhone**. The Java/System WebView project `android-standalone/` produced `myongji-campus-explorer-v0.5-android.apk`. Its signature and structure passed inspection; physical-device installation and use remain untested. The web app needs HTTPS hosting. Store distribution requires publisher accounts, signing, and further validation.

| Format | Purpose |
|---|---|
| `.apk` | Signed Android installer. The demonstration APK is not proof of store readiness. |
| `.aab` | Android App Bundle submitted to Google Play, which generates device-specific APKs. It is not normally installed by tapping the file. |
| `.ipa` | Signed iOS binary for an authorized distribution method. Copying it to a phone does not make it freely installable. |
| PWA/site package | Web files hosted over HTTPS and added to a home screen; not a native iOS binary. |
| Source ZIP | Editable project and build inputs; not an installer. |
| Standalone HTML | Local browser preview; does not replace the full PWA manifest and service worker. |

See [Google Play app setup](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en). EAS supports AAB/IPA submission, but uploading an IPA to TestFlight does not automatically publish it in the App Store. See [Expo store submission](https://docs.expo.dev/deploy/submit-to-app-stores/).

## 1. Install the Android demonstration

The generated APK is **184,867 bytes**, version 0.5.0/code 2, minimum API 24 (Android 7), target API 36, identifier `dev.student.myongjiexplorer.standalone`. It contains the guide, requests no Android permissions, and bundles no `.so` libraries. APK v2/v3 signing, ZIP alignment, and the exact HTML content were verified. **Device installation, launch, and use were not tested.** See the hash and instructions in [INSTALL.md](INSTALL.md) and the limits in [NATIVE_VALIDATION.md](NATIVE_VALIDATION.md).

1. Copy the APK to the phone by cable or HTTPS download.
2. Open **Files/Downloads** and tap it.
3. If prompted, allow **Install unknown apps** for the browser or file manager used.
4. Return, tap **Install**, then **Open**. Menu names vary by manufacturer.
5. Check building search, favorites, languages, campus switching, map, bus information, and questions. Close and reopen, including offline. Record any failure with the Android version and exact error.

Android supports [distribution outside Google Play](https://developer.android.com/distribute/marketing-tools/alternative-distribution). With Android SDK/ADB configured, USB debugging enabled, and the computer authorized, use `adb install -r "path-to-app.apk"`. The `-r` option attempts an update; it does not bypass signing incompatibility. See [APK installation with ADB](https://docs.expo.dev/build-reference/apk/).

Direct updates require a higher version and compatible identity/signing. This project has no automatic APK updater. The development key is not intended as the permanent publisher key. Changing signatures may require uninstalling the demonstration and losing local favorites; plan that transition before wider distribution. See [Android signing](https://developer.android.com/studio/publish/app-signing).

The Expo project in `mobile/` remains available for cross-platform development under identifier `dev.student.myongjiexplorer`. **No Expo APK was produced.** Both Windows build attempts encountered Ninja path limits, including a shortened-path attempt. Precompiled dependencies also have a known 16 KB memory-page compatibility limitation. The Java APK avoids those specific bundled libraries but still needs real-device testing, including on a 16 KB device. See [Android page-size guidance](https://developer.android.com/guide/practices/page-sizes).

The developer-verification guidance consulted for this record described a regional rollout beginning 30 September 2026 for participating stores in Brazil, Indonesia, Singapore, and Thailand, with broader requirements planned for 2027. It also described a limited distribution option for up to 20 devices for students/hobbyists and continued ADB development access. This is separate from Google Play's closed-testing requirement. Verify the applicable rollout and route in the [official developer-verification guide](https://developer.android.com/developer-verification/guides).

## 2. Install the web app on iPhone or Android

Publish the complete web folder, preserving `index.html`, the manifest, service worker, icons, and subfolders. Use HTTPS. The first online load must complete the cache; merely opening the page does not prove caching finished. See [service workers and cache storage](https://web.dev/articles/service-workers-cache-storage).

For manual hosting, sign in to [Netlify Drop](https://app.netlify.com/drop), drag in the extracted folder containing `index.html`, and keep the generated HTTPS address. Upload the updated complete folder to the same project for later releases. Review the hosting service's terms. See [Netlify manual deployment](https://docs.netlify.com/deploy/create-deploys/). A supplied URL can be used when deployment has been confirmed.

- **iPhone:** Safari → page menu/Share → **Add to Home Screen** → enable **Open as Web App**, when shown → **Add**. No Apple Developer enrollment is needed for this web installation. See [Apple's instructions](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios).
- **Android:** Chrome → **⋮ → Install and create shortcut → Install**. Some versions use **Add to Home screen**. See [Chrome's instructions](https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid&hl=en).

Open online, wait for loading and caching, close, enable airplane mode, and reopen from the icon. The map and local assistant should work after successful caching; external links require internet. Preferences belong to the web origin/installation and do not synchronize with the APK. Browser storage may be evicted; favorites are not a cloud backup.

There is no explicit update confirmation in the interface. After publishing to the same address, open online, close all app windows/tabs, and reopen. Compare the online `version.json` fields `version` and `appHash` with the package. This identifies the server's version, not necessarily an old open window's running code. Repeat the offline test. See [service-worker lifecycle](https://web.dev/learn/pwa/service-workers).

The PWA does not validate React Native, native permissions, accessibility, or performance of a future IPA.

## 3. Establish the publisher identity

Use accounts and permanent application identifiers under the publisher's control. Present the product as an **independent student guide, not Myongji University's official app**. Use the project's original icon without implying an institutional endorsement.

The Java development ID is `dev.student.myongjiexplorer.standalone`; the Expo ID is `dev.student.myongjiexplorer`. Choose the Android variant to maintain before the first store release. For Java, follow [android-standalone/README.md](../android-standalone/README.md) and prepare a Gradle/AAB release with publisher identity/signing. The demonstration packaging script alone does not publish to a store. For Expo, configure:

| Setting | Required publisher value |
|---|---|
| `CAMPUS_ANDROID_PACKAGE` | Permanent Android identifier |
| `CAMPUS_IOS_BUNDLE_ID` | Permanent iOS Bundle ID |
| `EXPO_OWNER`, `EAS_PROJECT_ID` | Expo account/project when using EAS |
| `EXPO_PUBLIC_PRIVACY_URL` | Public HTTPS privacy-policy page |
| `EXPO_PUBLIC_SUPPORT_URL` | Public support page with a working contact |

A published package ID is permanent. See [Google Play identity](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en). Apple individual enrollment uses the person's identity; organization enrollment requires an eligible legal entity. See [Apple enrollment](https://developer.apple.com/programs/enroll/).

Keep signing keys and passwords private with separate backups. Exclude `.jks` files, Apple private keys, administrative tokens, and passwords from public source and `EXPO_PUBLIC_*` variables. Play upload keys and distribution signing keys may differ; plan signing compatibility before supporting both direct and Play installation. See [Play App Signing](https://developer.android.com/studio/publish/app-signing).

## 4. Google Play release

The following requirements reflect the September 2026 documentation review and must be checked again before submission.

1. Register in [Google Play Console](https://play.google.com/console/), complete identity/contact checks, and pay the documented **US$25 one-time fee**. New personal accounts also require Android-device verification through the Play Console app. See [registration](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en).
2. Choose **Home → Create app**, provide name, language, app type, pricing, and support email, and complete declarations. See [app creation](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en).
3. Complete the listing, original icon, real screenshots, category, countries, support, privacy, age rating, audience, advertising, and access declarations. This version has no login, payments, ads, or personal class schedule access. Describe the assistant as local sourced answers and the map as an illustrated historical reference.
4. Build a publisher-signed **production AAB** from the selected Android variant. Resolve the Expo dependency limitation first if using Expo. The reviewed phone-app target requirement was **Android 16/API 36 or newer**; target API is distinct from the minimum supported Android version. Confirm the final manifest against [official target requirements](https://developer.android.com/google/play/requirements/target-sdk).
5. Use **Test and release → Testing → Internal testing**, upload the AAB, and invite initial testers. Record and fix actual failures. See [test tracks](https://support.google.com/googleplay/android-developer/answer/9845334?hl=en).
6. Personal accounts created after **13 November 2023** require a **closed test with at least 12 testers continuously opted in for 14 days** before applying for production access. Internal testing and external APK distribution do not replace it. Leaving/rejoining breaks continuity. See [testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en).
7. After production access, prepare the release, review Console warnings, and submit. Fourteen days of testing does not guarantee approval or a fixed review time. Release gradually and monitor feedback.

The reviewed closed-test requirement is 12 testers, not the earlier 20. Production must satisfy applicable **16 KB memory-page** requirements. Inspect the final binary and test runtime behavior; JavaScript checks and a completed build are insufficient. See [Android verification procedures](https://developer.android.com/guide/practices/page-sizes).

## 5. Native iPhone testing and release

The reviewed **Apple Developer Program** fee was **US$99/year**, with regional pricing. Build-service charges are separate. See [Apple pricing/enrollment](https://developer.apple.com/programs/enroll/).

EAS Build/Submit can be started from Windows; iOS compilation runs on macOS cloud workers. Local native compilation requires macOS/Xcode. Generated source or exported JavaScript is not an IPA. See [iOS build process](https://docs.expo.dev/build-reference/ios-builds/) and [store submission](https://docs.expo.dev/deploy/submit-to-app-stores/).

1. Enroll in Apple Developer and, if choosing EAS, create an Expo account. Review [EAS setup and plan requirements](https://docs.expo.dev/build/setup/).
2. Configure Bundle ID, privacy, support, and signing. Create the iOS record through **App Store Connect → Apps → + → New App**, using the matching Bundle ID, name, language, and internal SKU. See [app record creation](https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app/).
3. Build the iOS `production` profile and upload to App Store Connect. The reviewed upload requirement was **Xcode 26+ and iOS SDK 26+**, distinct from the minimum deployment version. Recheck [Apple's requirements](https://developer.apple.com/news/upcoming-requirements/).
4. In **TestFlight**, wait for processing, answer compliance questions, and create a tester group. External testing initially requires beta review. The reviewed limits were 10,000 external testers and 90-day build availability. See [TestFlight](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/).
5. Test on a physical iPhone: offline startup, map gestures, chat keyboard, VoiceOver, enlarged text, favorites, external links, and actual permissions used.
6. Complete the listing, real iPhone screenshots, age rating, privacy, support, and review information. Select the build, **Add for Review**, then **Submit for Review**. See [Apple submission](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app/).

Explain the searchable map, favorites, sourced bus information, and offline assistant in review notes. Do not promise verified GPS navigation. A WebView wrapper does not guarantee acceptance under [Apple guideline 4.2](https://developer.apple.com/app-store/review/guidelines/).

Sharing an IPA through a website or messaging service is not general installation equivalent to an APK. TestFlight and other authorized distribution methods have provisioning requirements. Native web distribution in the EU requires eligibility, Apple authorization, and notarization; the original review noted rule changes on 1 October 2026. It is distinct from a home-screen PWA and was not used for this demonstration. See [EU web distribution](https://developer.apple.com/support/web-distribution-eu/).

## 6. Privacy and support

Publish a policy identifying the responsible publisher, a contact, and the behavior of the actual release. A source file is not a public policy URL. Complete the applicable [Google Data safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en) and [Apple App Privacy](https://developer.apple.com/app-store/app-privacy-details/) declarations.

| Feature | Behavior to describe |
|---|---|
| Assistant | Local questions/answers; conversation remains in the session with a clear option. No academic-account, personal schedule, or remote AI access. |
| Favorites, campus, language | Stored locally, with no account or implemented cloud synchronization. |
| Main Java APK | No Android permissions; bundled guide; network and geolocation blocked in WebView; no GPS bridge or content refresh. Local WebView preferences; allowed links handed to external apps. Verify the final manifest. |
| Expo location | Requested after user action; kept in memory, with no persisted history or transmission to the content server in current code. Not validated campus routing. Do not attribute these permissions to the Java APK. |
| Optional Expo content service | Without `EXPO_PUBLIC_CONTENT_URL`, uses bundled data. When configured, requests content on startup/refresh without question/location payloads. The server operator must define access-log retention. This does not enable a server in the Java APK. |
| External links | Official sources, videos, architecture pages, and Naver searches open external services chosen by the user, subject to those services' policies. |
| Hosted PWA | Hosting receives requests to load/update the site; document the chosen host's actual logs and services. |

On-device processing alone is not collection under the stores' definitions, but final declarations depend on the binary, libraries, and enabled services. Do not infer “no data collected” solely from the absence of login. Use the linked [Google](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en) and [Apple](https://developer.apple.com/app-store/app-privacy-details/) definitions.

The default version needs no AI key or enabled Naver SDK. Revisit policies and forms when enabling native maps, telemetry, or server chat. Preserve source dates and the distinction between published timetables and live bus tracking.

## 7. Future Expo/EAS commands

These commands apply to `mobile/`, not the main Java APK. Follow [STORE_RELEASE.md](STORE_RELEASE.md) for dependencies, generated mobile content, and publisher variables. Keep `src/` and `mobile/` together at the repository root.

From `mobile/`, after configuration:

```powershell
npx eas-cli@24.8.0 login
npx eas-cli@24.8.0 init
npm run check:release
npx eas-cli@24.8.0 build --platform android --profile preview
npx eas-cli@24.8.0 build --platform android --profile production
npx eas-cli@24.8.0 build --platform ios --profile production
```

Run only the desired build: Android `preview` produces APK; Android `production` produces AAB; iOS `production` needs Apple signing. The `simulator` profile is not an iPhone installer. These are future instructions, not evidence of completed builds. See [EAS Build](https://docs.expo.dev/build/setup/).

For a completed iOS build, use `npx eas-cli@24.8.0 submit --platform ios --profile production` and select the correct artifact. For Android, the first AAB can be uploaded manually to Play's internal track. The existing Android submission profile is **internal/draft**, not automatic production publishing. See [EAS submission](https://docs.expo.dev/deploy/submit-to-app-stores/).

## 8. Release sequence

| Stage | Required outcome |
|---|---|
| Demonstration | Use the generated Java APK; host the PWA over HTTPS; finish device installation and reopening checks. |
| Student testing | Record usability issues and correct answers/sources without inventing classes, timetables, entrances, or current geometry. |
| Store preparation | Publisher accounts/identity, private keys, public privacy/support pages, actual screenshots, accurate declarations. |
| Public Android release | Production AAB, required closed testing, production-access application, and Google review. |
| Native iPhone release | Compiled/signed IPA, physical-device TestFlight testing, and Apple review. |
| Maintenance | Increment versions, preserve appropriate signing, update dated sources, and provide support. |

The historical map and local assistant are demonstrable features. Do not claim a 2026 field survey, access to a student's current class, live arrival predictions, or verified accessible routes without supporting data and validation.
