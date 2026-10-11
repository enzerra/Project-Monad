# Third-party software and services

VIBE's MIT license covers its original application source. Dependencies retain their own licenses. Exact resolved versions and integrity records are in [package-lock.json](package-lock.json); installed package LICENSE/NOTICE files remain authoritative.

## Main dependencies

Versions/licenses below were inspected in the installed packages on 11 October 2026.

| Package | Version | License | Role |
| --- | --- | --- | --- |
| [Next.js](https://github.com/vercel/next.js) | 16.3.8 | MIT | App framework and server |
| [React / React DOM](https://github.com/facebook/react) | 19.3.0 | MIT | UI |
| [Privy React Auth](https://www.npmjs.com/package/@privy-io/react-auth) | 3.46.0 | Apache-2.0 | Login and embedded wallets |
| [JOSE](https://github.com/panva/jose) | 6.2.12 | MIT | JWT verification |
| [Lucide React](https://github.com/lucide-icons/lucide) | 0.468.0 | ISC | UI icons |
| [Motion](https://github.com/motiondivision/motion) | 13.5.1 | MIT | Interface motion |
| [viem](https://github.com/wevm/viem) | 2.56.0 | MIT | EVM clients and signing utilities |
| [Zod](https://github.com/colinhacks/zod) | 4.6.5 | MIT | Data validation |
| [Vitest](https://github.com/vitest-dev/vitest) | 3.2.7 | MIT | Application tests |
| [TypeScript](https://github.com/microsoft/TypeScript) | 5.9.3 | Apache-2.0 | Type checking |

This is an overview, not a replacement for transitive dependency notices. Other development tooling is declared in package.json and the lockfile. Foundry is an external Solidity toolchain installed separately.

## Hosted services and source data

- **Privy:** Google authentication and embedded EVM wallets.
- **Supabase:** Postgres persistence and public upload Storage.
- **Railway:** always-on Node hosting.
- **YouTube:** official embedded player, metadata and observed view counts through the Data API. Creator content is not relicensed by VIBE.
- **ESPN:** public scoreboard data and club crest sources for the selected football fixtures.
- **Monad Testnet:** contract execution and RPC. Monadscan links provide an external transaction viewer.

These integrations do not imply sponsorship, endorsement or guaranteed bounty eligibility.

Fonts, images, videos, generated artwork and club marks are documented in [ASSETS.md](ASSETS.md).
