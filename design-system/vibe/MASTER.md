# VIBE product design

## Identity

English product interface. Creator titles, captions and messages stay in their original language.

| Token | Value | Role |
| --- | --- | --- |
| Background | `#f2ecdd` | Warm washi paper |
| Panel | `#fbf7ec` | Translucent paper cards and sheets |
| Raised | `#e9e2d2` | Secondary controls |
| Text | `#352b23` | Warm ink |
| Muted | `#72685c` | Supporting copy |
| Accent | `#267d76` | Teal from the VIBE symbol, adapted for light contrast |
| Gold | `#92733f` | Token identity only |

DM Sans for interface text and tabular numbers. Instrument Serif for editorial accents, target questions and the VIBE wordmark. Use the supplied symbol and coin, with original proportions and colors. `ink-theme.css` provides the final theme over the shared layout system. The original generated watercolor artwork lives at `public/brand/vibe-ink-landscape.webp`; its optimized size is 168 KB. Intro artwork is prominent; product backgrounds use a pale wash so content remains readable.

## Page hierarchy

- Discover: video first, compact creator identity, optional Call panel.
- Calls: target question, observed count, progress, Yes/No. Rules are disclosed on demand.
- Call detail: one decision beside momentum and timing. Fixed 2× return includes the original amount; cancellation refunds it.
- Profile: personal activity and videos. Creation remains a separate Studio route.
- Studio: real video preview, title, caption, category, hashtags, one publish action.
- Community: channels, conversation, one composer. Messages are browser-local and labelled accordingly.
- Monad proof: distinct signed-choice mode. No VIBE stake or reward in this mode.

## Interaction

44px minimum touch controls. Turquoise keyboard focus. Hover feedback on pointer devices; clear pressed/selected states on touch. Stable sidebar rail, smoothly revealed labels, mobile navigation respects safe areas.

Short page fades, directional feed motion, spring tab selection, sheet/dialog entrances and animated observed counts. No artificial view increments or continuous decorative motion. Respect reduced motion globally and locally. Keep official YouTube controls and attribution unobstructed.

## Copy and data

Use comma grouping in English. Deadlines explicitly use GMT+7/Jakarta. Normalize pre-release generated Call questions only for presentation; do not change saved targets, rules, balances or signatures.

Guest balances stay hidden. Entry actions require sign-in. Never describe periodic YouTube API snapshots as instantaneous views.

## Release verification

Checked Discover, Calls, Call detail, Profile, Studio and Community at 375px, 430px and 1440px. No horizontal overflow or browser runtime errors. The production build, lint and 68 unit tests pass.

Browser interaction checks cover automatic intro entry, logo response, stable sidebar positioning, swipe in both directions, URL/Back navigation, a single active player, guest balance visibility, Call sheets, browser-local comments, and file/caption/category preview in Studio. Browser QA uses isolated fixtures for Call data and does not submit uploads or wallet transactions to production.
