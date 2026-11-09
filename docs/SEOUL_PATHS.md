# Seoul illustrated pavement — October 16, 2026

## Update — 9 November 2026

Seven schematic paved traces now represent the reviewed internal circulation areas. The original three traces remain unchanged. Four additions show the west side of the entrance island, the lower apron outside the sports terrace toward MCC, a separate ground-level court between the MCC gardens, and the exposed Administration frontage. These stop before hidden continuations, stairs or building envelopes; no external street loop is inferred.

The official MCC panorama also verifies a short side stair from the sports terrace to an **intermediate elevated landing**. The new detail preserves that relationship, with a visible gap of more than one scene unit from the lower paved shoulder. Its six rendered treads, dimensions, solid display plinth, orientation and levels are schematic choices, not construction measurements. The larger central MCC stair is not forced through the existing approximate building envelope. The lower court stops before it.

Primary photographic evidence for the court and stair: [university notice](https://welfare.mju.ac.kr/bbs/welfare/243/227771/artclView.do), [1294 × 858 MCC panorama](https://gsca.mju.ac.kr/CrossEditor/binary/images/000355/20251128163849970_107N73HV.png). The side stair appears in image region `[1134,315,1210,430]`; the lower central court appears in `[488,566,624,795]`. Capture date is unknown. Source access was checked on 9 November; this is not an on-site survey.

The [evidence JSON](../data/seoul-path-evidence.json) records each new source region, observation, schematic trace and exclusion. [Vegetation notes](SEOUL_VEGETATION.md) document the seven planted areas. Buildings, directory markers, field surface, Yongin and the empty live navigation graph are preserved. The map never claims verified entrances, vehicle permissions, walking distances or step-free routes.

The October notes below describe the original three traces and remain historical provenance; the November additions and limited stair detail above extend that visual coverage.


Three short paved corridors now give the Seoul model the same muted pavement and pale shoulder treatment as Yongin. All existing building markers, centres, sizes, angles and model forms are retained. The live navigation graph remains empty.

The primary reference is the [university’s labelled Humanities campus illustration](https://www.mju.ac.kr/sites/mjukr/images/temp_1783296837696100.png), currently embedded on the [official campus-tour page](https://www.mju.ac.kr/mjukr/12348/subview.do). It is a 1200 × 818 oblique drawing, SHA-256 `d39ab84a9163d81a39a36a45711a816c6467bd20b85baf37399cbf59092fd810`. The same arrangement is corroborated by the [2025 graduate admissions guide, physical page 6](https://www.mju.ac.kr/bbs/record/359/168757/download.do) and the [official language centre’s March 2025 building-number illustration](https://klec.mju.ac.kr/home_up_file/2025/20250306_202041_2.png). These sources were reviewed locally. An [official university newspaper photograph](https://news.mju.ac.kr/news/articleView.html?idxno=12317) additionally captions the corridor from the main gate toward Student Union (정문에서 학생회관으로 가는 길목); it corroborates that visible connection without supplying measured geometry.

| Illustrated corridor | Visible evidence retained | Deliberate stopping point |
| --- | --- | --- |
| Inner main-gate corridor | Pale approach from the labelled gate, beside the planted island and Student Union | The paved gap south of International Hall |
| General Hall frontage | Pale space between General Hall / Student Union and the sports terrace, continuing toward Mirae Hall | The visible western frontage; no doorway or behind-building link |
| International Hall / library gap | Short pale strip in front of International Hall and beside the library | Within that visible gap, before any elevated library connection |

The [machine-readable evidence](../data/seoul-path-evidence.json) records the original source SHA-256, source image pixel regions, each retained observation and the three scene polylines. [seoul-paths.ts](../src/seoul-paths.ts) supplies those lines to the existing renderer. Source pixel rectangles locate the reviewed pavement in the drawing; they are not control points for a georeferenced transformation.

The drawing is oblique, has no measured scale and does not align metrically with the directory’s approximate point-of-interest markers. Accordingly the corridors are manually fitted to the existing schematic anchors, preserving their visible adjacency and open-space placement rather than implying a measured shape. Scene widths and the three pavement colours are display choices. Decorative trees are omitted within six scene units of the pavement so that they do not obscure it. Ground height and building geometry are unchanged.

No connection is inferred through a building, across the raised sports terrace or stairs, around an obscured rear elevation, or over the library bridge. The official tour’s visit order and the language-centre image’s arrow are not converted into path geometry. The lines do not establish public access, accessible routes, entrances, slopes, walking distances or travel times. The existing EN/KO/ZH map-evidence disclosure remains applicable, with an additional path-specific note.

The initially suggested `guide_02.pdf` was checked, not assumed: the current [2026 BCC guide](https://bizhrd.mju.ac.kr/default/img/guide_02.pdf) contains 73 physical pages; physical page 42 / printed page 41 is a UCheckPlus instruction sheet. Its SHA-256 is `74428be1c4eb1c03f2c5afaecc3f05f2fd7325de99a447911682b8f9f30124b8`. It was excluded as a path source.

Automated checks cover source/evidence agreement, the empty routing graph, unchanged building anchors, finite bounded centre lines, pavement clearance from all existing building envelopes, renderer layer heights and the absence of decorative trees over the corridor. Browser review covers Seoul and Yongin in 3D, 2D and Canvas fallback; see the task’s QA report for the executed browser results.
