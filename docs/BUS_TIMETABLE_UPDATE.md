# Bus timetable correction - 2026 second semester

Reviewed on 2026-09-30. This records the Yongin timetable correction using Myongji's dated second-semester notice, which supersedes the older undated general transport page. Seoul's separate transport evidence is documented in [SEOUL_EVIDENCE.md](SEOUL_EVIDENCE.md).

## Evidence

- [Official notice, published 2026-08-31](https://irb.mju.ac.kr/bbs/mjukr/141/234852/artclView.do): service period **2026-09-01 through 2026-12-14**, inclusive; 64 weekday station/downtown trips, 10 weekend/holiday trips; Giheung operates on semester weekdays excluding public holidays. Seasonal-term and vacation schedules are to be announced again in December.
- [Attached official timetable PDF](https://irb.mju.ac.kr/bbs/mjukr/141/180048/download.do): page 1 is the semester timetable; page 2 is labeled seasonal term; page 3 contains the weekend/holiday/vacation shuttle and Giheung rows. All three pages were rendered and visually inspected, including the table headers, blank cells and footnotes.
- [General transport page](https://www.mju.ac.kr/mjukr/506/subview.do): retained as a source record but explicitly labeled superseded; no route uses its departures.

The research PDF was kept outside the distributable project and is not included in this repository. Use the official PDF link above. Recorded SHA-256: `eba5fd7e25e062f4e8bdc3e07f80b828c737a13d644f8f87b3e862d659a93780`.

## Corrected interpretation

| Route | PDF evidence used | App behavior |
| --- | --- | --- |
| Station weekday loop | Page 1: 54 numbered campus departures | Adds 19:00, 19:20 and 19:30 to the older table; origin is the campus bus office in front of the chapel. After 18:00, the published route ends at Myeongjin Hall. |
| Downtown weekday loop | Page 1: 10 numbered campus departures | Adds 20:00. After 18:00, the published route ends at Engineering Building 1. |
| Weekend/holiday loop | Page 3: 10 departures | Origin is Myeonghyeon residence hall. The stable internal ID `downtown-vacation` remains for compatibility, but the public label and active date range only cover the semester weekend/holiday service. |
| Campus to Giheung | Page 3: 12 nonblank school-departure cells | Removes the unsupported 08:00 departure. First listed campus departure is 09:05. |
| Giheung to campus | Page 3: expected station arrival/departure column, with a corresponding school-arrival cell | Shows 13 slots from 08:15 through 18:30. The last station row says 19:30 but has a dash for school arrival; conservatively excluded from campus-bound offerings, with that omission disclosed in the UI note. The campus return stop is not specified. |
| Extra station to/from Myeongjin service | Page 1 note: 08:30-10:50 and 15:00-17:30 windows | Described as windows only. No individual extra departure times or frequency are invented. |

The notice's 30 Giheung daily runs are not 30 distinct time slots. The PDF has multiple vehicle assignments per row; the app does not fabricate missing slots to reach the summary count. Giheung times are expected times; the PDF warns full buses may leave early. The notice also warns that traffic can delay expected departures and arrivals by 5-10 minutes.

The PDF contains seasonal-term and vacation material, but the dated notice explicitly says those operating schedules will be announced again. The app therefore does not extend any route beyond December 14 or activate page 2 by guessing a future term calendar.

## Calendar and uncertainty contract

Every `BusRoute` now has `validFrom`, `validThrough` and `serviceDays`. `scheduledDepartures()` still returns `serviceStatus: 'unconfirmed'`, and adds:

| `availability` | Meaning | Candidate times |
| --- | --- | --- |
| `conditional` | Date is inside the notice period and matches the known weekday/weekend group. Weekday candidates are explicitly conditional on the date not being a public holiday. | Only selected-table times not yet passed in Seoul time. |
| `outside-period` | Before September 1 or after December 14, 2026. | Empty. |
| `wrong-day` | A weekday-only route was selected on Saturday/Sunday in Seoul. | Empty. |
| `holiday-unconfirmed` | Weekend/holiday route was selected on a weekday and no verified holiday calendar is available. | Empty. |

`eligibilityNote` supplies the localized explanation for each state. Actual operation, public-holiday status on weekdays, cancellations and live arrivals are not verified. Nothing in the function claims a bus will arrive, silently selects another route, or rolls remaining departures into tomorrow. A passed departure is excluded even when it passed by only one second.

UI integration: show `eligibilityNote`, retain the route's full dated published table for reference, and only label an empty result as “no later listed times” when availability is `conditional`. In other states the empty result means the selected schedule is inapplicable or unverified, not that the timetable has finished. Conditional highlights must remain labeled as published timetable comparisons, not confirmed next buses.

## Regression coverage

The knowledge tests cover updated 54/10 rows, Giheung blank cells and final ambiguous return, unexpanded extra-service windows, exact publication/source provenance, Seoul date rollover, inclusive effective-date boundaries, no weekday candidates on weekends, separate weekend origin, no inferred weekday holiday, and no future vacation activation. Food and classroom records remain unchanged.

Historical validation on 2026-09-30: `npm run typecheck` passed; the targeted knowledge suite passed **19/19**. The concurrent full project run passed 75/76, with one unrelated reviewed-visual-source native-link allowlist failure. See the [test report](TEST_REPORT.md) for subsequent integrated results. This content correction did not include a native application build or any device validation.
