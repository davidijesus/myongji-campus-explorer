# Yongin content evidence and review log

**Bus update, 30 September 2026:** the transport observations below are the version 0.2 audit. The dated 2026-2 notice now supersedes those timetable arrays. See [BUS_TIMETABLE_UPDATE.md](BUS_TIMETABLE_UPDATE.md) for current rows, dates and eligibility. Other factual records retain their stated review dates.

Version 0.5 adds Seoul with [separate evidence](SEOUL_EVIDENCE.md). This document's venue counts, classroom examples and student-guide import describe Yongin only.

Reviewed 29 September 2026, Asia/Seoul. This is an independent student project. The app does not claim university endorsement. English building and operator names are descriptive translations or transliterations unless the original source uses English.

The runtime source register, structured facts and deterministic assistant are in `src/knowledge.ts`. Source records distinguish officially published information, an imported student-guide snapshot and user-supplied visual references. `checkedAt` records the day the source was read, not the day a venue opened or a schedule became effective. The 30-day `sourceFreshness` threshold is an editorial review policy; it is not an assertion that information is valid during those 30 days.

## Sources actually read

| Source | Content used | Publication / effective date |
|---|---|---|
| [Myongji campus directory](https://www.mju.ac.kr/campusMap/mjukr/view.do?findType=B) | Building names and markers reviewed for the map module; labels retain the supplied illustration as a separate reference | No effective date; surveyed footprints and entrances unavailable |
| [Myongji Natural Campus transport](https://www.mju.ac.kr/mjukr/506/subview.do) | Giheung inbound/outbound departure tables; semester station and downtown tables; vacation/weekend downtown table; stated service categories | No effective date displayed in this page's transport section |
| [Myongji Natural Campus welfare facilities](https://www.mju.ac.kr/mjukr/492/subview.do) | Operators, buildings and floors for food, coffee, stores, copying and selected services | No effective date displayed |
| [Myongji classroom code guide, one-page PDF](https://www.mju.ac.kr/bbs/gs/195/174672/download.do) | Explicit classroom-prefix-to-building table | No internal publication date; no class assignment information |
| [Smart Mobility department FAQ](https://mjtrans.mju.ac.kr/bbs/mjtrans/1003/215452/artclView.do) | Y1/Y21 labels, library and health-room locations, sloped-entry caveat | Created 26 September 2024; modified 2 September 2025 |
| [User's Notion guide](https://app.notion.com/p/Myongji-University-Yongin-Campus-Definitive-Guide-2a396a3f3f60801fa233f911ed15b505) | User-supplied text export for library-app guidance, nearby suggestions and provenance | Undated export. Public reading of supplied Notion URL and a notion.so counterpart failed. No claim of live synchronization |
| User-supplied cartoon campus map, aerial photograph and map screenshot | Visual references and illustration labels | Undated; no survey, metric scale, georeferencing or rights grant established by the files themselves |

## Conflicts recorded in the original audit

- **Bus totals conflict within the official page itself.** The semester summary reports 50 station trips and 10 downtown trips, but its 60 numbered rows contain **51 station departures and 9 downtown departures**. The app transcribes the numbered rows and displays this conflict. It does not add an invented tenth downtown bus, delete a station bus, or reinterpret an ambiguous route row.
- The supplied Notion text describes 54 station trips, operation around 08:00–20:00 and semester-only campus shuttles. The official main transport page has different tables, including a weekend/holiday/vacation schedule. The app follows the main official page's readable table and does not publish the Notion numbers as current service.
- Other official departmental mirror pages showed older, mutually inconsistent counts (56, 84, etc.). Those were not merged into the main transport timetable.
- The Notion guide says there are four convenience stores but lists five locations. The app does not publish a total from this sentence.
- The Notion cafeteria hours and prices are undated; the guide's dormitory dinner start is also expressed ambiguously. A 2024 dormitory notice has different hours. None are converted into current prices or an “open now” badge.
- The source welfare page does not give a floor for GRAZIE. The app leaves its floor unspecified rather than guessing.
- Y1 means Student Hall in the facility guide. Engineering Building 1 uses the classroom pattern **Yxxx**, not **Y1xxx**. The resolver uses the exact patterns in the PDF and exactly three room digits after a known prefix. It never extracts a floor from the remaining digits.

## Historical bus behavior and limits — version 0.2

The five available timetable options distinguish the origin and direction. Every displayed time is a scheduled departure from that origin, not an estimated bus arrival at the student's location. Comparisons use `Asia/Seoul` even if the phone is set to another time zone. A departure passed by one second is excluded from the remaining-times helper; the app does not fabricate a next-day departure after the last row.

The student selects a published timetable. `calendarVerified: false` and `serviceStatus: 'unconfirmed'` are intentional. No verified academic-calendar/holiday exception feed or temporary suspension feed was supplied. Weekday, vacation and seasonal-term descriptions are preserved as source terms, without asserting that the selected table runs today. Giheung buses are described separately because the source excludes seasonal terms and vacations and warns that some full vehicles may leave early.

The Notion claims of free segments on public bus routes 5001-1, 5000 and 5003 were not promoted into verified current fare policy. No public-bus arrival API, free-fare guarantee, live vehicle location, stop GPS coordinate or estimated walk to a stop was invented.

## Assistant behavior and limits

`answerQuestion` performs deterministic local retrieval from reviewed records. There is no remote LLM, API key, hidden web search, telemetry or external transmission of a student's question. Replies carry source IDs and relevant building codes so the UI can render citations and map actions. User text and supplied document text are data, never executable instructions.

The assistant can identify an officially documented building-code pattern, list sourced places to eat or buy coffee, and answer the limited library/printing/service questions recorded in the register. A classroom code identifies its building according to the guide; it does **not** prove the specific room exists or assign any course or student to it. Unknown course assignments ask the student for the full room code from their actual timetable or instructor. Unsupported codes, current prices/hours, allergy suitability and unrelated questions receive an explicit unknown answer.

The app does not infer halal/vegan suitability, accessibility, exact entrances, room floors, opening status, student schedules or travel times. Nearby student-guide suggestions remain labeled as an unverified snapshot. Missing Notion image attachments were not treated as readable tables.

## Before store release

Re-read official source pages, validate the latest notice's effective dates and holiday exceptions, and have the source owner review the import. The old timetable-count inconsistency is retained here as historical evidence; the app's replacement table is documented in [BUS_TIMETABLE_UPDATE.md](BUS_TIMETABLE_UPDATE.md). A functioning browser and native shell do not replace native device testing. A visually convincing campus scene does not replace a surveyed pedestrian and entrance dataset. Content maintenance should keep the explicit source, review date, unknown values and conflict notes intact.
