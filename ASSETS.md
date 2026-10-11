# Asset attribution

The repository license applies to original application source. Embedded videos, third-party marks and other external assets keep their owners' rights and applicable licenses.

## Current YouTube Shorts

Discover uses the official YouTube player. It does not download or rehost the creators' Shorts. The app retains source links, creator metadata and timestamped YouTube Data API observations.

The **10 October 2026 selection** has 20 Shorts: 7 Gaming, 7 Sports and 6 Crypto. The complete ID/source/date/duration list is in [the curation record](docs/shorts-curation-2026-10-10.md); [initial observations](docs/shorts-observations-2026-10-10.json) record measured values rather than generated engagement.

The previous 20-video selection remains tracked for existing Call settlement. It is not the active Discover selection. Its attribution record is preserved in [Git history](https://github.com/enzerra/Project-Monad/blob/3bc68b2/ASSETS.md).

Public status, embed permission, duration and portrait orientation are checked before display. API eligibility does not confer ownership of a creator's work. Official playback controls and branding remain visible.

## Legacy demo clips

These two clips are attributed by their source pages as Creative Commons Attribution 3.0 Unported. The demo crops them into a vertical frame; source audio is absent. They are no longer part of the live Shorts selection.

| Local asset | Source / creator | License |
| --- | --- | --- |
| `public/videos/minecraft-beta-gameplay.webm` | [Minecraft Beta Gameplay — Xbox México](https://commons.wikimedia.org/wiki/File:Minecraft_Beta_Gameplay.webm) | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) |
| `public/videos/dishonored-2-gameplay.webm` | [Dishonored 2 gameplay clip — Xbox México](https://commons.wikimedia.org/wiki/File:Dishonored_2_gameplay_clip.webm) | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) |
| `public/prediction-brands/dishonored-still-dark.jpg` | Still derived from the Dishonored clip above | CC BY 3.0 derivative |

Any legacy fixture counts/questions describe a local demonstration, not verified metrics about those clips.

## Topic and club marks

| Asset | Attribution |
| --- | --- |
| `public/prediction-brands/dishonored-2.png` | [Arkane Studios logo, Wikimedia Commons source](https://commons.wikimedia.org/wiki/File:Dishonored_2_logo.png). Source marks the text logo public domain; trademark ownership is retained. |
| `public/prediction-brands/bitcoin.svg` | [Bitcoin.svg, Grayliptrot / Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Bitcoin.svg). Source marks it public domain. |
| `public/images/clubs/*.png` | Barcelona, Getafe, Al Hilal and Al Ittihad team marks, sourced from ESPN. [Exact source URLs and team IDs](public/images/clubs/SOURCES.md). Club marks retain their respective owners' rights; they are used to identify fixtures, not to claim affiliation. |

Legacy “Match Day” and “SR” badges are VIBE-created typography, not official team or game identities.

## VIBE identity and generated artwork

| Asset | Origin / treatment |
| --- | --- |
| `public/brand/vibe-symbol.png` and `vibe-wordmark.png` | Supplied by the project owner as VIBE identity assets |
| `public/brand/vibe-token.png` | Owner-supplied “Futuristic VIBE Unity Coin.png”, 5 October 2026; delivered through Next Image |
| `public/brand/vibe-ink-landscape.webp` | Original AI-generated watercolor/ink landscape made for VIBE, optimized as WebP for the ivory-paper theme |
| `public/brand/charcoal-plaster.webp` | Earlier AI-generated charcoal plaster texture, converted from PNG to WebP |
| `public/brand/hive-contours.svg` | Repository-authored decorative contour artwork |

The supplied website reference images guided palette and composition. They are not bundled as the site's background. Owner-supplied brand assets are recorded as supplied; VIBE does not independently certify their provenance.

Historical charcoal prompt: “Top-down rough charcoal plaster wall, fine mineral grains and irregular cement pores, uniform lighting, near-seamless square texture, no objects, text, or logos.”

## Fonts and icons

- **DM Sans** and **Instrument Serif** are loaded from Google Fonts through CSS imports; earlier shared styles also request **Geist** and **Manrope**. Font projects retain their own notices. [DM Sans license](https://github.com/google/fonts/blob/main/ofl/dmsans/OFL.txt) and [Instrument Serif license](https://github.com/google/fonts/blob/main/ofl/instrumentserif/OFL.txt) use SIL Open Font License 1.1. Preserve the respective notices if redistributing font files separately.
- **Lucide** icons use the ISC license. [Dependency notices](THIRD_PARTY_NOTICES.md).

User-uploaded captions and videos belong to their uploaders and are not automatically covered by the repository's MIT license.
