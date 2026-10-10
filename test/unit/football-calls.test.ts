import { describe, expect, it } from "vitest";
import { emptySourceState, sourceAccount } from "../../src/lib/source-calls";
import { footballFixtures, observeFootball, placeFootballChoice, type FootballObservation } from "../../src/lib/football-calls";
import { parseFootballScoreboard } from "../../src/lib/football-source";
import { virtualBalance } from "../../src/lib/virtual-token";
const fixture = footballFixtures[1];
const kickoff = Date.parse(fixture.kickoff);
const hash = (s: string) => `proof:${s}`;
const observation = (now: number, extra: Partial<FootballObservation> = {}): FootballObservation => ({ eventId: fixture.eventId, homeId: fixture.homeId, awayId: fixture.awayId, kickoff: fixture.kickoff, observedAt: new Date(now).toISOString(), state: "scheduled", statusText: "Scheduled", ...extra });
function setup() { const state = emptySourceState(); const now = kickoff - 60000; observeFootball(state,[observation(now)],now,hash); sourceAccount(state,"alice",now); return {state,now}; }
describe("football Calls",()=>{
  it("locks exactly at kickoff, debits once and rejects duplicate or unaffordable choices",()=>{
    const {state,now}=setup();
    expect(placeFootballChoice(state,"alice",fixture.id,"yes",50,now).ok).toBe(true);
    expect(placeFootballChoice(state,"alice",fixture.id,"yes",50,now).ok).toBe(false);
    expect(virtualBalance(state.wallets.alice)).toBe(950);
    sourceAccount(state,"bob",now);
    expect(placeFootballChoice(state,"bob",fixture.id,"yes",50,kickoff).ok).toBe(false);
    expect(placeFootballChoice(state,"bob",fixture.id,"yes",501,now).ok).toBe(false);
  });
  it("does not award based on estimated end time or an in-play lead; final result pays once",()=>{
    const {state,now}=setup();placeFootballChoice(state,"alice",fixture.id,"yes",50,now);
    const late=kickoff+120*60000;
    observeFootball(state,[observation(late,{state:"live",statusText:"90'+8'",homeScore:2,awayScore:1})],late,hash);
    expect(virtualBalance(state.wallets.alice)).toBe(950);
    const final=observation(late+30000,{state:"final",statusText:"FT",homeScore:2,awayScore:1});
    observeFootball(state,[final],late+30000,hash);observeFootball(state,[final],late+30001,hash);
    expect(virtualBalance(state.wallets.alice)).toBe(1050);
    expect(state.wallets.alice.entries.filter(e=>e.kind==="reward")).toHaveLength(1);
    expect(state.footballCalls?.find(c=>c.id===fixture.id)?.proof?.hash).toContain('"homeScore":2');
  });
  it.each([[1,1],[0,2]])("settles draw or away win as No (%i–%i)",(homeScore,awayScore)=>{
    const {state,now}=setup();placeFootballChoice(state,"alice",fixture.id,"no",50,now);
    const end=kickoff+120*60000;observeFootball(state,[observation(end,{state:"final",statusText:"FT",homeScore,awayScore})],end,hash);
    expect(state.wallets.alice.choices[0].settlement).toBe("won");expect(virtualBalance(state.wallets.alice)).toBe(1050);
  });
  it("rejects stale observations and wrong fixture identity; missing data cannot resolve a winner",()=>{
    const {state,now}=setup();
    observeFootball(state,[observation(now+1,{homeId:"wrong"})],now+1,hash);
    expect(state.footballCalls?.find(c=>c.id===fixture.id)?.observedAt).toBe(new Date(now).toISOString());
    const end=kickoff+120*60000;observeFootball(state,[observation(now,{state:"final",homeScore:3,awayScore:0})],end,hash);
    expect(state.footballCalls?.find(c=>c.id===fixture.id)?.status).toBe("closed");
  });
  it("refunds abandoned matches and no-result timeouts once",()=>{
    for(const abandoned of [true,false]){
      const {state,now}=setup();placeFootballChoice(state,"alice",fixture.id,"yes",50,now);
      const end=abandoned?kickoff+40*60000:kickoff+24*3600000+1;
      const observations=abandoned?[observation(end,{state:"void",statusText:"Abandoned"})]:[];
      observeFootball(state,observations,end,hash);observeFootball(state,observations,end+1,hash);
      expect(virtualBalance(state.wallets.alice)).toBe(1000);expect(state.wallets.alice.entries.filter(e=>e.kind==="refund")).toHaveLength(1);
    }
  });
  it("never reopens after an early kickoff followed by a scheduled snapshot",()=>{
    const {state,now}=setup();observeFootball(state,[observation(now,{state:"live",statusText:"1'"})],now,hash);
    observeFootball(state,[observation(now+1000)],now+1000,hash);
    expect(placeFootballChoice(state,"alice",fixture.id,"yes",50,now+1000).ok).toBe(false);
  });
});
describe("ESPN scoreboard parser",()=>{
  const board=(name="STATUS_FULL_TIME",completed=true,score="2")=>({events:[{id:fixture.eventId,date:fixture.kickoff,status:{displayClock:"90'+5'",type:{name,state:completed?"post":"in",completed}},competitions:[{competitors:[{id:fixture.homeId,homeAway:"home",score},{id:fixture.awayId,homeAway:"away",score:"1"}]}]}]});
  it("requires explicit full time and exact teams",()=>{
    expect(parseFootballScoreboard(board(),fixture,fixture.kickoff)?.state).toBe("final");
    expect(parseFootballScoreboard(board("STATUS_ABANDONED",false),fixture,fixture.kickoff)?.state).toBe("void");
    expect(parseFootballScoreboard(board("STATUS_FINAL",true),fixture,fixture.kickoff)).toBeUndefined();
    expect(parseFootballScoreboard(board(),{...fixture,homeId:"wrong"},fixture.kickoff)).toBeUndefined();
    expect(parseFootballScoreboard(board("STATUS_FULL_TIME",true,"NaN"),fixture,fixture.kickoff)).toBeUndefined();
  });
  it("accepts ESPN minute precision timestamps and no pre-match score",()=>{
    const b=board("STATUS_SCHEDULED",false);b.events[0].date="2026-10-10T18:00Z";b.events[0].status.type.state="pre";
    expect(parseFootballScoreboard(b,fixture,fixture.kickoff)).toMatchObject({state:"scheduled",homeScore:undefined});
  });
});
