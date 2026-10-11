# Monad integration and transaction evidence

## What the contract proves

VIBE's separate proof flow records a choice commitment before entry closes, validates its reveal afterward, and records a terminal result with a source snapshot hash. The contract binds authorization to chain ID, contract address, Call, wallet, choice, nonce, deadline and random salt.

A browser click is not an onchain choice. The interface exposes a commitment receipt only after confirmation.

The operator can decrypt stored choices and supplies YouTube observations. The contract proves commitment integrity and the declared result; it does **not** independently verify YouTube or conceal choices from the operator. VIBE credit balances and returns are outside this contract.

## Deployment

| Field | Value |
| --- | --- |
| Network | Monad Testnet |
| Chain ID | 10143 |
| RPC | `https://testnet-rpc.monad.xyz` |
| Contract | [`0x1a4914ec33c242b8fc781b3780c4bb0ab9bc09a5`](https://testnet.monadscan.com/address/0x1a4914ec33c242b8fc781b3780c4bb0ab9bc09a5) |
| Source | [HiveCallV2.sol](../contracts/HiveCallV2.sol) |
| Solidity tests | [HiveCallV2.t.sol](../test/foundry/HiveCallV2.t.sol) |
| Public result | [First completed Call](https://web-production-5e33e.up.railway.app/live/calls/cc2aafed-4e47-486e-ba0e-ebeb1025f7aa) |

## Verified lifecycle

Checked directly through the Monad Testnet RPC on **11 October 2026, approximately 13:28 WIB**.

- App Call: `cc2aafed-4e47-486e-ba0e-ebeb1025f7aa`.
- Chain Call: `0xa74c52e44315d25a9a785e2fbc28a2595d4bd04f121f94721f4886c120c8850e`.
- Two commitments and two reveals; official tally Yes 2, No 0, unrevealed 0.
- Target: **178,187,952** views. Result: **178,194,419** views. Outcome: **Yes**.
- Evaluation: 10 October 2026, 18:32:40 WIB.
- Result observation: 10 October 2026, 18:33:17 WIB.

| Event | Transaction | Receipt |
| --- | --- | --- |
| Create | [0xb447…a01b](https://testnet.monadscan.com/tx/0xb447a6b8845a34b433cb5c3805ab593b59db9d1fa46f3eb6c9cf9222881ca01b) | Success |
| Commit A | [0x67de…9c13](https://testnet.monadscan.com/tx/0x67de09a9944d654577dc14197f1e433252a34f149270b5988f4e5d21526d9c13) | Success |
| Commit B | [0x5331…a4cf](https://testnet.monadscan.com/tx/0x53317003f9d008c7cc79d651584edcf0d880a6f161797a6ba532535902ada4cf) | Success |
| Reveal A | [0xc0a6…1315](https://testnet.monadscan.com/tx/0xc0a694a15ffa3a492bae5181f942b6bc3d291ee2fe3a9a784c3aa3bfe3721315) | Success |
| Reveal B | [0xee31…31b8](https://testnet.monadscan.com/tx/0xee31c6eef74c42cd960256ba5319639c1dd7d8aa256eb714878b39d34cd431b8) | Success |
| Resolve | [0x4375…9b00](https://testnet.monadscan.com/tx/0x43759a61167ae2965b9a522a0315ab121a8cd0a4a4848c0884bd04b2c2a19b00) | Success |

## Lifecycle and timing

1. A curator publishes a source, baseline, higher absolute target, horizon and fixed rules.
2. The participant signs an authorization with their Privy EVM wallet. The relayer pays gas and submits it.
3. The contract accepts at most one commitment per wallet/Call and validates authorization, nonce and cutoff.
4. Entry closes after the first quarter of the six/24-hour horizon, or early when observed growth reaches halfway to the target.
5. Reveal is allowed only after effective close. The server opens the encrypted choice and salt; the contract verifies the commitment hash. Tally becomes official after all reveals or expiry of the reveal window.
6. After evaluation, the resolver submits a valid timestamped observation within the 30-minute result window. Source failure or metric correction follows the void path; the result is not invented.

An early close uses the closing transaction's block time, not a retroactive source timestamp. Later corrections never silently replace a terminal onchain result.

## Set up an independent deployment

Complete [service setup](SETUP.md), install Foundry, and use a dedicated funded Testnet operator. Configure `RELAYER_PRIVATE_KEY`, a stable 32-byte base64 `CHOICE_ENCRYPTION_KEY`, and a strong `OPERATOR_API_KEY`. Keep them server-only.

```sh
npm run test:contract
npm run compile:contract
npm run deploy:contract
```

These deployment commands broadcast real Testnet transactions. The deployment script restricts the chain, records the transaction before awaiting the receipt, checks roles/bytecode and updates the local public address. Preserve ignored `.vibe-data/monad-deployment.json` evidence; do not delete it during a pending deployment.

To create a genuine source Call:

```sh
npm run create:call -- VIDEO_ID TARGET_VIEWS 6 "Video title" "Creator"
```

Replace every placeholder with reviewed source data; the target must exceed current views. The script validates the public embeddable source and sends a Testnet transaction. Its horizon may be 6 or 24 hours. If database recording fails after a successful transaction, reconcile from the saved hash rather than blindly creating another Call.

In production, the keeper runs every 60 seconds when configured. Keep one instance and the encryption key stable. The protected `POST /api/operator/tick` supports operational recovery using its bearer key; do not run a second overlapping scheduler.

## Why Monad

The product needs a shared, independently inspectable execution record for choices and declared outcomes. Monad's EVM environment lets VIBE use Solidity, viem and embedded wallets for that lifecycle while the relayer handles Testnet gas. This release demonstrates the integration through real receipts; it makes no unsupported throughput, latency or decentralization claims.
