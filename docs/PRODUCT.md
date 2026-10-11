# VIBE product specification

**Current implementation overview · 11 October 2026**

## Purpose

Help viewers turn an early opinion about content into a time-bound Call with a visible outcome. The product connects discovery, prediction and community context across Gaming, Sports and Crypto.

Recommended Metropolis track: **Social, Attention & Culture**. The primary value is participation around content; free credits support the interaction.

## User journeys

### Guest

The animated intro enters Discover automatically. Guests can watch Shorts, inspect public Calls and results, and visit other product pages. They have no visible account balance. Entry and upload actions require sign-in.

### Signed-in viewer

Google authentication establishes a Privy account. The server grants 1,000 VIBE once per DID. The same account sees its balance and history across devices. Logging out hides its balance immediately.

A credit Call accepts a single Yes/No choice and an integer amount of 10–500 VIBE while entry is open and source data is fresh. A successful response confirms the debit; repeated submission must not charge again.

### Creator

Studio is a separate navigation destination. Select an owned MP4/WebM up to 40 MB, preview it, add a 3–100 character title, caption up to 500 characters, category and up to five unique hashtags. Each hashtag is 2–24 letters, numbers or underscores. Publish stores the public video in Supabase Storage and its metadata in the server state.

Uploads enter as insight content. They do not automatically receive YouTube views or a source Call.

### Monad participant

A separate proof Call requires an explicit Privy wallet signature. The relayer submits a commitment and pays Testnet gas. The participant can inspect commit, reveal and result receipts. This action does not spend VIBE credits.

## Content and navigation

- **Discover:** curated Shorts and published uploads. One active video; previous playback stops on navigation. Video state is represented in the URL.
- **Calls:** search/filter open and completed predictions; source views Calls and football fixtures.
- **Studio:** preview and publish content.
- **Community:** channel and shared-Call prototype, currently browser-local.
- **Profile:** identity, balance, personal activity and uploads.

On mobile, the official YouTube player occupies the available width between compact stats and bottom navigation/Call controls. VIBE gestures live outside the iframe. Source branding and controls remain unobstructed. The desktop layout provides additional context around the player.

## Rules

- [YouTube source Calls](../VIBE_SOURCE_CALL_PRD.md): calibration, fixed target, six-hour evaluation and refunds.
- [Football Calls](football-calls.md): home-win question, kickoff cutoff and verified full time.
- [Monad proof Calls](MONAD.md): commitments, reveal, source snapshot and trust boundary.

## Interaction principles

Use concise English interface copy, one clear primary action, readable numbers and progressive disclosure for rules. Creator titles and submitted captions retain their original language.

Motion helps explain state changes: directional feed transitions, smooth sheets, selection feedback and animation only when observed counts change. Respect reduced motion; never animate fabricated source growth.

## Implemented versus future work

| Implemented | Still limited or future |
| --- | --- |
| Curated Shorts, real observations, source Call engine | Personalized recommendations and additional providers |
| Account ledger and idempotent settlement | Purchase, transfer and cash-out are intentionally absent |
| Privy signatures and Monad commit–reveal | Unified onchain VIBE credit accounting |
| Studio and public upload storage | Live authenticated upload acceptance still pending |
| Local community UI | Shared messages, moderation and notifications |
| Profile activity | Verified Early & Right ranking and leaderboard |

Older HIVE PRDs are historical design records. Their proposed reputation, anti-abuse targets and community behavior are not shipped-feature claims.
