# VIBE source Calls and account credits

**Current rules · updated 11 October 2026**

This specification replaces the browser-only credit experiment. It describes the server ledger and YouTube views Calls. [Football](docs/football-calls.md) shares the ledger with different outcome rules; [Monad proof Calls](docs/MONAD.md) are separate.

## Identity and balance

- With Privy/Supabase configured, the verified Privy DID owns the account. Visitors can inspect Calls but cannot enter or receive credits.
- Grant **1,000 VIBE once per account**. Accept integer amounts **10–500**, default **50**, bounded by the available balance.
- Correct: return **2× the amount, including the original amount**. Incorrect: no return. Void: refund the original amount.
- Example: 1,000 → enter 50 → 950 → correct → 1,050. Incorrect stays 950; void restores 1,000.
- One choice per account/Call. Debit, return and refund happen once, including retries and concurrent requests.
- VIBE has no purchase, transfer, monetary value, cash-out or ERC-20 representation.
- Older browser-local balances are not imported as trusted credits.

Supabase commits state and the ledger through a row lock and revision check. A database outage never silently switches to a fresh local balance. When Privy and Supabase are both unconfigured, local development uses cookie sessions and SQLite; that is not the deployed account model.

## Publishing a views Call

1. Use the current 20 curated Shorts. Collect two valid observations at least 30 minutes apart with positive growth.
2. Select at most one active candidate per category in the current selection, based on projected growth.
3. Initial horizon: **6 hours**. Projected increase = ceil(observed increase × 6 hours / observation interval). Target = baseline + max(100, projected increase).
4. Freeze baseline, absolute target, calibration observations, opening/cutoff/evaluation times, multiplier and rule version.
5. Close entry after **90 minutes**, or earlier when views reach baseline + ceil((target − baseline) / 2).

The projection is not a probability, market price or promised growth. Old videos remain observable for unsettled Calls after a curation refresh; they no longer block fresh selection.

## Entry and evaluation

The server verifies identity, status, cutoff, balance, amount and an observation no older than 90 seconds. Rejected entry causes no debit.

The first valid observation at or after evaluation, within a **30-minute grace window**, decides the outcome: views at least target means Yes; otherwise No. A snapshot before evaluation cannot settle the Call.

If evidence stays unavailable through the window, void and refund. A metric correction below the previously observed peak also causes void. A terminal result is not rewritten by later source updates.

The proof records video ID, views, observation time, source, target, rule version and a SHA-256 hash. This is a trusted server observation, not an onchain proof or trustless YouTube oracle.

## Refresh and operation

The Node collector checks sources every 30 seconds. Account/Call views refresh every 15 seconds; the video count refreshes every 30 seconds. Source values may stay unchanged until YouTube publishes new data. No interpolation or artificial increments are used.

Keep one always-on Node instance. Supabase persists state but does not run the worker. Local SQLite production needs a persistent volume and consistent backups. If an outage spans the evaluation window without valid evidence, refund instead of reconstructing past views from present values.

## Verification

Tests cover invalid amounts, duplicate/overspending entries, deadlines, early close, exact-target results, both outcomes, one-time settlement, source outage, corrections, rollback, account isolation and Supabase revision conflicts. Live evidence is recorded separately in [release verification](docs/RELEASE.md).
