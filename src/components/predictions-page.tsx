"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { AnimatePresence, motion, useMotionTemplate, useReducedMotion, useSpring } from "motion/react";
import { ArrowRight, ArrowUpRight, Check, Clock3, Coins, Gamepad2, Search, SlidersHorizontal, TrendingUp, Trophy, X } from "lucide-react";
import { findContent, formatCount, type Call, type Choice, type Content, type PredictionCategory } from "@/lib/demo-data";
import { HiveSidebar } from "@/components/hive-sidebar";
import { useAccountAuth } from "@/components/auth-provider";
import { FootballCards } from "./football-calls";
import { LiveCallList } from "@/components/live-call-list";
import { AnimatedViewCount } from "@/components/animated-view-count";
import { AuthControl } from "@/components/auth-control";

import { PredictionSubject } from "@/components/prediction-subject";
import { VirtualBalance, type VirtualAccount } from "@/components/virtual-wallet";
import "./predictions-page.css";
import "./predictions-rework.css";
import "./predictions-market.css";
import "./metropolis-standard.css";
import "./predictions-motion.css";
import "./source-call.css";

type Category = "all" | PredictionCategory;
type Status = "all" | "open" | "done";
type Sort = "featured" | "closing" | "target";
type SavedChoice = { callId: string; choice: Choice; status: "pending" | "locked"; settlement?: "won" | "lost" | "refunded" };

const categories: { id: Category; label: string; Icon?: typeof Gamepad2 }[] = [
  { id: "all", label: "All" },
  { id: "gaming", label: "Gaming", Icon: Gamepad2 },
  { id: "sport", label: "Sports", Icon: Trophy },
  { id: "crypto", label: "Crypto", Icon: Coins },
];
const labels: Record<PredictionCategory, string> = { gaming: "Gaming", sport: "Sports", crypto: "Crypto" };
const destination = (call: Pick<Call, "id" | "status">) => call.status === "resolved" ? `/results/${call.id}` : `/calls/${call.id}`;

function MarketCard({ call, content: sourceContent, selected, reduceMotion, index }: { call: Call; content?: Content; selected?: SavedChoice; reduceMotion: boolean; index: number }) {
  const auth = useAccountAuth();
  const requireLogin = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (auth.configured && !auth.authenticated) { event.preventDefault(); if (auth.ready) auth.login(); }
  };
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const active = hovered || focused;
  const pointerX = useSpring(120, { stiffness: 260, damping: 32 });
  const pointerY = useSpring(80, { stiffness: 260, damping: 32 });
  const spotlight = useMotionTemplate`radial-gradient(260px circle at ${pointerX}px ${pointerY}px, rgba(81,222,209,.09), transparent 75%)`;
  const followPointer = (event: PointerEvent<HTMLElement>) => {
    if (reduceMotion || event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set(event.clientX - bounds.left);
    pointerY.set(event.clientY - bounds.top);
  };
  const content = sourceContent ?? findContent(call.contentId);
  const progress = Math.max(0, Math.min(100, ((call.currentViews - call.baselineViews) / (call.targetViews - call.baselineViews)) * 100));
  const completed = call.status !== "open";
  const statusLabel = call.status === "resolved" ? "Result ready" : call.status === "void" ? "Cancelled" : completed ? "Closed" : "Open";
  return <motion.article className="market-card reference-panel reference-card" data-active={active || undefined}
    onHoverStart={() => setHovered(true)} onHoverEnd={() => setHovered(false)} onPointerMove={followPointer}
    onFocusCapture={() => setFocused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}
    initial={{ opacity: 0, y: reduceMotion ? 0 : 26, scale: reduceMotion ? 1 : .985 }}
    whileInView={{ opacity: 1, y: 0, scale: 1, transition: { duration: reduceMotion ? 0 : .65, delay: reduceMotion ? 0 : Math.min(index, 5) * .07, ease: [.22, 1, .36, 1] } }} viewport={{ once: true, amount: .12 }}
    whileHover={reduceMotion ? undefined : { y: -3, scale: 1.004, transition: { type: "spring", stiffness: 300, damping: 26 } }}
    transition={{ duration: reduceMotion ? 0 : .45, ease: [.22, 1, .36, 1] }}>
    <motion.div className="market-card-spotlight" aria-hidden="true" style={{ background: spotlight }} initial={false} animate={{ opacity: active && !reduceMotion ? 1 : 0 }} transition={{ duration: .35 }} />
    <svg className="market-card-frame" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><motion.rect x=".15" y=".15" width="99.7" height="99.7" initial={false} animate={{ pathLength: active ? 1 : 0, opacity: active ? 1 : 0 }} transition={{ duration: reduceMotion ? 0 : active ? .65 : .25, ease: [.22, 1, .36, 1] }} /></svg>
    <div className="market-card-top"><PredictionSubject contentId={call.contentId} category={call.predictionCategory} className="market-subject" /><div className="market-card-title"><span>{labels[call.predictionCategory]} · {call.horizonHours}h</span><h3><Link href={destination(call)} aria-label={call.question}>{formatCount(call.targetViews)} <small>views?</small></Link></h3></div></div>
    <p className="market-card-source">{content?.title}</p>
    <div className="market-card-observation"><span>Current views</span><strong><AnimatedViewCount value={call.currentViews} /></strong></div>
    <div className="market-card-signal"><span className={`market-status ${completed ? "is-done" : ""}`}><span />{statusLabel}</span>{selected && <span className="market-choice-state"><Check size={13} /> You picked {selected.choice === "yes" ? "Yes" : "No"}</span>}</div>
    <div className="market-card-progress"><div><span>Start <strong>{formatCount(call.baselineViews)}</strong></span><span>Target <strong>{formatCount(call.targetViews)}</strong></span></div><div className="market-progress-track"><motion.span style={{ width: `${progress}%`, originX: 0 }} initial={{ scaleX: reduceMotion ? 1 : 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: reduceMotion ? 0 : .95, delay: reduceMotion ? 0 : .2 + index * .07, ease: [.22, 1, .36, 1] }} /></div></div>
    <div className="market-card-bottom">{completed ? <Link href={destination(call)} className="market-result-link">{call.status === "resolved" ? "View result" : "View details"} <ArrowUpRight size={16} /></Link> : <div className="market-outcomes" aria-label={`Choices for ${call.question}`}><Link href={`/calls/${call.id}?choice=yes`} className="market-outcome-yes" onClick={requireLogin} aria-label={`Choose Yes for ${call.question}`}>Yes <ArrowUpRight size={15} /></Link><Link href={`/calls/${call.id}?choice=no`} className="market-outcome-no" onClick={requireLogin} aria-label={`Choose No for ${call.question}`}>No <ArrowUpRight size={15} /></Link></div>}<Link href={destination(call)} className="market-card-details" aria-label={`View details for ${call.question}`}><ArrowRight size={17} /></Link></div>
  </motion.article>;
}

