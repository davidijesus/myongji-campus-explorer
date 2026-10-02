# Historical native validation — version 0.2, 29 September 2026

This record applies to **version 0.2**, not the current release. Version 0.3 subsequently regenerated the shared HTML and passed mobile dependency-aware TypeScript on 30 September; no new native compilation or Hermes export was performed for that revision. The hashes below are historical v0.2 artifacts. See [TEST_REPORT.md](TEST_REPORT.md) for current verification.

## Checks completed on Windows

| Check | Observed result |
| --- | --- |
| Registry and official version verification | Expo 57.0.26 exists on npm. Expo's SDK compatibility table specifies React 19.2.3 / React Native 0.86. The installed SDK manifest recommends RN 0.86.3. |
| Install dependencies and lock graph | Passed; `mobile/package-lock.json` is included. Node 22.19.0 / npm 10.8.1 were used. |
| `npm run typecheck` | Passed against installed Expo / React Native / WebView / location / storage type definitions. This supersedes the old syntax-only check. |
| `npm run doctor` | **21/21 passed** after correcting the direct native-core import and native-source ignore patterns. Raw result: `native-doctor-result.txt`. |
| `npx expo install --check` | Dependencies are up to date for SDK 57. |
| `npx expo export --platform all --output-dir dist` | Passed for Android and iOS, including a final rerun after the completed UI/data/source corrections. Produced Hermes bundles, approximately 1.9 MB each. This is a JavaScript bundle check, not native compilation. |
| Android Expo prebuild | Passed and generated the Android Gradle project. |
| Optional Naver autolinking | Confirmed `campus-naver` absent from the default Android module discovery; 19 Expo modules found. |
| Native external-link policy | 13 assertions passed: Myongji subdomains, the exact supplied Notion guide, and map links allowed; insecure schemes/credentials/lookalike domains/arbitrary redirect URLs and unrelated Notion pages rejected; configured publisher origin allowed. |
| Public Expo configuration | Resolved successfully with development identifiers, original icon, foreground-only location, and Naver disabled. `native-config-validation.json` records the configuration. |
| Production release guard | Correctly fails for missing publisher-owned package/bundle identifiers, Expo account/project identity, and public privacy/support URLs. The original icon is present. |
| iOS prebuild on Windows | Attempted and refused by Expo: iOS native project generation requires macOS or Linux. No CocoaPods, Xcode compile, IPA, simulator, or iPhone validation occurred. |
| Dependency audit | `npm audit --omit=dev` returned 10 moderate notices cascading from a transitive `uuid` advisory in Expo build tooling; zero high or critical notices. `mobile-dependency-audit.json` records the result. No incompatible forced downgrade was applied. Recheck upstream fixes before release. |

## Android native compilation

The final successfully exported `mobile/generated/page.ts` has SHA-256 `A46A6848705ACA2089163312E9216FA6DC994806EED61581E9FAB0537741BD98`. The final Android Hermes bundle is `index-5b37ff203a7fc4972883d435ee08c801.hbc`; iOS is `index-833336e1fdba0ae87891c2cc55f42b99.hbc`. Dependency-aware TypeScript passed immediately before that export.

An actual `gradlew.bat :app:assembleDebug --no-daemon --console=plain` build ran with the existing Android SDK and Oracle JDK 18.0.2.1. Gradle 9.3.1 downloaded successfully, and **32 native build-plugin tasks executed**. App configuration resolved Android compile/target API 36, min API 24, build-tools 36.0.0, NDK 27.1.12297006, and Kotlin 2.1.20.

The build **failed after 9 minutes 35 seconds** while downloading NDK 27.1.12297006 because the C: drive ran out of disk space. The native error was `java.io.IOException: Espaço insuficiente no disco` (insufficient disk space), followed by `InstallFailedException` for `ndk;27.1.12297006`. The package downloader cleaned its large temporary download; approximately 1.2 GB remained free after failure. The new incomplete NDK folder contains only installer metadata. Automatic approval review blocked removing that folder, giving only “blocked by policy” as its reason, so it was left in place. The pre-existing NDK 27.0 installation and unrelated user files were preserved.

**No APK, AAB, or IPA was produced.** No device was launched. Free sufficient disk space or use the owner's configured EAS build account, install the required SDK components, then rerun compilation. Prebuild and Hermes export are not substitutes for a completed native binary.

## Still unverified

Physical-device launch and UI, actual Android/iOS graphics behavior and frame rate, GPS and operating-system permission dialogs, screen-reader behavior, battery use, external map handoff, memory/process recovery, optional Naver SDK authentication, and store acceptance. No cloud builds or store submissions were initiated.

See [STORE_RELEASE.md](STORE_RELEASE.md) for publisher configuration, commands, native/device release gates, and the distinction between a testing APK and publisher-signed store artifacts. Recheck the linked official requirements before a future submission.

