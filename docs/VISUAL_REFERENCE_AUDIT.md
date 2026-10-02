# Yongin visual reference audit — 2026-09-30

The catalogue covers **all 40 Yongin building/gate records modeled at this review**. It does **not** claim that 40 individual building photographs were found, that every real campus structure has been inventoried, or that the illustrations are surveyed reconstructions. Later layout evidence is recorded in [POSITION_EVIDENCE.md](POSITION_EVIDENCE.md); Seoul's separate record is [SEOUL_EVIDENCE.md](SEOUL_EVIDENCE.md).

Current evidence coverage: **10 exterior-photo records, 10 video-frame records, 12 overview-only records, 8 without a usable individually identified exterior view**. Multiple photographs of one building count once. Video frames and the older overview are separate evidence classes. `src/visual-references.ts` is the machine-readable register; it includes every modeled building, observations, source links, explicit unknowns and the review date.

## What was inspected

- The supplied cartoon campus map, aerial photograph and map screenshot establish the user's requested visual direction. Their dates, image rights and exact geometry are unknown.
- All **53 entries** from the [official natural-campus directory](https://www.mju.ac.kr/campusMap/mjukr/view.do?findType=B) were retrieved. POST `/campusMap/mjukr/2/artclList.do` lists them; POST `/campusMap/mjukr/{article}/artclDetailView.do` returns details. Every detail response's first `imgPath` ended with `/campusMap/null`. None supplied a usable building photo. The floor lists were not promoted into current room information.
- The [older official campus overview PDF](https://gsit.mju.ac.kr/bbs/mjukr/147/5556/download.do) was rendered and visually inspected, including three detail crops. It is an aerial/composite overview, not a set of individual recent photographs. Its image capture date is unknown. The older search-index date was not converted into an asserted capture date.
- Page 8 of the [university event PDF](https://www.mju.ac.kr/bbs/mjukr/147/175263/download.do) contains a satellite view and an oblique central-campus photograph. These support broad roof forms, paved courts and planting around Y3/Y5/Engineering 1. The page also includes a **2025** festival diagram, so its presence in a newer document does not establish a current photo date.
- [University history](https://www.mju.ac.kr/mjukr/160/subview.do) contains an identified Y2 photograph. The [architect's project page](https://www.gansam.com/works/work.php?code=works&idx=2527) provides actual photographs alongside proposed-design renderings. Only gallery images `2105110910094_4.png` and `2105110910094_5.jpg` were treated as photographs. Images `_6`, `_7` and `_8` depict design renderings and were excluded as as-built evidence. Proposed adjacent volumes must not be added to the campus.
- [Official dormitory facilities](https://dorm.mju.ac.kr/dorm/6640/subview.do) provides individually labelled exterior photographs for Myeonghyeon, Myeongdeok, 3-dong, 4-dong and 5-dong. All exterior images were visually reviewed through contact sheets. Interior photos on the same page were inspected only while identifying the exterior images; they do not support exterior geometry. [Dormitory convenience facilities](https://dorm.mju.ac.kr/dorm/6642/subview.do) identifies the low welfare building, but that exterior photo is only 186 × 114 pixels.
- [The Hybrid Structural Testing Center](https://hystec.mju.ac.kr/) supplies two labelled exterior photos of Y24. Its unrelated wind-turbine hero image was excluded as campus evidence.
- The [university's 2024 facilities article](https://www.mju.ac.kr/bbs/mjukr/166/209975/artclView.do) supplies an identified actual photograph of the chapel. A court-renovation image in the same article is a proposed visual and was not treated as a current photograph.
- Printed page 196 / PDF page 195 of [Gyeonggi's public architectural publication](https://memory.library.kr/files/original/f962a9ceb37087ac01a6564c77847219.pdf#page=195) supplies three older exterior views of Bangmok Memorial Hall. These were rendered and inspected. The adjoining administration building was not independently resolved from those images. The [Gyeonggi architectural portal](https://ggarchimap.gg.go.kr/archives/gg_building-presentday/07/57/2647/) links four additional photographs, but their downloads failed with transport/TLS errors and they were **not** counted as reviewed.
- Actual frames from the [official campus tour video](https://www.youtube.com/watch?v=u-JLFts2Pxc) were visually reviewed during the original audit, with building captions or signs and timestamps recorded below. The record represents those frames, not a claim to have inspected every frame or measured a building from video. Another discovered [official video](https://www.youtube.com/watch?v=ygrp6mytWI8) is not credited as reviewed by this catalogue.

## Coverage by modeled structure

| Code / ID | Name | Strongest reviewed visual evidence | Remaining limitation |
| --- | --- | --- | --- |
| Y_ | Engineering Hall 1 | Official video 2:34 | Unseen elevations and dimensions |
| Y1 | Student Union | Official video 1:26 | Unseen elevations and dimensions |
| Y2 | Creative Arts Hall | University and architect photographs | Exclude unbuilt master-plan volumes |
| Y3 | Myongjin Hall | Official video 4:58; central aerial context | Aerial capture date unknown |
| Y5 | Engineering Hall 5 | Official video 1:44; central aerial context | Roof details simplified |
| Y6 | Sports & Culture Hall | Older overview | Current individual facade unverified |
| Y7 | Gymnasium | Official video 4:13; overview roof | Roof dimensions and unseen elevations |
| Y8 | Engineering Hall 2 | Older overview | Current individual facade unverified |
| Y9 | Hambak Hall | Official video 3:23 | Bridge geometry/access not surveyed |
| Y10 | Athletes' Residence | Older overview | Partly hidden by trees |
| Y11 | ROTC | Older overview | No identified close exterior photograph |
| Y12 | Design & Modeling Center | Official video 5:57 | Complex and adjacent Y20 outlines unresolved |
| Y13 | Engineering Hall 4 | Official video 7:22 | Unseen elevations and dimensions |
| Y14 | Structural Materials Lab | Older overview, labelled group only | Individual facade unresolved; marker overlap with Y83 |
| Y15 | Hydraulic Modeling Lab | Older overview, labelled group only | Individual facade unresolved |
| Y16 | Bangmok Memorial Hall | Gyeonggi architectural book, PDF p195 | Older image, current condition unknown |
| Y17 | Industry–Academic Cooperation Hall | Older overview | Individual facade not resolved in architectural book |
| Y18 | Joint Laboratory | Older overview | Individual elevations unresolved |
| Y19 | Engineering Hall 3 | Official video 6:37 | Unseen elevations and dimensions |
| Y20 | Architecture & Urban Design Institute | Older overview | Separation from Y12 schematic |
| Y21 | Student Welfare Hall | Older overview | Current individual facade unverified |
| Y22 | 60th Anniversary Chapel | Official 2024 facilities photograph | Capsule form visible; exact dimensions unknown |
| Y23 | Next Generation Science Hall | Official video 4:13 | Unseen elevations and dimensions |
| Y24 | Hybrid Structural Testing Center | Official center exterior photographs | Yard structures and equipment not fully inventoried |
| Y30 | Myeonghyeon Residence | Labelled official dormitory exterior | Image capture date unknown |
| Y31 | Myeongdeok Residence | Labelled official dormitory exterior | Curvature and dimensions approximate |
| Y32 | Residence 3 | Official exterior labelled 3동 | Y32 association follows supplied map; directory name conflict remains |
| Y33 | Residence 4 | Labelled official dormitory exterior | Image capture date unknown |
| Y34 | Residence 5 | Labelled official dormitory exterior | Image capture date unknown |
| Y35 | Residence Welfare Building | Official convenience-facility exterior | Small image; fine detail unresolved |
| Y82 | Greenhouse | No usable individually identified exterior | Directory identity only |
| Y83 | Model Testing Laboratory | Older overview, labelled group only | Individual facade unresolved; marker overlap with Y14 |
| E | Indoor Tennis Hall | Older overview | No reviewed close exterior photograph |
| mju-elpenheim | Elpenheim | No usable individually identified exterior | Directory identity only; do not infer which distant tower is this record |
| mju-visitors | Visitor Residence | No usable individually identified exterior | Directory identity only |
| mju-bus-office | Bus Management Office | No usable individually identified exterior | Directory identity only |
| mju-guardhouse | Guardhouse | No usable individually identified exterior | Directory identity only |
| mju-hydraulics | Hydraulics Laboratory | No usable individually identified exterior | Directory identity only |
| mju-gate | Main Gate | No usable individually identified exterior | Directory identity only; exclude Seoul-campus gate results |
| mju-tennis-office | Tennis Court Office | No usable individually identified exterior | Directory identity only |

## Search gaps and rejected candidates

Every modeled structure was checked against its official directory entry. Named searches also covered the less prominent laboratories, greenhouse, residence/visitor buildings, service offices, gate and sports buildings. These generally returned campus diagrams, procurement notices or department addresses rather than usable, identified exterior photos. Relevant departmental pages were inspected where returned, including architecture, civil engineering, sports and ROTC. ROTC's homepage images were promotional, military-training or indoor-event pictures, and were not treated as photographs of its building. Civil-engineering and sports directions pages displayed a generic icon rather than a building photograph.

A secondary campus article listed many labelled exterior photos, but **16 attempted image downloads returned HTTP 503**. Their captions are not proof of image contents, and none was counted as visually reviewed. The failed candidates covered the gate, library, chapel, science hall, engineering halls, gym, Sports & Culture Hall, design center, student buildings, administration, Bangmok, indoor tennis and Joint Laboratory. No such secondary image is shipped with the application.

The research does not establish photographs for every building. The eight explicit gaps and twelve overview-only entries remain visible in the product's evidence catalogue. Repeated facade details in those illustrative models are generic visual treatment, not confirmed architecture.

## Modeling boundaries

Observed broad forms can inform original simplified geometry: Y2's elevated bar and glass end; the gym's faceted body; the chapel's capsule-shaped upper volume; the test center's large industrial opening; distinct dormitory roof/tower forms; central paving and lawns; wooded hills, courts and tree-lined roads. A photo does not establish exact heights, facade/window counts, building orientation, surveyed footprint, current entrances, accessible paths or safe walking connections.

Decorative vegetation expresses the observed wooded setting. Tree count, species, coordinates and seasonal colours are artistic choices, not a botanical survey. Paths and roads remain illustrations and must not enter GPS or routing data.

Downloaded source photographs, PDFs, crops and contact sheets were kept in a private research archive, which is not included in this repository. The distributed source register contains links and observations; original third-party pixels are not bundled into the app, store screenshots or public assets. Public image availability is not a redistribution licence. A checked date records research, not authorship, permission, capture date or present-day accuracy.

## Research files

The private research folder contains `directory.json`, all 53 `detail-{article}.json` snapshots, source-page HTML, `aerial-1.jpg`, `event-aerial-8.jpg`, `contact-dorm-0.jpg`, `contact-dorm-1.jpg`, `contact-gansam.jpg`, `dorm-welfare.gif`, the Y24 exterior photos, chapel photograph and `bangmok-book-195.png`. Source API null-photo responses and failed download results are intentionally not disguised as successful photo coverage.
