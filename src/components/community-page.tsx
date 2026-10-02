"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, Gamepad2, Link2, Music2, Plus, Search, Send, Trophy, X } from "lucide-react";
import { calls, findCall, findContent, formatCount, type Call, type PredictionCategory } from "@/lib/demo-data";
import { HiveSidebar } from "@/components/hive-sidebar";
import "./community-page.css";

type Comment = { id: string; callId: string; name: string; text: string; createdAt: string };
type CommunityState = { sharedCallIds: string[]; comments: Comment[]; shareCall: (callId: string) => void; addComment: (callId: string, text: string) => void };
const channels = [
  { id: "gaming", name: "Gaming", description: "Gameplay dan kreator", Icon: Gamepad2 },
  { id: "sport", name: "Sport", description: "Momen pertandingan", Icon: Trophy },
  { id: "lagu", name: "Lagu", description: "Rilisan dan tren musik", Icon: Music2 },
] as const;

export function CommunityPage({ state }: { state: CommunityState }) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [activeChannel, setActiveChannel] = useState<PredictionCategory>("gaming");
  const [activeCallId, setActiveCallId] = useState("rush-views");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [feedback, setFeedback] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const sharedCalls = state.sharedCallIds.map(findCall).filter((call): call is Call => Boolean(call));
  const channelCalls = sharedCalls.filter((call) => call.predictionCategory === activeChannel);
  const selectedCall = channelCalls.find((call) => call.id === activeCallId) ?? channelCalls[0];
  const selectedComments = selectedCall ? state.comments.filter((item) => item.callId === selectedCall.id) : [];
  const channel = channels.find((item) => item.id === activeChannel)!;
  const matchingChannels = channels.filter((item) => item.name.toLowerCase().includes(search.trim().toLowerCase()));
  const pickerCalls = calls.filter((call) => call.predictionCategory === activeChannel);

  useEffect(() => {
    const syncFromUrl = () => {
      const call = findCall(new URLSearchParams(window.location.search).get("call") ?? "");
      if (call) { setActiveChannel(call.predictionCategory); setActiveCallId(call.id); }
    };
    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);
  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(""), 4000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);
  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
  }, [selectedCall?.id, selectedComments.length]);

  const updateUrl = (id?: string) => {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("call", id);
    else url.searchParams.delete("call");
    window.history.replaceState(null, "", url);
  };
  const selectChannel = (id: PredictionCategory) => {
    setActiveChannel(id);
    setActiveCallId(sharedCalls.find((call) => call.predictionCategory === id)?.id ?? "");
    setDraft("");
    updateUrl();
  };
  const selectCall = (call: Call, focus = false) => {
    setActiveChannel(call.predictionCategory);
    setActiveCallId(call.id);
    setDraft("");
    updateUrl(call.id);
    if (focus) window.requestAnimationFrame(() => composerRef.current?.focus());
  };
  const shareCall = (call: Call) => {
    const alreadyShared = state.sharedCallIds.includes(call.id);
    state.shareCall(call.id);
    selectCall(call, true);
    dialogRef.current?.close();
    setFeedback(alreadyShared ? "Obrolan Call dibuka." : "Call demo dibagikan ke channel.");
  };
  const copyCall = async (id: string) => {
    const url = new URL(`/calls/${id}`, window.location.origin).toString();
    try { await navigator.clipboard.writeText(url); setFeedback("Tautan Call disalin."); }
    catch { setFeedback(`Tautan Call: ${url}`); }
  };
  const submitComment = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!selectedCall || !text) return;
    state.addComment(selectedCall.id, text);
    setDraft("");
    setFeedback("Pesan demo tersimpan di browser ini.");
  };

  return (
    <div className={`discover-shell community-shell ${sidebarExpanded ? "is-sidebar-expanded" : ""}`}>
      <HiveSidebar active="community" onExpandedChange={setSidebarExpanded} />
      <main className="community-page">
        <aside className="community-channels" aria-label="Channel yang diikuti">
          <header className="community-channels-head"><span className="community-kicker">HIVE / COMMUNITY</span><h1>Komunitas</h1><p>Channel yang kamu ikuti</p></header>
          <label className="community-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Cari channel</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari channel" /></label>
          <div className="community-channel-list">
            {matchingChannels.map((item) => {
              const count = sharedCalls.filter((call) => call.predictionCategory === item.id).length;
              return <button type="button" key={item.id} className={`community-channel ${activeChannel === item.id ? "is-active" : ""}`} onClick={() => selectChannel(item.id)} aria-current={activeChannel === item.id ? "page" : undefined}>
                <span className="community-channel-icon"><item.Icon size={21} strokeWidth={1.8} aria-hidden="true" /></span>
                <span className="community-channel-copy"><strong>{item.name}</strong><small>{count ? `${count} Call dibagikan` : item.description}</small></span>
              </button>;
            })}
            {!matchingChannels.length && <p className="community-search-empty">Channel tidak ditemukan.</p>}
          </div>
          <p className="community-side-note">Channel dan percakapan ini adalah demo lokal.</p>
        </aside>
        <section className="community-chat" aria-label={`Obrolan channel ${channel.name}`}>
          <header className="community-chat-head">
            <span className="community-channel-icon"><channel.Icon size={21} strokeWidth={1.8} aria-hidden="true" /></span>
            <div><h2>{channel.name}</h2><p>Channel publik · Demo lokal</p></div>
            <button type="button" className="community-share-button" onClick={() => dialogRef.current?.showModal()}><Plus size={17} aria-hidden="true" /><span>Bagikan Call</span></button>
          </header>
          {channelCalls.length > 1 && <nav className="community-topics" aria-label="Call dalam channel">{channelCalls.map((call) => <button type="button" key={call.id} className={selectedCall?.id === call.id ? "is-active" : ""} onClick={() => selectCall(call)} aria-current={selectedCall?.id === call.id ? "page" : undefined}>{call.question}</button>)}</nav>}
          <div className="community-chat-scroll" ref={messagesRef} role="log" aria-label="Pesan channel">
            {selectedCall ? <div className="community-chat-content" key={selectedCall.id}>
              <div className="community-chat-divider"><span>Percakapan Call · Demo</span></div>
              <div className="community-call-message"><span className="community-message-avatar hive">H</span><div className="community-call-bubble"><div className="community-bubble-author">HIVE <span>membagikan Call</span></div><span className="community-call-label">{selectedCall.horizonHours} JAM · {selectedCall.status === "resolved" ? "HASIL TERSEDIA" : "PREDIKSI"}</span><h3>{selectedCall.question}</h3><p>{findContent(selectedCall.contentId)?.title}</p><div className="community-call-metric">Awal {formatCount(selectedCall.baselineViews)} <span>→</span> Target {formatCount(selectedCall.targetViews)} views</div><div className="community-call-links"><Link href={selectedCall.status === "resolved" ? `/results/${selectedCall.id}` : `/calls/${selectedCall.id}`}>{selectedCall.status === "resolved" ? "Lihat hasil" : "Buka Call"}<ArrowUpRight size={15} aria-hidden="true" /></Link><button type="button" onClick={() => void copyCall(selectedCall.id)}><Link2 size={14} aria-hidden="true" /> Salin tautan</button></div></div></div>
              {selectedComments.map((item) => <div key={item.id} className={`community-chat-message ${item.name === "Kamu" ? "is-mine" : ""}`}><span className="community-message-avatar">{item.name.slice(0, 1).toUpperCase()}</span><div className="community-chat-bubble"><strong>{item.name}</strong><p>{item.text}</p><time>{item.createdAt}</time></div></div>)}
              {!selectedComments.length && <p className="community-conversation-empty">Belum ada balasan. Mulai obrolan tentang Call ini.</p>}
            </div> : <div className="community-empty-chat"><span className="community-empty-icon"><channel.Icon size={30} strokeWidth={1.5} aria-hidden="true" /></span><h3>Belum ada obrolan di {channel.name}</h3><p>Bagikan Call pertama untuk memulai percakapan channel ini.</p><button type="button" onClick={() => dialogRef.current?.showModal()}><Plus size={16} aria-hidden="true" /> Bagikan Call</button></div>}
          </div>
          <form className="community-composer" onSubmit={submitComment}><label htmlFor="community-comment" className="sr-only">Tulis pesan untuk Call terpilih</label><textarea id="community-comment" ref={composerRef} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder={selectedCall ? "Tulis pesan tentang Call ini..." : "Bagikan Call untuk mulai mengobrol"} disabled={!selectedCall} maxLength={500} rows={1} /><button type="submit" disabled={!selectedCall || !draft.trim()} aria-label="Kirim pesan"><Send size={18} aria-hidden="true" /></button></form>
        </section>
      </main>
      <dialog ref={dialogRef} className="community-picker" aria-labelledby="community-picker-title"><div className="community-picker-head"><div><span>CHANNEL {channel.name.toUpperCase()}</span><h2 id="community-picker-title">Bagikan Call</h2></div><button type="button" onClick={() => dialogRef.current?.close()} aria-label="Tutup pilihan Call"><X size={20} /></button></div><p>Pilih Call demo untuk membuka obrolan yang sama di channel ini.</p><div className="community-picker-list">{pickerCalls.map((call) => <button type="button" key={call.id} onClick={() => shareCall(call)}><strong>{call.question}</strong><small>{findContent(call.contentId)?.title}</small><span>{state.sharedCallIds.includes(call.id) ? <><Check size={15} /> Buka obrolan</> : <><Plus size={15} /> Bagikan ke {channel.name}</>}</span></button>)}</div></dialog>
      <div className="community-toast" role="status" aria-live="polite">{feedback}</div>
    </div>
  );
}
