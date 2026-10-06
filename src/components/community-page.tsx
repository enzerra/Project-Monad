"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowDown, ArrowUpRight, Check, Coins, Gamepad2, Heart, Link2, Plus, Reply, Search, Send, Trophy, X } from "lucide-react";
import { calls, findContent, formatCount, type Call, type PredictionCategory } from "@/lib/demo-data";
import { HiveSidebar } from "@/components/hive-sidebar";
import "./community-page.css";
import "./community-rework.css";
import "./community-telegram.css";
import "./metropolis-standard.css";

type Comment = { id: string; callId: string; name: string; text: string; createdAt: string };
type CommunityState = { calls?: Call[]; contents?: import("@/lib/demo-data").Content[]; sharedCallIds: string[]; comments: Comment[]; shareCall: (callId: string) => void; addComment: (callId: string, text: string) => void };
const channels = [
  { id: "gaming", name: "Gaming", description: "Gameplay, kreator, dan momen viral", Icon: Gamepad2 },
  { id: "sport", name: "Sports", description: "Pertandingan dan sorotan olahraga", Icon: Trophy },
  { id: "crypto", name: "Crypto", description: "Kultur dan teknologi onchain", Icon: Coins },
] as const;
const isChannel = (value: unknown): value is PredictionCategory => channels.some((channel) => channel.id === value);

