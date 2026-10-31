# Minimal theme structure

> Research record: original proposals may be superseded. Read the [design handoff](../design-handoff.md) and [current UI/UX](../ui-ux.md) for selected decisions; this record does not approve implementation.

Research checked against official browser documentation on October 31, 2026. Quiet Flat (C) is the selected starting point. Layered Pond (B) and Expressive Gradient (A) remain possible later treatments. This note proposes boundaries for that flexibility; it does not implement an interface, select final palettes, adopt assets, or expose new settings.

## Separate identity from rendering

| Concern | Responsibility | Initial scope |
| --- | --- | --- |
| Theme | Pond or Halloween identity, semantic colors, display/UI font roles, scene accents and motion parameters | Automatic or a fixed explicit theme |
| Appearance | Light or dark palette within either theme | System, light or dark, independently persisted |
| Visual treatment | Solid field, broad solid layers or restrained gradients | Quiet Flat first; authored configuration, no extra selector required |
| Control finish | Filled, raised, jelly-like or lily-pad-inspired styling | Exact finish remains a proposal; authored configuration |
| Optional background image | A decorative, human-made PNG, JPEG or WebP over a CSS fallback | Capability required; no image currently selected |

Treatments and finishes are independent presentation concepts. Independence does not require exposing every combination as a user preference. Ship and review a small set of authored presets instead of promising the full theme × appearance × treatment × finish × image cross product. Theme and appearance remain the approved user choices. Do not persist treatment or finish unless a later decision makes them user choices.

## Small authored contract

The following is a candidate TypeScript shape for discussion, not production code. Names for palettes, gradients, shapes, fonts and assets refer only to local authored definitions. Their final fields should follow the selected mockups rather than preempt them.

```ts
type ThemeId = 'pond' | 'halloween';
type ThemeChoice = 'automatic' | ThemeId;
type AppearanceChoice = 'system' | 'light' | 'dark';
type ControlFinish = 'flat' | 'raised' | 'jelly' | 'pad';

type SceneBase =
  | { kind: 'solid'; shapes?: ShapeSetId }
  | { kind: 'layered'; shapes: ShapeSetId }
  | { kind: 'gradient'; gradient: GradientId; shapes?: ShapeSetId };

type SceneImage = {
  asset: ApprovedBackgroundId;
  fit: 'cover' | 'contain';
  position: readonly [number, number]; // CSS percentages, checked per crop
};

type ThemeDefinition = {
  palettes: { light: Palette; dark: Palette };
  typography: { display: FontId; ui: FontId };
  controls: { finish: ControlFinish };
  background: { base: SceneBase; image?: SceneImage };
  motion: MotionPresetId;
};
```

`Palette` supplies semantic roles for scene, board, givens, entries, notes, grid, related/selected cells, conflicts, focus and control states. Both appearances must define those roles. Keep the board digit font shared and stable. Display and UI roles may vary only where readability permits. Local font files, fallback stacks and licenses belong to the build's asset records. Localization owns interface wording and theme labels; a theme does not contain translated copies of the UI.

Use trusted static data, semantic CSS custom properties and a few closed selectors. Optional fields express actual optional decoration. No arbitrary HTML, runtime CSS payloads, user-uploaded themes, plugin registry, configuration editor or general scene graph is needed. Start with only C's rendering branch; the union describes the intended extension point, not an instruction to implement B and A immediately.

## Keep components stable

Resolve Automatic into a theme ID and System into a light/dark appearance before rendering. Automatic event dates remain a separate policy decision. A fixed explicit theme stays fixed when the date changes. Pass the resolved palette and authored styling choices to the presentation root. A single decorative background component can render the selected base, optional image and sparse shapes behind the scene. It does not own board layout or puzzle state.

The board, number input, menu choices and overflow use semantic roles without checking whether Halloween or a gradient is active. New treatments may add a background-renderer branch and authored CSS, while the Sudoku components keep their structure and behavior. Background layers are noninteractive, excluded from accessibility navigation, clipped to the scene and independent of document flow. They must not intercept taps, shrink the board, cover controls or introduce scrolling.

Frog and lily-pad sprite references belong to shared presentation assets, outside theme definitions. Their geometry, palette and animation frames remain identical across themes. The main menu retains the frog; gameplay omits the decorative frog to maximize the board. That scene-level placement choice is not a theme variant.

Cute, candy-like, tactile or lily-pad-inspired controls can come from CSS fills, borders, restrained highlights, rounding and shallow shadows. A finish must preserve the control's layout box, label, focus outline and hit area. Decorative layers must not alter button meaning, keyboard behavior, notes, cell geometry or box boundaries. Do not add a button row, wobbling hit targets, heavy glass or blur to demonstrate theme flexibility.

## Optional image behavior

CSS supports stacked images and gradients with a background color below them, making a useful fallback independent of image success. Background images do not provide accessible content: never place instructions, digits or meaningful status solely in them. [MDN: background-image](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/background-image).

Default an adopted full-scene image to nonrepeating `cover` only after checking its crop. `cover` preserves aspect ratio while cropping; `contain` preserves the whole image and can leave uncovered space. Keep the CSS base visible in that space. Position values control alignment, not a guarantee that a subject remains visible at every aspect ratio. Review portrait, landscape and desktop crops; allow an authored position adjustment only when a real asset needs it. [MDN: background-size](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/background-size), [MDN: background-position](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/background-position).

Every adopted image needs a local asset record with creator, source URL, human-authorship evidence, license, attribution requirements and any permitted modifications. Keep that provenance out of rendering logic. A background capability does not authorize elaborate painted scenery, AI-created production images, external runtime image URLs or themed replacement frog sprites. The opaque board and readable controls must remain usable with the image missing, blocked or still loading.

Size and compress images for their actual display needs before bundling. Avoid shipping an oversized source merely because CSS scales it down. Profile any large image: it can become the largest contentful element, and CSS discovery can delay its request. Preload only a measured critical image rather than every optional theme asset. The board and controls must render without waiting for decoration. [web.dev: Optimize LCP](https://web.dev/articles/optimize-lcp).

Bundle adopted images, shared sprites and required fonts locally. Resolve paths through Vite's configured base so GitHub Pages repository subpaths work. Include shipped scene assets in the explicit offline caching plan; browser HTTP caching alone does not establish offline support. Verify offline reload and switching between shipped themes after cache preparation, plus CSS fallback when an optional image is absent. Initial installation requires a connection. [Vite: Public base path](https://vite.dev/guide/build.html#public-base-path), [web.dev: Service worker caching](https://web.dev/articles/service-worker-caching-and-http-caching).

## Motion and review boundary

Start with static backgrounds. If later approved, use short localized transform/opacity effects, then measure on target phones. Those properties do not make a large animated layer free. Avoid animated full-screen gradients, parallax image panning and blur. Reduced motion removes nonessential movement without hiding state or changing layout. [web.dev: CSS animation performance](https://web.dev/articles/animations-guide), [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion).

For every shipped preset, review both appearances with readable digits/notes, focus, selection and conflict states; identical board size; touch and keyboard operation; English/German/Spanish labels; portrait/landscape/desktop composition; reduced motion; and offline recovery. Test automatic and explicit preference resolution separately from visual treatment. When adding B, A, a new finish or an image, review its actual supported presets and fallback behavior before exposing it. Do not create a combinatorial test matrix for combinations the product does not offer.

See [visual constraints](../design.md), [theme requirements](../themes.md), [architecture](../architecture.md) and [existing contrast/performance research](immersive-surfaces.md). Exact swatches, fonts, finish details, image adoption and seasonal dates remain discussion items.
