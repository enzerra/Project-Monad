"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  ChevronRight,
  Clock3,
  Compass,
  ExternalLink,
  MessageCircle,
  Send,
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
  type Choice,
  type Content,
} from "@/lib/demo-data";
import { AuthControl } from "@/components/auth-control";
import { DiscoverViewer } from "@/components/discover-viewer";
import { PredictionsPage } from "@/components/predictions-page";
import { CommunityPage } from "@/components/community-page";

type Comment = { id: string; callId: string; name: string; text: string; createdAt: string };
type DemoChoice = { callId: string; choice: Choice; status: "pending" | "locked" };

const initialComments: Comment[] = [
  { id: "c1", callId: "rush-views", name: "raka", text: "Potongan aksinya cepat. Kalau jadi video baru, apakah bakal ramai?", createdAt: "12 menit lalu" },
  { id: "c2", callId: "rush-views", name: "lina", text: "Momen gameplay-nya kuat, tapi angka Call ini tetap hanya skenario demo.", createdAt: "8 menit lalu" },
  { id: "c3", callId: "speedrun-views", name: "dimas", text: "Ternyata tembus. Yang memilih lebih awal memang jeli.", createdAt: "1 jam lalu" },
];

function useDemoState() {
  const [choices, setChoices] = useState<DemoChoice[]>([]);
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [sharedCallIds, setSharedCallIds] = useState<string[]>(["rush-views", "speedrun-views"]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const savedChoices = localStorage.getItem("hive-demo-choices");
        const savedComments = localStorage.getItem("hive-demo-comments");
        const savedShares = localStorage.getItem("hive-demo-shares");
        if (savedChoices) setChoices(JSON.parse(savedChoices));
        if (savedComments) setComments(JSON.parse(savedComments));
        if (savedShares) setSharedCallIds(JSON.parse(savedShares));
      } catch {
        // The demo remains usable when local storage is unavailable.
      }
      setReady(true);
    });
  }, []);

  useEffect(() => { if (ready) localStorage.setItem("hive-demo-choices", JSON.stringify(choices)); }, [choices, ready]);
  useEffect(() => { if (ready) localStorage.setItem("hive-demo-comments", JSON.stringify(comments)); }, [comments, ready]);
  useEffect(() => { if (ready) localStorage.setItem("hive-demo-shares", JSON.stringify(sharedCallIds)); }, [sharedCallIds, ready]);

  const selectChoice = (callId: string, choice: Choice) => {
    setChoices((current) => current.some((item) => item.callId === callId) ? current : [...current, { callId, choice, status: "pending" }]);
    window.setTimeout(() => {
      setChoices((current) => current.map((item) => item.callId === callId ? { ...item, status: "locked" } : item));
    }, 950);
  };
  const shareCall = (callId: string) => setSharedCallIds((current) => current.includes(callId) ? current : [...current, callId]);
  const addComment = (callId: string, text: string) => setComments((current) => [...current, { id: crypto.randomUUID(), callId, name: "kamu · demo", text, createdAt: "baru saja" }]);
  return { choices, comments, sharedCallIds, selectChoice, shareCall, addComment };
}

function AppIcon() {
  return <span className="brand-symbol" aria-hidden="true"><span /><span /><span /><span /></span>;
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
  return <><header className="site-header"><div className="header-inner"><Link href="/" className="brand" aria-label="HIVE beranda"><AppIcon /><span>HIVE</span></Link><Nav path={path} /><div className="header-right"><span className="demo-pill"><span className="demo-dot" /> DEMO INTERAKTIF</span>{process.env.NEXT_PUBLIC_PRIVY_APP_ID ? <AuthControl /> : <Link href="/profile" className="avatar small" aria-label="Buka profil">H</Link>}</div></div></header><div className="mobile-nav"><Nav path={path} /></div></>;
}

