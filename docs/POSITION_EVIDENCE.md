# Position, scale, and footprint evidence

Yongin research checked 2026-09-30. This audit distinguishes directory POIs, labelled plan geometry, community mapping, and illustration choices. It does not establish present-day surveyed building boundaries, entrances, floor plans, heights, accessible routes, or terrain elevations. Seoul has separate [evidence and geometry limitations](SEOUL_EVIDENCE.md).

## Strongest layout source

The university's [Natural Campus land-disposal location plan](https://www.mju.ac.kr/bbs/mjukr/147/116783/download.do), titled **명지대학교 자연캠퍼스 처분대상 위치도**, contains a north arrow, individually labelled buildings, grey vector footprints, roads, sports areas, and a graphic 0–300 m scale. The PDF creation metadata is **2021-03-08 17:15:29 +09:00**. That is a file metadata date, not proof of the survey date or continuing validity in 2026. Coloured outlines concern land-disposal/site-designation boundaries; they must not become app buildings or pedestrian routes.

The plan is a much stronger source for relative horizontal layout than the oblique aerial photographs or the stylized campus illustration. It supplies no coordinate reference system or latitude/longitude control grid. Derived coordinates therefore belong to a **scaled drawing frame**, not GPS.

The official source was visually inspected at full-page and enlarged campus/detail views. Label assignments below were read from those rendered views, not inferred solely from nearest directory markers.

## Scale calibration and vector extraction

- Displayed PDF page: 1191 × 842 points. Underlying media box: 842 × 1191; rotation 270°. PyMuPDF drawing points require the page rotation matrix `[0,-1,1,0,0,842]` to match the displayed page.
- Graphic scale endpoints in displayed page coordinates: 0 m at x **985.5609130859375**, 300 m at x **1131.240966796875**. Span: **145.6800537109375 points**.
- Uniform horizontal conversion: **2.05930731323911 m per displayed PDF point**. At 0.46 scene units/m, the conversion is **0.9472813640899908 scene units per PDF point** on both axes.
- The printed `1:3,000` text does not by itself match the rescaled digital PDF page dimensions. The graphic scale survives that resizing and is the calibration used here. Applying 1:3000 directly to PDF points would create a roughly 1.946× discrepancy.
- No raster image was embedded in the source. It contains 19,821 drawing paths and no extractable text. Grey building fill is approximately RGB `(0.7299306,0.7300221,0.7299001)`.
- 1,642 valid filled triangles were extracted. CAD export rounding leaves tiny cracks between them; closing them with a **0.002-point expansion**, about 4 mm at the drawing's graphic scale, yields 44 connected grey groups. This numerical cleanup is not a claimed survey tolerance.
- Research export `official-plan-footprints.json` preserves group outlines, interior rings, minimum rotated rectangles, area centroids, and scale metadata. Its angles are **degrees clockwise from page-right**, not scene rotation radians.
- Connected complexes were divided only for visual selection/model allocation. `official-plan-complex-splits.json` preserves six resulting regions, their holes, and constrained-Delaunay roof triangles. A 0.015-point simplification removes CAD export chatter (about 3 cm at the graphic scale). Roof triangle areas were checked against polygon areas; triangle representative points were checked inside the polygons.
- A plan region's minimum-rectangle center is an illustration reference. It is not an entrance, official POI, surveyed building center, or route endpoint.

For the current scene transform, x grows east/right and z grows south/down. With local scene rotation `[u,v] → [u cos(a)+v sin(a), -u sin(a)+v cos(a)]`, negate the exported clockwise angle when converting to radians.

## Directory points are map markers

