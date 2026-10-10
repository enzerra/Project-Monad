"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Bookmark,
  ChevronUp,
  ChevronRight,
  ExternalLink,
  MessageCircle,
  Heart,
  Menu,
  Pause,
  Play,
  Send,
  Share2,
  TrendingUp,
  X,
} from "lucide-react";
import { formatCount, formatTime, type Choice, type Content } from "@/lib/demo-data";
import type { YoutubeFeedItem } from "@/lib/server/youtube";
import type { UploadedContent } from "@/lib/source-calls";
import { HiveSidebar } from "@/components/hive-sidebar";
import { YoutubePlayer, type YoutubePlayerHandle } from "@/components/youtube-player";
import { LiveVideoViews } from "@/components/live-video-views";
import { SourceCallProgress, SourceCallOutcome } from "@/components/source-call-progress";
import { AuthControl } from "@/components/auth-control";
import { useAccountAuth } from "@/components/auth-provider";
import { VirtualAmount, VirtualBalance, type VirtualAccount } from "@/components/virtual-wallet";
import { validateVirtualAmount, VIRTUAL_TOKEN } from "@/lib/virtual-token";
import "./discover-viewer.css";
import "./discover-mobile.css";
import "./discover-refined.css";

type ViewerState = VirtualAccount & {
  comments: { id: string; callId: string; name: string; text: string; createdAt: string }[];
  shareCall: (callId: string) => void;
  addComment: (callId: string, text: string) => void;
};

type DiscoverViewerProps = { state: ViewerState; initialVideoId?: string; youtubeFeed?: YoutubeFeedItem[]; uploads?: UploadedContent[] };

function DiscoverDisclosure({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const id = useId();
  return <div className="discover-disclosure">
    <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>{label}<ChevronRight size={15} aria-hidden="true" /></button>
    <AnimatePresence initial={false}>{open && <motion.div id={id} className="discover-disclosure-body" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reduceMotion ? 0 : .24, ease: [.22, 1, .36, 1] }}><div>{children}</div></motion.div>}</AnimatePresence>
  </div>;
}

export function DiscoverViewer(props: DiscoverViewerProps) {
  if (!props.youtubeFeed?.length && !props.uploads?.length) return <DiscoverEmptyFeed />;
  return <DiscoverVideoFeed {...props} youtubeFeed={props.youtubeFeed ?? []} />;
}

function DiscoverEmptyFeed() {
  const [expanded, setExpanded] = useState(false);
  return <div className={`discover-shell hive-theme viewer-standard ${expanded ? "is-sidebar-expanded" : ""}`}>
    <HiveSidebar active="discover" onExpandedChange={setExpanded} />
    <main className="discover-main"><section className="discover-empty-feed" role="status">
      <h1>Shorts are unavailable right now</h1>
      <p>Try again, or explore Calls and Community.</p>
      <button type="button" onClick={() => window.location.reload()}>Try again</button>
    </section></main>
  </div>;
}