function Media({ content, large = false }: { content: Content; large?: boolean }) {
  return <div className={`media media-${content.visual}${large ? " media-large" : ""}`} role="img" aria-label={`Ilustrasi demo untuk ${content.title}`}><div className="media-grid" /><div className="media-orb orb-one" /><div className="media-orb orb-two" /><div className="media-center"><span className="media-monogram">{content.creator.slice(0, 1)}</span><span className="media-art-title">{content.category.split(" · ")[0]}</span></div><div className="media-top"><span className="media-demo">VISUAL DEMO</span><span className="media-length">00:{content.minutes % 60 < 10 ? "0" : ""}{content.minutes % 60}</span></div><div className="media-bottom"><span className="play-shape" aria-hidden="true">▶</span><span>Preview konten</span></div></div>;
}

function StatusBadge({ status }: { status: Call["status"] }) {
  const labels: Record<Call["status"], string> = { open: "Call terbuka", pending: "Menunggu konfirmasi", locked: "Pilihan terkunci", closed: "Pilihan ditutup", revealing: "Reveal berlangsung", resolved: "Hasil tersedia", void: "Call void" };
  return <span className={`status-badge status-${status}`}><span className="status-dot" />{labels[status]}</span>;
}

function ContentDetail({ id }: { id: string }) {
  const content = findContent(id);
  if (!content) return <NotFound />;
  const call = content.callId ? findCall(content.callId) : undefined;
  return <main className="section-wrap detail-main"><Link href="/discover" className="back-link"><ArrowLeft size={17} /> Kembali ke Discover</Link><div className="detail-grid"><div><Media content={content} large /><div className="source-note"><ShieldCheck size={17} /><span>Ilustrasi demo. Belum terhubung ke video sumber.</span></div></div><div className="detail-copy"><p className="overline">{content.category.toUpperCase()}</p><h1>{content.title}</h1><div className="detail-author"><span className="creator-avatar">{content.creator.slice(0, 1)}</span><span><strong>{content.creator}</strong><small>{content.handle}</small></span></div><p className="detail-description">{content.description}</p>{call ? <div className="attached-call"><div className="attached-call-head"><span>CALL TERKAIT</span><StatusBadge status={call.status} /></div><h2>{call.question}</h2><p>Baseline {formatCount(call.baselineViews)} → target {formatCount(call.targetViews)} views</p><Link href={call.status === "resolved" ? `/results/${call.id}` : `/calls/${call.id}`} className="button button-primary">{call.status === "resolved" ? "Lihat hasil" : "Lihat prediksi"}<ArrowRight size={17} /></Link></div> : <div className="insight-notice"><Sparkles size={19} /><div><strong>Konten insight</strong><p>Video ini tidak memiliki prediksi. Kamu tetap bisa menyimpan atau membicarakannya.</p></div></div>}<div className="content-actions"><button type="button" onClick={() => alert("Tersimpan di demo lokal.")}><Bookmark size={18} /> Simpan</button><Link href="/community"><MessageCircle size={18} /> Lihat komunitas</Link></div></div></div></main>;
}

