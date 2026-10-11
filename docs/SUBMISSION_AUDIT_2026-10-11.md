# VIBE submission readiness — 11 October 2026

> Historical audit before the documentation/repository handoff. Its default-branch and documentation gaps describe that earlier moment. See [the current checklist](SUBMISSION_CHECKLIST.md) and [release evidence](RELEASE.md) for subsequent progress.

## Decision

The hosted MVP and its first Monad lifecycle are operational. The submission package is **not complete**: the owner confirmed that the demo is not recorded and the portal project has not been created. Finish the public code handoff, recording and portal entry before submission.

## Checks performed

| Item | Evidence | Assessment |
| --- | --- | --- |
| Public app | Railway deployment `f886177c-5d76-4456-8100-87ed0a805aae` reports SUCCESS | Ready |
| Health | `/api/health`: HTTP 200, ready, storage connected, source fresh | Ready at audit time |
| Infrastructure preflight | Privy verification configuration; Supabase profile/Call schema, versioned state and upload bucket; real YouTube API metrics all pass | Ready at audit time |
| Google login | Owner previously confirmed two independent Google accounts, balances and signed choices | Prior acceptance evidence; not repeated today |
| Upload | Public MP4/WebM bucket with 40 MB limit is configured | Still needs real authenticated upload, playback and persistence acceptance |
| Monad | Direct RPC on chain 10143: 2 commitments, 2 reveals, no unrevealed choices, stage Resolved, outcome Yes | Complete lifecycle verified |
| Source Calls | Public API includes resolved source Calls and three current open source Calls | Operational; these use the server ledger, not the Monad proof contract |
| Football Calls | Public API reports both requested fixtures resolved | Server-ledger results, not onchain proofs |
| GitHub | Anonymous GitHub API confirms repository is public and MIT licensed | Public source available, latest release handoff incomplete |
| Tests | Initial application run 77 passed / 1 timeout; affected `live-api.test.ts` rerun 4/4 passed; contract tests 12/12 passed | One timing-sensitive full-suite result; record honestly |
| Dependency audit | `npm audit --omit=dev`: 23 moderate, no high/critical | Review remaining advisories; not a security certification |
| Demo | Owner confirms not recorded | Required, missing |
| Portal | Owner confirms project not created | Required, missing |

The production build and 375/1440 px crest card/detail checks passed during the preceding release. This audit did not repeat a production build or authenticate as the owner.

## Remaining work, in order

1. **Create the portal draft now.** Use the same login provider as registration. Enter VIBE, team details, a concise English description, website, repository, architecture and contract links. Track recommendation: **Track 03 — Social, Attention & Culture**. Enter only one primary track. Sponsor bounties are optional and require checking their own requirements; Privy usage alone does not prove eligibility.
2. **Finalize the public source release.** Push local commit `3bc68b2` after GitHub authentication. Publish the tested release on the default branch (review/merge), or explicitly submit the release branch URL. The default `main` currently points to old HIVE commit `e35a0e7`, whereas the public release branch is `ee3cafb`. Judges following a bare repository link will see the old default revision.
3. **Refresh judge-facing documentation.** Translate the README into concise English, include current architecture and screenshots, link current Shorts curation and club-crest attribution, and replace stale pending/legacy HIVE claims. Keep AI disclosure and MIT license. `ASSETS.md` still lists the old Shorts set and omits the current ink landscape. Link/update the existing source records instead of claiming third-party assets are MIT licensed. Distinguish free offchain VIBE credits from the separate Monad commitment flow; describe API polling accurately, not as instant YouTube push updates. Community is still a local prototype.
4. **Complete real upload acceptance.** Signed-in user uploads an owned MP4/WebM, previews it, supplies caption/category/hashtags, publishes, refreshes and confirms playback/profile persistence. Check the same public content in another session. Bucket and unit checks alone do not prove this journey.
5. **Prepare and record the demo, at most three minutes.** Use `VIBE_3_MINUTE_SCRIPT_EN.md`, update it to the current UI and verified outcome below. Record the actual deployed product and Monad explorer evidence. No open Monad Call exists at this audit: prepare a new genuine Call if recording a fresh signature, capture it before close, then capture its eventual result; alternatively use genuine existing transaction footage if available. Do not present ordinary VIBE credit predictions as onchain transactions. Upload the final video to a public-access link and check it logged out.
6. **Complete the portal submission.** Check exact live form fields, attach the demo and current repository/website/contract links, select the track and eligible optional bounties, submit and save the confirmation. Keep hosting and public links available throughout judging.

## Verified Monad evidence

- Network: Monad Testnet, chain ID `10143`.
- Contract: `0x1a4914ec33c242b8fc781b3780c4bb0ab9bc09a5`.
- [Live result page](https://web-production-5e33e.up.railway.app/live/calls/cc2aafed-4e47-486e-ba0e-ebeb1025f7aa).
- Target: 178,187,952 views. Result: **178,194,419 views**, outcome **Yes**.
- Snapshot: 10 October 2026, **18:33:17 WIB** (YouTube observation; not a trustless oracle).
- Official tally: Yes 2, No 0, unrevealed 0.

| Event | Successful transaction |
| --- | --- |
| Create | [0xb447…a01b](https://testnet.monadscan.com/tx/0xb447a6b8845a34b433cb5c3805ab593b59db9d1fa46f3eb6c9cf9222881ca01b) |
| Commit A | [0x67de…9c13](https://testnet.monadscan.com/tx/0x67de09a9944d654577dc14197f1e433252a34f149270b5988f4e5d21526d9c13) |
| Commit B | [0x5331…a4cf](https://testnet.monadscan.com/tx/0x53317003f9d008c7cc79d651584edcf0d880a6f161797a6ba532535902ada4cf) |
| Reveal A | [0xc0a6…1315](https://testnet.monadscan.com/tx/0xc0a694a15ffa3a492bae5181f942b6bc3d291ee2fe3a9a784c3aa3bfe3721315) |
| Reveal B | [0xee31…31b8](https://testnet.monadscan.com/tx/0xee31c6eef74c42cd960256ba5319639c1dd7d8aa256eb714878b39d34cd431b8) |
| Resolve | [0x4375…9b00](https://testnet.monadscan.com/tx/0x43759a61167ae2965b9a522a0315ab121a8cd0a4a4848c0884bd04b2c2a19b00) |

Receipts and contract state were checked directly via the Monad Testnet RPC on 11 October 2026 at approximately 13:28 WIB; the table is not based only on database status.

## Deadline and verification boundary

The portal text supplied by the owner states **14 October 2026 at 10:59 GMT+7 (WIB)**, equivalent to 13 October at 11:59 PM US Eastern daylight time. Aim to submit by 13 October WIB to preserve a buffer.

The [official portal](https://hackathon.monad.xyz/) currently requires login to inspect project/submission fields. Public access confirms the portal and its registration providers, but cannot independently confirm the account's current form or deadline. Check the authenticated dashboard before relying on the supplied date. This audit did not create a project, select a track, submit the entry, change production data or broadcast blockchain transactions.
