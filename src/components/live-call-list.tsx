"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

type LiveItem = { id: string; status: string; baseline_views: number; target_views: number; horizon_hours: number; chain_call_id: string; content?: { title: string; creator: string } };
export function LiveCallList() {
  const [calls, setCalls] = useState<LiveItem[]>([]);
  const [configured, setConfigured] = useState(false);
  useEffect(() => { fetch("/api/live/calls").then((response) => response.json()).then((data) => { setCalls(data.calls ?? []); setConfigured(Boolean(data.configured)); }).catch(() => {}); }, []);
  if (!configured) return null;
  if (!calls.length) return null;
  return <section className="live-list" aria-label="Call Monad"><p className="overline">MONAD TESTNET</p><h2>Buktikan pilihanmu</h2><p className="muted-small">Pilihan bertanda tangan di Monad, tanpa stake VIBE.</p>{calls.map((call) => <Link key={call.id} href={`/live/calls/${call.id}`} className="prediction-row"><div className="prediction-main"><span className="eyebrow">{call.horizon_hours} JAM · {call.status === "open" ? "TERBUKA" : call.status.toUpperCase()}</span><h3>{call.content?.title ?? `${call.target_views.toLocaleString("id-ID")} views`}</h3><span className="muted-small">Target {call.target_views.toLocaleString("id-ID")} views</span></div><span aria-hidden="true">→</span></Link>)}</section>;
}
