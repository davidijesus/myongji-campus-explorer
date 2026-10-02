# Historical native validation — v0.4.0, 30 September 2026

**An Android demonstration APK was built and statically verified using the independent Java/System WebView shell. The Expo Android build did not finish. No Expo APK, AAB, or iOS IPA was produced. No device installation or launch was tested.**

The preserved consolidated record is [native-v04-results.json](native-v04-results.json). See [NATIVE_VALIDATION.md](NATIVE_VALIDATION.md) for the current release. Files named `current-*` now describe the latest revision unless explicitly versioned; their names below record the original evidence. The v0.2 history, including its disk-space failure and Hermes hashes, is preserved in [NATIVE_VALIDATION_V02.md](NATIVE_VALIDATION_V02.md).

## Delivered Android APK

| Item | Actual result |
| --- | --- |
| File | `myongji-campus-explorer-v0.4-android.apk` |
| Size | 152,099 bytes |
| SHA-256 | `0465207759b19f7dd50294af9a9c7d5f611bc06784475ca4a408cc839a83e946` |
| Application ID | `dev.student.myongjiexplorer.standalone` |
| Version | 0.4.0; code 1 |
| SDK | Minimum 24; compile/target 36 |
| ABI | Architecture-independent Java/Dex; zero bundled native `.so` libraries |
| Build | Embedded offline HTML; no Metro or Expo account needed |
| Signing | Self-signed development RSA 3072 key; APK v2/v3 signatures verified; not publisher release signing |
| Certificate SHA-256 | `dc047d342057bbf022d14f94865f186f7a0dc52872275f5777f59b3d5a3dac32` |
| Permissions | Zero Android permissions |
| ZIP alignment | `zipalign -c -P 16 4` passed |
| Bundled page | Exact frozen HTML SHA-256 `702a95fb103f1a8b878f1f75d6bfcc4a20e844c64daaa602728abc43378abb13` |
| Link policy | 30 JVM cases passed |
| Desktop asset smoke checks | Six passed under the shell's local HTTPS origin/CSP; not Android execution |
| Device/emulator installation and launch | Not performed |

Detailed evidence: [standalone results](current-android-standalone-results.json), [desktop asset smoke results](current-android-standalone-asset-smoke.json). `android-standalone/build.ps1` reproduces direct SDK packaging. The development private key is outside the distributed source.

This shell uses System WebView, local DOM storage, intercepted offline assets and reviewed external source links. It has no native GPS/Naver bridge or remote-content refresh. Real asset startup, browser handoff, preferences, keyboard, insets, lifecycle, accessibility and rendering still require Android device testing. Zero bundled native libraries avoids the React Native ELF issue below; 16 KB device runtime behavior was not tested.

## Shared Expo project

| Check | Actual v0.4 result |
| --- | --- |
| Installed packages | Expo 57.0.26; React Native 0.86.3; React 19.2.3 |
| Dependency-aware TypeScript | Passed again with the frozen final page |
| `npx expo install --check` | Up to date |
| Expo doctor | 21/21 passed; [current output](native-v04-doctor-result.txt) |
| Android Expo prebuild | Passed; version 0.4.0/code 1, `dev.student.myongjiexplorer` |
| Optional Naver module | Excluded by default; no credentials required |
| Frozen `mobile/generated/page.ts` SHA-256 | `0625b6449e8d1b1f2eaefe6b045aa85decb4dd38454f35e378ccef21b1d6c509` |
| Android native compile | Two attempts reached CMake/Ninja; native app task failed on paths over 260 characters |
| Final v0.4 Hermes export | Not separately performed; v0.2 hashes are historical only |
| Expo APK/AAB | Not produced |
| iOS compile/IPA | Not performed/produced |

### Native build evidence

Toolchain: Oracle JDK 18.0.2.1, Gradle 9.3.1, AGP 8.12.0, Build-Tools 36.0.0, NDK 27.1.12297006, CMake 3.22.1, Ninja 1.10.2 and Kotlin 2.1.20. Compile/target 36 and minimum 24 resolved successfully.

The incomplete NDK was repaired additively from Google's official `android-ndk-r27b-windows.zip`, verified against repository SHA-1 `3bb7efc850cd0af7707854b7e0d5c3b6a7153703`. Existing installer metadata was preserved; only this run's verified temporary archive was removed afterward. Build-Tools 36 installed under the existing SDK license. No unrelated files or SDK components were deleted.

Both attempts ran from `mobile/android` with SDK/JAVA environment paths and `NODE_ENV=production`:

```powershell
.\gradlew.bat :app:assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon --max-workers=2 --console=plain
```

Dependency retrieval, module discovery, code generation and CMake configuration proceeded. The first native app task failed on a generated ReactAndroid CMake path over 260 characters. A temporary Windows `SUBST M:` alias was tried without moving/copying source. The retry failed on an async-storage generated C++ path that still resolved to the original long directory. Remaining Expo workers repeated path warnings; only those failed build process trees were terminated. The final “daemon disappeared” message reflects deliberate termination after the native task had failed.

The temporary alias was removed. Approximately 3.61 GiB remained free. These v0.4 attempts were **path-limit failures, not disk-space interruptions**. Raw working logs remain at `work/android-v04-build.log` and `work/android-v04-short-path-build.log`. Future Expo compilation needs a genuinely short checkout/build path or validated newer Windows tooling; the alias did not resolve every canonical path.

### Separate upstream 16 KB limitation

Static inspection of the downloaded RN 0.86.3 release AAR found all five arm64 libraries' LOAD alignments at least 16,384 bytes. Four fail GNU_RELRO end alignment: `libc++_shared.so`/`libfbjni.so` remainder 12,288; `libhermestooling.so` 8,192; `libjsi.so` 4,096. `libreactnative.so` has remainder 0. These are upstream AAR findings, not a final APK or runtime test; [hashes and headers](native-v04-upstream-elf.json) are recorded.

Android's [16 KB guidance](https://developer.android.com/guide/practices/page-sizes) calls for ELF LOAD, GNU_RELRO end, ZIP alignment and runtime checks. App linker flags alone do not rebuild precompiled dependencies. An upstream rebuild/update and fresh verification are needed before claiming Expo 16 KB compatibility.

## Remaining release gates

Validate the selected app on physical devices: offline cold start, restore, storage, map gestures, performance, text sizing/screen readers, external links and system UI. iOS requires native compilation and signing. Publisher identifiers, release keys, public privacy/support pages, rights review, store declarations and store review remain pending. No account, cloud build, upload or store submission was initiated. See [DISTRIBUTION_GUIDE.md](DISTRIBUTION_GUIDE.md) and [STORE_RELEASE.md](STORE_RELEASE.md).

