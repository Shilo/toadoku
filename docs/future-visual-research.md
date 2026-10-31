# Future visual research and acceptance plan

Status: 2026-10-31. Requested future improvements to the selected inward-pad/Winding-shallows design. This records work to research, implement and test later; neither feature is implemented or validated now. Preserve the [design handoff](design-handoff.md).

Scope update: animated water is now part of the next visual prototype. Research the simplest useful approach and implement/test it there; production integration remains later. Procedural pad cuts remain deferred. The prototype only adds menu/game navigation, static digits and pad selection, not Sudoku gameplay or product infrastructure.

Create a fresh prototype rather than extending old demos. A pond sub-agent researches animation options and reports a short recommendation/tradeoff comparison, then owns implementation and motion checks for the chosen background. The parent challenges the recommendation and handles screens/integration. Use explicit, separate file ownership; existing demos are visual references only.

## Procedural lily-pad splits and perimeter

The request concerns silhouette only: researched notches, splits, cutouts or gaps that make the round pad feel like an abstract lily pad, possibly with a gently irregular edge. Preserve its green palette, raised lower edge/highlight, button character, inward alignment and 1:1 bounding envelope. This is not approval for realistic leaf texture, new shading, veins over text, recoloring or a stretched botanical sprite.

Research tasks:

- Inspect reliable botanical photos/descriptions and record sources. Determine which features are actual openings versus surface markings. Do not assume every apparent vein should become a transparent slit.
- Compare a single edge split with a few restrained cuts and an optional mildly irregular perimeter. Research the minimum recognizable treatment rather than building a general plant generator.
- Compare simple procedural CSS/SVG masking or path geometry for these control surfaces. Choose the smallest approach that supports the required cutouts, smooth sizing and phone performance; no additional generator framework is selected.
- Keep any cutout outside a protected central number/note zone. True gaps expose the existing pond fill; do not paint dark fake holes or use extra water colors.
- If controlled variation is useful, keep it deterministic and stable for a cell/puzzle. Do not regenerate it on input, language/theme changes or rotation. Seed/variation policy and parameter values remain open.
- Use temporary ignored ImageGen comparisons before refining a measured control prototype. Final illustrated assets, if ever needed, remain subject to the human-made artwork policy.

Acceptance before adoption:

- Decorative face remains within a 1:1 circular-derived envelope at all target sizes and orientations; it never stretches with the long cell axis.
- Inward placement, all rectangular button bounds, spacing and logical row/column navigation remain unchanged.
- Water, cuts and perimeter layers ignore pointer input. Clicking an opening or empty part of the cell selects that exact cell.
- Labels and all nine candidate positions remain on a quiet opaque area with readable type and contrast. Test givens, entries, errors, selection, focus, blank pads and pressed states. Do not approve the current tiny note specimen by default.
- Lower edge/highlight follows the new visual mask without leaking across holes or expanding the face bounds. The cream dock/menu controls are unchanged.
- Shape stays still while solving, scales cleanly, and remains usable in grayscale, browser zoom and both orientations.
- Procedural UI control geometry is not a substitute route for shipping AI-created illustrations. Keep provenance requirements for actual artwork.

Open choices: exact cuts, count/depth, perimeter amplitude, whether any variation is beneficial, mask/path format and final readable note solution.

## Animated pond water in both scenes

The menu and gameplay backgrounds should gently evoke moving/rippling water while retaining the selected flat abstract design. Slow drift/deformation of the existing three shapes is an explicitly suggested simple option. A shader is an investigation option, not an adopted technology or dependency.

Research tasks:

- Compare a static reference, restrained CSS-led shape movement and a small procedural-rendering approach only if the simpler option cannot achieve the desired motion.
- Establish how to deform shared boundaries without seams, gaps, overlap flicker or temporary fourth colors. Decide what looks like water without becoming a realistic reflective scene or a collection of large ripple rings.
- If a shader is evaluated, compare its visual benefit, startup/caching cost, compatibility, fallback and sustained device performance against CSS. Preserve JavaScript/static hosting and no required WebAssembly; do not introduce a game engine merely for water.
- Keep menu and gameplay motion in one small background responsibility with authored theme parameters. Use broader freedom in the menu and constrained motion around gameplay circles.
- Design a motion envelope so every visible pad, lip, digit and note remains in its assigned region fill throughout the animation. Do not let moving water imply a different 3x3 box.
- Investigate reduced-motion handling, a stable static fallback, suspension when the page is hidden and behavior on resize, orientation change, resume and theme changes.
- Discuss speed, amplitude and whether a motion preference is needed after comparing examples. No new permanent control is approved.

Acceptance before adoption:

- Exactly the same three solid water fills remain shared by menu and gameplay; no unwanted gradient, tint, reflective layer or decorative texture. The desired impression comes from restrained movement/shape, not a new palette.
- Full board allocation, inward pad placement, hitboxes, labels, focus indicators, dock and 4px/8px spacing remain stationary. No eighty-one bobbing pads or animated Sudoku contents.
- Sample color containment over the complete motion range, not only a single animation frame. Check extreme phases and changes in orientation/viewport.
- Reduced motion gives a fully usable static composition with the same region/readability cues. Hidden/background operation should not keep unnecessary rendering work active.
- Verify hit testing and logical navigation during motion; the background never intercepts input. Motion must not affect puzzle correctness, timing, currency or saved progress.
- Test actual Motorola G31/G32 in browser and installed PWA, portrait and landscape. Record frame timing, dropped frames, responsiveness, sustained load and memory against the static baseline; review energy/thermal impact where measurable. Set budgets from evidence, not desktop-only claims.
- Verify desktop, Android display/text scaling, browser chrome/safe areas, offline reload, fallback behavior and screenshot comparability.
- Keep the static renderer usable if animation/rendering support fails. No motion backend is selected until research and target-device testing justify it.

## Implementation order

1. Research sources/options and record a concise comparison for the next discussion.
2. Review temporary examples against the selected handoff; settle the unresolved parameters.
3. Implement only the agreed feature in the presentation/background boundary.
4. Test geometry, readability, input and actual-device performance as applicable.
5. Record evidence and limitations before calling either feature complete.

These tasks do not reopen the accepted inward alignment, board B, cream action controls, two-size spacing, menu layout or basic-Pond scope.