function CallDetail({ id, state }: { id: string; state: ReturnType<typeof useDemoState> }) {
  const call = findCall(id);
  const router = useRouter();
  if (!call) return <NotFound />;
  const content = findContent(call.contentId)!;
  const chosen = state.choices.find((item) => item.callId === id);
  const earlyCloseThreshold = call.baselineViews + Math.ceil((call.targetViews - call.baselineViews) / 2);
  const isOpen = call.status === "open";
  return <main className="section-wrap detail-main"><Link href={`/content/${content.id}`} className="back-link"><ArrowLeft size={17} /> Kembali ke konten</Link><div className="call-layout"><div className="call-main"><div className="call-header"><span className="overline">PREDICTION / {call.horizonHours} JAM</span><StatusBadge status={chosen?.status ?? call.status} /></div><h1>{call.question}</h1><p className="call-subtitle">Buat pilihan sebelum waktunya habis. Hasil akan diperiksa dari sumber yang sudah ditetapkan.</p><div className="call-video-link"><Link href={`/content/${content.id}`}><div className={`small-visual media-${content.visual}`}>{content.creator.slice(0, 1)}</div><span><small>KONTEN SUMBER · DEMO</small><strong>{content.title}</strong><span>{content.creator}</span></span><ChevronRight size={18} /></Link></div><div className="choice-section"><div className="section-label-row"><span>01 / PILIH POSISIMU</span><span>Satu pilihan per Call</span></div>{isOpen && !chosen ? <div className="choice-buttons"><button onClick={() => state.selectChoice(id, "yes")} className="choice-button"><span className="choice-mark">Y</span><span><strong>Ya, akan tercapai</strong><small>Video mencapai {formatCount(call.targetViews)} views</small></span><ArrowRight size={18} /></button><button onClick={() => state.selectChoice(id, "no")} className="choice-button"><span className="choice-mark">N</span><span><strong>Tidak, belum tercapai</strong><small>Video tetap di bawah target saat evaluasi</small></span><ArrowRight size={18} /></button></div> : chosen ? <div className={`choice-feedback ${chosen.status}`}><span className="choice-feedback-icon">{chosen.status === "locked" ? <Check size={23} /> : <Clock3 size={23} />}</span><div><strong>{chosen.status === "locked" ? `Pilihan demo: ${chosen.choice === "yes" ? "Ya" : "Tidak"}` : "Memproses pilihan demo…"}</strong><p>{chosen.status === "locked" ? "Tersimpan di browser ini. Belum menjadi komitmen Monad; tidak masuk reputasi nyata." : "Simulasi status pending. Tidak ada transaksi blockchain yang dikirim."}</p></div></div> : <div className="choice-feedback"><Clock3 size={22} /><p>Jendela pilihan telah ditutup. Kamu masih bisa melihat aturan dan hasilnya.</p></div>}<p className="choice-disclaimer"><ShieldCheck size={16} /> Mode demo. Integrasi Privy–Monad belum aktif; tombol ini tidak mengirim transaksi.</p></div><div className="share-strip"><div><strong>Bawa percakapan ke komunitas</strong><p>Bagikan Call ini agar orang lain melihat pertanyaan dan sumber yang sama.</p></div><button onClick={() => { state.shareCall(id); router.push("/community?call=" + id); }} className="button button-secondary"><Send size={16} /> Bagikan ke channel</button></div></div><aside className="rules-panel"><p className="overline">ATURAN YANG TERKUNCI</p><h2>Angkanya<br /><em>jelas.</em></h2><div className="rules-data"><div><span>Baseline</span><strong>{formatCount(call.baselineViews)}</strong></div><div><span>Target akhir</span><strong>{formatCount(call.targetViews)}</strong></div><div><span>Kenaikan perlu</span><strong>+{formatCount(call.targetViews - call.baselineViews)}</strong></div><div><span>Penutupan dini</span><strong>{formatCount(earlyCloseThreshold)}</strong></div><div><span>Pilihan tutup</span><strong>{formatTime(call.scheduledClosesAt)}</strong></div><div><span>Evaluasi</span><strong>{formatTime(call.evaluationAt)}</strong></div></div><p className="rules-explain">Pilihan tutup dini jika views mencapai 50% jarak dari baseline ke target. Hasil dinilai menggunakan angka YouTube Data API saat pemeriksaan.</p><Link href={call.status === "resolved" ? `/results/${call.id}` : "/predictions"} className="subtle-link">{call.status === "resolved" ? "Buka bukti hasil" : "Lihat semua Call"} <ArrowRight size={16} /></Link></aside></div></main>;
}

