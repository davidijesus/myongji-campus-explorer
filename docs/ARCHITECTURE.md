# Architecture decision record

**Decision date:** 29 September 2026. **Status:** provisional until the two-platform native proof of concept passes.

**Historical scope:** this decision record describes the original Expo shell and geographic-content prototype. Version 0.5 also includes a primary Java/System WebView Android app and a PWA, with separate illustrated Yongin and Seoul datasets. The Java app has no GPS or remote content-refresh feature. The Expo and Naver behavior below applies to the optional integration source, not automatically to every distribution. See [V05_NATIVE_CHANGES.md](V05_NATIVE_CHANGES.md), [MAP_EVIDENCE.md](MAP_EVIDENCE.md) and [SEOUL_EVIDENCE.md](SEOUL_EVIDENCE.md).

## Boundaries

The UI is a bundled HTML/CSS/TypeScript document inside a React Native WebView. This choice makes the full miniature-map interaction available as a self-contained preview and allows device-independent tests without a 3D-engine dependency. WebGL renders first-party meshes; a small software z-buffer renderer uses the same vertices when WebGL is missing. It is event-driven, not an always-running animation loop.

The Expo shell owns operating-system location permission, a one-shot location read, persisted favorites, cached first-party campus data, provider handoff, safe areas and application lifecycle. It passes only typed messages into the bundled document. The document cannot publish administrative content or access a server secret. Mobile location history is not persisted by the first-party code.

Naver is a separate Swift/Kotlin native map view. It receives validated live coordinates, names, IDs and routes reconstructed from the authoritative dataset. It does not receive fictional coordinates, scrape provider tiles, load custom campus meshes into the SDK, or assume a deep link returns route geometry.

The content service is a small Node HTTP service for a single curated dataset. It is meant to sit behind HTTPS, not replace a complete institutional identity platform. Public browsing needs no account. Administrative publishing is a protected CLI operation, not a public editing feature.

## Shared contracts

`Dataset` in `src/types.ts` is the geographic source of truth. Place IDs join buildings, entrances, food venues, events and room mappings. Entrance IDs are distinct from building IDs. A selected place and entrance remain application state, independent of renderer. Dijkstra consumes the same pathway graph that produces the route overlay.

Real points use WGS84 latitude/longitude and optional elevation. The custom scene converts them to an east/up/south meter frame around one origin. Demo points are a different tagged type containing local `x/z/elevationM` values. A demo dataset has no WGS84 origin. The client and publication validator reject mixed frames and demo evidence in live content.

The frame conversion is a small-area approximation, not a full GIS projection pipeline. Survey alignment, footprint orientation, elevation datums and model tolerances require field validation before real navigation. No campus boundary or real model frame has been seeded.

## Why not use a general preview client as proof?

The browser tests exercise neither iOS WebKit nor Android WebView. A local Expo native module needs a custom build. The official SDKs' existence does not establish compatibility with the selected Expo/RN versions. Dependency installation, Android compilation, CocoaPods resolution, Swift signatures, module discovery and lifecycle forwarding are therefore explicit release gates.

## Deliberate scope limits

There is no indoor positioning, turn-by-turn voice guidance, continuous GPS tracking, automatic GPS-to-path connector, accessible-route certification, AI recommendation service, public user-generated content or administrative GUI. Live campus geometry and content remain empty until verified data is supplied.

The current building primitives are development proxies, not an automatic architectural-reconstruction system or GLB importer. The software renderer prioritizes a useful fallback, not a promise of 30 FPS. A 2D/list experience must remain available when detailed 3D is too expensive.

## Risk controls

Only explicitly public, usable graph nodes and edges are routed. Unknown stairs are excluded when avoiding stairs; unknown accessibility is not relabeled as wheelchair access. Distances come from edge records, never a straight line shown as a walk. Food hours expire to unknown after 14 days in live mode. Event times use Asia/Seoul and finished events are not upcoming.

Incoming content is structurally and relationally validated. Source URLs and a verified flag are **not automatic factual verification**: an administrator still needs to verify that each source supports the record. Publication uses authenticated access, version compare-and-swap and atomic file replacement. Tokens, provider credentials and real-user location must not appear in test fixtures or logs.
