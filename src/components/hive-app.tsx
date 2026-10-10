"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
  { id: "c1", callId: "rush-views", name: "raka", text: "Potongan aksinya cepat. Kalau jadi video baru, apakah bakal ramai?", createdAt: "12 menit lalu" },
  { id: "c2", callId: "rush-views", name: "lina", text: "Momen gameplay-nya kuat, tapi angka Call ini tetap hanya skenario demo.", createdAt: "8 menit lalu" },
  { id: "c3", callId: "speedrun-views", name: "dimas", text: "Ternyata tembus. Yang memilih lebih awal memang jeli.", createdAt: "1 jam lalu" },
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
  const addComment = (callId: string, text: string) => setComments((current) => [...current, { id: crypto.randomUUID(), callId, name: "kamu · demo", text, createdAt: "baru saja" }]);
  return { ...virtualAccount, comments, sharedCallIds, shareCall, addComment };
}

function Media({ content, large = false }: { content: Content; large?: boolean }) {
  const className = `source-preview reference-panel ${large ? "is-large" : ""}`;
  const preview = <><span className="overline">KONTEN SUMBER</span><PredictionSubject contentId={content.id} /><strong>{content.title}</strong></>;
  if (!content.video) return <div className={className}>{preview}<span className="source-preview-play">Video sumber belum terhubung</span></div>;
  if (content.video.provider !== "youtube") return <a href={content.video.sourceUrl} target="_blank" rel="noreferrer" className={className} aria-label={`Lihat sumber ${content.title}`}>{preview}<span className="source-preview-play">Lihat video sumber <ExternalLink size={18} /></span></a>;
  return <Link href={`/discover?video=${content.id}`} className={className} aria-label={`Putar ${content.title}`}>{preview}<span className="source-preview-play">Putar di Discover <ArrowRight size={18} /></span></Link>;
}

function StatusBadge({ status }: { status: Call["status"] }) {
  const labels: Record<Call["status"], string> = { open: "Call terbuka", pending: "Menunggu konfirmasi", locked: "Pilihan terkunci", closed: "Pilihan ditutup", revealing: "Reveal berlangsung", resolved: "Hasil tersedia", void: "Call void" };
  return <span className={`status-badge status-${status}`}><span className="status-dot" />{labels[status]}</span>;
}

function ContentDetail({ id }: { id: string }) {
  const content = findContent(id);
  if (!content) return <NotFound />;
  const call = content.callId ? findCall(content.callId) : undefined;
  return <main className="section-wrap detail-main"><Link href="/discover" className="back-link"><ArrowLeft size={17} /> Kembali ke Discover</Link><div className="detail-grid"><div><Media content={content} large /><div className="source-note"><ShieldCheck size={17} /><span>Buka Discover untuk menonton video dan melihat sumbernya.</span></div></div><div className="detail-copy"><p className="overline">{content.category.toUpperCase()}</p><h1>{content.title}</h1><div className="detail-author"><span className="creator-avatar">{content.creator.slice(0, 1)}</span><span><strong>{content.creator}</strong><small>{content.handle}</small></span></div><p className="detail-description">{content.description}</p>{call ? <div className="attached-call"><div className="attached-call-head"><span>CALL TERKAIT</span><StatusBadge status={call.status} /></div><h2>{call.question}</h2><p>Baseline {formatCount(call.baselineViews)} → target {formatCount(call.targetViews)} views</p><Link href={call.status === "resolved" ? `/results/${call.id}` : `/calls/${call.id}`} className="button button-primary">{call.status === "resolved" ? "Lihat hasil" : "Lihat prediksi"}<ArrowRight size={17} /></Link></div> : <div className="insight-notice"><Sparkles size={19} /><div><strong>Konten insight</strong><p>Video ini tidak memiliki prediksi. Kamu tetap bisa menyimpan atau membicarakannya.</p></div></div>}<div className="content-actions"><button type="button" onClick={() => alert("Tersimpan di demo lokal.")}><Bookmark size={18} /> Simpan</button><Link href="/community"><MessageCircle size={18} /> Lihat komunitas</Link></div></div></div></main>;
}

function Result({ id }: { id: string }) {
  const call = findCall(id);
  if (!call) return <NotFound />;
  const content = findContent(call.contentId)!;
  const resolved = call.status === "resolved";
  return <main className="section-wrap detail-main"><Link href={`/calls/${call.id}`} className="back-link"><ArrowLeft size={17} /> Kembali ke Call</Link><div className="result-wrap"><div className="result-intro"><p className="overline">RESULT / PROOF</p><StatusBadge status={call.status} /><h1>{resolved ? "Hasilnya sudah ada." : "Call belum selesai."}</h1><p>{call.question}</p>{resolved && <div className="result-answer"><span>JAWABAN</span><strong>{call.result === "yes" ? "YA" : "TIDAK"}</strong><p>Angka demo saat pemeriksaan: {formatCount(call.currentViews)} views</p></div>}</div><div className="proof-card"><div className="proof-head"><ShieldCheck size={21} /><span>BUKTI & BATAS KEPERCAYAAN</span></div><div className="proof-row"><span>Konten</span><Link href={`/content/${content.id}`}>{content.title} <ExternalLink size={14} /></Link></div><div className="proof-row"><span>Baseline</span><strong>{formatCount(call.baselineViews)} views</strong></div><div className="proof-row"><span>Target</span><strong>{formatCount(call.targetViews)} views</strong></div><div className="proof-row"><span>Evaluasi dijadwalkan</span><strong>{formatTime(call.evaluationAt)}</strong></div><div className="proof-row"><span>Sumber yang direncanakan</span><strong>YouTube Data API</strong></div><div className="proof-row"><span>Snapshot API nyata</span><strong>Belum tersedia</strong></div><div className="proof-row"><span>Transaksi Monad</span><strong>Belum tersedia</strong></div><div className="proof-warning"><ShieldCheck size={18} /><p>Ini adalah <strong>skenario demo</strong>, bukan bukti hasil YouTube atau transaksi Monad. Halaman ini akan menampilkan data sumber dan tautan explorer setelah integrasi live.</p></div></div></div></main>;
}

function Profile({ state, uploads }: { state: ReturnType<typeof useDemoState>; uploads: UploadedContent[] }) {
  return <ProfilePage account={state} initialUploads={uploads} />;
}
function NotFound() { return <main className="section-wrap not-found"><X size={30} /><h1>Halaman tidak ditemukan.</h1><Link href="/discover" className="button button-primary">Kembali ke Discover</Link></main>; }

export function HiveApp({ initialVideoId, youtubeFeed = [], uploads = [] }: { initialVideoId?: string; youtubeFeed?: import("@/lib/server/youtube").YoutubeFeedItem[]; uploads?: UploadedContent[] }) {
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
  else if (parts[0] === "calls" && parts[1]) page = <CallDetail id={parts[1]} state={state} />;
  else if (parts[0] === "results" && parts[1]) page = parts[1].startsWith("shorts-") ? <CallDetail id={parts[1]} state={state} /> : <Result id={parts[1]} />;
  else page = <NotFound />;
  return <ProductShell account={state} section={path.startsWith("/profile") ? "profile" : path.startsWith("/upload") ? "upload" : path.startsWith("/content") ? "discover" : "predictions"} title={path.startsWith("/profile") ? "Profil" : path.startsWith("/upload") ? "Studio" : path.startsWith("/content") ? "Discover / Konten" : path.startsWith("/results") ? "Prediksi / Hasil" : "Prediksi / Call"}>{page}</ProductShell>;
}
