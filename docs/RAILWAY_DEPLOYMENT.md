# Deploy VIBE to Railway

The website uses Next.js on Node 22, Privy Google authentication, Supabase for balances and uploads, and the YouTube Data API for observed views. The background collector must stay running even when no browser is open. Deploy **one replica**, with Railway Serverless/sleep disabled. This is a small MVP deployment, not a high-traffic architecture.

## 1. Prepare services

- Use an active Railway workspace. An expired trial cannot create a service; a browser login and CLI login are separate sessions.
- Run the SQL migrations in `supabase/migrations/` in order. The application needs `hive_users`, the onchain Call/intent tables, `hive_vibe_state`, and the atomic `hive_commit_vibe_state` RPC.
- Verify the public `vibe-uploads` bucket: MP4/WebM only, 40 MB maximum. Uploaded files are public content; do not upload private files.
- Enable Google login and embedded EVM wallets in Privy. Keep the verification public key and server-side Supabase service-role key configured.
- Enable YouTube Data API v3 and keep its key server-side. A key restricted to localhost IPs will fail on Railway; configure restrictions suitable for the deployed server.

Local preflight (never prints credential values):

```powershell
npm ci
npm run check:deploy:local
npm run test
npm run lint
npm run typecheck
npm run test:contract
npm run build
```

## 2. Create the Railway service

```powershell
railway login
railway init --name VIBE
railway add --service web
railway service web
railway domain --port 8080
```

Confirm the workspace and service before uploading secrets. Record the HTTPS domain. The project requires Node **22.15+ within Node 22**; set `RAILPACK_NODE_VERSION=22` in Variables to pin the runtime. Do not add SQLite volumes when using Supabase.

Configure these settings in the Railway service: build `npm run build`, start `npm run start:production`, healthcheck `/api/health` with 120-second timeout, one replica, sleep disabled, and ON_FAILURE restart with 10 retries. Verify the settings on the actual deployment. `railway.json` records the intended configuration, but Railway now treats config-as-code files as legacy (deprecated and scheduled to stop working after 1 December 2026). New services may require explicit service settings or Railway's new Infrastructure as Code configuration. A redeploy can reuse the old deployment manifest; use a new `railway up` after settings changes and verify its start logs.

## 3. Configure Variables

| Variable | Value/source |
| --- | --- |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Existing Privy app ID; public |
| `PRIVY_VERIFICATION_KEY` | Existing ES256 verification public key (PEM; escaped `\n` supported) |
| `SUPABASE_URL` | Existing Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key; never expose in client code |
| `YOUTUBE_API_KEY` | Server-only YouTube Data API key |
| `NEXT_PUBLIC_APP_ORIGIN` | Exact generated HTTPS origin, without a path |
| `PORT` | `8080` |
| `RAILPACK_NODE_VERSION` | `22` |
| `NEXT_TELEMETRY_DISABLED` | `1` |

Add the exact public origin to Privy's allowed origins in its dashboard. If using custom Google OAuth credentials, update the origins/redirects required by Privy's dashboard instructions too. Do not invent a Google redirect URL based on the website path.

Do not upload `.env.local` or put private credentials into `NEXT_PUBLIC_*`. Use Railway Variables or `railway variable set NAME --stdin --skip-deploys` to avoid putting values into shell arguments. Keep all Variables set before the build: `NEXT_PUBLIC_*` values are compiled into the browser bundle. Changing them requires a rebuild/redeploy.

The normal VIBE token flow does not require a deployed Monad contract. Leave its address and operator credentials unset until the onchain setup is complete. Enabling an address without its keys causes the production startup check to fail intentionally.

## 4. Deploy and check

```powershell
railway up --detach
railway deployment list
railway logs --lines 100
```

Wait for deployment status SUCCESS, then visit `/api/health` on the public domain. `status: ready` checks persistent storage; `source: fresh` indicates the collector made a recent observation. `source: waiting` is not a fabricated live reading: inspect YouTube quota/key/connectivity and the last observation time. Allow the worker's 30-second interval to elapse. A website can be ready while YouTube is temporarily unavailable.

## 5. Acceptance checks on the public domain

- Open the root: intro automatically enters Discover. Test mobile and desktop layouts.
- As a guest, no account balance appears; submitting a Call/upload requires login.
- Login through Google. Confirm the same DID receives its initial 1,000 VIBE only once. Reload and login on another device: balance and choices must match.
- Confirm a second account has a separate balance; logout removes the first account's displayed balance.
- Make one valid 50 VIBE choice on an open Call. Inspect the receipt/history, reload, and confirm no duplicate debit. Repeat submission must be rejected.
- Compare a Short's observed views with the YouTube Data API. The collector polls every 30 seconds; YouTube may delay publishing changes. Do not describe this as second-by-second streaming.
- Close all tabs, then reopen after several minutes: observation timestamps must keep advancing while the server lives.
- Upload a small MP4/WebM with a caption and hashtags. Confirm its preview and public Discover entry. Guests, oversized and invalid files must be rejected.
- Confirm the worker resolves an actual Call at its deadline (or voids/refunds on missing evidence). Automated tests with a simulated clock are not evidence of a real six-hour result.

Do not open a broad public beta until authenticated tests and operational review pass. Community/comments remain local; do not demonstrate them as cross-account synchronized features.

## 6. Operate and roll back

- Monitor Railway credits/resources and Supabase/YouTube quotas. Keep sleep disabled and one replica.
- The initial source Call calibration needs two valid observations at least 30 minutes apart with positive growth. Lack of an open Call immediately after deployment is expected.
- Use the last healthy Railway deployment to roll back code. Never replace Supabase state with an older snapshot to undo a deployment: balances/history must remain current.
- A process outage can invalidate a Call's evaluation window; the engine refunds void Calls instead of guessing a result. Check the ledger after outages.
- Back up Supabase state and Storage through the provider's supported tools. Preserve any onchain encryption key securely; losing it prevents reveals.
- The snapshot/CAS store serializes updates but reads the complete ledger. For substantial traffic, migrate to normalized PostgreSQL tables and a coordinated job queue.

## 7. Complete the Monad requirement separately

The free VIBE token Call engine is offchain. Website hosting alone does **not** satisfy a working Monad integration. Follow README's live setup: a dedicated funded Monad Testnet operator, contract deployment, encrypted signed choices, create/commit/reveal/resolve receipts, and a trusted scheduled operator tick. Record the address and transaction hashes, test two accounts, then film the public demo. Do not claim the token balance is onchain.

References: [Railway config](https://docs.railway.com/config-as-code/reference), [sleep/serverless](https://docs.railway.com/deployments/serverless), [restart policy](https://docs.railway.com/deployments/restart-policy).

## Monad deployment now active

Contract: `0x1a4914ec33c242b8fc781b3780c4bb0ab9bc09a5` on Testnet 10143. The public Call proof flow is separate from the offchain VIBE balance flow. Production instrumentation starts a single keeper every 60 seconds when all contract credentials are set; it shares a transaction queue with commits. Do not also schedule operator tick from another host. Keep the encryption key stable across redeploys so existing sealed choices can be revealed.

Deploy with `npm run compile:contract` then `npm run deploy:contract`. The deployment script reads .env.local, restricts chain ID, saves the transaction before waiting, checks owner/keeper/resolver, and reuses saved evidence on rerun. It updates the local contract address. To redeploy intentionally, first inspect and archive existing evidence; do not delete it during a pending transaction. Call creation also saves transaction evidence for manual database recovery.