function Result({ id }: { id: string }) {
  const call = findCall(id);
  if (!call) return <NotFound />;
  const content = findContent(call.contentId)!;
  const resolved = call.status === "resolved";
  return <main className="section-wrap detail-main"><Link href={`/calls/${call.id}`} className="back-link"><ArrowLeft size={17} /> Kembali ke Call</Link><div className="result-wrap"><div className="result-intro"><p className="overline">RESULT / PROOF</p><StatusBadge status={call.status} /><h1>{resolved ? "Hasilnya sudah ada." : "Call belum selesai."}</h1><p>{call.question}</p>{resolved && <div className="result-answer"><span>JAWABAN</span><strong>{call.result === "yes" ? "YA" : "TIDAK"}</strong><p>Angka demo saat pemeriksaan: {formatCount(call.currentViews)} views</p></div>}</div><div className="proof-card"><div className="proof-head"><ShieldCheck size={21} /><span>BUKTI & BATAS KEPERCAYAAN</span></div><div className="proof-row"><span>Konten</span><Link href={`/content/${content.id}`}>{content.title} <ExternalLink size={14} /></Link></div><div className="proof-row"><span>Baseline</span><strong>{formatCount(call.baselineViews)} views</strong></div><div className="proof-row"><span>Target</span><strong>{formatCount(call.targetViews)} views</strong></div><div className="proof-row"><span>Evaluasi dijadwalkan</span><strong>{formatTime(call.evaluationAt)}</strong></div><div className="proof-row"><span>Sumber yang direncanakan</span><strong>YouTube Data API</strong></div><div className="proof-row"><span>Snapshot API nyata</span><strong>Belum tersedia</strong></div><div className="proof-row"><span>Transaksi Monad</span><strong>Belum tersedia</strong></div><div className="proof-warning"><ShieldCheck size={18} /><p>Ini adalah <strong>skenario demo</strong>, bukan bukti hasil YouTube atau transaksi Monad. Halaman ini akan menampilkan data sumber dan tautan explorer setelah integrasi live.</p></div></div></div></main>;
}

function Profile({ state }: { state: ReturnType<typeof useDemoState> }) {
  return <main className="section-wrap page-main"><div className="page-heading"><div><p className="overline">YOUR RECORD / 04</p><h1>Profile<span className="heading-dot">.</span></h1><p>Riwayat pilihan dan momen yang kamu ikuti. Reputasi resmi hanya menghitung Call nyata yang selesai.</p></div></div><div className="profile-layout"><div className="profile-card"><div className="profile-avatar">H</div><h2>Penjelajah HIVE</h2><p>Profil lokal · mode demo</p><div className="profile-stats"><div><strong>—</strong><span>Early & Right resmi</span></div><div><strong>—</strong><span>Call sah selesai</span></div></div><p className="profile-note">Belum ada data onchain. Leaderboard resmi memerlukan ≥20 Call sah, ≥5 Early Call, dan akun berusia ≥24 jam.</p></div><div className="profile-history"><div className="section-label-row"><span>RIWAYAT DEMO</span><span>{state.choices.length} pilihan lokal</span></div>{state.choices.length ? state.choices.map((item) => { const call = findCall(item.callId); if (!call) return null; return <Link key={item.callId} href={`/calls/${call.id}`} className="history-row"><div><span className="eyebrow">{item.status === "pending" ? "PENDING DEMO" : "TERKUNCI LOKAL"}</span><h3>{call.question}</h3><p>Pilihanmu: {item.choice === "yes" ? "Ya" : "Tidak"} · Bukan transaksi Monad</p></div><ArrowRight size={17} /></Link>; }) : <div className="empty-state"><p>Belum ada pilihan demo.</p><Link href="/predictions">Jelajahi Call <ArrowRight size={16} /></Link></div>}</div></div></main>;
}

function NotFound() { return <main className="section-wrap not-found"><X size={30} /><h1>Halaman tidak ditemukan.</h1><Link href="/discover" className="button button-primary">Kembali ke Discover</Link></main>; }

export function HiveApp({ initialVideoId }: { initialVideoId?: string }) {
  const path = usePathname() || "/";
  const state = useDemoState();
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0 || parts[0] === "discover") return <DiscoverViewer state={state} initialVideoId={initialVideoId} />;
  if (parts[0] === "predictions") return <PredictionsPage choices={state.choices} />;
  if (parts[0] === "community") return <CommunityPage state={state} />;
  let page: React.ReactNode;
  if (parts[0] === "profile") page = <Profile state={state} />;
  else if (parts[0] === "content" && parts[1]) page = <ContentDetail id={parts[1]} />;
  else if (parts[0] === "calls" && parts[1]) page = <CallDetail id={parts[1]} state={state} />;
  else if (parts[0] === "results" && parts[1]) page = <Result id={parts[1]} />;
  else page = <NotFound />;
  return <div className="app-shell"><Header path={path} />{page}<footer className="site-footer"><div className="section-wrap footer-inner"><Link href="/" className="brand"><AppIcon /><span>HIVE</span></Link><span>Discover · Predict · Belong</span><span>Prototype interaktif · Tidak ada transaksi nyata</span></div></footer></div>;
}
