# Release evidence

**Documentation handoff: 11 October 2026**

## Scope

This handoff consolidates the tested VIBE release and its English documentation for the public repository. It retains development and team-authentication commit history. The existing contract/table/signature names are kept for compatibility.

Release label: **v0.1.0-mvp**. The public handoff targets the default `main` branch and retains `codex/integrate-privy-supabase` as the implementation branch. The tag identifies this MVP/documentation snapshot, not a completed hackathon submission.

The running app release is commit `3bc68b2`, deployed as Railway `f886177c-5d76-4456-8100-87ed0a805aae`. Subsequent documentation commits do not change the deployed application behavior.

## Verified evidence

| Check | Evidence |
| --- | --- |
| Production build | Passed during the 11 October club-crest release |
| Mobile/desktop crest UI | 375 px and 1440 px; four logos load, detail works, image-error fallback works, no overflow/runtime errors |
| Production health | HTTP 200; ready, Supabase connected, recent source observation |
| Deployment preflight | Profile/Call schema, versioned state, upload bucket and real YouTube metrics pass |
| Accounts | Owner confirmed Google login, two independent balances and signed choices |
| Monad | Direct RPC: chain 10143, two commits, two reveals, Yes result; six successful receipts |
| Contract tests | 12 passed |
| Application tests | Final documentation-handoff run: **78/78 passed**, 13 files; the earlier audit had one timeout that passed on targeted rerun |
| Production dependency audit | 23 moderate findings, zero high/critical on 11 October |
| Credentials | Local environment/state paths ignored; only the empty environment template is intended for version control |

[Full Monad evidence](MONAD.md) · [Security limits](../SECURITY.md)

## Final handoff verification

The final handoff reran all 78 application tests and ESLint successfully. It also checks local Markdown targets, required evidence, whitespace and tracked-file hygiene. A fresh screenshot uses the actual public deployment, without fixture overrides. Public branch/default-branch synchronization is verified after push.

## Outstanding acceptance

- Authenticated public Studio upload and playback.
- Final demo video and script approval.
- Portal project creation, track selection and submission confirmation.
- Operational availability and quota monitoring throughout judging.

The historical [audit](SUBMISSION_AUDIT_2026-10-11.md) records the state before repository finalization and should not override later release evidence.
