# Human artwork and theme typography

Research checked 2026-10-30. These are candidates for discussion, with no asset purchase, download, adoption or interface implementation. The target is one small, fixed set of simple frogs and lily pads shared by Pond and Halloween. Theme differences come from backgrounds, gradients, colors, buttons and typography.

## Artwork shortlist

No complete matching flat frog-and-lily-pad suite was verified. The strongest options cover frogs; a matching lily pad still needs a verified source or a small human-made commission. A paid listing, permissive license or vector format does not establish human authorship.

| Candidate | Verified contents and fit | Human-authorship evidence | Cost and license |
| --- | --- | --- | --- |
| [Kenney Animal Pack Redux](https://opengameart.org/content/animal-pack-redux), also listed as [Animal Pack Remastered](https://kenney.nl/assets/animal-pack-remastered) | Frog among 30 animals, each with eight square/round, outlined/plain and detailed/simple styles. PNG, spritesheets and vector sources. Best simple frog-face option; no lily pads listed. This is an icon collection, not a full animated pond scene. | Strong historical provenance: creator's own Kenney upload dated February 2018, with source vector files listed and contemporary discussion. Human origin is a reasoned inference from that provenance; an explicit current no-AI declaration was not found during this review. | Free, CC0. Commercial use and attribution-free use confirmed in [Kenney support](https://kenney.nl/support). |
| [RhosGFX Vector Animals Pack](https://rhosgfx.itch.io/vector-animals-pack) | Flat cartoon animal icons with outlined and plain variants in 64px and 256px PNG. Current preview includes a little side-view frog and a frog-face icon. No lily pad verified. Good full-body frog option, with more outline/shading detail than Kenney. | Strong direct creator evidence: listing says no generative AI, describes redrawing and improving animal shapes, and creator identifies Adobe Illustrator in comments. This is the creator's declaration, not an independent production audit. | Checked listing: USD 7.19 sale, USD 7.99 regular; Pro tier USD 10.79 sale. Recheck before purchase. Standard license allows own commercial projects and editing; attribution optional. See [creator license](https://www.rhosgfx.com/license). |
| [GameDeveloperStudio Animated Frog](https://www.gamedeveloperstudio.com/graphics/viewgraphic.php?page-name=Animated-frog&item=194g7a7g7v4r9x2z3u) | Animated cartoon frog, artist Robert Brooks. More detailed, heavily outlined and less minimal than the other choices. No lily pad verified. Public description does not enumerate source formats or animation states, so these remain acquisition checks. | Strong explicit evidence: named artist plus the creator's [no-AI declaration](https://www.gamedeveloperstudio.com/no-ai.php), which states that the art is personally designed and crafted by human hands. | Checked price USD 2.50, with a separate supporter price. [Standard license](https://www.gamedeveloperstudio.com/license.php) permits commercial/personal projects, multiple projects and modifications; attribution optional. |

**Suggested direction:** compare Kenney's simplest round frog face against RhosGFX's small full-body frog. Keep the selected frog unchanged across both themes. If neither provides the right lily pad, commission a human artist for one matching pad and any necessary frog poses, with source files and explicit website/PWA distribution rights. Do not generate or trace the missing production artwork with AI.

### Distribution details

- [CC0](https://creativecommons.org/publicdomain/zero/1.0/) permits modification and redistribution, including commercial use. Kenney is the easiest option for a public GitHub repository and offline bundle; retain a provenance record even though attribution is optional.
- RhosGFX forbids standalone asset redistribution and standard-license client/commission work. It also explicitly forbids using its assets as AI reference material, input or training data. Do not feed its previews or purchased files into ImageGen. The separate Commercial License concerns commissioned work; it is not automatically necessary merely because an own game earns money.
- GameDeveloperStudio permits incorporation into websites, apps and games, while forbidding redistribution as standalone assets, developer templates or asset libraries. Its publishing license is tied to the license holder/publisher.
- For both paid choices, ship only the assets required inside the finished game and offline cache. Keep purchased archives and editable originals out of a public source repository. Website/app permission supports normal game delivery, but do not interpret it as permission to publish an asset download collection. Verify any remaining public-repository packaging ambiguity with the creator before adoption.

### Other results and exclusions

[Delapouite's Lily pads icon](https://game-icons.net/1x1/delapouite/lily-pads.html) is a separate SVG/PNG silhouette option under CC BY 3.0, not a matching cute frog suite. Named-artist attribution is available, but the creation process and human-authorship evidence were not fully verified here. It is a lead, not an approved production asset.

Falvey's [Lily Pond Life FX](https://falvey.itch.io/lily-pond-life-fx-6-animated-32x32-pixel-pond-life-effects-48-frames) includes frog/lily animations but explicitly discloses AI-authored code drawing its sprites. Exclude it from production under the artwork policy, even though it says no AI image generator was used.

## Typography proposals

Design judgments below are proposals. Keep digits and small notes clear in every theme. Apply seasonal display fonts only to the title and short, sufficiently large menu labels, with a readable UI family available for longer translations.

| System | Pond | Halloween | Tradeoff |
| --- | --- | --- | --- |
| A, suggested | Fredoka 500/600 title and main choices; Nunito 600 UI and digits | Mystery Quest title; Nunito UI and digits | Rounded everyday identity, gentle storybook Halloween; three families total. |
| B | Quicksand 600/700 title and choices; Nunito UI and digits | Creepster title only; Nunito UI and digits | Stronger Halloween lettering; restrict Creepster to large display text. |
| C, smallest | Nunito throughout, varying size and weight | Fredoka title/large choices; Nunito UI and digits | Two families, softer seasonal distinction supplied mainly by the palette and background. |

Official Google Fonts records establish named designers, licenses, axes and Latin coverage:

| Family | Designer and available weights | License/source |
| --- | --- | --- |
| Fredoka | Milena Brandão and Hafontia; variable weight 300-700 and width 75-125 | [Metadata](https://raw.githubusercontent.com/google/fonts/main/ofl/fredoka/METADATA.pb), [OFL](https://raw.githubusercontent.com/google/fonts/main/ofl/fredoka/OFL.txt) |
| Nunito | Vernon Adams, Cyreal and Jacques Le Bailly; variable weight 200-1000, normal and italic | [Metadata](https://raw.githubusercontent.com/google/fonts/main/ofl/nunito/METADATA.pb), [OFL](https://raw.githubusercontent.com/google/fonts/main/ofl/nunito/OFL.txt) |
| Quicksand | Andrew Paglinawan; variable weight 300-700 | [Metadata](https://raw.githubusercontent.com/google/fonts/main/ofl/quicksand/METADATA.pb), [OFL](https://raw.githubusercontent.com/google/fonts/main/ofl/quicksand/OFL.txt) |
| Mystery Quest | Sideshow; static 400 display face | [Metadata](https://raw.githubusercontent.com/google/fonts/main/ofl/mysteryquest/METADATA.pb), [OFL](https://raw.githubusercontent.com/google/fonts/main/ofl/mysteryquest/OFL.txt) |
| Creepster | Sideshow; static 400 display face | [Metadata](https://raw.githubusercontent.com/google/fonts/main/ofl/creepster/METADATA.pb), [OFL](https://raw.githubusercontent.com/google/fonts/main/ofl/creepster/OFL.txt) |

These families use SIL OFL 1.1. Self-hosting and bundling with software are permitted; retain each copyright notice and OFL when distributing font files. Respect reserved font names when modifying font software. See the [OFL usage guidance](https://openfontlicense.org/how-to-use-ofl-fonts/) and individual license files.

For the eventual offline PWA, bundle the selected local font files and switch theme font tokens without changing puzzle state. Avoid depending on a live font CDN. Before selection, compare actual English, German and Spanish labels, including `ä ö ü ß Ä Ö Ü ñ á é í ó ú ¿ ¡`, along with `123456789`, small notes and a timer. Latin/Latin-ext metadata supports the shortlist but does not replace checking the exact delivered font subset. Tabular figures are a useful timer option only if verified in the chosen file; Sudoku cells already provide fixed positioning. No claim of tabular support was verified in this review.