function DiscoverVideoFeed({ state, initialVideoId, youtubeFeed, uploads = [] }: DiscoverViewerProps & { youtubeFeed: YoutubeFeedItem[] }) {
  const auth = useAccountAuth();
  const reduceMotion = useReducedMotion();
  const feed = useMemo<Content[]>(() => [...youtubeFeed, ...uploads], [youtubeFeed, uploads]);
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, feed.findIndex((item) => item.id === initialVideoId)));
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mediaError, setMediaError] = useState(false);
  const [playerAttempt, setPlayerAttempt] = useState(0);
  const [panel, setPanel] = useState<"call" | "comments">("call");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [likedVideos, setLikedVideos] = useState<string[]>([]);
  const [savedVideos, setSavedVideos] = useState<string[]>([]);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [callPanelOpen, setCallPanelOpen] = useState(true);
  const [transitionDirection, setTransitionDirection] = useState<-1 | 0 | 1>(0);
  const [amount, setAmount] = useState<number>(VIRTUAL_TOKEN.defaultAmount);
  const [submittingChoice, setSubmittingChoice] = useState(false);
  const [choiceError, setChoiceError] = useState("");
  const [pendingChoice, setPendingChoice] = useState<Choice | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [feedback, setFeedback] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const youtubeRef = useRef<YoutubePlayerHandle>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const callShortcutRef = useRef<HTMLButtonElement>(null);
  const callPeekRef = useRef<HTMLButtonElement>(null);
  const swipeStartRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const lastSwipeRef = useRef(0);
  const activeContentRef = useRef(feed[activeIndex]?.id);

  const content = feed[activeIndex];
  const isYoutube = content.video?.provider === "youtube";
  const youtubeStats = youtubeFeed.find((item) => item.id === content.id);
  const call = state.calls?.find((item) => item.contentId === content.id && item.status !== "void" && item.status !== "resolved") ?? state.calls?.findLast((item) => item.contentId === content.id);
  const chosen = call ? state.choices.find((item) => item.callId === call.id) : undefined;
  const commentKey = call?.id ?? `content:${content.id}`;
  const comments = state.comments.filter((item) => item.callId === commentKey);
  const showAside = panel === "comments" || Boolean(call && callPanelOpen);

  useEffect(() => { activeContentRef.current = content.id; }, [content.id]);

  useEffect(() => {
    const syncFromUrl = () => {
      const id = new URLSearchParams(window.location.search).get("video");
      const found = feed.findIndex((item) => item.id === id);
      const nextIndex = found >= 0 ? found : 0;
      if (found < 0) {
        const url = new URL(window.location.href);
        url.searchParams.set("video", feed[nextIndex].id);
        window.history.replaceState(null, "", url);
      }
      if (feed[nextIndex].id !== activeContentRef.current) {
        videoRef.current?.pause();
        youtubeRef.current?.pause();
        setLoading(true);
        setPlaying(false);
      }
      setMediaError(false);
      setCallPanelOpen(true);
      setPanel("call");
      setDrawerOpen(false);
      setMobileNavOpen(false);
      setTransitionDirection(0);
      setActiveIndex(nextIndex);
    };
    queueMicrotask(syncFromUrl);
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, [feed]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) { videoRef.current?.pause(); youtubeRef.current?.pause(); }
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
    videoRef.current?.pause();
    youtubeRef.current?.pause();
    const url = new URL(window.location.href);
    url.searchParams.set("video", feed[next].id);
    window.history.pushState(null, "", url);
    setLoading(true);
    setMediaError(false);
    setPanel("call");
    setCallPanelOpen(true);
    setDrawerOpen(false);
    setMobileNavOpen(false);
    setTransitionDirection(direction);
    setFeedback("");
    setPlaying(false);
    setMuted(false);
    setActiveIndex(next);
  }, [activeIndex, feed]);

  const openPanel = (nextPanel: "call" | "comments") => {
    videoRef.current?.pause();
    youtubeRef.current?.pause();
    setPlaying(false);
    setPanel(nextPanel);
    if (nextPanel === "call") setCallPanelOpen(true);
    setDrawerOpen(true);
    setMobileNavOpen(false);
  };

  const closePanel = () => {
    setDrawerOpen(false);
    setPanel("call");
    setCallPanelOpen(false);
    window.requestAnimationFrame(() => {
      if (window.matchMedia("(max-width: 780px)").matches) callPeekRef.current?.focus();
      else callShortcutRef.current?.focus();
    });
  };

  const onPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (!window.matchMedia("(max-width: 780px)").matches || drawerOpen || pendingChoice ||
        !event.isPrimary || event.button !== 0 ||
        (event.target as HTMLElement).closest("button, a, input, textarea, select, dialog, .discover-aside")) {
      swipeStartRef.current = null;
      return;
    }
    swipeStartRef.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLElement>) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start || start.pointerId !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dy) >= 58 && Math.abs(dy) > Math.abs(dx) * 1.35) {
      lastSwipeRef.current = Date.now();
      navigate(dy < 0 ? 1 : -1);
    }
  };

  const onWheel = (event: React.WheelEvent<HTMLElement>) => {
    if (!window.matchMedia("(max-width: 780px)").matches || drawerOpen || pendingChoice ||
        (event.target as HTMLElement).closest("input, textarea, select, dialog, .discover-aside") ||
        Math.abs(event.deltaY) < 35 || Math.abs(event.deltaY) <= Math.abs(event.deltaX) ||
        Date.now() - lastSwipeRef.current < 550) return;
    lastSwipeRef.current = Date.now();
    navigate(event.deltaY > 0 ? 1 : -1);
  };

  const togglePlayback = useCallback(() => {
    if (isYoutube) { if (muted || !playing) youtubeRef.current?.playWithSound(); else youtubeRef.current?.pause(); return; }
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => setFeedback("Could not play this video. Try reloading."));
    else video.pause();
  }, [isYoutube, muted, playing]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (pendingChoice || target?.closest("input, textarea, dialog")) return;
      if (event.key === "Escape") { setDrawerOpen(false); setMobileNavOpen(false); return; }
      if (drawerOpen) return;
      if (event.key === "ArrowDown") { event.preventDefault(); navigate(1); }
      if (event.key === "ArrowUp") { event.preventDefault(); navigate(-1); }
      if (event.key === " " && !target?.closest("button, a")) { event.preventDefault(); togglePlayback(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate, pendingChoice, togglePlayback, drawerOpen]);

  const share = async () => {
    const url = new URL(window.location.href);
    url.pathname = "/";
    url.searchParams.set("video", content.id);
    if (call) state.shareCall(call.id);
    try {
      await navigator.clipboard.writeText(url.toString());
      setFeedback(call ? "Link copied. Your Call is in Community." : "Video link copied.");
    } catch {
      setFeedback(`Link: ${url.toString()}`);
    }
  };

  const submitComment = (event: React.FormEvent) => {
    event.preventDefault();
    const text = commentDraft.trim();
    if (!text) return;
    state.addComment(commentKey, text);
    setCommentDraft("");
  };

  const requestChoice = (choice: Choice) => {
    if (auth.configured && !auth.authenticated) { auth.login(); return; }
    if (!state.walletReady || state.balance < VIRTUAL_TOKEN.minAmount) return;
    setChoiceError("");
    setPendingChoice(choice);
  };

  const confirmChoice = async () => {
    if (!call || !pendingChoice || chosen || submittingChoice) return;
    if (auth.configured && !auth.authenticated) { dialogRef.current?.close(); setPendingChoice(null); auth.login(); return; }
    setSubmittingChoice(true);
    setChoiceError("");
    const result = await state.selectChoice(call.id, pendingChoice, amount);
    setSubmittingChoice(false);
    if (!result.ok) { setChoiceError(result.error); return; }
    dialogRef.current?.close();
    setPendingChoice(null);
  };

  const onYoutubeReady = useCallback(() => setLoading(false), []);
  const onYoutubePlayingChange = useCallback((value: boolean) => setPlaying(value), []);
  const onYoutubeMutedChange = useCallback((value: boolean) => setMuted(value), []);
  const onYoutubeError = useCallback(() => { setMediaError(true); setLoading(false); setPlaying(false); }, []);

  if (!content.video) return null;

  return (
    <div className={`discover-shell hive-theme viewer-standard ${isYoutube ? "is-youtube-video" : "is-local-video"} ${call ? "has-mobile-call" : ""} ${sidebarExpanded ? "is-sidebar-expanded" : ""} ${drawerOpen ? "is-drawer-open" : ""}`} data-direction={transitionDirection}>
      <HiveSidebar active="discover" onExpandedChange={setSidebarExpanded} />
      {mobileNavOpen && <nav className="discover-mobile-menu" aria-label="VIBE navigation"><Link href="/discover">Discover</Link><Link href="/predictions">Calls</Link><Link href="/upload">Upload</Link><Link href="/community">Community</Link><Link href="/profile">Profile</Link><button type="button" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation"><X size={20} /></button></nav>}
      {call && <div className="discover-call-dock">
        <motion.button ref={callPeekRef} type="button" className="discover-call-peek" aria-label={`Open Call: ${call.question}`} aria-expanded={drawerOpen && panel === "call"} aria-controls="discover-call-sheet" onClick={() => openPanel("call")} drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={0.15} dragMomentum={false} onDragEnd={(_, info) => { if (info.offset.y < -28 || info.velocity.y < -250) openPanel("call"); }}>
          <span className="discover-peek-handle" aria-hidden="true" /><TrendingUp size={22} aria-hidden="true" /><span className="discover-peek-copy"><small>CALL · {call.horizonHours} HOURS</small><strong>Will it reach {formatCount(call.targetViews)} views?</strong></span><ChevronUp size={20} aria-hidden="true" />
        </motion.button>
        <button type="button" className="discover-dock-menu" onClick={() => setMobileNavOpen(!mobileNavOpen)} aria-expanded={mobileNavOpen} aria-label="Open VIBE navigation"><Menu size={21} /><span>Menu</span></button>
      </div>}

      <main className={`discover-main ${call ? "has-call" : "is-insight"}`} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => { swipeStartRef.current = null; }} onWheel={onWheel}>
        <div className="discover-layout">
          {youtubeStats && <LiveVideoViews key={content.id} videoId={youtubeStats.video.videoId} initialViews={youtubeStats.youtubeViews} initialObservedAt={youtubeStats.observedAt} />}
          {isYoutube && <div className="discover-swipe-area" aria-label="Swipe up or down to change video" role="region" />}
          <section className="discover-story" aria-label="Video information">
            <div className="discover-story-top"><VirtualBalance account={state} /></div>
            <motion.div className="discover-story-bottom" key={`story-${content.id}`} initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .35, ease: [.22, 1, .36, 1] }}>
              <div className="discover-author"><span className="discover-author-mark" aria-hidden="true">{content.creator.slice(0, 1).toUpperCase()}</span><div><strong>{content.creator}</strong><span>{isYoutube ? content.category.split(" · ")[0] : content.category}</span></div></div>
              <h1>{content.title.replace(/\s*#\S+/g, "").trim() || content.title}</h1>
              {content.video.provider === "upload" && (content.description || content.hashtags?.length) && <p className="discover-upload-caption">{content.description}{content.hashtags?.length ? <span>{content.hashtags.map((tag) => `#${tag}`).join(" ")}</span> : null}</p>}
              <div className="discover-story-footer"><a className="discover-source-link" href={content.video.sourceUrl} target="_blank" rel="noreferrer">{isYoutube ? "YouTube Shorts" : "Video source"}<ExternalLink size={12} aria-hidden="true" /></a>
              <DiscoverDisclosure label="About this video">
                {youtubeStats && <p><strong>{formatCount(state.contents?.find((item) => item.id === content.id)?.youtubeViews ?? youtubeStats.youtubeViews)} views</strong><br />Checked {formatTime(state.contents?.find((item) => item.id === content.id)?.observedAt ?? youtubeStats.observedAt)}</p>}
                {content.video.provider === "local" || !content.video.provider ? <p>{content.video.author} · <a href={content.video.licenseUrl} target="_blank" rel="noreferrer">{content.video.license}</a></p> : null}
              </DiscoverDisclosure></div>
            </motion.div>
          </section>

          <section className="discover-player-column" key={`player-${content.id}`} aria-label={`Video ${content.title}`}>
            <div className={`discover-player ${isYoutube ? "is-youtube" : ""}`}>
              {content.video.provider === "youtube" ? <YoutubePlayer key={`${content.id}-${playerAttempt}`} ref={youtubeRef} videoId={content.video.videoId} title={content.title} onReady={onYoutubeReady} onPlayingChange={onYoutubePlayingChange} onMutedChange={onYoutubeMutedChange} onError={onYoutubeError} /> : <video
                key={content.id}
                ref={videoRef}
                src={content.video.src}
                autoPlay
                muted={muted}
                playsInline
                loop
                onClick={() => { if (Date.now() - lastSwipeRef.current > 350) togglePlayback(); }}
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
              />}
              {loading && !mediaError && <div className="discover-media-state" role="status">Loading video…</div>}
              {mediaError && <div className="discover-media-state" role="alert"><strong>Could not load this video.</strong><button type="button" onClick={() => { setMediaError(false); setLoading(true); if (isYoutube) setPlayerAttempt((value) => value + 1); else { videoRef.current?.load(); void videoRef.current?.play().catch(() => setPlaying(false)); } }}>Try again</button><a href={content.video.sourceUrl} target="_blank" rel="noreferrer">Open original video</a></div>}
              {!isYoutube && !playing && !loading && !mediaError && <button type="button" className="discover-big-play" onClick={togglePlayback} aria-label="Play video"><Play size={30} fill="currentColor" /></button>}
              {!isYoutube && <><div className="discover-player-top"><span>{content.video.provider === "upload" ? "VIBE" : "VIBE / DEMO"}</span><span>{activeIndex + 1} / {feed.length}</span></div>
              <div className="discover-player-bottom"><span>{call ? "RELATED CALL" : "INSIGHT"}</span><span>{content.video.hasAudio ? muted ? "MUTED" : "SOUND ON" : "SILENT CLIP"}</span></div></>}
            </div>
          </section>

          <div className="discover-actions" role="group" aria-label="Video controls">
            <span className="discover-mobile-avatar" aria-hidden="true">{content.creator.slice(0, 1).toUpperCase()}</span>
            <button type="button" onClick={togglePlayback} aria-label={isYoutube && muted ? "Play with sound" : playing ? "Pause video" : "Play video"} title={isYoutube && muted ? "Play with sound" : playing ? "Pause" : "Play"}>{playing && !(isYoutube && muted) ? <Pause size={24} /> : <Play size={24} />}</button>
            <button type="button" className="discover-mobile-reaction" aria-label={likedVideos.includes(content.id) ? "Unlike" : "Like video"} aria-pressed={likedVideos.includes(content.id)} onClick={() => setLikedVideos((ids) => ids.includes(content.id) ? ids.filter((id) => id !== content.id) : [...ids, content.id])}><Heart size={30} fill={likedVideos.includes(content.id) ? "#ff4f7c" : "currentColor"} /><span>{likedVideos.includes(content.id) ? "Liked" : "Like"}</span></button>
            <button type="button" onClick={() => openPanel("comments")} aria-label={`Open ${comments.length} comments`} title="Comments"><MessageCircle size={24} /><span>{comments.length}</span></button>
            <button type="button" className="discover-mobile-reaction" aria-label={savedVideos.includes(content.id) ? "Remove saved video" : "Save video"} aria-pressed={savedVideos.includes(content.id)} onClick={() => setSavedVideos((ids) => ids.includes(content.id) ? ids.filter((id) => id !== content.id) : [...ids, content.id])}><Bookmark size={28} fill="currentColor" /><span>{savedVideos.includes(content.id) ? "Saved" : "Save"}</span></button>
            <button type="button" onClick={() => void share()} aria-label="Share video" title="Share"><Share2 size={24} /></button>
            {call && <button ref={callShortcutRef} type="button" className="discover-call-shortcut" onClick={() => openPanel("call")} aria-label="Open Call" title="Open Call"><TrendingUp size={24} /><span>Call</span></button>}
            <div className="discover-compact-stepper"><button type="button" onClick={() => navigate(-1)} disabled={activeIndex === 0} aria-label="Previous video"><ArrowUp size={20} /></button><button type="button" onClick={() => navigate(1)} disabled={activeIndex === feed.length - 1} aria-label="Next video"><ArrowDown size={20} /></button></div>
          </div>

          <aside id="discover-call-sheet" className={`discover-aside ${drawerOpen ? "drawer-open" : ""} ${!showAside ? "is-hidden" : ""}`} aria-label={panel === "comments" ? "Comments" : "Calls"}>
            <motion.button type="button" className="discover-sheet-handle" aria-label="Collapse panel" onClick={closePanel} drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={0.15} dragMomentum={false} onDragEnd={(_, info) => { if (info.offset.y > 28 || info.velocity.y > 250) closePanel(); }}><span /></motion.button>
            <div className="discover-aside-top"><span>{panel === "comments" ? "Conversation" : "Calls"}</span><div className="discover-stepper"><button type="button" onClick={() => navigate(-1)} disabled={activeIndex === 0} aria-label="Previous video"><ArrowUp size={19} /></button><button type="button" onClick={() => navigate(1)} disabled={activeIndex === feed.length - 1} aria-label="Next video"><ArrowDown size={19} /></button></div>{(panel === "comments" || drawerOpen || (call && callPanelOpen)) && <button type="button" className="discover-drawer-close" onClick={closePanel} aria-label={panel === "call" ? "Close Call" : "Close comments"} title={panel === "call" ? "Close Call" : "Close comments"}><X size={20} /></button>}</div>
            {panel === "comments" ? <div className="discover-side-content discover-comments"><div className="discover-side-heading"><span>CONVERSATION</span><h2>Comments <small>{comments.length}</small></h2></div><div className="discover-comment-list">{comments.length ? comments.map((item) => <div className="discover-comment" key={item.id}><span className="discover-comment-avatar">{item.name.slice(0, 1).toUpperCase()}</span><div><div><strong>{item.name}</strong><time>{item.createdAt}</time></div><p>{item.text}</p></div></div>) : <p className="discover-comment-empty">Be the first to say something.</p>}</div><form className="discover-comment-form" onSubmit={submitComment}><label htmlFor="discover-comment-input">Add a comment</label><div><input id="discover-comment-input" value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} placeholder="Add a comment…" maxLength={500} /><button type="submit" disabled={!commentDraft.trim()} aria-label="Post comment"><Send size={18} /></button></div><small>Comments stay in this browser.</small></form>{call && <button type="button" className="discover-back-call" onClick={() => setPanel("call")}>Back to Calls <ChevronRight size={16} /></button>}</div> : call ? (
              <motion.div className="discover-side-content discover-call-panel" key={`call-${call.id}`} initial={reduceMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4, ease: [.22, 1, .36, 1] }}>
                <div className="discover-call-topline"><span className="discover-call-status"><span />{call.status === "open" ? "Open" : call.status === "resolved" ? "Completed" : call.status === "void" ? "Cancelled" : "Closed"}</span><span>{call.horizonHours} h</span></div>
                <div className="discover-side-heading">
                  <h2><span>Will it reach</span>{formatCount(call.targetViews)}<small>views?</small></h2>
                </div>
                <div className="discover-call-question">
                  <SourceCallProgress call={call} serverNow={state.serverNow} compact />
                  <SourceCallOutcome call={call} chosen={chosen} compact />
                </div>
                {call.status === "open" && !chosen ? (
                  <div className="discover-choices">
                    <motion.button type="button" whileTap={reduceMotion ? undefined : { scale: .97 }} disabled={!auth.ready || (!state.loginRequired && (!state.walletReady || state.balance < VIRTUAL_TOKEN.minAmount))} onClick={() => requestChoice("yes")}><strong>Yes</strong><ChevronRight size={19} aria-hidden="true" /></motion.button>
                    <motion.button type="button" whileTap={reduceMotion ? undefined : { scale: .97 }} disabled={!auth.ready || (!state.loginRequired && (!state.walletReady || state.balance < VIRTUAL_TOKEN.minAmount))} onClick={() => requestChoice("no")}><strong>No</strong><ChevronRight size={19} aria-hidden="true" /></motion.button>
                  </div>
                ) : chosen ? (
                  <div className="discover-choice-result" role="status"><Check size={19} aria-hidden="true" /><div><strong>Your choice: {chosen.choice === "yes" ? "Yes" : "No"}</strong><p>{formatCount(chosen.amount)} VIBE</p></div></div>
                ) : null}
                {state.loginRequired && <div className="call-login-prompt"><p>Sign in to make your Call.</p><AuthControl /></div>}
                {call.status === "open" && !chosen && state.walletReady && state.balance < VIRTUAL_TOKEN.minAmount && <p className="virtual-error" role="status">Not enough VIBE. Choose a smaller amount.</p>}
                <DiscoverDisclosure label="Rules & details">
                  <p>Correct: 2× return, including your amount. Incorrect: your amount is spent. Free VIBE, no cash value.</p>
                  <dl><div><dt>Entries close</dt><dd>{formatTime(call.closesAt)}</dd></div><div><dt>Start</dt><dd>{formatCount(call.baselineViews)} views</dd></div><div><dt>YouTube data</dt><dd>{formatTime(call.observedAt)}</dd></div></dl>
                  <Link href={"/calls/" + call.id} className="discover-detail-link">{call.proof ? "Proof & rules" : "Full rules"}<ChevronRight size={16} aria-hidden="true" /></Link>
                </DiscoverDisclosure>
              </motion.div>
            ) : <div className="discover-insight-note"><span>INSIGHT</span><p>Enjoy the video. No Call attached.</p></div>}
          </aside>
        </div>
        <div className="discover-feedback" aria-live="polite">{feedback}</div>
      </main>

      <dialog ref={dialogRef} className="discover-confirm" onClose={() => setPendingChoice(null)} onCancel={() => setPendingChoice(null)} aria-labelledby="discover-confirm-title"><span>CONFIRM CALL</span><h2 id="discover-confirm-title">Choose {pendingChoice === "yes" ? "Yes" : "No"}?</h2><p>Your choice locks on confirmation. Correct: 2× return. Incorrect: your amount is spent. No cash value.</p><VirtualAmount account={state} amount={amount} onChange={setAmount} disabled={submittingChoice} /><p className="virtual-confirm-summary"><span>Balance after this Call</span><strong>{Number.isFinite(amount) ? formatCount(Math.max(0, state.balance - amount)) : "—"} VIBE</strong></p>{choiceError && <p className="virtual-error" role="alert">{choiceError}</p>}<div><button type="button" onClick={() => { dialogRef.current?.close(); setPendingChoice(null); }}>Cancel</button><button type="button" disabled={submittingChoice || !state.walletReady || Boolean(validateVirtualAmount(amount, state.balance))} onClick={() => void confirmChoice()}>{submittingChoice ? "Saving…" : "Confirm Call"}</button></div></dialog>
    </div>
  );
}
