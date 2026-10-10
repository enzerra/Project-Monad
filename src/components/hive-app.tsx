"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  ExternalLink,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import {
  findCall,
  findContent,
  formatCount,
  formatTime,
  type Call,
  type Content,
} from "@/lib/demo-data";
import { DiscoverViewer } from "@/components/discover-viewer";
import { PredictionsPage } from "@/components/predictions-page";
import { FootballDetail } from "@/components/football-calls";
import { CommunityPage } from "@/components/community-page";
import { ProductShell } from "@/components/product-shell";
import { CallDetailSimple as CallDetail } from "@/components/call-detail-simple";
import { PredictionSubject } from "@/components/prediction-subject";
import { useVirtualWallet } from "@/components/use-virtual-wallet";
import { ProfilePage } from "@/components/profile-page";
import { UploadPage } from "@/components/upload-page";
import type { UploadedContent } from "@/lib/source-calls";

type Comment = { id: string; callId: string; name: string; text: string; createdAt: string };


const initialComments: Comment[] = [
  { id: "c1", callId: "rush-views", name: "raka", text: "Great clip. Could this be the next big moment?", createdAt: "12m ago" },
  { id: "c2", callId: "rush-views", name: "lina", text: "Great gameplay. The Call figures are an example scenario.", createdAt: "8m ago" },
  { id: "c3", callId: "speedrun-views", name: "dimas", text: "It made it. Nice Call from the early viewers.", createdAt: "1h ago" },
];

function useDemoState() {
  const virtualAccount = useVirtualWallet();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [sharedCallIds, setSharedCallIds] = useState<string[]>(["rush-views", "speedrun-views"]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const savedComments = localStorage.getItem("hive-demo-comments");
        const savedShares = localStorage.getItem("hive-demo-shares");
        if (savedComments) setComments(JSON.parse(savedComments));
        if (savedShares) setSharedCallIds(JSON.parse(savedShares));
      } catch {
        // The demo remains usable when local storage is unavailable.
      }
      setReady(true);
    });
  }, []);

  useEffect(() => { if (ready) { try { localStorage.setItem("hive-demo-comments", JSON.stringify(comments)); } catch { /* Keep the current conversation usable when storage is blocked. */ } } }, [comments, ready]);
  useEffect(() => { if (ready) { try { localStorage.setItem("hive-demo-shares", JSON.stringify(sharedCallIds)); } catch { /* Sharing remains available for this session. */ } } }, [sharedCallIds, ready]);

  const shareCall = (callId: string) => setSharedCallIds((current) => current.includes(callId) ? current : [...current, callId]);
  const addComment = (callId: string, text: string) => setComments((current) => [...current, { id: crypto.randomUUID(), callId, name: "you", text, createdAt: "just now" }]);
  return { ...virtualAccount, comments, sharedCallIds, shareCall, addComment };
}

function Media({ content, large = false }: { content: Content; large?: boolean }) {
  const className = `source-preview reference-panel ${large ? "is-large" : ""}`;
  const preview = <><span className="overline">SOURCE VIDEO</span><PredictionSubject contentId={content.id} /><strong>{content.title}</strong></>;
  if (!content.video) return <div className={className}>{preview}<span className="source-preview-play">Source video unavailable</span></div>;
  if (content.video.provider !== "youtube") return <a href={content.video.sourceUrl} target="_blank" rel="noreferrer" className={className} aria-label={`View source ${content.title}`}>{preview}<span className="source-preview-play">Watch original video <ExternalLink size={18} /></span></a>;
  return <Link href={`/discover?video=${content.id}`} className={className} aria-label={`Play ${content.title}`}>{preview}<span className="source-preview-play">Play in Discover <ArrowRight size={18} /></span></Link>;
}

function StatusBadge({ status }: { status: Call["status"] }) {
  const labels: Record<Call["status"], string> = { open: "Open Call", pending: "Awaiting confirmation", locked: "Choice locked", closed: "Closed", revealing: "Revealing", resolved: "Result ready", void: "Call void" };
  return <span className={`status-badge status-${status}`}><span className="status-dot" />{labels[status]}</span>;
}

function ContentDetail({ id }: { id: string }) {
  const content = findContent(id);
  if (!content) return <NotFound />;
  const call = content.callId ? findCall(content.callId) : undefined;
  return <main className="section-wrap detail-main"><Link href="/discover" className="back-link"><ArrowLeft size={17} /> Back to Discover</Link><div className="detail-grid"><div><Media content={content} large /><div className="source-note"><ShieldCheck size={17} /><span>Watch the original video in Discover.</span></div></div><div className="detail-copy"><p className="overline">{content.category.toUpperCase()}</p><h1>{content.title}</h1><div className="detail-author"><span className="creator-avatar">{content.creator.slice(0, 1)}</span><span><strong>{content.creator}</strong><small>{content.handle}</small></span></div><p className="detail-description">{content.description}</p>{call ? <div className="attached-call"><div className="attached-call-head"><span>RELATED CALL</span><StatusBadge status={call.status} /></div><h2>{call.question}</h2><p>Baseline {formatCount(call.baselineViews)} → target {formatCount(call.targetViews)} views</p><Link href={call.status === "resolved" ? `/results/${call.id}` : `/calls/${call.id}`} className="button button-primary">{call.status === "resolved" ? "View result" : "Explore Calls"}<ArrowRight size={17} /></Link></div> : <div className="insight-notice"><Sparkles size={19} /><div><strong>Just a moment</strong><p>No Call attached. Save it or start a conversation.</p></div></div>}<div className="content-actions"><button type="button" onClick={() => alert("Saved in this browser.")}><Bookmark size={18} /> Save</button><Link href="/community"><MessageCircle size={18} /> Open Community</Link></div></div></div></main>;
}

