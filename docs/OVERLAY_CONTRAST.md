# Map overlays and readability

This records the earlier Yongin overlay/readability revision and its measured color pairs. It is a historical UI audit, not a fresh accessibility assessment of every version 0.5 campus/language combination. See [TEST_REPORT.md](TEST_REPORT.md) for current recorded checks.

The map is the main content. The previous marketing headline over the campus has been replaced with a compact, opaque Nature Campus card and a source-information button. This keeps the schematic-map qualification available without placing faint text directly over changing terrain.

## Layout changes

- Map controls are grouped into view/labels, zoom, and rotation/reset groups. Each control has an accessible name, a visible keyboard-focus ring, and a 44 × 44 CSS-pixel hit target on desktop and mobile.
- The **Aa** button toggles building labels. `aria-pressed` expresses its state; the selected building retains its label. The choice survives language changes within the session. The building list remains available when labels are hidden.
- Labels use opaque ivory pills with dark text; a selected label uses white on dark teal. Their visual pills are inset inside 44 × 44 minimum button hit areas, reducing visual bulk while preserving touch size. Long selected names wrap.
- A mobile **Find a building** button (minimum 48 pixels tall) scrolls to and focuses the existing search field. It does not duplicate the search input or its ID.
- The selected-building card is now a dock **outside the map canvas viewport**. It cannot cover the selected building or its label. On desktop it reduces the map viewport; on mobile it follows the map in the scrollable content.
- A `ResizeObserver` measures the visible campus card, grouped controls, search shortcut, map failure message, and desktop gesture hint. Their canvas-relative boxes, expanded by eight pixels, are sent to `CampusScene.setOcclusionRects()`. The scene excludes labels from these protected areas. `setLabelsVisible()` handles the label toggle.
- Secondary metadata and source links across Explore, Food, Buses, Ask, Events, and dialogs use darker colors. Most small metadata previously set at 8–10 pixels now uses 11–12 pixels before user font scaling. Published facts, sources, timetable behavior, and answer logic were not changed by this UI pass.

## Measured color pairs

Ratios were calculated from the stylesheet's sRGB hex colors using WCAG relative luminance: linearize each RGB component, combine with coefficients 0.2126 / 0.7152 / 0.0722, then divide `(lighter + 0.05)` by `(darker + 0.05)`. These are specified-color measurements, not estimates from a compressed screenshot.

| Use | Foreground | Background | Ratio |
| --- | --- | --- | ---: |
| Main text on paper | `#183c37` | `#ffffff` | **12.07:1** |
| Map building code on ivory | `#173e36` | `#fffdf4` | **11.59:1** |
| Secondary text on paper | `#516b61` | `#ffffff` | **5.79:1** |
| Secondary text on pale green | `#516b61` | `#edf3e9` | **5.13:1** |
| Map-control text/icon on ivory | `#285b4e` | `#fffdf4` | **7.64:1** |
| Selected label / primary action | `#ffffff` | `#14645b` | **6.99:1** |
| Timetable notice on cream | `#705421` | `#f6f6ed` | **6.49:1** |
| Search-field boundary | `#789182` | `#f8faf6` | **3.24:1** |
| Control-group boundary against its ivory surface | `#789182` | `#fffdf4` | **3.34:1** |

The listed text pairs exceed the WCAG AA **4.5:1** threshold for normal text. The listed boundary pairs exceed **3:1** against the named adjacent surfaces. See [WCAG contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) and [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

## Verification scope

Final browser checks now measure the rendered targets and label/overlay intersections, exercise the search shortcut and label toggle, and confirm the selected dock is below the canvas. At 200% native font scale, phone headers and navigation reflow into two rows. A selected title that cannot fit between overlays falls back to its building code, retaining the full accessible name and restoring the full visible title when space returns. A 320px software-rendered session exercises this case.

The shared TypeScript check passed after integrating the overlay APIs. The documented 44-pixel sizes are CSS minimums for map controls, map labels, selected-place actions, and the revised source/filter buttons; the mobile search shortcut is at least 48 pixels tall. Final browser QA should measure actual rendered rectangles, test the toggle and search shortcut, and verify label exclusion at mobile and desktop sizes, with a selected building and increased text size.

These measurements are **not a full accessibility audit**. They do not establish screen-reader quality, mobile-native behavior, every possible color combination, or automatic WCAG conformance. Terrain and building colors remain illustrative; geometry is still approximate and source limitations remain accessible through the map's source button.
