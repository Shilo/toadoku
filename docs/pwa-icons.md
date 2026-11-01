# Installation icon recipe

Installation icons identify the app outside the game. They are independent of menu artwork and the currently selected theme. Keep a recognizable human-authored mark and record creator/source/version, rights, modifications and the notices shipped with derivatives. The temporary menu-sketch exception does not authorize final generated installation artwork. See [asset provenance](production-assets.md#installation-icons) and the [PWA system](pwa-system.md).

## Current source and outputs

[icon.svg](../public/pwa/icon.svg) adapts the human-authored [Lucide Sprout](https://lucide.dev/icons/sprout) from pinned `@lucide/svelte` 1.66.0: cream strokes on opaque Pond green. [Lucide's ISC license](https://lucide.dev/license) permits adaptation with its notices; the complete original notice is retained at [Lucide-ISC.txt](../public/pwa/Lucide-ISC.txt). Preserve it while these derivatives remain distributed.

[icons.mjs](../tools/pwa/icons.mjs) reads that trusted SVG and renders it with the lockfile's Playwright Chromium. It writes three tracked files:

| File | Pixels | Manifest purpose |
| --- | --- | --- |
| `public/pwa/icon-192.png` | 192 x 192 | `any` |
| `public/pwa/icon-512.png` | 512 x 512 | `any` |
| `public/pwa/maskable-512.png` | 512 x 512 | `maskable` |

The generator sets the repository-local browser path before dynamically importing Playwright. Static import initialized Playwright too early and selected a global browser cache; the reviewed import-order fix leaves all three output hashes unchanged. It renders a viewport at device scale factor 1, first 192 then 512, and screenshots the same 512 viewport again for maskable output. There is no automatic padding, shape analysis or separate maskable composition.

## Safe geometry and future artwork

The [Web Application Manifest specification](https://www.w3.org/TR/appmanifest/#icon-masks) guarantees a centered circular safe zone of radius 40% of the smaller image dimension. At 512 square that radius is 204.8 pixels. Keep every essential detail inside that circle, with a solid full-bleed background outside it. Transparent corners can acquire a platform-chosen background. Review the circle, rounded-square and other platform masks rather than relying on a square preview.

The current 512 PNGs are byte-identical and fully opaque. Measured non-background pixel centers reach radius 163.751 pixels; even the full pixel squares stay below 164.459, inside 204.8. Their bounds are x148 through363, y124 through363. The 192 mark reaches radius61.307 inside76.8. This checks the present padded Sprout only; setting a manifest purpose does not make future art safe.

For a replacement:

1. Supply approved, self-contained static SVG with a square `viewBox`, explicit fills/strokes and intentional safe-zone padding. Convert any licensed lettering to paths; record font rights and derivation. Avoid external files/fonts, scripts, animation and unresolved CSS dependencies. This trusted-source renderer is not an SVG sanitizer or a general asset converter.
2. If one padded design suits all purposes, replace `icon.svg` and regenerate all three PNGs. If the ordinary icon needs a larger composition, retain a separate padded maskable SVG and explicitly adapt the tool to render that source, or use a reviewed external export. Keep both reproducible sources and their notices. The current generator overwrites `maskable-512.png` from `icon.svg`; a manually replaced PNG alone will be lost on the next run.
3. Review actual192/512 exports for clipped strokes, alpha, readable small-scale shape and all essential details inside the safe circle. Browser rendering and third-party resources can vary; self-contained paths and the pinned tool/browser reduce those inputs. Cross-platform byte identity is not assumed.

## Reproduce

From the repository root with Node >=24.11 and the committed lockfile:

```text
npm ci
npm run test:browser:install
node tools/pwa/icons.mjs
```

The install command downloads the Playwright-matched Chromium into ignored `prototypes/production-ui-evidence/browsers`; do not commit browser binaries. [Playwright documents](https://playwright.dev/docs/browsers) that its versions require matching browser binaries. The generator uses no running Vite server or remote icon service. Run it as the single browser/heavy job. Compare the changed source, all three outputs and hashes before committing; do not regenerate unrelated illustration assets.

The import-order regression was checked with one actual generator run:192 PNG SHA-256 `553d393bb7d4caf96b941d3e87c173db432665f2096127d07002e1ae88839d55`; both512 PNGs `7c6ac8bd7e295850067f66bdd1a024357d4555924a9f2700652acb193d1ee9ec`. Before/after bytes, dimensions, opacity and geometry are recorded in ignored `prototypes/pwa-validation/icon-generator-import-order.json`. Those are reproduction facts for the current inputs, not required hashes for a future approved redesign.

## Manifest and release checks

[vite.config.ts](../vite.config.ts) declares the three PNG paths, sizes, MIME and purposes. Keep manifest `id`, `start_url` and `scope` at `./` relative to the configured app base. `TOADOKU_BASE` must match the actual Pages deployment path; moving to another base/origin can change installation identity and storage namespace, so it is not an ordinary icon edit. Do not add a seasonal ID or start URL. Keep worker scope/script paths aligned.

After changes:

```text
npm run check
npm run build
node tools/pwa/validate.mjs dist
```

The artifact gate verifies icon existence, PNG dimensions, stable manifest identity and integrity-bound inclusion. It does not judge logo readability or safe-circle geometry. Inspect the built manifest/icons at both `/` and the actual repository subpath, including correct MIME and no redirects. Review installed appearance/masks and fresh cold offline launch on Android hardware when available. A changed public icon changes the release identity; use the normal safe waiting update tests, not forced reload/activation. Existing launcher icons can refresh on browser/platform timing, so a successful build alone does not prove immediate replacement of an installed icon. Record hardware and authorized-host checks honestly in [acceptance](pwa-acceptance.md).