export function CommunityPage({ state }: { state: CommunityState }) {
  const reduceMotion = useReducedMotion();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [activeChannel, setActiveChannel] = useState<PredictionCategory>("gaming");
  const [activeCallId, setActiveCallId] = useState("speedrun-views");
  const [joinedChannels, setJoinedChannels] = useState<PredictionCategory[]>(["gaming"]);
  const [membershipReady, setMembershipReady] = useState(false);
  const [search, setSearch] = useState("");
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [chatSearch, setChatSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [feedback, setFeedback] = useState("");
  const [likedMessages, setLikedMessages] = useState<Record<string, boolean>>({});
  const [reactionsReady, setReactionsReady] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const chatSearchRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  const availableCalls = useMemo(() => [...(state.calls ?? []), ...calls], [state.calls]);
  const lookupCall = (id: string) => availableCalls.find((call) => call.id === id);
  const sharedCalls = useMemo(() => state.sharedCallIds.map((id) => availableCalls.find((call) => call.id === id)).filter((call): call is Call => Boolean(call)), [state.sharedCallIds, availableCalls]);
  const channelCalls = sharedCalls.filter((call) => call.predictionCategory === activeChannel);
  const selectedCall = channelCalls.find((call) => call.id === activeCallId) ?? channelCalls[channelCalls.length - 1];
  const channel = channels.find((item) => item.id === activeChannel)!;
  const joined = joinedChannels.includes(activeChannel);
  const searchTerm = search.trim().toLocaleLowerCase("id-ID");
  const matchingChannels = channels.filter((item) => `${item.name} ${item.description}`.toLocaleLowerCase("id-ID").includes(searchTerm));
  const messageResults = searchTerm ? state.comments.filter((item) => {
    const call = lookupCall(item.callId);
    return Boolean(call && `${item.name} ${item.text} ${call.question}`.toLocaleLowerCase("id-ID").includes(searchTerm));
  }).slice(0, 8) : [];
  const inChatTerm = chatSearch.trim().toLocaleLowerCase("id-ID");
  const visibleCalls = channelCalls.filter((call) => !inChatTerm || call.question.toLocaleLowerCase("id-ID").includes(inChatTerm) || state.comments.some((item) => item.callId === call.id && `${item.name} ${item.text}`.toLocaleLowerCase("id-ID").includes(inChatTerm)));
  const pickerCalls = availableCalls.filter((call) => call.predictionCategory === activeChannel);

  useEffect(() => {
    const syncFromUrl = () => {
      const call = availableCalls.find((call) => call.id === (new URLSearchParams(window.location.search).get("call") ?? ""));
      if (call) { setActiveChannel(call.predictionCategory); setActiveCallId(call.id); }
    };
    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, [availableCalls]);
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const savedMembers = localStorage.getItem("vibe-demo-joined-channels");
        const savedReactions = localStorage.getItem("vibe-demo-reactions");
        if (savedMembers) { const parsed: unknown = JSON.parse(savedMembers); if (Array.isArray(parsed)) setJoinedChannels(parsed.filter(isChannel)); }
        if (savedReactions) setLikedMessages(JSON.parse(savedReactions));
      } catch { /* The demo remains usable without browser storage. */ }
      setMembershipReady(true);
      setReactionsReady(true);
    });
  }, []);
  useEffect(() => { if (membershipReady) try { localStorage.setItem("vibe-demo-joined-channels", JSON.stringify(joinedChannels)); } catch { /* Storage may be unavailable. */ } }, [joinedChannels, membershipReady]);
  useEffect(() => { if (reactionsReady) try { localStorage.setItem("vibe-demo-reactions", JSON.stringify(likedMessages)); } catch { /* Storage may be unavailable. */ } }, [likedMessages, reactionsReady]);
  useEffect(() => { if (!feedback) return; const timer = window.setTimeout(() => setFeedback(""), 4000); return () => window.clearTimeout(timer); }, [feedback]);
  useEffect(() => {
    if (chatSearchOpen && chatSearch) return;
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior });
  }, [activeChannel, state.comments.length, state.sharedCallIds.length, chatSearchOpen, chatSearch]);

  const updateUrl = (callId?: string) => {
    const url = new URL(window.location.href);
    if (callId) url.searchParams.set("call", callId);
    else url.searchParams.delete("call");
    window.history.replaceState(null, "", url);
  };
  const selectChannel = (id: PredictionCategory) => {
    setActiveChannel(id);
    setActiveCallId(sharedCalls.filter((call) => call.predictionCategory === id).at(-1)?.id ?? "");
    setChatSearch("");
    setChatSearchOpen(false);
    setDraft("");
    setSearch("");
    updateUrl();
  };
  const openCall = (call: Call, focusComposer = false) => {
    setActiveChannel(call.predictionCategory);
    setActiveCallId(call.id);
    setSearch("");
    updateUrl(call.id);
    if (focusComposer) window.requestAnimationFrame(() => composerRef.current?.focus());
    else window.setTimeout(() => document.getElementById(`community-call-${call.id}`)?.scrollIntoView({ block: "center", behavior: reduceMotion ? "instant" : "smooth" }), reduceMotion ? 0 : 230);
  };
  const joinChannel = (id: PredictionCategory) => { setJoinedChannels((current) => current.includes(id) ? current : [...current, id]); setFeedback(`Kamu bergabung ke ${channels.find((item) => item.id === id)?.name}.`); };
  const leaveChannel = (id: PredictionCategory) => { setJoinedChannels((current) => current.filter((item) => item !== id)); setFeedback(`Kamu keluar dari ${channels.find((item) => item.id === id)?.name}.`); };
  const shareCall = (call: Call) => {
    const wasShared = state.sharedCallIds.includes(call.id);
    state.shareCall(call.id);
    if (!joinedChannels.includes(call.predictionCategory)) setJoinedChannels((current) => [...current, call.predictionCategory]);
    dialogRef.current?.close();
    openCall(call, true);
    setFeedback(wasShared ? "Obrolan Call dibuka." : "Call demo dibagikan ke channel.");
  };
  const copyCall = async (id: string) => {
    const url = new URL(`/calls/${id}`, window.location.origin).toString();
    try { await navigator.clipboard.writeText(url); setFeedback("Tautan Call disalin."); }
    catch { setFeedback(`Tautan Call: ${url}`); }
  };
  const submitComment = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!selectedCall || !joined || !text) return;
    state.addComment(selectedCall.id, text);
    setDraft("");
    setFeedback("Pesan demo tersimpan di browser ini.");
  };

  const channelRow = (item: typeof channels[number]) => {
    const itemCalls = sharedCalls.filter((call) => call.predictionCategory === item.id);
    const recentComment = [...state.comments].reverse().find((comment) => itemCalls.some((call) => call.id === comment.callId));
    return <button type="button" key={item.id} className={`community-channel ${activeChannel === item.id ? "is-active" : ""}`} onClick={() => selectChannel(item.id)} aria-current={activeChannel === item.id ? "page" : undefined}>
      <span className={`community-channel-icon icon-${item.id}`}><item.Icon size={20} strokeWidth={1.8} aria-hidden="true" /></span><span className="community-channel-copy"><strong>{item.name}</strong><small>{recentComment ? `${recentComment.name}: ${recentComment.text}` : item.description}</small></span>{itemCalls.length > 0 && <span className="community-channel-count">{itemCalls.length}</span>}
    </button>;
  };

  return <div className={`discover-shell community-shell hive-theme ${sidebarExpanded ? "is-sidebar-expanded" : ""}`}>
    <HiveSidebar active="community" onExpandedChange={setSidebarExpanded} />
    <main className="community-page telegram-page"><aside className="community-channels" aria-label="Daftar komunitas">
      <header className="community-channels-head"><span className="community-kicker">VIBE / COMMUNITY</span><h1>Chats<span>.</span></h1><p>Channel dan percakapan yang kamu ikuti.</p></header>
      <label className="community-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Cari komunitas atau pesan</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari komunitas atau pesan" />{search && <button type="button" onClick={() => setSearch("")} aria-label="Hapus pencarian"><X size={16} /></button>}</label>
      <div className="community-channel-list">{searchTerm ? <><span className="telegram-list-label">Komunitas</span>{matchingChannels.map(channelRow)}{!matchingChannels.length && <p className="community-search-empty">Tidak ada komunitas yang cocok.</p>}<span className="telegram-list-label">Pesan</span>{messageResults.map((item) => { const call = lookupCall(item.callId); return call && <button className="telegram-search-result" key={item.id} type="button" onClick={() => openCall(call)}><span>{item.name} · {channels.find((entry) => entry.id === call.predictionCategory)?.name}</span><strong>{item.text}</strong></button>; })}{!messageResults.length && <p className="community-search-empty">Belum ada pesan yang cocok. Coba kata lain.</p>}</> : <><span className="telegram-list-label">Channel kamu</span>{channels.filter((item) => joinedChannels.includes(item.id)).map(channelRow)}{joinedChannels.length === 0 && <p className="community-search-empty">Belum mengikuti channel. Jelajahi pilihan di bawah.</p>}<span className="telegram-list-label">Jelajahi komunitas</span>{channels.filter((item) => !joinedChannels.includes(item.id)).map(channelRow)}{joinedChannels.length === channels.length && <p className="community-search-empty">Semua channel demo sudah kamu ikuti.</p>}</>}</div>
      <p className="community-side-note"><span className="community-side-note-dot" /> Percakapan demo tersimpan di browser ini.</p>
    </aside><section className="community-chat" aria-label={`Obrolan channel ${channel.name}`}>
      <header className="community-chat-head"><span className={`community-channel-icon icon-${channel.id}`}><channel.Icon size={20} strokeWidth={1.8} aria-hidden="true" /></span><div className="telegram-chat-title"><h2>{channel.name}</h2><p>{joined ? "Channel yang diikuti" : "Pratinjau channel publik"} · {channelCalls.length} Call dibagikan</p></div><button type="button" className="telegram-header-icon" aria-label="Cari dalam percakapan" aria-expanded={chatSearchOpen} onClick={() => { setChatSearchOpen((value) => !value); setChatSearch(""); window.requestAnimationFrame(() => chatSearchRef.current?.focus()); }}><Search size={20} /></button>{joined ? <button type="button" className="telegram-member-action" onClick={() => leaveChannel(channel.id)}>Keluar</button> : <button type="button" className="telegram-member-action is-join" onClick={() => joinChannel(channel.id)}>Gabung</button>}<button type="button" className="community-share-button" aria-label="Bagikan Call ke channel" onClick={() => dialogRef.current?.showModal()}><Plus size={17} aria-hidden="true" /><span>Bagikan Call</span></button></header>
      {chatSearchOpen && <div className="telegram-chat-search"><Search size={16} /><label className="sr-only" htmlFor="community-chat-search">Cari pesan dalam channel</label><input id="community-chat-search" ref={chatSearchRef} value={chatSearch} onChange={(event) => setChatSearch(event.target.value)} placeholder={`Cari di ${channel.name}`} /><span>{chatSearch ? `${visibleCalls.length} Call` : "Cari pesan atau Call"}</span><button type="button" onClick={() => { setChatSearch(""); setChatSearchOpen(false); }} aria-label="Tutup pencarian"><X size={17} /></button></div>}
      {channelCalls.length > 0 && !chatSearchOpen && <button type="button" className="telegram-pinned-call" onClick={() => openCall(channelCalls[channelCalls.length - 1])}><span className="telegram-pin-line" /><span><strong>Call yang dibahas</strong><small>{channelCalls[channelCalls.length - 1].question}</small></span><ArrowDown size={17} aria-hidden="true" /></button>}
      <div className="community-chat-scroll" ref={messagesRef} role="log" aria-label="Pesan channel"><AnimatePresence initial={false} mode="wait"><motion.div key={activeChannel} className="community-chat-content telegram-timeline" initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? .1 : .2 }}>
        {visibleCalls.length ? visibleCalls.map((call) => { const comments = state.comments.filter((item) => item.callId === call.id && (!inChatTerm || call.question.toLocaleLowerCase("id-ID").includes(inChatTerm) || `${item.name} ${item.text}`.toLocaleLowerCase("id-ID").includes(inChatTerm))); return <section id={`community-call-${call.id}`} className="telegram-thread" key={call.id} aria-label={`Obrolan ${call.question}`}><div className="community-chat-divider"><span>{call.status === "resolved" ? "Hasil tersedia" : "Call dibagikan"}</span></div><div className="community-call-message"><span className="community-message-avatar hive"><Image src="/brand/vibe-symbol.png" alt="" width={30} height={30} /></span><div className="community-call-bubble"><div className="community-bubble-author">VIBE <span>membagikan prediksi</span></div><span className="community-call-label">{call.horizonHours} JAM · {call.status === "resolved" ? "HASIL TERSEDIA" : "PILIHAN TERBUKA"}</span><h3>{call.question}</h3><p>{(state.contents?.find((content) => content.id === call.contentId) ?? findContent(call.contentId))?.title}</p><div className="community-call-metric"><span>Mulai {formatCount(call.baselineViews)}</span><span aria-hidden="true">→</span><span>Target {formatCount(call.targetViews)} views</span></div><div className="community-call-links"><Link href={call.status === "resolved" ? `/results/${call.id}` : `/calls/${call.id}`}>{call.status === "resolved" ? "Lihat hasil" : "Ikut prediksi"}<ArrowUpRight size={15} aria-hidden="true" /></Link><button type="button" onClick={() => void copyCall(call.id)}><Link2 size={14} aria-hidden="true" /> Salin tautan</button><button type="button" onClick={() => openCall(call, true)}><Reply size={14} aria-hidden="true" /> Balas</button></div></div></div>
          {comments.map((item) => <div key={item.id} className={`community-chat-message ${item.name.toLowerCase().startsWith("kamu") ? "is-mine" : ""}`}><span className="community-message-avatar">{item.name.slice(0, 1).toUpperCase()}</span><div className="community-message-stack"><div className="community-chat-bubble"><strong>{item.name}</strong><p>{item.text}</p><time>{item.createdAt}</time></div><div className="community-message-actions"><button type="button" className={likedMessages[item.id] ? "is-liked" : ""} aria-label={likedMessages[item.id] ? `Batal suka pesan ${item.name}` : `Sukai pesan ${item.name}`} aria-pressed={Boolean(likedMessages[item.id])} onClick={() => setLikedMessages((current) => ({ ...current, [item.id]: !current[item.id] }))}><Heart size={14} fill={likedMessages[item.id] ? "currentColor" : "none"} /> <span>{likedMessages[item.id] ? "Disukai" : "Suka"}</span></button><button type="button" onClick={() => { setActiveCallId(item.callId); setDraft(`@${item.name} `); composerRef.current?.focus(); }}><Reply size={14} /> Balas</button></div></div></div>)}
          {!comments.length && !inChatTerm && <button type="button" className="telegram-first-reply" onClick={() => openCall(call, true)}>Mulai obrolan tentang Call ini <ArrowUpRight size={14} /></button>}</section>; }) : <div className="community-empty-chat"><span className="community-empty-icon"><channel.Icon size={28} strokeWidth={1.5} aria-hidden="true" /></span><h3>{inChatTerm ? "Tidak ada pesan yang cocok" : `Belum ada obrolan di ${channel.name}`}</h3><p>{inChatTerm ? "Coba kata lain atau tutup pencarian." : "Bagikan Call pertama untuk memulai percakapan."}</p>{!inChatTerm && <button type="button" onClick={() => dialogRef.current?.showModal()}><Plus size={16} /> Bagikan Call</button>}</div>}
      </motion.div></AnimatePresence></div>
      {joined ? <form className="community-composer telegram-composer" onSubmit={submitComment}><div className="telegram-reply-context">{selectedCall ? <>Membalas <strong>{selectedCall.question}</strong></> : "Bagikan Call untuk mulai mengobrol"}</div><div className="telegram-composer-row"><label htmlFor="community-comment" className="sr-only">Tulis pesan untuk Call terpilih</label><textarea id="community-comment" ref={composerRef} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder={selectedCall ? "Tulis pesan..." : "Bagikan Call untuk mulai mengobrol"} disabled={!selectedCall} maxLength={500} rows={1} /><span className="community-composer-hint">Enter ↵</span><button type="submit" disabled={!selectedCall || !draft.trim()} aria-label="Kirim pesan"><Send size={18} aria-hidden="true" /></button></div></form> : <div className="telegram-join-bar"><span>Gabung ke {channel.name} untuk ikut mengobrol.</span><button type="button" onClick={() => joinChannel(channel.id)}>Gabung channel</button></div>}
    </section></main>
    <dialog ref={dialogRef} className="community-picker" aria-labelledby="community-picker-title"><div className="community-picker-head"><div><span>CHANNEL {channel.name.toUpperCase()}</span><h2 id="community-picker-title">Bagikan Call</h2></div><button type="button" onClick={() => dialogRef.current?.close()} aria-label="Tutup pilihan Call"><X size={20} /></button></div><p>Pilih Call untuk membuka obrolan yang sama di channel ini.</p><div className="community-picker-list">{pickerCalls.map((call) => <button type="button" key={call.id} onClick={() => shareCall(call)}><strong>{call.question}</strong><small>{(state.contents?.find((content) => content.id === call.contentId) ?? findContent(call.contentId))?.title}</small><span>{state.sharedCallIds.includes(call.id) ? <><Check size={15} /> Buka obrolan</> : <><Plus size={15} /> Bagikan ke {channel.name}</>}</span></button>)}</div></dialog>
    <div className="community-toast" role="status" aria-live="polite">{feedback}</div>
  </div>;
}
