"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

type LiveItem = { id: string; status: string; baseline_views: number; target_views: number; horizon_hours: number; chain_call_id: string };
export function LiveCallList() {
  const [calls, setCalls] = useState<LiveItem[]>([]);
  const [configured, setConfigured] = useState(false);
  useEffect(() => { fetch("/api/live/calls").then((response) => response.json()).then((data) => { setCalls(data.calls ?? []); setConfigured(Boolean(data.configured)); }).catch(() => {}); }, []);
  if (!configured) return null;
  return <section className="live-list" aria-label="Live Calls"><p className="overline">MONAD TESTNET / LIVE</p><h2>Call nyata</h2>{calls.length ? calls.map((call) => <Link key={call.id} href={`/live/calls/${call.id}`} className="prediction-row"><div className="prediction-main"><span className="eyebrow">{call.horizon_hours} JAM · {call.status.toUpperCase()}</span><h3>{call.target_views.toLocaleString("id-ID")} views</h3><span className="muted-small">Baseline {call.baseline_views.toLocaleString("id-ID")} · {call.chain_call_id.slice(0, 12)}…</span></div><span>→</span></Link>) : <p>Belum ada Call live yang diterbitkan.</p>}</section>;
}
