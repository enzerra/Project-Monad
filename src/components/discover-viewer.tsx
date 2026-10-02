"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronRight,
  ExternalLink,
  MessageCircle,
  Pause,
  Play,
  Send,
  Share2,
  TrendingUp,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { contents, findCall, formatCount, formatTime, type Choice } from "@/lib/demo-data";
import { HiveSidebar } from "@/components/hive-sidebar";
import "./discover-viewer.css";

type ViewerState = {
  choices: { callId: string; choice: Choice; status: "pending" | "locked" }[];
  comments: { id: string; callId: string; name: string; text: string; createdAt: string }[];
  selectChoice: (callId: string, choice: Choice) => void;
  shareCall: (callId: string) => void;
  addComment: (callId: string, text: string) => void;
};

const feed = contents.filter((item) => item.video);

export function DiscoverViewer({ state, initialVideoId }: { state: ViewerState; initialVideoId?: string }) {
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, feed.findIndex((item) => item.id === initialVideoId)));
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [loading, setLoading] = useState(true);
  const [mediaError, setMediaError] = useState(false);
  const [panel, setPanel] = useState<"call" | "comments">("call");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [callPanelOpen, setCallPanelOpen] = useState(true);
  const [pendingChoice, setPendingChoice] = useState<Choice | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [feedback, setFeedback] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const callShortcutRef = useRef<HTMLButtonElement>(null);

  const content = feed[activeIndex];
  const call = content.callId ? findCall(content.callId) : undefined;
  const chosen = call ? state.choices.find((item) => item.callId === call.id) : undefined;
  const commentKey = call?.id ?? `content:${content.id}`;
  const comments = state.comments.filter((item) => item.callId === commentKey);
  const showAside = panel === "comments" || Boolean(call && callPanelOpen);

  useEffect(() => {
    const syncFromUrl = () => {
      const id = new URLSearchParams(window.location.search).get("video");
      const found = feed.findIndex((item) => item.id === id);
      setLoading(true);
      setMediaError(false);
      setCallPanelOpen(true);
      setPanel("call");
      setDrawerOpen(false);
      setActiveIndex(found >= 0 ? found : 0);
    };
    queueMicrotask(syncFromUrl);
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) videoRef.current?.pause();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const video = videoRef.current;
      if (!video) return;
      if (video.readyState >= 2) setLoading(false);
      setPlaying(!video.paused);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeIndex]);

  useEffect(() => {
    if (pendingChoice) dialogRef.current?.showModal();
  }, [pendingChoice]);

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(""), 4500);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const navigate = useCallback((direction: -1 | 1) => {
    const next = Math.max(0, Math.min(feed.length - 1, activeIndex + direction));
    if (next === activeIndex) return;
    const url = new URL(window.location.href);
    url.searchParams.set("video", feed[next].id);
    window.history.pushState(null, "", url);
    setLoading(true);
    setMediaError(false);
    setPanel("call");
    setCallPanelOpen(true);
    setDrawerOpen(false);
    setFeedback("");
    setPlaying(false);
    setMuted(true);
    setActiveIndex(next);
  }, [activeIndex]);

  const togglePlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => setFeedback("Video tidak bisa diputar. Coba muat ulang."));
    else video.pause();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (pendingChoice || target?.closest("input, textarea, dialog")) return;
      if (event.key === "ArrowDown") { event.preventDefault(); navigate(1); }
      if (event.key === "ArrowUp") { event.preventDefault(); navigate(-1); }
      if (event.key === " " && !target?.closest("button, a")) { event.preventDefault(); togglePlayback(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate, pendingChoice, togglePlayback]);

  const toggleMute = () => {
    if (!content.video?.hasAudio) return;
    const next = !muted;
    setMuted(next);
    if (videoRef.current) videoRef.current.muted = next;
    setFeedback(next ? "Suara dimatikan." : "Suara diaktifkan jika klip sumber memiliki audio.");
  };

  const share = async () => {
    const url = new URL(window.location.href);
    url.pathname = "/";
    url.searchParams.set("video", content.id);
    if (call) state.shareCall(call.id);
    try {
      await navigator.clipboard.writeText(url.toString());
      setFeedback(call ? "Tautan video dan Call disalin. Call juga muncul di Community." : "Tautan video disalin.");
    } catch {
      setFeedback(`Tautan: ${url.toString()}`);
    }
  };

  const submitComment = (event: React.FormEvent) => {
    event.preventDefault();
    const text = commentDraft.trim();
    if (!text) return;
    state.addComment(commentKey, text);
    setCommentDraft("");
  };

  const confirmChoice = () => {
    if (call && pendingChoice && !chosen) state.selectChoice(call.id, pendingChoice);
    dialogRef.current?.close();
    setPendingChoice(null);
  };

  if (!content.video) return null;

  return (
    <div className={`discover-shell ${sidebarExpanded ? "is-sidebar-expanded" : ""}`}>
      <HiveSidebar active="discover" onExpandedChange={setSidebarExpanded} />

      <main className={`discover-main ${call ? "has-call" : "is-insight"}`}>
        <div className="discover-layout">
          <section className="discover-story" aria-label="Informasi video">
            <div className="discover-story-top"><span className="discover-wordmark">HIVE<span>.</span></span><span className="discover-feed-label">DISCOVER</span></div>
            <div className="discover-story-bottom">
              <div className="discover-author"><span className="discover-author-mark" aria-hidden="true">X</span><div><strong>{content.creator}</strong><span>{content.handle}</span></div></div>
              <h1>{content.title}</h1>
              <p>{content.description}</p>
              <div className="discover-story-meta"><span>{call ? "Punya Call · Demo" : "Insight"}</span><span aria-hidden="true">·</span><span>{content.category}</span></div>
              <div className="discover-attribution">Rekaman: <a href={content.video.sourceUrl} target="_blank" rel="noreferrer">{content.video.author} <ExternalLink size={12} aria-hidden="true" /></a> · <a href={content.video.licenseUrl} target="_blank" rel="noreferrer">{content.video.license}</a> · dipotong untuk format vertikal</div>
            </div>
          </section>

          <section className="discover-player-column" aria-label={`Video ${content.title}`}>
            <div className="discover-player">
              <video
                key={content.id}
                ref={videoRef}
                src={content.video.src}
                autoPlay
                muted={muted}
                playsInline
                loop
                preload="auto"
                style={{ objectPosition: content.video.cropPosition }}
                onLoadedData={() => { setLoading(false); if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) videoRef.current?.pause(); }}
                onCanPlay={() => setLoading(false)}
                onPlaying={() => setPlaying(true)}
                onTimeUpdate={() => { if (loading && (videoRef.current?.readyState ?? 0) >= 2) setLoading(false); if (!playing && !videoRef.current?.paused) setPlaying(true); }}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onError={() => { setMediaError(true); setLoading(false); setPlaying(false); }}
                aria-label={`Gameplay: ${content.title}`}
              />
              {loading && !mediaError && <div className="discover-media-state" role="status">Memuat video…</div>}
              {mediaError && <div className="discover-media-state" role="alert"><strong>Video gagal dimuat.</strong><button type="button" onClick={() => { setMediaError(false); setLoading(true); videoRef.current?.load(); void videoRef.current?.play().catch(() => setPlaying(false)); }}>Coba lagi</button></div>}
              {!playing && !loading && !mediaError && <button type="button" className="discover-big-play" onClick={togglePlayback} aria-label="Putar video"><Play size={30} fill="currentColor" /></button>}
              <div className="discover-player-top"><span>HIVE / DEMO</span><span>{activeIndex + 1} / {feed.length}</span></div>
              <div className="discover-player-bottom"><span>{call ? "CALL TERKAIT" : "INSIGHT"}</span><span>{content.video.hasAudio ? muted ? "TANPA SUARA" : "SUARA AKTIF" : "KLIP TANPA AUDIO"}</span></div>
            </div>
          </section>

          <div className="discover-actions" role="group" aria-label="Kontrol video">
            <button type="button" onClick={togglePlayback} aria-label={playing ? "Jeda video" : "Putar video"} title={playing ? "Jeda" : "Putar"}>{playing ? <Pause size={24} /> : <Play size={24} />}</button>
            <button type="button" onClick={toggleMute} disabled={!content.video.hasAudio} aria-label={content.video.hasAudio ? muted ? "Aktifkan suara" : "Matikan suara" : "Video sumber tanpa audio"} title={content.video.hasAudio ? muted ? "Aktifkan suara" : "Matikan suara" : "Video sumber tanpa audio"}>{muted ? <VolumeX size={24} /> : <Volume2 size={24} />}</button>
            <button type="button" onClick={() => { setPanel("comments"); setDrawerOpen(true); }} aria-label={`Buka ${comments.length} komentar`} title="Komentar"><MessageCircle size={24} /><span>{comments.length}</span></button>
            <button type="button" onClick={() => void share()} aria-label="Bagikan video" title="Bagikan"><Share2 size={24} /></button>
            {call && <button ref={callShortcutRef} type="button" className="discover-call-shortcut" onClick={() => { setPanel("call"); setCallPanelOpen(true); setDrawerOpen(true); }} aria-label="Buka Call" title="Buka Call"><TrendingUp size={24} /><span>Call</span></button>}
            <div className="discover-compact-stepper"><button type="button" onClick={() => navigate(-1)} disabled={activeIndex === 0} aria-label="Video sebelumnya"><ArrowUp size={20} /></button><button type="button" onClick={() => navigate(1)} disabled={activeIndex === feed.length - 1} aria-label="Video berikutnya"><ArrowDown size={20} /></button></div>
          </div>

          <aside className={`discover-aside ${drawerOpen ? "drawer-open" : ""} ${!showAside ? "is-hidden" : ""}`} aria-label={panel === "comments" ? "Komentar" : "Prediksi"}>
            <div className="discover-aside-top"><span>{call ? "GAMING / HIVE" : "GAMING / INSIGHT"}</span><div className="discover-stepper"><button type="button" onClick={() => navigate(-1)} disabled={activeIndex === 0} aria-label="Video sebelumnya"><ArrowUp size={19} /></button><button type="button" onClick={() => navigate(1)} disabled={activeIndex === feed.length - 1} aria-label="Video berikutnya"><ArrowDown size={19} /></button></div>{(panel === "comments" || drawerOpen || (call && callPanelOpen)) && <button type="button" className="discover-drawer-close" onClick={() => { if (panel === "call") { setCallPanelOpen(false); callShortcutRef.current?.focus(); } setDrawerOpen(false); setPanel("call"); }} aria-label={panel === "call" ? "Tutup Call" : "Tutup komentar"} title={panel === "call" ? "Tutup Call" : "Tutup komentar"}><X size={20} /></button>}</div>
            {panel === "comments" ? <div className="discover-side-content discover-comments"><div className="discover-side-heading"><span>PERCAKAPAN</span><h2>Komentar <small>{comments.length}</small></h2></div><div className="discover-comment-list">{comments.length ? comments.map((item) => <div className="discover-comment" key={item.id}><span className="discover-comment-avatar">{item.name.slice(0, 1).toUpperCase()}</span><div><div><strong>{item.name}</strong><time>{item.createdAt}</time></div><p>{item.text}</p></div></div>) : <p className="discover-comment-empty">Belum ada komentar. Mulai percakapan tentang video ini.</p>}</div><form className="discover-comment-form" onSubmit={submitComment}><label htmlFor="discover-comment-input">Tambahkan komentar</label><div><input id="discover-comment-input" value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} placeholder="Tulis pendapatmu…" maxLength={500} /><button type="submit" disabled={!commentDraft.trim()} aria-label="Kirim komentar"><Send size={18} /></button></div><small>Komentar demo tersimpan di browser ini.</small></form>{call && <button type="button" className="discover-back-call" onClick={() => setPanel("call")}>Kembali ke prediksi <ChevronRight size={16} /></button>}</div> : call ? (
              <div className="discover-side-content discover-call-panel">
                <div className="discover-side-heading">
                  <span>PREDIKSI · {call.horizonHours} JAM</span>
                  <h2>{formatCount(call.targetViews)} <small>views</small></h2>
                  <p>Tembus dalam {call.horizonHours} jam?</p>
                </div>
                <div className="discover-call-question">
                  <span className="discover-call-status"><span />{call.status === "open" ? "Pilihan terbuka" : call.status === "resolved" ? "Hasil tersedia" : "Pilihan ditutup"} · Demo</span>
                  <p className="discover-call-baseline">Mulai dari <strong>{formatCount(call.baselineViews)}</strong> views</p>
                  <p className="discover-call-deadline">Pilih sebelum {formatTime(call.scheduledClosesAt)}</p>
                </div>
                {call.status === "open" && !chosen ? (
                  <div className="discover-choices">
                    <button type="button" onClick={() => setPendingChoice("yes")}><strong>Ya, tembus</strong><ChevronRight size={19} /></button>
                    <button type="button" onClick={() => setPendingChoice("no")}><strong>Tidak</strong><ChevronRight size={19} /></button>
                  </div>
                ) : chosen ? (
                  <div className="discover-choice-result" role="status"><Check size={19} /><div><strong>Pilihan demo: {chosen.choice === "yes" ? "Ya" : "Tidak"}</strong><p>{chosen.status === "pending" ? "Memproses simulasi…" : "Tersimpan di browser ini. Bukan transaksi Monad."}</p></div></div>
                ) : (
                  <Link href={call.status === "resolved" ? "/results/" + call.id : "/calls/" + call.id} className="discover-call-link">{call.status === "resolved" ? "Lihat hasil demo" : "Lihat detail Call"}<ChevronRight size={17} /></Link>
                )}
                <p className="discover-demo-note">Angka prediksi ini simulasi, bukan metrik video sumber.</p>
                <Link href={"/calls/" + call.id} className="discover-detail-link">Lihat aturan lengkap <ChevronRight size={16} /></Link>
              </div>
            ) : <div className="discover-insight-note"><span>INSIGHT</span><p>Video ini untuk ditonton dan dibicarakan. Tidak ada prediksi terkait.</p></div>}
          </aside>
        </div>
        <div className="discover-feedback" aria-live="polite">{feedback}</div>
      </main>

      <dialog ref={dialogRef} className="discover-confirm" onClose={() => setPendingChoice(null)} onCancel={() => setPendingChoice(null)} aria-labelledby="discover-confirm-title"><span>DEMO INTERAKTIF</span><h2 id="discover-confirm-title">Pilih {pendingChoice === "yes" ? "Ya" : "Tidak"}?</h2><p>Pilihan ini hanya tersimpan di browser. Tidak ada wallet, tanda tangan, atau transaksi Monad.</p><div><button type="button" onClick={() => { dialogRef.current?.close(); setPendingChoice(null); }}>Batal</button><button type="button" onClick={confirmChoice}>Konfirmasi pilihan demo</button></div></dialog>
    </div>
  );
}