The [official campus directory](https://www.mju.ac.kr/campusMap/mjukr/view.do?findType=B) publishes names and latitude/longitude through `POST https://www.mju.ac.kr/campusMap/mjukr/2/artclList.do`. The 2026-09-30 response had 53 records. Comparison with the cached 2026-09-29 response found **zero changed names or coordinates**.

The directory's JavaScript uses the values to center a Kakao map and create `kakao.maps.Marker({position: markerPosition})`. It does not identify them as surveyed centroids, entrances, footprint vertices, or precision-qualified coordinates. Some are demonstrably incompatible with the labelled plan. Keep the raw points and their provenance for audit; do not force all physical geometry to be centered on them.

The following are **straight-line distances between directory markers**, calculated from a WGS84 local tangent approximation near latitude 37.2222°. They are not walking distances, distances between doors, or gaps between walls:

| Directory marker pair | Approximate separation |
|---|---:|
| Y12 / Y20 | 30.16 m |
| Y14 / Y83 | 0.24 m |
| Y13 / hydraulics laboratory | 37.99 m |
| Y6 / Y7 | 60.92 m |
| Y3 / Y5 | 84.27 m |
| Y32 / Y33 | 67.04 m |
| Y33 / Y34 | 91.72 m |
| Y33 / Y35 | 64.33 m |
| Y34 / Y35 | 45.62 m |
| Small sports field C / tennis D | 66.27 m |

These figures diagnose the earlier marker-based illustration. The corrected plan-based drawing has its own consistent relative distances and must not be described as preserving every flawed directory-marker separation.

## Consequential conflicts and how the plan resolves them

| Places | Evidence from the labelled plan | Consequence for illustration |
|---|---|---|
| Y14 / Y83 | `[14]구조재료실험동` is a long lab south of Y13; `[83]모형실험동` is a separate small rectangle immediately southwest of Y13 and northwest of Y14. Extracted groups39 and35 respectively. | The nearly duplicate directory points cannot be used as two measured physical centers. A shared Y14/Y83 model is only an interim treatment and is superseded by the separate labelled plan footprints. Do not retain the earlier arbitrary westward shift. |
| Hydraulics / Y13 / Y15 | `[86]유압실` is a very small room at the southeast end of `[15]수리모형실습동`, beside the indoor-tennis cluster. Groups37 and36. The small rectangle beside Y13 is labelled `[83]모형실험동`. | The directory hydraulics point near Y13 is inconsistent with this plan. Nearest-OSM-polygon assignment would misidentify Y83 as hydraulics. Use the explicit plan label for the drawing, and disclose the source conflict. |
| Y12 / Y20 | `[12]디자인조형센터` is the large bent/U-shaped complex; `[20]건축도시설계원` labels the narrow inner courtyard bar at its southwest end. They belong to connected grey group30. | Preserve the courtyard void and the narrow inner bar. Overlapping enclosing rectangles do not prove a physical collision. Six-region export separates the bar from the enclosing complex without adding a fictitious gap. The exact internal ownership boundary through connectors remains approximate. |
| Y6 / Y7 | `[06]체육문화관` is the smaller northeast courtyard wing attached to `[07]체육관`, the large faceted/octagonal gym. Both occur in group22. | Treat as a connected complex. Use the actual polygon rings; a generic box or octagon enlarged to an entire envelope can overlap its neighbour. The model split follows the visible connector neck, not a surveyed internal boundary. |
| Y_ / Y5 / Y3 | `[04]제1공학관` is the long northwest–southeast horizontal-on-plan wing joined to `[05]제5공학관`, extending southeast; together group19. `[03]명진당` is the separate block east of them, group21. Plan number04 corresponds to the project's `Y_` convention. | Preserve the perpendicular connected engineering wings and Myongjin's separate footprint. No artificial separation is needed between the engineering halls. |
| Dormitories33–35 | `[34]제3생활관5동(5동)` labels the west long block (group6); `[33]제3생활관4동(4동)` the east block (group7); `[35]제3생활관B동` the smaller block southwest of34 (group8). `[32]제3생활관1동(3동)` is the long southern group12. | Several directory POIs imply different relative positions. Use the plan labels for physical layout. Preserve the existing current-name/code uncertainty for Y32 rather than inventing a renaming history. |
| C / D / E | The plan labels `소운동장` northeast of the outdoor tennis complex, with courts to its southwest and `[84]실내테니스장` farther southwest (group38). The local office `[85]테니스장관리사무소` is group31 at the small-field edge. | Trace the actual outdoor ground regions separately. Do not enlarge adjacent generic rectangles until they collide. The plan's number84 labels indoor tennis and is not the directory article ID84, which refers to outdoor tennis. |

For perspective on the conflict, the **drawing allocation's minimum-rectangle centers**, calibrated from the graphic scale, are about 60.0 m apart for Y14/Y83 and 89.5 m for Y13/hydraulics, versus directory-marker separations 0.24 m and 38.0 m. These are different source representations and different point definitions. They must not be presented as two measurements of the same surveyed center pair.

## Visually checked grey-group identification

These refer to IDs in the research JSON, not campus codes. Connected groups require the split data above.

| Plan feature | Extracted group |
|---|---:|
| Visitor residence, plan `[36]방문…` | 1 |
| Y31 / Y30 | 2 / 10 |
| Y34 / Y33 / Y35 / Y32 | 6 / 7 / 8 / 12 |
| Y82 / Y22 / Y1 / Y21 | 4 / 5 / 11 / 13 |
| Y2 / Y18 | 14 / 15; nearby group16 is an unlabelled separate grey component |
| Y_ and Y5 connected complex | 19 |
| Y3 / Y6 and Y7 connected complex | 21 / 22 |
| Y8 / Y10 / Y23 / Y9 | 23 / 24 / 25 / 27 |
| Y16 / Y17 | 28 / 29 |
| Y12 and Y20 connected complex | 30 |
| Tennis office / outdoor music stage | 31 / 32 |
| Y19 / Y13 / Y83 / Y15 / hydraulics | 33 / 34 / 35 / 36 / 37 |
| Indoor tennis E / Y14 / Y24 | 38 / 39 / 41 |
| Bus management office, explicitly labelled `[81]버스관리사무소` | 3 |
| ROTC, explicitly labelled `[11]학군단` | 18 |

The current `PLAN_LAYOUT` mapping of all 32 vector-envelope models was independently checked against the rendered plan. **Guardhouse/group0 requires a qualification:** the small entrance-side grey footprint is not labelled as a guardhouse on this plan. Its identity is inferred by correspondence with the official directory guardhouse POI and entrance-side placement. The source geometry is real plan geometry; the identity association is weaker than the directly labelled buildings. Visitor residence/group1 is explicitly labelled `[36]방문…` in the enlarged western crop.

The Yongin integration covers **46 of its 50 map features** with this plan: 32 vector-derived envelopes, six allocations within connected source polygons, and eight manually traced outdoor areas. Four features—G monument, K commuter-bus area, Elpenheim, and the gate—retain approximate fallback placement because their specific physical geometry could not be reliably identified from this plan. This is coverage of the existing Yongin inventory, not proof that the inventory exhausts every physical structure on campus.

The outdoor plan explicitly labels **농구장** (basketball) and **풋살장** (futsal), with **족구장** (foot-volleyball) separately between the tennis and futsal areas. Features I and J therefore have historical university-plan evidence as well as the supplied illustration. Their present-day operation, access, condition, and continued use remain unverified; the plan must not be described as a current facilities inspection. Trace the basketball area east of the tennis/futsal cluster, not the separately labelled foot-volleyball court.

Group26 is a narrow walkway-like element, not evidence for an additional named building. Groups40,42,43 correspond to plan labels27/25/26, outside the existing modeled inventory. Elpenheim is labelled northwest of the main plan's grey footprint group set; that label alone does not supply a grey building footprint. Sports surfaces, the gate, and other unfilled shapes require separate source tracing. Absence from this extraction is not evidence that a place does not exist.

## OpenStreetMap cross-check — research only

A one-off read of the [OpenStreetMap map API bounding box](https://api.openstreetmap.org/api/0.6/map?bbox=127.177,37.216,127.193,37.227) retrieved 52 building ways. The relevant campus outlines are mostly unnamed version1 ways timestamped **2020-03-03T17:37:08Z**. They are community-mapped geometry, not university-verified measurements. OSM requires [OpenStreetMap attribution and ODbL compliance](https://www.openstreetmap.org/copyright) if its data is used in a distributed derived database or rendering.

OSM was useful for detecting connected complexes and identifying the danger of blindly centering models on POIs. It was superseded for the app's drawing geometry by the university's labelled vector plan. The raw XML and candidate file remain research artifacts; they are not app geometry inputs.

Examples of why candidate association is insufficient:

- OSM way778045620 contains both official engineering markers73 and81, consistent with the connected Y_/Y5 complex.
- Way778045643 contains both near-duplicate Y14/Y83 markers. It cannot establish two building identities. The primary plan separates those identities.
- Way778045641 lies closest to the directory hydraulics marker, but the plan labels the corresponding small building beside Y13 as **Y83**.
- Way778045663 contains directory marker77 (Y33) and lies near marker76 (Y32). The plan shows a long southern residence labelled32 and distinct northern residence blocks33/34/35. Proximity is not reliable identity evidence here.
- Several official points are near polygon edges or outside them: Y12 roughly0.5 m from a candidate edge, Y20 roughly1.6 m; Y2 about15.9 m outside its candidate; Y6 about4.5 m outside the joined sports-complex candidate. These are candidate-geometry diagnostics, not surveyed accuracy estimates.

The user-supplied geographic screenshot has no visible scale bar or georeferenced corner coordinates. It corroborates broad topology, not direct metric pixel measurements. The oblique aerial and illustrated map have perspective/stylization and cannot support a single reliable pixel-to-meter conversion.

## Implementation constraints supported by this audit

1. Use one origin and one uniform horizontal scale for the entire drawing. Framing, pan, zoom, and label displacement belong to the camera/UI, not ad hoc per-building location offsets.
2. Keep raw official markers separate from physical illustration positions where the labelled plan contradicts them. Do not silently replace or re-label source coordinates as surveyed values.
3. Use actual polygon holes for courtyards. Test ground-plane footprint intersections rather than screen-space labels or bounding boxes. Shared boundaries and physically connected halls are valid; artificial gaps should not be created merely to satisfy a generic overlap test.
4. If a conservative rectangular model is used inside a nonrectangular source outline, retain the limitation. Do not portray an enclosing rectangle as an exact footprint.
5. Plan-derived dimensions and separations inherit the age and uncertainty of the plan. Avoid unnecessary decimal precision in user-facing descriptions. No inferred floor/window count, entrance, tree location, elevation, or pedestrian access should become a verified fact.
6. The current app remains an illustrated campus guide. The historical drawing, approximate heights, current directory records, and available photos do not establish an accurate live navigation dataset.

Technical background for geographic marker calculations: [PROJ topocentric conversion](https://proj.org/en/stable/operations/conversions/topocentric.html) describes geographic-to-geocentric-to-local-east/north/up transformation. A WGS84 ECEF→ENU calculation with a single scene-units/meter factor is appropriate for comparing directory-marker spacing. It does not correct wrong source markers or georeference an unregistered PDF.

## Research artifacts

The original research archive is not included in this repository. It contained `official-land-plan.pdf`, full/cropped reviewed PNGs, `official-plan-footprints.json`, `official-plan-footprint-groups.png`, `official-plan-complex-splits.json`, `official-plan-complex-splits.png`, `official-plan-design-split-review.png`, extraction scripts `extract-plan.py` and `split-complexes.py`, `osm-campus.xml`, and `osm-building-candidates.json`.

The distributed evidence inputs are `data/official-plan-footprints.json`, `data/official-plan-complex-splits.json` and `data/official-plan-outdoors-roads.json`. Run `python scripts/generate-plan-layout.py --check` to verify the generated layout from those inputs. Source links above identify the external reference material.

The university source PDF and photos are reference material; the app uses derived illustration geometry and source links. This audit does not grant asset-republication rights or university endorsement.
