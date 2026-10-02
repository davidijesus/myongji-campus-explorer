# Historical source review — 29 September 2026

This is the Yongin version 0.2 audit. Its bus arrays were superseded by the [dated timetable correction](BUS_TIMETABLE_UPDATE.md) on September 30, 2026; its illustration-only evidence note for I/J was later supplemented by the [historical plan review](POSITION_EVIDENCE.md). Preserve the results below as a dated record, not a description of the latest dataset. Seoul evidence is recorded [separately](SEOUL_EVIDENCE.md).

Result: **PASS for faithful transcription and explicit uncertainty**, after two provenance corrections. This is a content audit, not confirmation that services are operating today.

## Bus tables: 97 of 97 departures match

The [main university transport page](https://www.mju.ac.kr/mjukr/506/subview.do) was downloaded again, its HTML tables parsed independently of the application's arrays, and each entire departure array compared in order against the compiled `BUS_ROUTES` records. Only zero-padding single-digit hours was applied. Times from the adjacent expected-passage/arrival columns were not substituted for departures.

| Application timetable | Matching source rows | Result |
|---|---:|---|
| Station, semester | 51 / 51 | Exact match |
| Downtown, semester | 9 / 9 | Exact match |
| Downtown, vacation/weekend | 10 / 10 | Exact match |
| Campus to Giheung | 13 / 13 | Exact match |
| Giheung to campus | 14 / 14 | Exact match |

Origins, directions and semester/seasonal-term descriptions match their surrounding source sections. The Giheung inbound section explicitly identifies the inbound direction even though its table repeats the other section's column headings. No departure was multiplied by the number of buses listed in the vehicle-count column.

The source's **50 station / 10 downtown summary conflicts with its 51 / 9 detailed rows**. The app retains the detailed rows and calls out the conflict. It does not invent a missing trip. No effective date or operational exception calendar was found in the transport section; those remain unknown. No current-service or live-arrival claim is made.

Re-fetched transport HTML SHA-256: `a46d7111aa282c19e15614a571636c4d96acadb09b1438ece0b23353e51401b0`.

## Cafés and food locations

All 14 food/store records were checked against the [official welfare table](https://www.mju.ac.kr/mjukr/492/subview.do). Building-code associations were checked against the [university department's facilities guide](https://mjtrans.mju.ac.kr/bbs/mjtrans/1003/215452/artclView.do), not inferred from nearby geometry.

| Café | Official building/floor | Application map code |
|---|---|---|
| 명지카페 | 학생회관 1층 | Y1 |
| CAFEING | 디자인조형센터 1층 | Y12 |
| GRAZIE | 제3공학관; floor not given | Y19 |
| CAFEING | 학생복지관 2층 | Y21 |

The cafeteria, convenience-store, burger and hotdog locations also match. The welfare page calls the Paris Baguette building “창조관”; the facilities guide explicitly identifies it as Y2 창조예술관 and specifies the fourth-floor lobby. This association therefore has corroboration rather than a guessed code. GRAZIE's floor stays unspecified. “Basement” was not changed to a fabricated numbered basement level. All current hours and prices remain null.

Re-fetched welfare HTML SHA-256: `568e85415dd5adf0476b37a875e44ff6828fbe847e835cc0482c3ee139fce783`.

## Classroom example

The [official room-code PDF](https://www.mju.ac.kr/bbs/gs/195/174672/download.do) explicitly maps `Y9xxx` to 함박관. Accordingly, `Y9228` resolves to Y9. As an independent corroboration, the [2026-2 English Café notice](https://www.mju.ac.kr/bbs/bangmok/646/235071/artclView.do), published 4 September 2026, explicitly names 함박관 Y9228. This corroborating notice was used for this audit only; no new program, timetable, room floor or personal class assignment was added to the app.

The generic resolver correctly stops at building identification. It does not treat every syntactically matching room as known to exist, extract a floor, or infer a student's class. `Yxxx` belongs to Engineering Building 1; `Y1` is the separate Student Hall map label.

## Corrections made during this audit

1. The facilities FAQ's `publishedAt` now uses its creation date, **26 September 2024**. Its September 2025 modification date remains described as an update in the source note.
2. Assistant lookups for reference-only features with no official directory marker now cite only the supplied illustration and explicitly say that official confirmation is unavailable. They no longer imply that illustration-only basketball/futsal labels were confirmed in the directory.

Strict shared TypeScript compilation and targeted assertions for both corrections and the Y9228 mapping passed. No other product behavior was changed.

## Remaining uncertainty

The Notion source remains an undated user-supplied text snapshot; live public reading did not succeed. Facility operation, prices, dietary suitability, today's bus service and temporary changes require confirmation. Published source facts are distinct from the approximate architectural models: these checks do not establish surveyed building footprints, heights, entrances, indoor room positions or pedestrian routes. The app's source notes and map caveats preserve that distinction.
