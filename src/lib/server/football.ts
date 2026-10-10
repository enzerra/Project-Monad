import "server-only";
import { footballFixtures, type FootballObservation } from "@/lib/football-calls";
import { parseFootballScoreboard } from "@/lib/football-source";

type Cache = { until: number; items: FootballObservation[]; pending?: Promise<FootballObservation[]> };
const host = globalThis as typeof globalThis & { vibeFootballCache?: Cache };
export async function getFootballObservations(): Promise<FootballObservation[]> {
  const cache = host.vibeFootballCache ??= { until: 0, items: [] };
  if (cache.pending) return cache.pending;
  if (Date.now() < cache.until) return cache.items;
  cache.pending = (async () => {
    const results = await Promise.allSettled(footballFixtures.map(async fixture => {
      const date = fixture.kickoff.slice(0,10).replaceAll("-", "");
      const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${fixture.league}/scoreboard?dates=${date}`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
      if (!response.ok) return undefined;
      return parseFootballScoreboard(await response.json(), fixture, new Date().toISOString());
    }));
    cache.items = results.flatMap(result => result.status === "fulfilled" && result.value ? [result.value] : []);
    cache.until = Date.now() + 30_000;
    return cache.items;
  })().finally(() => { cache.pending = undefined; });
  return cache.pending;
}
