# Data model, validation and asset replacement

The authoritative machine-readable contract is **`src/types.ts`**, with the runtime validator **`validateDataset` in `src/core.ts`**. `data/live-seed.json` and `data/demo-fixture.json` are generated examples. Run `npm run validate -- path/to/file.json` after editing a candidate dataset.

This document describes the geographic dataset and optional routing/content workflow. Illustrated reference geometry is separate: see [MAP_EVIDENCE.md](MAP_EVIDENCE.md), [POSITION_EVIDENCE.md](POSITION_EVIDENCE.md) and [SEOUL_EVIDENCE.md](SEOUL_EVIDENCE.md). The presence of an illustrated building does not create verified entrances or path records.

## Records

Every entity has an ASCII stable ID (letters/digits with `.`, `_`, `:`, `-`), evidence and the relevant translation fields. IDs are unique across entity collections. Never reuse a retired ID for a different physical place.

| Type | Primary fields and relationship |
|---|---|
| Dataset | `schemaVersion`, `id`, `mode`, `version`, `updatedAt`, campus and entity collections |
| Evidence | `status` = verified/unverified/demo; nullable HTTPS source URL and timestamp; English/Korean note |
| Campus | Stable campus ID, translated name/address, identity evidence, optional WGS84 origin/boundary and geometry evidence |
| Place | Name, aliases, category, description, optional code/point/photo, identity and geometry evidence, building ID and entrance IDs |
| Building | Place ID, point, width/depth/height in meters, bearing in degrees, primitive form/color and evidence |
| Entrance | Place ID, pathway-node ID, exact point, translated name/notes, nullable stairs information and evidence |
| PathNode | Point, explicit public/restricted/unknown access and evidence |
| PathEdge | From/to node IDs, positive distance in meters, optional slope/steps, direction, access and evidence |
| FoodVenue | Place ID, type, on-campus/nearby, sourced price and hours, separately sourced dietary claims |
| CampusEvent | Place ID, translated title/description/organizer/language, zoned start/end, Asia/Seoul display, state and optional registration link |
| Room | Search aliases, place ID, verified floor description and evidence |

`null` is intentional: it represents unknown information, not false, closed, inaccessible or zero. An empty exception schedule means a confirmed full-day closure. Weekly hours use Sunday=0; closing earlier than opening denotes an overnight interval. Full-day 24-hour schedules need an explicit extension rather than an ambiguous equal opening/closing time.

Events support draft, published, canceled and completed. The public server strips drafts; the upcoming feed includes only published records whose end is still in the future. The fixed demo schedule is fictional and will naturally become empty after its dates pass.

## Geometry and routes

A live geographic point is `{frame:'wgs84', lat, lon, elevationM}`. A demo point is `{frame:'demo', x, z, elevationM}`. These frames must not mix. The live seed deliberately has no real points. Synthetic WGS84 values in automated tests are unit-test inputs only, not surveyed campus data.

Both the routing graph and renderers reference the same records. A multi-segment or curved walkway should be divided into sufficient surveyed nodes so the displayed polyline follows the actual ground. Stored edge distances must be verified and must not understate the real walking path. Automatic nearest-path GPS snapping is deliberately absent because it could fabricate a connection across unsurveyed ground.

Routing is not a guarantee that conditions remain safe or accessible. Revalidate access and changes through the content workflow. Source freshness is visible; expired hours become unknown. The broader refresh and survey cadence is an operational responsibility.

## Replacing the fictional scene

Do not turn `demo-fixture.json` into a real campus simply by changing its `mode` or evidence. Build a separate live dataset from verified records. Publish it only after schema checks and human source review.

For the current primitive renderer, create a `Building` for each verified envelope, respecting its point, dimensions, elevation and bearing. The default forms are development placeholders. If the building shape needs multiple wings or irregular footprints, extend the model contract and `CampusScene.model` in `src/scene.ts` with a first-party mesh representation; do not make an inaccurate rectangular proxy appear survey-accurate.

The included scene has no GLB loading or arbitrary terrain-asset pipeline yet. An asset extension should share the existing meter frame, keep entrance/path records independent from decorative geometry, record licensing, validate the model's bounding box and elevations, and add round-trip and alignment tests. Check the full asset on both devices before enabling it in the real navigation journey.

Optimize meshes and shared materials, limit textures, add level-of-detail only when measured necessary, and preserve a useful 2D/list fallback. First-party content may be cached under your own terms. Provider content caching is a separate licensing and SDK concern; this code does not implement custom Naver tile caching.
