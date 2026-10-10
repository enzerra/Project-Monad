# Football Calls

These Calls use free VIBE credits in the existing server ledger. They do not create Monad contract markets or spend real funds.

## Fixtures verified on 10 October 2026

|Match|Kickoff UTC|Kickoff Asia/Jakarta|ESPN event|
|---|---|---|---|
|Barcelona – Getafe|2026-10-10 16:30|2026-10-10 23:30|401882853|
|Al Hilal – Al Ittihad|2026-10-10 18:00|2026-10-11 01:00|401900909|

Schedules cross-checked with [LaLiga](https://www.laliga.com/en-ES/match/temporada-2026-2027-laliga-ea-sports-fc-barcelona-getafe-cf-8) and [Al-Ittihad](https://www.ittihadclub.sa/en/matches?season=2026). Barcelona had already kicked off before release; it is available for following the score/result, with entry closed.

## Entry and settlement

- Binary question: will the home team win? A draw or away win resolves No.
- Entries close at the original kickoff, or earlier if the source reports an earlier kickoff/live state. No reopening after the match starts.
- ESPN scoreboard is polled server-side every 30 seconds. Exact event and home/away IDs are validated. New entries require a snapshot no older than 90 seconds.
- Only explicit `STATUS_FULL_TIME`, completed/post status, and valid scores resolve a Call. A projected end time never settles a result. League full time includes stoppage time; extra time and penalties are excluded.
- Winning choice returns 2× including the original amount. Losing choice receives no return. Existing wallet validation and revision-checked Supabase commits prevent duplicate debits or settlement.
- Postponed, cancelled or abandoned matches void and refund. No verified result within 24 hours of kickoff also voids and refunds.
- The result retains the source, observed timestamp, final score and SHA-256 evidence hash. Failed requests preserve the previous score; no result is fabricated.

ESPN's public scoreboard endpoint needs no credentials but has no availability guarantee. The UI shows the last check time. The existing Railway Node worker keeps checking when browsers are closed; keep the service running. Terminal fixture state is retained in Supabase.