export function PredictionsPage({ choices, account }: { choices: SavedChoice[]; account: VirtualAccount }) {
  const auth = useAccountAuth();
  const calls = useMemo(() => account.calls ?? [], [account.calls]);
  const reduceMotion = useReducedMotion();
  const searchRef = useRef<HTMLInputElement>(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [category, setCategory] = useState<Category>("all");
  const [status, setStatus] = useState<Status>("all");
  const [sort, setSort] = useState<Sort>("featured");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key !== "/" || event.metaKey || event.ctrlKey || target?.matches("input, textarea, [contenteditable=true]")) return;
      event.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);

  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("en-US");
    const filtered = calls.filter((call) => {
      const content = account.contents?.find((item) => item.id === call.contentId);
      if (!content || (category !== "all" && call.predictionCategory !== category)) return false;
      const finished = call.status === "resolved" || call.status === "void";
      if (status === "open" && finished) return false;
      if (status === "done" && !finished) return false;
      return !term || [call.question, content.title, content.creator, labels[call.predictionCategory]].some((value) => value.toLocaleLowerCase("en-US").includes(term));
    });
    if (sort === "closing") return filtered.sort((a, b) => Date.parse(a.closesAt) - Date.parse(b.closesAt));
    if (sort === "target") return filtered.sort((a, b) => a.targetViews - b.targetViews);
    return filtered.sort((a,b) => Number(b.status === "open") - Number(a.status === "open") || Date.parse(b.openedAt) - Date.parse(a.openedAt));
  }, [account.contents, calls, category, query, sort, status]);
  const football = (account.footballCalls ?? []).filter(call => (category === "all" || category === "sport") && (status === "all" || (status === "done" ? call.status === "resolved" || call.status === "void" : call.status !== "resolved" && call.status !== "void")) && (!query.trim() || [call.home, call.away, call.competition, "Sports football"].some(value => value.toLowerCase().includes(query.trim().toLowerCase()))));
  const resetFilters = () => { setCategory("all"); setStatus("all"); setSort("featured"); setQuery(""); };

  return <div className={`discover-shell predictions-shell hive-theme ${sidebarExpanded ? "is-sidebar-expanded" : ""}`}>
    <HiveSidebar active="predictions" onExpandedChange={setSidebarExpanded} />
    <main className="predictions-page predictions-rework market-page"><div className="market-layout">
      <motion.header className="market-header" initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : .7, ease: [.22, 1, .36, 1] }}><div><span className="market-kicker">Spot it early.</span><h1>Calls</h1><p>Spot the momentum. Make your Call.</p></div><div className="virtual-header-controls"><VirtualBalance account={account} />{!auth.authenticated && <AuthControl />}</div></motion.header>
      <motion.div className="market-search-row" initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : .58, delay: reduceMotion ? 0 : .13, ease: [.22, 1, .36, 1] }}><label className="market-search"><Search size={19} aria-hidden="true" /><span className="predictions-sr-only">Search Calls</span><input ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Calls, videos or categories" />{query ? <button type="button" onClick={() => { setQuery(""); searchRef.current?.focus(); }} aria-label="Clear search"><X size={17} /></button> : <kbd>/</kbd>}</label></motion.div>
      <motion.nav className="market-categories" aria-label="Call categories" initial={{ opacity: 0, y: reduceMotion ? 0 : 9 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : .55, delay: reduceMotion ? 0 : .22, ease: [.22, 1, .36, 1] }}>{categories.map(({ id, label, Icon }) => <button key={id} type="button" className={category === id ? "is-active" : ""} aria-current={category === id ? "page" : undefined} onClick={() => setCategory(id)}>{Icon && <Icon size={17} aria-hidden="true" />}{label}<small>{(id === "all" ? calls.length : calls.filter((call) => call.predictionCategory === id).length) + (id === "all" || id === "sport" ? account.footballCalls?.length ?? 0 : 0)}</small>{category === id && <motion.span className="market-category-indicator" layoutId="prediction-category-indicator" transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 34 }} aria-hidden="true" />}</button>)}</motion.nav>
      <div className="market-main-grid"><section className="market-listing" aria-labelledby="market-list-title"><div className="market-list-head"><div><h2 id="market-list-title">{query ? "Search results" : category === "all" ? "All Calls" : labels[category]}</h2><span>{visible.length + football.length} Calls</span></div><div className="market-controls"><div className="market-status-tabs" role="group" aria-label="Call status">{([{ id: "all", label: "All" }, { id: "open", label: "Active" }, { id: "done", label: "Completed" }] as const).map((item) => <button key={item.id} type="button" className={status === item.id ? "is-active" : ""} aria-pressed={status === item.id} onClick={() => setStatus(item.id)}>{status === item.id && <motion.span className="market-status-indicator" layoutId="prediction-status-indicator" transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 34 }} aria-hidden="true" />}<span className="market-status-label">{item.label}</span></button>)}</div><label className="market-sort"><SlidersHorizontal size={15} aria-hidden="true" /><span className="predictions-sr-only">Sort Calls</span><select value={sort} onChange={(event) => setSort(event.target.value as Sort)}><option value="featured">Featured</option><option value="closing">Closing soon</option><option value="target">Lowest target</option></select></label></div></div>
        <FootballCards calls={football} />
        <AnimatePresence initial={false} mode="wait"><motion.div className="market-cards" key={`${category}-${status}-${sort}`} initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -5 }} transition={{ duration: reduceMotion ? 0.1 : 0.2 }}>{visible.map((call, index) => <MarketCard index={index} key={call.id} content={account.contents?.find((item) => item.id === call.contentId)} call={call} selected={choices.find((choice) => choice.callId === call.id)} reduceMotion={Boolean(reduceMotion)} />)}{calls.length === 0 ? <div className="source-calibration" role="status"><h3>{(account.feedReady ?? account.walletReady) ? "Next Calls are on their way" : "Loading Calls…"}</h3><p>We need two YouTube snapshots, at least 30 minutes apart, to set a target.</p>{account.calibrationStartedAt && <p>Tracking started {new Date(account.calibrationStartedAt).toLocaleTimeString("en-US", { timeZone: "Asia/Jakarta" })} GMT+7.</p>}<Link href="/discover">Explore Shorts <ArrowRight size={16} /></Link></div> : visible.length === 0 && football.length === 0 && <div className="market-empty"><Search size={24} /><h3>No matching Calls</h3><p>Try another search or explore all categories.</p><button type="button" onClick={resetFilters}>Explore all Calls</button></div>}</motion.div></AnimatePresence>
      </section><motion.aside initial={{ opacity: 0, x: reduceMotion ? 0 : 18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: reduceMotion ? 0 : .65, delay: reduceMotion ? 0 : .12, ease: [.22, 1, .36, 1] }} className="market-activity" aria-label="Your activity"><div className="market-activity-head"><span className="market-activity-icon"><Clock3 size={18} /></span><h2>Your Calls</h2></div>{choices.length ? <div className="market-activity-list">{choices.map((choice) => { const call = calls.find((item) => item.id === choice.callId) ?? account.footballCalls?.find(item => item.id === choice.callId); return call ? <Link href={destination(call)} key={choice.callId}><span>{choice.choice === "yes" ? "Yes" : "No"} · {choice.status === "locked" ? "Saved" : "Processing"}</span><strong>{call.question}</strong><ArrowUpRight size={15} /></Link> : null; })}</div> : <div className="market-activity-empty"><p>Find a moment you believe in. Make your first Call.</p></div>}<div className="market-activity-note"><strong>One moment. One Call.</strong><div className="market-how-steps"><div><TrendingUp size={17} /><span>Choose <strong>Yes or No</strong></span></div><div><Coins size={17} /><span>Set your <strong>VIBE amount</strong></span></div><div><Check size={17} /><span>Correct? <strong>2× returned</strong></span></div></div><details><summary className="market-rules-link">How results work</summary><p>YouTube views and football scores are checked every 30s. Each Call shows its result and refund rules. VIBE is free, with no cash value.</p></details></div></motion.aside></div>

      <LiveCallList />
    </div></main>
  </div>;
}
