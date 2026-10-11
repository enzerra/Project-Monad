# Local setup

## Requirements

- Node.js **22.15+ within Node 22**, npm and Git.
- Foundry Forge for Solidity compilation and tests.
- For the connected app: a Privy app, Supabase project and YouTube Data API key.
- For Monad proof actions: a dedicated operator wallet funded with Testnet MON.

## 1. Install

```sh
git clone https://github.com/enzerra/Project-Monad.git
cd Project-Monad
npm ci
cp .env.example .env.local
npm run dev
```

PowerShell: use `Copy-Item .env.example .env.local` for the copy step. Open [localhost:3000](http://localhost:3000). Next.js loads the local environment file automatically.

Keep the service fields empty together for local preview. This mode does not provide Google authentication, public uploads or Monad transactions. Real source data needs a YouTube key. Local session data is stored in ignored `.vibe-data/`.

## 2. Set up Supabase

Run the following files in the SQL Editor, in order:

1. `supabase/migrations/202610020001_hive_metropolis.sql`
2. `supabase/migrations/202610020002_commit_deadline.sql`
3. `supabase/migrations/202610030001_hive_users.sql`
4. `supabase/migrations/202610060001_vibe_source_state.sql`

Use the project URL and **server-only** service-role key. Existing installations should apply only migrations they have not already applied.

Studio uses a public bucket named `vibe-uploads`, restricted to `video/mp4` and `video/webm`, with a limit of **41,943,040 bytes (40 MiB)**. The upload endpoint creates it if missing; preflight expects it to exist, so create/configure it in Storage before running preflight on a new project. Objects are public, not private documents.

## 3. Configure Privy and YouTube

Enable Google login and embedded EVM wallets in the Privy app. Add `http://localhost:3000` and the exact deployed HTTPS origin to its allowed origins. Put the app ID and ES256 verification public key in the environment file.

Enable YouTube Data API v3 and provide a server API key. Quota or source failures keep the last timestamped observation or an unavailable state; they do not generate substitute views.

## Environment reference

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_APP_ORIGIN` | Exact browser origin; localhost for development, HTTPS for deployment |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Public Privy app identifier |
| `PRIVY_VERIFICATION_KEY` | Privy ES256 verification public key, PEM; escaped newlines are supported |
| `SUPABASE_URL` | Supabase HTTPS project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only database/Storage credential |
| `YOUTUBE_API_KEY` | Server-only YouTube Data API key |
| `NEXT_PUBLIC_MONAD_CONTRACT_ADDRESS` | Deployed proof contract; leave empty until the operator is configured |
| `RELAYER_PRIVATE_KEY` | Dedicated Testnet operator private key; never a browser variable |
| `CHOICE_ENCRYPTION_KEY` | Stable base64 encoding of 32 random bytes for sealed choices |
| `OPERATOR_API_KEY` | Strong server-only operator credential, at least 32 characters |
| `MAX_DAILY_COMMITS` | Sponsored-commit cap; default 50 |
| `VIBE_STORE_PATH` | Local SQLite path; ignored with Supabase, persistent volume required for local-mode production |

The optional legacy `CRON_SECRET` field remains in the example configuration; use the operator authentication implemented by the current endpoint, not an assumed scheduler integration. Never commit credential values or put secrets in `NEXT_PUBLIC_*`.

Restart after configuration changes. Public environment values are compiled into the browser bundle and need a rebuild in production.

## 4. Verify and build

```sh
npm run check:deploy:local
npm test
npm run lint
npm run typecheck
npm run build
npm run test:contract
```

Preflight needs the connected services; it is not expected to pass in empty local preview mode. A cold typecheck may require `npm run build` first to generate Next.js route types. Foundry must be installed for the final command.

For a connected production deployment, follow [Railway](RAILWAY_DEPLOYMENT.md). The `start:production` script enforces required configuration and Node version. Ordinary `npm start` serves a previously built app; it does not replace the production configuration checks.

## 5. Verify the actual user journey

Test guest browsing, Google login, the one-time grant, persistence across devices, logout, an entry before its cutoff and the eventual result. For Studio, upload an owned clip and check publication, refresh and playback in another session.

A configured bucket or passing unit test alone does not establish successful authenticated publication. [Current acceptance evidence](RELEASE.md).
