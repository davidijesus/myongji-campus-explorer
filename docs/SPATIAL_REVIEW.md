# Position, proportion and spacing review — v0.4

This records the v0.4 Yongin layout revision. The layout was reconstructed from the [vector plan published by Myongji](https://www.mju.ac.kr/bbs/mjukr/147/116783/download.do). The PDF's creation metadata is dated March 8, 2021; this does not certify the survey date or the campus's current condition. The [evidence record](POSITION_EVIDENCE.md) documents the label review and conflicts with directory markers. Seoul's separate evidence is recorded in [SEOUL_EVIDENCE.md](SEOUL_EVIDENCE.md).

## What changed

- One horizontal scale: the 300 m graphic scale spans 145.68005371 points in the displayed PDF. Both axes use 2.05930731324 m per point and 0.46 scene units per meter. The printed “1:3,000” scale was not applied directly to the resized digital PDF dimensions.
- 46 references use the drawing: 32 vector envelopes, six subdivisions of connected complexes and eight traced sports areas. Among the 32 vector associations, the guardhouse remains provisional: its small outline has no readable name on the plan, and the association relies on the marker and its surroundings. The app discloses this limitation.
- G, K, Elpenheim and the gate retain approximate directory-based positions because their outlines could not be identified reliably.
- The 48 official markers remain preserved separately. None was moved to make the illustration look correct. Nearly coincident markers, such as Y14/Y83, are not treated as proof of a shared building.
- Y_/Y5, Y6/Y7 and Y12/Y20 use the drawing's polygons, including courtyard voids. The model divisions are approximate visual allocations within connected complexes, not verified internal boundaries.
- The other models, including roofs and details, stay within their rotated envelopes. Bases and shadows that artificially enlarged buildings were removed. Illustrative heights were reduced; no new height or floor-count measurement is claimed.
- The main field, courts, amphitheater and main corridors were reoriented using the plan. The small field is rectangular. Road lines provide visual context without promising access or navigation.

## How to check the scale

The examples below are straight-line distances between the **centers of the envelopes used to draw the models**. They are not distances between doors, facades or official markers, and are not walking distances.

| Drawing references | Approximate distance at the document's scale |
| --- | ---: |
| Y14 / Y83 | 60 m |
| Y12 / Y20 | 51 m |
| Y6 / Y7 | 57 m |
| Y13 / hydraulics laboratory | 90 m |
| Y9 / Y23 | 63 m |

Camera position and 3D perspective change the apparent size on screen; use the 2D view to compare the layout. Zoom and rotation affect the whole view without moving individual buildings to accommodate labels.

## Verification

The spatial suite checks the original markers, the 300 m scale, the transformation of the 46 models, all 1,035 pairwise distances between them, and the generated vertices of all 50 places. Overlap checks compare the area of physical triangles projected onto the ground. Shared boundaries are accepted; bounding rectangles that cross courtyards are not classified as collisions by themselves. Recorded results appear in the [test report](TEST_REPORT.md).

The extraction data is included in `data/official-plan-footprints.json`, `data/official-plan-complex-splits.json` and `data/official-plan-outdoors-roads.json`; the app uses `src/plan-layout.ts`. OpenStreetMap was used only for a research comparison, and its outlines were not incorporated into the distributed geometry.

Run `python scripts/generate-plan-layout.py --check` to reproduce the data with the Python 3 standard library and check the module without changing it. Without `--check`, the script regenerates the module from the three evidence files; run the normal project build afterward.

The result preserves relative proportions from the historical document. These values do not establish a current survey, GPS registration, accessible entrance or verified route. Vegetation, terrain, facades, heights, road widths and sports details remain illustrative.
