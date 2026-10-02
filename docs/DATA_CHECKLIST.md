# Real-campus data checklist

This checklist is for a future surveyed navigation dataset. The existing Yongin and Seoul illustrations do not establish the entrance or path evidence required below. The original first-route proposal focuses on Yongin; any Seoul route needs its own survey and review.

Start with one small, surveyed journey on the **Natural Science Campus in Yongin**. A complete artistic campus model is not needed to validate the first route, but invented entrances or shortcuts are unacceptable.

| Required record | Evidence to obtain | Release condition |
|---|---|---|
| Campus frame and boundary | Authorized geographic source or measured control points; CRS, datum, accuracy, survey date and reviewer | Confirm Yongin, not Seoul; use one origin for all custom geometry |
| Building | Official Korean name, curated English name, code, identity, measured footprint/orientation/height and elevation | Recognizable model aligns with the actual building and does not obscure routes |
| Entrance | Exact exterior coordinate, name, related building, photo or survey note, public access, steps and opening restrictions | Verify the route ends at the entrance actually usable by a student |
| Path connection | Measured junction coordinate and elevation, provenance and public-access status | Connect to other surveyed nodes; do not infer crossings through terrain or structures |
| Path segment | Start/end nodes, measured walkable distance, direction, steps, slope where known and access restrictions | Walk the segment and document continuity before marking it usable |
| Room lookup | Official room-to-building/floor mapping and aliases | No inference from an unverified numbering convention |
| Food venue | Name, location and entrance, on/off-campus status, current hours, exception dates, menu prices and evidence dates | Unknown hours/prices remain unknown; dietary claims require an explicit supporting source |
| Event | Organizer, venue, start/end, language, publication state, current source and registration link | Confirm the venue and time zone; verify changes and cancellations |
| Photos and models | Ownership/license, permitted use, credits and asset provenance | Do not copy provider tiles, models or restricted university media |

For the first native proof of concept, obtain one campus fragment with **two verified entrance nodes and a connected public path between them**, plus a properly georeferenced building or campus fragment. Use that small real dataset on both phones. Do not reuse geographic points from unit tests or transform the fictional miniature to fit a map.

Record `sourceUrl`, `checkedAt` and a useful bilingual evidence note for each entity. Keep separate evidence for building identity and geometry: an official name is not proof of a footprint. Confirm that the entrance coordinate exactly matches its pathway node, and that a path's recorded length describes the segment being drawn. Curved paths need intermediate nodes rather than a straight segment crossing a building.

Unknown slope is not zero slope. An absence of steps in a model is not proof of step-free access. Important elevation changes, locked gates, temporary closures and route restrictions require a repeatable maintenance process. Before public launch, have a campus representative or trained reviewer walk the full route and assess whether its labels and destination are understandable to a new international student.
