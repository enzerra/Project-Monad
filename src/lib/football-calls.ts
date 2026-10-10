import type { Choice, Call } from "./demo-data";
import type { SourceState } from "./source-calls";
import { settleSourceWallet } from "./source-calls";
import { placeVirtualChoice, type ChoiceResult } from "./virtual-token";

export const FOOTBALL_RULE = "football-home-win-90m-fixed2x-v1";
export type FootballFixture = {
  id: string; eventId: string; league: "esp.1" | "ksa.1"; competition: string;
  homeId: string; awayId: string; home: string; away: string; kickoff: string; sourceUrl: string;
};
// Identity and kickoff checked against the clubs/league and ESPN on 10 Oct 2026.
export const footballFixtures: FootballFixture[] = [
  { id: "football-barcelona-getafe-20261010", eventId: "401882853", league: "esp.1", competition: "LaLiga", homeId: "83", awayId: "2922", home: "Barcelona", away: "Getafe", kickoff: "2026-10-10T16:30:00.000Z", sourceUrl: "https://www.espn.com/soccer/match/_/gameId/401882853" },
  { id: "football-al-hilal-al-ittihad-20261010", eventId: "401900909", league: "ksa.1", competition: "Saudi Pro League", homeId: "929", awayId: "2276", home: "Al Hilal", away: "Al Ittihad", kickoff: "2026-10-10T18:00:00.000Z", sourceUrl: "https://www.espn.com/soccer/match/_/gameId/401900909" },
];
export type FootballObservation = {
  eventId: string; homeId: string; awayId: string; kickoff: string; observedAt: string;
  state: "scheduled" | "live" | "final" | "void"; statusText: string;
  homeScore?: number; awayScore?: number;
};
export type FootballCall = FootballFixture & {
  question: string; status: Call["status"]; closesAt: string; openedAt: string;
  observedAt?: string; matchState: FootballObservation["state"]; statusText: string;
  homeScore?: number; awayScore?: number; result?: Choice; voidReason?: string;
  ruleVersion: typeof FOOTBALL_RULE; multiplier: 2;
  proof?: FootballObservation & { source: "ESPN"; hash: string };
};
const isFresh = (value: string | undefined, now: number) => Boolean(value && Number.isFinite(Date.parse(value)) && Date.parse(value) <= now && now - Date.parse(value) <= 90_000);

export function observeFootball(state: SourceState, observations: FootballObservation[], now: number, hash: (value: string) => string) {
  const calls = state.footballCalls ??= [];
  for (const fixture of footballFixtures) {
    let call = calls.find(item => item.id === fixture.id);
    if (!call) {
      call = { ...fixture, question: `Will ${fixture.home} win?`, status: "closed", closesAt: fixture.kickoff, openedAt: new Date(now).toISOString(), matchState: "scheduled", statusText: "Awaiting match data", ruleVersion: FOOTBALL_RULE, multiplier: 2 };
      calls.push(call);
    }
    if (call.status === "resolved" || call.status === "void") continue;
    const observation = observations.find(item => item.eventId === fixture.eventId && item.homeId === fixture.homeId && item.awayId === fixture.awayId && isFresh(item.observedAt, now) && Number.isFinite(Date.parse(item.kickoff)) && Math.abs(Date.parse(item.kickoff) - Date.parse(fixture.kickoff)) <= 24 * 3600_000);
    if (observation && (!call.observedAt || observation.observedAt >= call.observedAt)) {
      call.observedAt = observation.observedAt;
      call.matchState = observation.state;
      call.statusText = observation.statusText;
      call.homeScore = observation.homeScore;
      call.awayScore = observation.awayScore;
      // A moved/early kickoff can shorten entry, never reopen an in-play market.
      call.closesAt = new Date(Math.min(Date.parse(call.closesAt), Date.parse(observation.kickoff))).toISOString();
      if (observation.state !== "scheduled") call.closesAt = new Date(Math.min(Date.parse(call.closesAt), now)).toISOString();
      if (observation.state === "void") {
        call.status = "void"; call.voidReason = "Match postponed, cancelled or abandoned";
      } else if (observation.state === "final" && now >= Date.parse(observation.kickoff) + 90 * 60_000 && Number.isSafeInteger(observation.homeScore) && Number.isSafeInteger(observation.awayScore) && observation.homeScore! >= 0 && observation.awayScore! >= 0) {
        call.status = "resolved";
        call.result = observation.homeScore! > observation.awayScore! ? "yes" : "no";
        call.proof = { ...observation, source: "ESPN", hash: hash(JSON.stringify({ ...observation, callId: call.id, ruleVersion: call.ruleVersion })) };
      } else if (observation.state === "scheduled" && now < Date.parse(call.closesAt)) {
        call.status = "open";
      } else call.status = "closed";
    }
    if (call.status === "open" && now >= Date.parse(call.closesAt)) call.status = "closed";
    if (call.status !== "resolved" && call.status !== "void" && now > Date.parse(fixture.kickoff) + 24 * 3600_000) {
      call.status = "void"; call.voidReason = "No verified full-time result within 24 hours";
    }
  }
  for (const wallet of Object.values(state.wallets)) settleSourceWallet(wallet, calls, new Date(now).toISOString());
}

export function placeFootballChoice(state: SourceState, accountId: string, callId: string, choice: Choice, amount: number, now: number): ChoiceResult {
  const call = state.footballCalls?.find(item => item.id === callId);
  if (!call || call.status !== "open" || call.matchState !== "scheduled" || now >= Date.parse(call.closesAt)) return { ok: false, error: "Entries close at kickoff." };
  if (!isFresh(call.observedAt, now)) return { ok: false, error: "Waiting for fresh match data. Your balance has not been deducted." };
  const wallet = state.wallets[accountId];
  if (!wallet) return { ok: false, error: "Load your balance first." };
  const placed = placeVirtualChoice(wallet, call, choice, amount, new Date(now).toISOString());
  if (placed.result.ok) {
    placed.wallet.choices.at(-1)!.status = "locked";
    state.wallets[accountId] = placed.wallet;
  }
  return placed.result;
}