function Result({ id }: { id: string }) {
  const call = findCall(id);
  if (!call) return <NotFound />;
  const content = findContent(call.contentId)!;
  const resolved = call.status === "resolved";
  return <main className="section-wrap detail-main"><Link href={`/calls/${call.id}`} className="back-link"><ArrowLeft size={17} /> Back to Call</Link><div className="result-wrap"><div className="result-intro"><p className="overline">RESULT / PROOF</p><StatusBadge status={call.status} /><h1>{resolved ? "The result is in." : "Result pending."}</h1><p>{call.question}</p>{resolved && <div className="result-answer"><span>RESULT</span><strong>{call.result === "yes" ? "YES" : "NO"}</strong><p>Example view count: {formatCount(call.currentViews)} views</p></div>}</div><div className="proof-card"><div className="proof-head"><ShieldCheck size={21} /><span>PROOF & SOURCE</span></div><div className="proof-row"><span>Content</span><Link href={`/content/${content.id}`}>{content.title} <ExternalLink size={14} /></Link></div><div className="proof-row"><span>Baseline</span><strong>{formatCount(call.baselineViews)} views</strong></div><div className="proof-row"><span>Target</span><strong>{formatCount(call.targetViews)} views</strong></div><div className="proof-row"><span>Evaluation time</span><strong>{formatTime(call.evaluationAt)}</strong></div><div className="proof-row"><span>Planned source</span><strong>YouTube Data API</strong></div><div className="proof-row"><span>YouTube snapshot</span><strong>Not available</strong></div><div className="proof-row"><span>Monad transaction</span><strong>Not available</strong></div><div className="proof-warning"><ShieldCheck size={18} /><p>This is an <strong>example scenario</strong>, without live YouTube or Monad proof.</p></div></div></div></main>;
}

function Profile({ state, uploads }: { state: ReturnType<typeof useDemoState>; uploads: UploadedContent[] }) {
  return <ProfilePage account={state} initialUploads={uploads} />;
}
function NotFound() { return <main className="section-wrap not-found"><X size={30} /><h1>Page not found.</h1><Link href="/discover" className="button button-primary">Back to Discover</Link></main>; }

function HiveAppContent({ initialVideoId, youtubeFeed = [], uploads = [] }: { initialVideoId?: string; youtubeFeed?: import("@/lib/server/youtube").YoutubeFeedItem[]; uploads?: UploadedContent[] }) {
  const path = usePathname() || "/";
  const state = useDemoState();
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0 || parts[0] === "discover") return <DiscoverViewer state={state} initialVideoId={initialVideoId} youtubeFeed={youtubeFeed} uploads={uploads} />;
  if (parts[0] === "predictions") return <PredictionsPage choices={state.choices} account={state} />;
  if (parts[0] === "community") return <CommunityPage state={state} />;
  let page: React.ReactNode;
  if (parts[0] === "profile") page = <Profile state={state} uploads={uploads} />;
  else if (parts[0] === "upload") page = <UploadPage />;
  else if (parts[0] === "content" && parts[1]) page = <ContentDetail id={parts[1]} />;
  else if ((parts[0] === "calls" || parts[0] === "results") && parts[1]?.startsWith("football-")) page = <FootballDetail id={parts[1]} account={state} />;
  else if (parts[0] === "calls" && parts[1]) page = <CallDetail id={parts[1]} state={state} />;
  else if (parts[0] === "results" && parts[1]) page = parts[1].startsWith("shorts-") ? <CallDetail id={parts[1]} state={state} /> : <Result id={parts[1]} />;
  else page = <NotFound />;
  return <ProductShell account={state} section={path.startsWith("/profile") ? "profile" : path.startsWith("/upload") ? "upload" : path.startsWith("/content") ? "discover" : "predictions"} title={path.startsWith("/profile") ? "Profile" : path.startsWith("/upload") ? "Studio" : path.startsWith("/content") ? "Discover / Video" : path.startsWith("/results") ? "Calls / Result" : "Calls / Detail"}>{page}</ProductShell>;
}

export function HiveApp(props: Parameters<typeof HiveAppContent>[0]) {
  const path = usePathname();
  const reduced = useReducedMotion();
  // Opacity only: transforms on a parent would change the fixed mobile nav's containing block.
  return <motion.div key={path} className="vibe-page-transition" initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduced ? 0 : .24 }}><HiveAppContent {...props} /></motion.div>;
}
