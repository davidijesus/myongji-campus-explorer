# Official building photographs — Yongin and Seoul

Reviewed **2026-10-16**. The selected gallery contains **20 official photo assets for 15 buildings**: Yongin has 11 assets for 9 buildings, and Seoul has 9 assets for 6 buildings. A source asset may be a publisher-created diptych or graphic containing a real photograph; the count is not a count of independent camera angles.

The machine-readable [coverage record](../data/building-photo-coverage.json) preserves every building/POI identifier, Korean and English names, selection status, source URLs, identification evidence, original dimensions and source SHA-256. The runtime photograph manifest is separate; this document does not change geometry, identities or navigation.

## Scope and classification

The two completed photo audits cover **51 modeled places**. Classified by the actual scene `kind`, these are **48 buildings** and **3 non-building POIs**. Fifteen buildings have selected images; **33 buildings and 3 reviewed POIs have no approved image**. Seoul’s small gatehouse is classified here as a building because `src/seoul.ts` uses `kind: 'building'`; its original research grouping as a separate reference POI remains recorded.

Yongin has **10 additional outdoor/reference POIs** outside its 40-building/gate photo audit. They are listed separately as **not reviewed for a dedicated photo**, bringing this documentation to all **61 modeled places**. Neither the inventory nor the gallery claims to include every real structure on either campus.

**A gap means no suitable, sufficiently identified image was approved in the examined official sources. It is not proof that no photograph exists.** Images are not assigned using proximity, resemblance alone, background appearance or generic campus imagery. Official directory names, room codes, labelled university pages and identifiable façades establish the selected building matches. Known name conflicts remain visible.

## Selected coverage

