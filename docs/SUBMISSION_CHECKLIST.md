# VIBE submission handoff

Work through these gates in order. A code build is not a completed submission.

| Gate | Required evidence | Current state |
| --- | --- | --- |
| Website | Public HTTPS URL, healthcheck, mobile/desktop checks | Railway SUCCESS; healthcheck passed; intro redirect and small-screen profile verified. Full authenticated acceptance pending |
| Accounts | Real Google login, two independent accounts, persistent balance/history | Google login and visible balance confirmed by owner; two Google accounts and separate initial balances confirmed by owner; signed commitments verified |
| Upload | Authenticated upload with preview, caption and hashtags | Implemented; public deployment acceptance pending |
| YouTube | Source metadata, real observation timestamps, worker runs without open tabs | Public views API and hosted health report fresh observations |
| Monad | Testnet contract address, create/commit/reveal/result transaction hashes | Deployed on Testnet; create and first signed commit verified. Reveal and final result pending |
| Repository | Public source, MIT license, README, build history, AI disclosure | Verify pushed branch contains the tested release |
| Demo | Public accessible video, maximum 3 minutes, real Monad interaction | English script available; recording pending |
| Portal | Project/team details, one primary track, requested links/docs and final submit | Pending |

## Record release evidence

- Website URL: https://web-production-5e33e.up.railway.app
- Verified Railway deployment: `c8a29ac2-fa71-49cf-b220-56fd9e3ac31a` (10 October 2026)
- GitHub release branch/commit:
- Monad network/chain ID: Testnet / 10143
- Contract address: 0x1a4914ec33c242b8fc781b3780c4bb0ab9bc09a5
- Create Call transaction: 0xb447a6b8845a34b433cb5c3805ab593b59db9d1fa46f3eb6c9cf9222881ca01b
- Commit transaction (account A): 0x67de09a9944d654577dc14197f1e433252a34f149270b5988f4e5d21526d9c13
- Commit transaction (account B): 0x53317003f9d008c7cc79d651584edcf0d880a6f161797a6ba532535902ada4cf
- Reveal transaction:
- Resolve/void transaction:
- Public demo video URL:
- Selected primary track:
- Final submission confirmation:

## Verified during deployment

- Production build and lint pass; 68 application tests and 12 contract tests pass.
- Public `/api/health` returns HTTP 200 with persistent storage connected and recent collector observations.
- Guest `/api/vibe` has no account or balance; Call/upload/profile-sync writes without authentication return 401. Foreign origins return 403.
- Public Short views endpoint returns actual YouTube observations with a timestamp.
- Railway starts `scripts/start-production.mjs`, listens on port 8080, uses `/api/health`, one replica, sleep disabled, and ON_FAILURE retries.
- Profile login no longer clips on a narrow viewport. A full Google login and two-account acceptance test must be completed by the project owner.
- Production dependency audit: 23 moderate findings, zero high/critical at verification time. Development dependencies still have unresolved advisories; this is not a security audit certificate.
- Deployment uses the local working-tree snapshot. Recent changes have not yet been committed/pushed as a release; confirm the public repository matches before submission.

## Demo outline

Use `VIBE_3_MINUTE_SCRIPT_EN.md` as a draft. Show the actual deployed experience: Discover, an open Call, Google login and signed onchain choice, receipt/explorer, result evidence, and community context. Clearly distinguish free VIBE balances from Monad proofs. Do not replace missing live interactions with test output or imply an API observation is a trustless oracle.

Verify the portal's current deadline and mandatory fields before submission. The supplied portal text listed **14 October 2026, 10:59 GMT+7**; preserve time for recording, video permissions and final review. Re-check that public links work in an incognito browser.

## Monad acceptance, 10 October 2026

- Operator roles and bytecode verified on chain 10143.
- Google login and balance confirmed by the owner after adding the Railway origin in Privy.
- First owner-signed choice mined successfully; contract commitment is nonzero.
- Call URL: https://web-production-5e33e.up.railway.app/live/calls/cc2aafed-4e47-486e-ba0e-ebeb1025f7aa
- Scheduled close: 2026-10-10T07:02:40.000Z; evaluation: 2026-10-10T11:32:40.000Z.
- Hosted keeper runs every minute with one replica and serializes transactions with sponsored commits. API smoke check returned polled; anonymous prepare/submit requests returned 401.
- Full reveal/resolve acceptance, upload and visual checks across phone widths remain pending.
