# Security and operational limits

VIBE is a hackathon MVP. This document describes the implemented boundaries and known limits; it is not a security audit certificate.

## Protected boundaries

- Account identity comes from server-verified Privy JWTs. Client display metadata is not authorization.
- State-changing browser endpoints check the request origin and authenticate the account.
- Credit balances, targets and outcomes are computed on the server. Atomic/revision-checked updates reject duplicate charges and settlements.
- Supabase service credentials, operator keys and choice encryption keys remain server-only. Environment files, databases and local transaction working files are ignored by Git.
- Uploads require authentication, enforce size/MIME/signature checks, and limit the accepted categories and metadata.
- Monad authorization binds the signature to a specific action, chain, contract, wallet, nonce and deadline.

## Limits to understand

- The operator can decrypt choices and controls the source snapshot submitted to the contract. This is not a trustless YouTube oracle.
- Community messages/comments remain browser-local. Do not use them for private or durable communication.
- Uploaded video objects are public. The prototype does not implement a complete moderation, malware-scanning or transcoding pipeline.
- The account ledger uses one versioned Supabase state row. It is not designed for high traffic without further database/queue work.
- Google login and wallet limits do not prove one human per account. Multi-account abuse remains possible.
- The relayer has in-process transaction serialization and a daily sponsored-commit limit (default 50). It is not a multi-host transaction coordinator. Current intent limits include five per account and twenty per IP per 24 hours; shared IPs may affect legitimate users.
- Keep a single always-on replica. Source failure beyond the result window causes void/refund, not reconstructed outcomes.
- Snapshot corrections after a finalized result need explicit human review; no automatic historical resettlement exists.

## Dependency review

On 11 October 2026, `npm audit --omit=dev` reported **23 moderate**, **0 high** and **0 critical** findings. Moderate transitive wallet dependencies remain for review. Development dependencies have separately reported higher-severity findings; the production-only count must not be described as a clean full dependency audit.

Privy is pinned to the tested version. The optional Farcaster/Solana connector is excluded from the bundle. The `ws` 8.x override selects a patched compatible version. Re-run the audit for each release and evaluate SDK upgrades with authentication/signing regression tests.

## Reporting a vulnerability

Use the repository's private vulnerability reporting channel if enabled. Otherwise contact the maintainers through their GitHub profiles to arrange a private report. Do not publish credentials, account data or an exploitable issue in a public discussion.

For an exposed key, revoke/rotate it through the owning provider. Preserve the existing choice encryption key securely until pending reveals are resolved; replacing it without a migration may make those choices unrecoverable.
