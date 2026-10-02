# Yongin campus illustration evidence and limits

Directory rechecked 30 September 2026. The new 3D view represents real named campus landmarks. It is a **reference illustration, not a surveyed digital twin or a walking-navigation map**.

This record covers Yongin's 50 reference features. Version 0.5 adds Seoul's 11 references with [separate source and geometry evidence](SEOUL_EVIDENCE.md).

## Position and scale revision — version 0.4

The university’s [historical scaled site plan](https://www.mju.ac.kr/bbs/mjukr/147/116783/download.do), whose PDF metadata dates to 8 March 2021, is the primary relative-layout source. Its graphic 0–300 m bar calibrates both horizontal axes equally. Forty-six features follow its labelled footprints or manually traced outdoor areas; four unresolved entries retain directory-based placement (G, K, Elpenheim and the gate). Source pins are preserved independently and are not assumed to be building centroids.

Six connected halls use traced polygon extrusions, including courtyard voids: Y_/Y5, Y6/Y7 and Y12/Y20. Their connecting seams are approximate illustration allocations within the traced complex, not surveyed interior boundaries. Other models fit within their traced rotated envelopes, including roofs and surrounding decorative pads. Ground heights, facade detail and landscaping remain illustrative.

See [position evidence](POSITION_EVIDENCE.md), [spatial checks](SPATIAL_REVIEW.md), and the [visual audit](VISUAL_REFERENCE_AUDIT.md). The previous v0.3 offset-based placement is superseded; no per-building offset is used to resolve model crowding.

## Coverage

- 50 selectable reference features.
- All 32 Y-coded entries and all 11 A–K entries shown in the user's illustrated overview.
- Seven additional structures found in the official university directory.
- 40 modeled buildings/structures: 39 building forms plus the main gate. The remaining 10 features are outdoor facilities, courts, a monument, or the bus boarding area.
- 48 features have an official directory marker. I and J have no directory marker; their labelled outdoor areas are traced from the historical plan and remain unverified as current destinations.
- The official response contained 53 markers. The 48 structural/facility landmarks are included; the four separate shuttle-stop markers (articles 96–99) and student parking marker (103) are not separate meshes.

This covers the supplied overview and the named structures in the checked university directory. It **does not establish that every current campus outbuilding, annex, renovation or unnamed structure is present**. No as-built survey, campus GIS export, current aerial orthophoto or building-height dataset was provided.

## Sources

1. [Official Myongji campus directory](https://www.mju.ac.kr/campusMap/mjukr/view.do?findType=B), reached from the university's [campus map page](https://www.mju.ac.kr/mjukr/193/subview.do). The published page calls `POST https://www.mju.ac.kr/campusMap/mjukr/2/artclList.do` to list Natural Science Campus landmarks. This public read-only response supplied Korean names, article IDs, latitude and longitude. The source markers are preserved separately in `ReferenceFeature.marker`.
2. The user's attached illustrated overview, aerial photograph, and conventional map screenshot. They supply the Y/A–K labels, recognizable visual relationships, and the appearance of features such as the octagonal gymnasium. These are visual reference material, not a dimensional survey. The screenshots are not bundled as third-party map tiles.
3. [Official graduate-school classroom-code guide](https://www.mju.ac.kr/bbs/gs/195/174672/download.do), a one-page PDF. It independently confirms the principal academic building code patterns. In particular, `Yxxx` refers to Engineering Hall 1, while the attached overview's `Y1` label is Student Union. These must not be conflated in classroom search.

English names are descriptive translations of the Korean names; they are not asserted to be the university's official English building names. The official directory verifies the existence/name of an entry, not its code, model dimensions, opening hours, accessible entrances, room assignments or current operation.

## Complete reference inventory

An article number identifies the source marker in the official campus directory response. An em dash means no matching official marker was found; I/J use the supplied overview and labelled historical plan, without confirmation of current operation.

| Code / reference | Korean label | Official article | Rendering |
| --- | --- | ---: | --- |
| Y_ | 제1공학관 | 73 | Winged hall |
| Y1 | 학생회관 | 93 | Winged hall |
| Y2 | 창조예술관 | 56 | Courtyard hall |
| Y3 | 명진당 | 49 | Courtyard hall |
| Y5 | 제5공학관 | 81 | Hall |
| Y6 | 체육문화관 | 68 | Winged hall |
| Y7 | 체육관 | 83 | Octagonal gymnasium |
| Y8 | 제2공학관 (에코바이오관) | 66 | Winged hall |
| Y9 | 함박관 | 94 | Winged hall |
| Y10 | 선수숙소 | 59 | Residence |
| Y11 | 학군단 | 89 | Low-rise hall |
| Y12 | 디자인조형센터 | 46 | Courtyard composition |
| Y13 | 제4공학관 (토목환경관) | 80 | Winged hall |
| Y14 | 구조재료실험동 | 43 | Laboratory |
| Y15 | 수리모형실습동 | 62 | Laboratory |
| Y16 | 방목기념관 | 52 | Hall |
| Y17 | 산학협력관 | 95 | Winged hall |
| Y18 | 공동실험동 | 42 | Laboratory |
| Y19 | 제3공학관 | 74 | Winged hall |
| Y20 | 건축도시설계원 | 41 | Plan-based hall envelope |
| Y21 | 학생복지관 | 90 | Winged hall |
| Y22 | 60주년채플관 | 40 | Chapel |
| Y23 | 차세대과학관 | 82 | Winged hall |
| Y24 | 하이브리드구조실험센터 | 87 | Laboratory |
| Y30 | 명현관 | 50 | Residence |
| Y31 | 명덕관 | 47 | Residence |
| Y32 | 생활관 3동 · 첨부 지도 표기 | 76 | Residence; disputed mapping/name |
| Y33 | 생활관 4동 | 77 | Residence |
| Y34 | 생활관 5동 | 78 | Residence |
| Y35 | 생활관 복지동 (B동) | 79 | Residence services |
| Y82 | 온실 | 69 | Greenhouse |
| Y83 | 모형실험동 | 51 | Plan-based laboratory envelope |
| A | 대운동장 | 44 | Field and running-track illustration |
| B | 선수전용테니스장 | 60 | Court illustration |
| C | 소운동장 | 61 | Sports-field illustration |
| D | 테니스장 | 84 | Court illustration |
| E | 실내테니스장 | 64 | Indoor hall |
| F | 야외음악당 | 65 | Outdoor performance-area illustration |
| G | 백마상 | 57 | Abstract monument marker |
| H | 학생테니스장 | 92 | Court illustration |
| I | 야외농구장 | — | Historical-plan court; current status unverified |
| J | 풋살장 | — | Historical-plan court; current status unverified |
| K | 통학버스승강장 | 86 | Boarding-area illustration |
| Elpenheim | 엘펜하임 | 48 | Residence |
| Visitor residence | 방문자숙소 | 53 | Residence |
| Bus management office | 버스관리사무소 | 58 | Low-rise office |
| Guardhouse | 수위실 | 63 | Low-rise structure |
| Hydraulics laboratory | 유압실 | 71 | Plan-based laboratory envelope |
| Main gate | 정문 | 72 | Gate |
| Tennis court office | 테니스장관리사무소 | 85 | Low-rise office |

## Conflicts and approximations

- **Y32:** the attached overview says `3동`, but the candidate official marker's name is `생활관(제3학생기숙사(1동))`. The correspondence/current name requires confirmation. The reference entry stays `unverified` and displays this conflict; it is not silently renamed or presented as a confirmed dormitory destination.
- **Y14/Y83:** the directory pins are almost coincident, but the labelled official plan shows distinct buildings. Models follow the separate plan footprints; source pins remain unchanged.
- **Y12/Y20:** the plan shows a narrow architecture bar within the open Design & Modeling complex. Traced polygons preserve the courtyard instead of separating two overlapping rectangle models by an invented gap.
- **Hydraulics laboratory:** the labelled plan places the small structure beside the southeast end of Y15. Its directory pin conflicts with this position and is retained separately as source data.
- **Dormitories:** Y33/Y34/Y35 placement follows the explicit plan labels rather than assigning the nearest unnamed outline to a directory pin. The current Y32 naming conflict remains visible.
- **I/J:** basketball and futsal are identifiable in the plan, but no current directory-marker match is available; current status remains unverified.
- **G/K/Elpenheim/gate:** no sufficiently identified footprint was traced; their directory-based models remain approximate. No current dimensions are inferred from the 2021 drawing.
- Heights, facade/window/floor detail, ground silhouette, terrain, vegetation, water outlines, sports markings and road widths are **stylized approximations**. Model centers and envelopes from the plan are historical drawing measurements, not certified current real-world geometry.
- The terrain silhouette is not a university property boundary. The apparent roads are decorative context, not public-access or pedestrian network evidence. An apparent gap or street does not establish that a route is safe, open, accessible or traversable.

## Trust boundary in the implementation

`src/campus.ts` owns `ReferenceFeature` and `REFERENCE_CAMPUS`. This schema explicitly uses the `illustration` frame. Its marker coordinates serve source attribution and unresolved approximate placement only. `src/plan-layout.ts` keeps the calibrated historical drawing frame separate; a single translation retains camera framing without claiming GPS registration. They do not have a `Point` discriminator, elevation, entrance metadata or route-node identity.

`createReferencePlaces()` gives every place `point: null`, `buildingId: null`, no entrance IDs and `geometryEvidence.status: 'unverified'`. It produces no `Dataset.buildings`, `Entrance`, `PathNode` or `PathEdge`. The live navigation dataset therefore remains empty of unsurveyed geometry.

`CampusScene.setReferenceCampus(true)` displays these models separately from the existing geographic and demonstration render paths. `setRoute()` suppresses navigation and entrance overlays in reference mode. A selection centers the camera; it does not draw a walking route. Reference I/J/Y32 remain visible as qualified reference entries even though they are not verified live destinations.

## Interaction and validation

- 2D/3D share selection and view state.
- Pan, wheel/pinch zoom (0.45–4.5×), two-finger rotation, view rotation and reset are supported.
- The initial phone view crops around the campus core. Users can pan to the dormitories and outer academic cluster or zoom out to see the overall illustration.
- Selection centers its feature and zooms in when appropriate. Labels are collision-suppressed; search/list selection remains available for every reference entry.
- Both WebGL and the existing event-driven software fallback use the same generated geometry. This does not prove native GPU behavior or 30 FPS on a device.
- Shared TypeScript typecheck passed. Seven reference-data tests passed: exhaustive attached-code coverage, official marker inventory, navigation isolation, conflicting/unverified records, source-position conflicts, finite/unique selectable features, and distinct first-engineering/student-union identity.
- Browser visual checks and actual Android/iOS device validation are separate release checks. A measured, accurate campus model still requires permitted geospatial footprints, heights/elevation, entrance/path surveys and a current university inventory.
