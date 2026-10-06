"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Compass,
  ExternalLink,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  UserRound,
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
import { AuthControl } from "@/components/auth-control";
import { DiscoverViewer } from "@/components/discover-viewer";
import { PredictionsPage } from "@/components/predictions-page";
import { CommunityPage } from "@/components/community-page";
import { VibeBrand } from "@/components/vibe-brand";
import { ProductShell } from "@/components/product-shell";
import { CallDetailPage as CallDetail } from "@/components/call-detail-page";
import { PredictionSubject } from "@/components/prediction-subject";
import { useVirtualWallet } from "@/components/use-virtual-wallet";
import { VirtualWalletPanel } from "@/components/virtual-wallet";

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

function Nav({ path }: { path: string }) {
  const links = [
    { href: "/discover", label: "Discover", icon: Compass },
    { href: "/predictions", label: "Predictions", icon: TrendingUp },
    { href: "/community", label: "Community", icon: Users },
    { href: "/profile", label: "Profile", icon: UserRound },
  ];
  return <nav className="main-nav" aria-label="Navigasi utama">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={path.startsWith(href) ? "nav-link active" : "nav-link"} aria-current={path.startsWith(href) ? "page" : undefined}><Icon size={18} strokeWidth={1.8} /><span>{label}</span></Link>)}</nav>;
}

function Header({ path }: { path: string }) {
  return <><header className="site-header"><div className="header-inner"><Link href="/" className="brand" aria-label="VIBE beranda"><VibeBrand /></Link><Nav path={path} /><div className="header-right"><span className="demo-pill"><span className="demo-dot" /> DEMO INTERAKTIF</span>{process.env.NEXT_PUBLIC_PRIVY_APP_ID ? <AuthControl /> : <Link href="/profile" className="avatar small" aria-label="Buka profil">V</Link>}</div></div></header><div className="mobile-nav"><Nav path={path} /></div></>;
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

function Profile({ state }: { state: ReturnType<typeof useDemoState> }) {
  return <main className="section-wrap page-main"><div className="page-heading"><div><p className="overline">YOUR RECORD / 04</p><h1>Profile<span className="heading-dot">.</span></h1><p>Riwayat pilihan, hasil pemeriksaan, dan saldo VIBE kamu.</p></div></div><VirtualWalletPanel account={state} /><div className="profile-layout"><div className="profile-card"><div className="profile-avatar">V</div><h2>Penjelajah VIBE</h2><p>Sesi browser · saldo di server</p><div className="profile-stats"><div><strong>—</strong><span>Early & Right resmi</span></div><div><strong>—</strong><span>Call sah selesai</span></div></div><p className="profile-note">Belum ada data onchain. Leaderboard resmi memerlukan ≥20 Call sah, ≥5 Early Call, dan akun berusia ≥24 jam.</p></div><div className="profile-history"><div className="section-label-row"><span>RIWAYAT CALL</span><span>{state.choices.length} pilihan</span></div>{state.choices.length ? state.choices.map((item) => { const call = state.calls.find((call) => call.id === item.callId) ?? findCall(item.callId); if (!call) return null; return <Link key={item.callId} href={`/calls/${call.id}`} className="history-row"><div><span className="eyebrow">{item.settlement === "won" ? "MENANG" : item.settlement === "lost" ? "BELUM TEPAT" : item.settlement === "refunded" ? "DIKEMBALIKAN" : "TERKUNCI DI SERVER"}</span><h3>{call.question}</h3><p>Pilihanmu: {item.choice === "yes" ? "Ya" : "Tidak"} · {item.amount ? `${formatCount(item.amount)} VIBE` : "Pilihan lama tanpa kredit"}</p></div><ArrowRight size={17} /></Link>; }) : <div className="empty-state"><p>Belum ada pilihan.</p><Link href="/predictions">Jelajahi Call <ArrowRight size={16} /></Link></div>}</div></div></main>;
}

function NotFound() { return <main className="section-wrap not-found"><X size={30} /><h1>Halaman tidak ditemukan.</h1><Link href="/discover" className="button button-primary">Kembali ke Discover</Link></main>; }

export function HiveApp({ initialVideoId, youtubeFeed = [] }: { initialVideoId?: string; youtubeFeed?: import("@/lib/server/youtube").YoutubeFeedItem[] }) {
  const path = usePathname() || "/";
  const state = useDemoState();
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0 || parts[0] === "discover") return <DiscoverViewer state={state} initialVideoId={initialVideoId} youtubeFeed={youtubeFeed} />;
  if (parts[0] === "predictions") return <PredictionsPage choices={state.choices} account={state} />;
  if (parts[0] === "community") return <CommunityPage state={state} />;
  let page: React.ReactNode;
  if (parts[0] === "profile") page = <Profile state={state} />;
  else if (parts[0] === "content" && parts[1]) page = <ContentDetail id={parts[1]} />;
  else if (parts[0] === "calls" && parts[1]) page = <CallDetail id={parts[1]} state={state} />;
  else if (parts[0] === "results" && parts[1]) page = parts[1].startsWith("shorts-") ? <CallDetail id={parts[1]} state={state} /> : <Result id={parts[1]} />;
  else page = <NotFound />;
  if (!path.startsWith("/profile")) return <ProductShell account={state} section={path.startsWith("/content") ? "discover" : "predictions"} title={path.startsWith("/content") ? "Discover / Konten" : path.startsWith("/results") ? "Prediksi / Hasil" : "Prediksi / Call"}>{page}</ProductShell>;
  return <div className="app-shell hive-theme"><Header path={path} />{page}<footer className="site-footer"><div className="section-wrap footer-inner"><Link href="/" className="brand"><VibeBrand compact /></Link><span>Discover · Predict · Belong</span><span>Prototype interaktif · Tidak ada transaksi nyata</span></div></footer></div>;
}
