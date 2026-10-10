import { z } from "zod";
import type { FootballFixture, FootballObservation } from "./football-calls";

const eventSchema = z.object({
  id: z.string(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/).refine(value => Number.isFinite(Date.parse(value))),
  status: z.object({ displayClock: z.string().optional(), type: z.object({ name: z.string(), state: z.string(), completed: z.boolean(), shortDetail: z.string().optional() }) }),
  competitions: z.array(z.object({ competitors: z.array(z.object({ id: z.string(), homeAway: z.enum(["home", "away"]), score: z.string().regex(/^\d{1,2}$/).optional() })) })),
});

export function parseFootballScoreboard(payload: unknown, fixture: FootballFixture, observedAt: string): FootballObservation | undefined {
  const board = z.object({ events: z.array(z.unknown()) }).safeParse(payload);
  if (!board.success) return;
  for (const raw of board.data.events) {
    const parsed = eventSchema.safeParse(raw);
    if (!parsed.success || parsed.data.id !== fixture.eventId) continue;
    const event = parsed.data;
    const teams = event.competitions[0]?.competitors;
    if (teams?.length !== 2) return;
    const home = teams.find(team => team.homeAway === "home" && team.id === fixture.homeId);
    const away = teams.find(team => team.homeAway === "away" && team.id === fixture.awayId);
    if (!home || !away) return;
    const type = event.status.type;
    // "post" alone also includes abandonment: only explicit full time can settle.
    const state = type.name === "STATUS_FULL_TIME" && type.completed && type.state === "post" ? "final"
      : ["STATUS_POSTPONED", "STATUS_CANCELED", "STATUS_CANCELLED", "STATUS_ABANDONED"].includes(type.name) ? "void"
      : type.name === "STATUS_SCHEDULED" && type.state === "pre" && !type.completed ? "scheduled"
      : type.state === "in" && !type.completed ? "live" : undefined;
    if (!state || (state === "final" && (home.score === undefined || away.score === undefined))) return;
    return { eventId: event.id, homeId: home.id, awayId: away.id, kickoff: event.date, observedAt, state,
      statusText: state === "final" ? "Full time" : state === "scheduled" ? "Scheduled" : state === "void" ? "Match postponed or cancelled" : (event.status.displayClock ?? "Live").slice(0,24),
      homeScore: state === "scheduled" || home.score === undefined ? undefined : Number(home.score),
      awayScore: state === "scheduled" || away.score === undefined ? undefined : Number(away.score) };
  }
}