| Campus | Code / place ID | Building | Assets | Source and identification |
| --- | --- | --- | ---: | --- |
| Yongin | Y2 / `mju-y2` | Creative Arts Hall / 창조관 예술관 | 1 | University history explicitly labels 창조예술관 전경. [Official source 1](https://www.mju.ac.kr/mjukr/160/subview.do) |
| Yongin | Y14 / `mju-y14` | Structural Materials Lab / 구조재료실험동 | 1 | HYSTEC labels 구조재료시험동; directory article 43 lists Y14 rooms. Do not assign this photo to adjacent Y83. [Official source 1](https://hystec.mju.ac.kr/theme/mypage1/page_html/exper_facility.html) |
| Yongin | Y22 / `mju-y22` | 60th Anniversary Chapel / 60주년채플관 | 1 | University news explicitly captions the 60th Anniversary Chapel. [Official source 1](https://www.mju.ac.kr/bbs/mjukr/166/209975/artclView.do) |
| Yongin | Y24 / `mju-y24` | Hybrid Structural Testing Center / 하이브리드 구조실험센터 | 2 | HYSTEC façade signage and number 24; elevated wide view and closer entrance view are distinct. [Official source 1](https://hystec.mju.ac.kr/) |
| Yongin | Y30 / `mju-y30` | Myeonghyeon Residence / 생활관(명현관) | 1 | 명현관 section and visible number 30. [Official source 1](https://dorm.mju.ac.kr/dorm/6640/subview.do) |
| Yongin | Y31 / `mju-y31` | Myeongdeok Residence / 생활관(명덕관) | 2 | 명덕관 section and number 31 in frontal and elevated oblique photos. [Official source 1](https://dorm.mju.ac.kr/dorm/6640/subview.do) |
| Yongin | Y33 / `mju-y33` | Residence 4 / 생활관(제3학생기숙사(4동)) | 1 | 4동 heading plus directory article 77 and Y33 rooms. [Official source 1](https://dorm.mju.ac.kr/dorm/6640/subview.do) |
| Yongin | Y34 / `mju-y34` | Residence 5 / 생활관(제3학생기숙사(5동)) | 1 | 5동 heading and directory article 78. [Official source 1](https://dorm.mju.ac.kr/dorm/6640/subview.do) |
| Yongin | Y35 / `mju-y35` | Residence Welfare Building B / 생활관(제3학생기숙사(B동)) | 1 | 부대시설동 label and welfare dining-room crosswalk; only 186×114 pixels. [Official source 1](https://dorm.mju.ac.kr/dorm/6642/subview.do) |
| Seoul | S1 / `mju-s1` | General Hall / 종합관 | 1 | Official newspaper identifies 종합관; the day/night diptych is one original asset, not two angles. [Official source 1](https://news.mju.ac.kr/news/articleView.html?idxno=12317) |
| Seoul | S2 / `mju-s2` | Student Union / 학생회관 | 1 | Official 2010 newspaper photo and current building-number/labelled-overview match. Historical appearance only. [Official source 1](https://news.mju.ac.kr/news/articleView.html?idxno=1357) |
| Seoul | S3 / `mju-s3` | Mirae Hall / 미래관 | 1 | Official 2010 archive, current institutional-name/code bridge and labelled panorama. Historical appearance only. [Official source 1](https://news.mju.ac.kr/news/articleView.html?idxno=1357) |
| Seoul | S8 / `mju-s8` | Humanities Residence / 인문생활관 | 1 | Official residence heading and alt text; the real photograph remains inside the university’s original graphic. [Official source 1](https://www.mju.ac.kr/mjukr/7696/subview.do) |
| Seoul | S9 / `mju-s9` | Bangmok Academic Information Center / 방목학술정보관 | 2 | Official library identification; annotated daytime façade and night bridge viewpoint are distinct. Night source is 330×230. [Official source 1](https://www.mju.ac.kr/bbs/mjukr/464/228882/artclView.do) [Official source 2](https://www.mju.ac.kr/mjukr/161/subview.do) |
| Seoul | S10 / `mju-s10` | MCC Myongji Campus Complex / MCC관 | 3 | Official newspaper names MCC; front plaza, exterior stairs and vehicle entrance are different views. Vehicle entrance is not a walking-route recommendation. [Official source 1](https://news.mju.ac.kr/news/articleView.html?idxno=12317) |

Distinct-view galleries are Y24, Y31, S9 and S10. Other entries keep a single original asset. Source publication dates are retained where known, but are not converted into capture dates; all selected capture dates remain unknown.

## Buildings without an approved photograph

### Yongin — 30 buildings

| Code / place ID | Name (English / Korean) | Reason |
| --- | --- | --- |
| Y_ / `mju-y-main` | Engineering Hall 1 / 제1공학관 | No identifiable exterior photograph matched to this building in the reviewed university sources. The fresh directory record exposes an image path ending in /null. No generic or third-party image was substituted. |
| Y1 / `mju-y1` | Student Union / 학생회관 | No identifiable exterior photograph matched to this building in the reviewed university sources. The fresh directory record exposes an image path ending in /null. No generic or third-party image was substituted. |
| Y3 / `mju-y3` | Myongjin Hall / 명진당 | No identifiable exterior photograph matched to this building in the reviewed university sources. The fresh directory record exposes an image path ending in /null. No generic or third-party image was substituted. |
| Y5 / `mju-y5` | Engineering Hall 5 / 제5공학관 | No identifiable exterior photograph matched to this building in the reviewed university sources. The fresh directory record exposes an image path ending in /null. No generic or third-party image was substituted. |
| Y6 / `mju-y6` | Sports & Culture Hall / 체육문화관 | No identifiable exterior photograph matched to this building in the reviewed university sources. The fresh directory record exposes an image path ending in /null. No generic or third-party image was substituted. |
| Y7 / `mju-y7` | Gymnasium / 체육관 | No identifiable exterior photograph matched to this building in the reviewed university sources. The fresh directory record exposes an image path ending in /null. No generic or third-party image was substituted. |
| Y8 / `mju-y8` | Engineering Hall 2 / 제2공학관(에코바이오관) | No identifiable exterior photograph matched to this building in the reviewed university sources. The fresh directory record exposes an image path ending in /null. No generic or third-party image was substituted. |
| Y9 / `mju-y9` | Hambak Hall / 함박관 | No identifiable exterior photograph matched to this building in the reviewed university sources. The fresh directory record exposes an image path ending in /null. No generic or third-party image was substituted. |
| Y10 / `mju-y10` | Athletes’ Residence / 선수숙소 | No identifiable exterior photograph matched to this building in the reviewed university sources. The fresh directory record exposes an image path ending in /null. No generic or third-party image was substituted. |
| Y11 / `mju-y11` | ROTC / 학군단 | No identifiable exterior photograph matched to this building in the reviewed university sources. The fresh directory record exposes an image path ending in /null. No generic or third-party image was substituted. |
| Y12 / `mju-y12` | Design & Modeling Center / 디자인조형센터 | No identifiable exterior photograph matched to this building in the reviewed university sources. The fresh directory record exposes an image path ending in /null. No generic or third-party image was substituted. |
| Y13 / `mju-y13` | Engineering Hall 4 / 제4공학관 | No identifiable exterior photograph matched to this building in the reviewed university sources. The fresh directory record exposes an image path ending in /null. No generic or third-party image was substituted. |
| Y15 / `mju-y15` | Hydraulic Modeling Lab / 수리모형실습동 | No identifiable exterior photograph matched to this building in the reviewed university sources. The fresh directory record exposes an image path ending in /null. No generic or third-party image was substituted. |
| Y16 / `mju-y16` | Bangmok Memorial Hall / 방목기념관 | No identifiable exterior photograph matched to this building in the reviewed university sources. The fresh directory record exposes an image path ending in /null. No generic or third-party image was substituted. Previously cited Gyeonggi public-library architecture publication is outside the university-only source scope. |
| Y17 / `mju-y17` | Industry-Academic Cooperation Hall / 산학협력관 | No identifiable exterior photograph matched to this building in the reviewed university sources. The fresh directory record exposes an image path ending in /null. No generic or third-party image was substituted. |
| Y18 / `mju-y18` | Joint Laboratory / 공동실험동 | No identifiable exterior photograph matched to this building in the reviewed university sources. The fresh directory record exposes an image path ending in /null. No generic or third-party image was substituted. |
| Y19 / `mju-y19` | Engineering Hall 3 / 제3공학관 | No identifiable exterior photograph matched to this building in the reviewed university sources. The fresh directory record exposes an image path ending in /null. No generic or third-party image was substituted. |
| Y20 / `mju-y20` | Architecture & Urban Design Institute / 건축도시설계원 | No identifiable exterior photograph matched to this building in the reviewed university sources. The fresh directory record exposes an image path ending in /null. No generic or third-party image was substituted. |
| Y21 / `mju-y21` | Student Welfare Hall / 학생복지관 | No identifiable exterior photograph matched to this building in the reviewed university sources. The fresh directory record exposes an image path ending in /null. No generic or third-party image was substituted. |
| Y23 / `mju-y23` | Next Generation Science Hall / 차세대과학관 | No identifiable exterior photograph matched to this building in the reviewed university sources. The fresh directory record exposes an image path ending in /null. No generic or third-party image was substituted. |
| Y32 / `mju-y32` | Residence 3 — unresolved annex label / 생활관(제3학생기숙사(1동)) | Official dorm facilities page labels the candidate 3동; fresh directory article 76 still says 제3학생기숙사(1동) and provides no Y32 room code or photo. No authoritative crosswalk resolving that mismatch was found. The existing app also marks Y32 identity unverified. |
| Y82 / `mju-y82` | Greenhouse / 온실 | No identifiable exterior photograph matched to this building in the reviewed university sources. The fresh directory record exposes an image path ending in /null. No generic or third-party image was substituted. |
| Y83 / `mju-y83` | Model Testing Laboratory / 모형실험동 | No identifiable exterior photograph matched to this building in the reviewed university sources. The fresh directory record exposes an image path ending in /null. No generic or third-party image was substituted. HYSTEC 구조재료시험동 photo belongs to Y14; 건설인프라연구동 photo has no verified Y83 crosswalk and was not assigned. |
| E / `mju-e` | Indoor Tennis Hall / 실내테니스장 | No identifiable exterior photograph matched to this building in the reviewed university sources. The fresh directory record exposes an image path ending in /null. No generic or third-party image was substituted. |
| — / `mju-elpenheim` | Elpenheim / 엘펜하임 | No identifiable exterior photograph matched to this building in the reviewed university sources. The fresh directory record exposes an image path ending in /null. No generic or third-party image was substituted. |
| — / `mju-visitors` | Visitor Residence / 방문자숙소 | No identifiable exterior photograph matched to this building in the reviewed university sources. The fresh directory record exposes an image path ending in /null. No generic or third-party image was substituted. |
| — / `mju-bus-office` | Bus Management Office / 버스관리사무소 | No identifiable exterior photograph matched to this building in the reviewed university sources. The fresh directory record exposes an image path ending in /null. No generic or third-party image was substituted. |
| — / `mju-guardhouse` | Guardhouse / 수위실 | No identifiable exterior photograph matched to this building in the reviewed university sources. The fresh directory record exposes an image path ending in /null. No generic or third-party image was substituted. |
| — / `mju-hydraulics` | Hydraulics Laboratory / 유압실 | No identifiable exterior photograph matched to this building in the reviewed university sources. The fresh directory record exposes an image path ending in /null. No generic or third-party image was substituted. |
| — / `mju-tennis-office` | Tennis Court Office / 테니스장관리사무소 | No identifiable exterior photograph matched to this building in the reviewed university sources. The fresh directory record exposes an image path ending in /null. No generic or third-party image was substituted. |

### Seoul — 3 buildings, including the gatehouse

| Code / place ID | Name (English / Korean) | Reason |
| --- | --- | --- |
| S4 / `mju-s4` | International Hall / 국제관 | No dedicated university photograph adequately shows the facade. The KLEC guide explicitly identifies S4 but uses a third-party street-view screenshot; not promoted as a university original photo. In the 2023 newspaper sign photo, the visible 4 corroborates identity but the facade is mostly obscured by a banner, so it remains research evidence. |
| S5 / `mju-s5` | Administration Building / 행정동 | KLEC guide contains clearly labelled front and rear street-view screenshots, retained as research evidence only. The university newspaper photo of the sign beside Administration does not show a usable Administration facade. Event/group pictures inside the building are not substitutes. |
| — / `mju-seoul-guardhouse` | Gatehouse / 경비실 | A small gatehouse-like booth appears in the 2023 newspaper route photo, but the caption identifies lamp banners along the main-gate-to-Student-Union approach rather than the booth. No precise POI identity or unique facade caption is established; do not map it generically. |

### Reviewed non-building POIs — 3

| Code / place ID | Name (English / Korean) | Reason |
| --- | --- | --- |
| — / `mju-gate` | Main Gate / 정문 | No identifiable exterior photograph matched to this building in the reviewed university sources. The fresh directory record exposes an image path ending in /null. No generic or third-party image was substituted. |
| — / `mju-seoul-field` | Campus Sports Field / 운동장 | The official MCC panorama labels 운동장 진입. It depicts an access reference and partially visible rooftop sports area; no dedicated field photo is approved. |
| — / `mju-seoul-gate` | Main Gate / 정문 | 2010 university newspaper historic-gate.jpg explicitly shows the then main gate. KLEC2022 guide labels the front gate on a street-view screenshot. Retained separately because the approved catalogue covers numbered buildings; the gate's appearance and surroundings have changed with MCC construction. |

### Additional Yongin reference POIs — not reviewed for dedicated photos

These entries are listed for complete map coverage. They were outside the building-photo review and must not be described as searched-but-unavailable photographs.

| Code / place ID | Name (English / Korean) | Reason |
| --- | --- | --- |
| A / `mju-a` | Main Sports Field / 대운동장 | Outside the 40-building/gate Yongin photo audit. No dedicated photo was selected or verified in this task; this is not a finding that an official photo is unavailable. |
| B / `mju-b` | Athletes’ Tennis Courts / 선수전용테니스장 | Outside the 40-building/gate Yongin photo audit. No dedicated photo was selected or verified in this task; this is not a finding that an official photo is unavailable. |
| C / `mju-c` | Small Sports Field / 소운동장 | Outside the 40-building/gate Yongin photo audit. No dedicated photo was selected or verified in this task; this is not a finding that an official photo is unavailable. |
| D / `mju-d` | Tennis Courts / 테니스장 | Outside the 40-building/gate Yongin photo audit. No dedicated photo was selected or verified in this task; this is not a finding that an official photo is unavailable. |
| F / `mju-f` | Outdoor Music Hall / 야외음악당 | Outside the 40-building/gate Yongin photo audit. No dedicated photo was selected or verified in this task; this is not a finding that an official photo is unavailable. |
| G / `mju-g` | White Horse Statue / 백마상 | Outside the 40-building/gate Yongin photo audit. No dedicated photo was selected or verified in this task; this is not a finding that an official photo is unavailable. |
| H / `mju-h` | Student Tennis Courts / 학생테니스 | Outside the 40-building/gate Yongin photo audit. No dedicated photo was selected or verified in this task; this is not a finding that an official photo is unavailable. |
| I / `mju-i` | Outdoor Basketball Court / 야외농구장 | Outside the 40-building/gate Yongin photo audit. No dedicated photo was selected or verified in this task; this is not a finding that an official photo is unavailable. |
| J / `mju-j` | Futsal Court / 풋살장 | Outside the 40-building/gate Yongin photo audit. No dedicated photo was selected or verified in this task; this is not a finding that an official photo is unavailable. |
| K / `mju-k` | Commuter Bus Boarding Area / 통학버스승강장 | Outside the 40-building/gate Yongin photo audit. No dedicated photo was selected or verified in this task; this is not a finding that an official photo is unavailable. |

## Historical, composite and graphic originals

- **S1 General Hall:** keep the university newspaper’s original day/night diptych and watermark together. It is one asset; do not split it into invented independent slides.
- **S2 Student Union and S3 Mirae Hall:** keep the 2010 publication context in captions. S3 was then labelled Social Education Institute; current official numbering/function evidence and a labelled panorama support its identity. Neither archive photograph establishes the current appearance.
- **S8 Humanities Residence:** retain the circular photographic framing and university graphic border. It is a real exterior photograph inside an original graphic, not an isolated rectangular photo.
- **S9 library:** retain the university’s daytime photo-zone annotation. The night original is only 330×230 pixels and must not be upscaled. Day and night source viewpoints are different.
- **S10 MCC:** retain the original front-plaza, stair-detail and vehicle-entrance images. The stair detail is not a full façade, and the garage image does not establish a pedestrian route. The large historical panorama and its annotated duplicate remain research evidence, not extra carousel angles.
- **Y35 welfare building:** the only selected source is 186×114 pixels. Preserve that limitation rather than generating or inventing missing detail.

The gallery should contain the full source composition, preserving annotations, borders and watermarks rather than cropping them away.

## Excluded or unresolved evidence

**Y32 remains excluded.** The [official dorm facilities page](https://dorm.mju.ac.kr/dorm/6640/subview.do) labels its candidate photo **3동**, while fresh [directory article 76](https://www.mju.ac.kr/campusMap/mjukr/76/artclDetailView.do) says **제3학생기숙사(1동)** and supplies no Y32 room code. The photograph does not visibly resolve the number. Its original remains in research; no image is assigned to Y32 and no map data is changed.

The [Yongin directory](https://www.mju.ac.kr/campusMap/mjukr/view.do?findType=B) was refreshed with all 53 detail records; every image path ends in `/null`. It supports identity and room-code crosschecks, not usable photographs. Y14 was resolved using [HYSTEC’s explicitly labelled facility image](https://hystec.mju.ac.kr/theme/mypage1/page_html/exper_facility.html), its official location diagram and directory Y14 room codes. The separate 건설인프라연구동 image has no verified Y83 crosswalk and remains excluded.

For S4 and S5, the official KLEC guide contains clearly labelled third-party street-view screenshots. Those are retained as research evidence rather than represented as university-original façade photographs. Obscured façades, route banners and indoor/group images do not fill those gaps. Existing video-frame and overview evidence remains in the historical [Yongin visual audit](VISUAL_REFERENCE_AUDIT.md); it is not counted as a dedicated downloadable photograph in this selection. Architect portfolios, blogs and the Gyeonggi architecture publication are outside this task’s university-only source scope.

## Original files and display derivatives

Original source files remain unchanged in the task’s `research-064/yongin/originals/` and Seoul research evidence folders. Their original source URLs, dimensions and SHA-256 values are recorded in the approved research catalogs and this coverage record.

The integrated build prepares deterministic **local JPEG display derivatives with a maximum longest edge of 1600 pixels**, without upscaling, cropping, retouching or AI services. Scaling preserves the complete source composition. Runtime provenance records original and derivative dimensions and SHA-256 separately; source hashes must not be replaced with derivative hashes. Original catalogs remain unchanged. The validated 0.6.4-dev.1 build resizes seven large JPEG display copies; the twenty original assets total **21,102,399 bytes**, and the twenty display assets total **6,977,054 bytes**. See [the development validation record](DEVELOPMENT_0.6.4.md).

## Attribution and rights

Every selected image links to the university source page and exact original image URL. Identification evidence is recorded per asset in the coverage JSON. The university site states `COPYRIGHT(C) MYONGJI UNIV. ALL RIGHTS RESERVED.` The dorm site also states that all rights are reserved. University-newspaper and other publisher credits, watermarks and graphic marks remain intact.

**The photographs are not covered by the application’s MIT code license.** Copyright remains with Myongji University or the credited publisher. No open redistribution license was established merely by public availability; local selection does not assert a new license grant.
