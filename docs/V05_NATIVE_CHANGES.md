# Native changes — v0.5

- The primary Java/System WebView Android application now bundles both campuses and English, Korean and Simplified Chinese.
- Version 0.5.0, version code 2. The demonstration application ID and local signing certificate match v0.4. Preferences use the same localStorage key and HTTPS asset origin; old language/favorite preferences remain readable and campus defaults to Yongin.
- The separate Expo source accepts `zh` and stores `campusId`. It will not apply cached Yongin content to the Seoul view. Shared TypeScript types accept only the two known campus identifiers and validate optional Chinese translations.
- No new Android permissions, SDK credentials, chatbot service or embedded network request is needed by the primary APK.
- APK installation, upgrades, external links, WebView performance, accessibility and device lifecycle remain untested on a physical Android device.
- No IPA was produced. Apple signing and a macOS/Xcode or configured cloud build remain required. The included PWA is an alternative for iPhone after HTTPS hosting and Safari validation.
- Historical Expo Android compile/16 KB library findings remain documented separately; this update does not claim to fix them.
