# Historical source and verification register — initial prototype

Reviewed on **29 September 2026**. URLs below are primary sources. Documentation review is not runtime integration verification.

This preserves the initial Expo/geographic-prototype review. Statements about empty seed content, unavailable visual references and pending integration describe that stage. Later source work is recorded in [CONTENT_EVIDENCE.md](CONTENT_EVIDENCE.md), [BUS_TIMETABLE_UPDATE.md](BUS_TIMETABLE_UPDATE.md), [MAP_EVIDENCE.md](MAP_EVIDENCE.md), [VISUAL_REFERENCE_AUDIT.md](VISUAL_REFERENCE_AUDIT.md), [POSITION_EVIDENCE.md](POSITION_EVIDENCE.md) and [SEOUL_EVIDENCE.md](SEOUL_EVIDENCE.md). Current build evidence is in [NATIVE_VALIDATION.md](NATIVE_VALIDATION.md).

| Source | URL | What it supports / limitation |
|---|---|---|
| Myongji official campus map page | https://www.mju.ac.kr/us/3407/subview.do | Readable page identifies the Natural Science Campus at 116 Myongji-ro, Cheoin-gu, Yongin-si, Gyeonggi-do, 17058. It did not provide verified entrance/path coordinates or a usable georeferenced building model in the retrieved content. |
| Requested visual reference | https://www.youtube.com/watch?v=J3xaQHhOk5U | Retrieval was unsuccessful. No screenshot was actually attached. No claim of visual inspection or precise reproduction is made. |
| Expo version compatibility | https://docs.expo.dev/versions/latest/ | Expo 57 / RN 0.86 / React 19.2.3 target and documented platform requirements; actual dependency resolution is pending. |
| Expo WebView | https://docs.expo.dev/versions/latest/sdk/webview/ | Bundled web UI component and installation approach. Native WebView rendering is not verified by the desktop browser run. |
| Expo location | https://docs.expo.dev/versions/latest/sdk/location/ | Foreground permissions and location API/configuration. Actual OS permission states remain to be tested. |
| Expo native view tutorial | https://docs.expo.dev/modules/native-view-tutorial/ | Local native-view/module integration approach; current generated templates still need compilation checks. |
| Expo module API | https://docs.expo.dev/modules/module-api/ | Native view props/events and Android view-destruction hooks. |
| Naver Android setup | https://navermaps.github.io/android-map-sdk/guide-en/1.html | Official Maven repository, map SDK 3.24.0 example, NCP key metadata, service selection and authentication behavior. |
| Naver Android lifecycle | https://navermaps.github.io/android-map-sdk/guide-en/2-1.html | Required MapView lifecycle forwarding. |
| Naver iOS setup | https://navermaps.github.io/ios-map-sdk/guide-en/1.html | NMapsMap CocoaPod, NMFNcpKeyId and dynamic-framework requirements. |
| Naver URL schemes, English | https://guide.ncloud-docs.com/docs/en/maps-url-scheme | `nmap://place`, `/route/walk`, `/search`, required `appname`, coordinate/name encoding and optional start coordinates defaulting to the user's location in Naver. |
| Naver URL schemes, Korean | https://guide.ncloud-docs.com/docs/maps-url-scheme | Companion guide. The retrieved English page exposed the walking-route section and common route parameters more completely. |
| Naver iOS marker / overlays | https://navermaps.github.io/ios-map-sdk/guide-en/5-2.html and https://navermaps.github.io/ios-map-sdk/guide-en/5-4.html | Marker and polyline APIs used as implementation references, pending native compile/runtime validation. |
| Naver Android overlays | https://navermaps.github.io/android-map-sdk/guide-en/5-4.html | Official polyline overlay behavior; it does not calculate a pedestrian route. |

## Data provenance boundary

Only campus identity/address have been transcribed into the real seed. English/Korean interface translations and demo names are first-party prototype copy, not a verified university building directory. Fictional buildings, local geometry, room D201, food prices/hours and event records are marked as demo records and are not sources about Myongji.

The code does not infer accurate walking paths from the official address, recover hidden campus geometry from a map provider, or label undocumented dietary/accessibility facts as verified. A future editor must review supporting evidence before publishing any new real record.
