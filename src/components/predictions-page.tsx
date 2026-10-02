"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, Gamepad2, Grid2X2, Music2, Search, Trophy, X } from "lucide-react";
import { calls, findContent, formatCount, type Choice, type PredictionCategory } from "@/lib/demo-data";
import { HiveSidebar } from "@/components/hive-sidebar";
import { LiveCallList } from "@/components/live-call-list";
import "./predictions-page.css";

type CategoryFilter = "all" | PredictionCategory;
type StatusFilter = "all" | "open" | "done";

const categories = [
  { id: "all", label: "Semua", icon: Grid2X2 },
  { id: "sport", label: "Sport", icon: Trophy },
  { id: "gaming", label: "Gaming", icon: Gamepad2 },
  { id: "lagu", label: "Lagu", icon: Music2 },
] as const;

const categoryLabels: Record<PredictionCategory, string> = { sport: "Sport", gaming: "Gaming", lagu: "Lagu" };
const categoryIcons = { sport: Trophy, gaming: Gamepad2, lagu: Music2 };

export function PredictionsPage({ choices }: { choices: { callId: string; choice: Choice; status: "pending" | "locked" }[] }) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("id-ID");
    return calls.filter((call) => {
      const content = findContent(call.contentId);
      if (!content) return false;
      if (category !== "all" && call.predictionCategory !== category) return false;
      if (status === "open" && call.status !== "open") return false;
      if (status === "done" && call.status === "open") return false;
      return !term || [call.question, content.title, content.creator, categoryLabels[call.predictionCategory]].some((value) => value.toLocaleLowerCase("id-ID").includes(term));
    });
  }, [category, query, status]);

  const resetFilters = () => { setCategory("all"); setStatus("all"); setQuery(""); };

  return (
    <div className={`discover-shell predictions-shell ${sidebarExpanded ? "is-sidebar-expanded" : ""}`}>
      <HiveSidebar active="predictions" onExpandedChange={setSidebarExpanded} />
      <main className="predictions-page">
        <div className="predictions-inner">
          <header className="predictions-header">
            <div>
              <span className="predictions-eyebrow">HIVE / PREDICTIONS</span>
              <h1>Prediksi<span>.</span></h1>
              <p>Jelajahi semua Call HIVE dalam satu tempat.</p>
            </div>
            <span className="predictions-mode"><span /> MODE DEMO</span>
          </header>

          <div className="predictions-toolbar">
            <div className="predictions-search-wrap">
              <Search size={19} aria-hidden="true" />
              <label className="predictions-sr-only" htmlFor="predictions-search">Cari prediksi</label>
              <input id="predictions-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari prediksi, konten, atau kreator" />
              {query && <button type="button" onClick={() => setQuery("")} aria-label="Hapus pencarian"><X size={16} /></button>}
            </div>
          </div>

          <div className="predictions-category-tabs" role="group" aria-label="Kategori prediksi">
            {categories.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" className={category === id ? "is-selected" : ""} aria-pressed={category === id} onClick={() => setCategory(id)}><Icon size={17} strokeWidth={1.8} aria-hidden="true" /><span>{label}</span><small>{id === "all" ? calls.length : calls.filter((call) => call.predictionCategory === id).length}</small></button>
            ))}
          </div>

          <div className="predictions-section-head">
            <div><h2>{category === "all" ? "Semua Call" : categoryLabels[category]}</h2><span>{visible.length} Call ditampilkan</span></div>
            <div className="predictions-status-tabs" role="group" aria-label="Status Call">
              <button type="button" className={status === "all" ? "is-selected" : ""} aria-pressed={status === "all"} onClick={() => setStatus("all")}>Semua</button>
              <button type="button" className={status === "open" ? "is-selected" : ""} aria-pressed={status === "open"} onClick={() => setStatus("open")}>Terbuka</button>
              <button type="button" className={status === "done" ? "is-selected" : ""} aria-pressed={status === "done"} onClick={() => setStatus("done")}>Selesai</button>
            </div>
          </div>

          <div className="predictions-grid">
            {visible.map((call) => {
              const content = findContent(call.contentId)!;
              const Icon = categoryIcons[call.predictionCategory];
              const chosen = choices.find((item) => item.callId === call.id);
              const finished = call.status !== "open";
              return (
                <Link key={call.id} href={call.status === "resolved" ? `/results/${call.id}` : `/calls/${call.id}`} className="predictions-card">
                  <div className="predictions-card-top">
                    <span className={`predictions-card-icon category-${call.predictionCategory}`}><Icon size={24} strokeWidth={1.6} aria-hidden="true" /></span>
                    <span className="predictions-card-category">{categoryLabels[call.predictionCategory]}</span>
                    <span className={`predictions-card-status ${finished ? "is-finished" : ""}`}>{chosen ? "Pilihanmu tersimpan" : call.status === "resolved" ? "Hasil tersedia" : finished ? "Ditutup" : "Terbuka"}</span>
                  </div>
                  <h3>{call.question}</h3>
                  <p className="predictions-card-source">{content.title}</p>
                  <div className="predictions-card-metrics"><span>Awal <strong>{formatCount(call.baselineViews)}</strong></span><span aria-hidden="true">→</span><span>Target <strong>{formatCount(call.targetViews)}</strong> views</span></div>
                  <div className="predictions-card-footer"><span>{call.horizonHours} jam <i /> Data demo</span><span>{finished ? "Lihat hasil" : "Buka Call"} <ArrowUpRight size={17} aria-hidden="true" /></span></div>
                </Link>
              );
            })}
          </div>

          {visible.length === 0 && <div className="predictions-empty"><Search size={24} aria-hidden="true" /><h3>Call tidak ditemukan</h3><p>Coba kata kunci atau kategori lain.</p><button type="button" onClick={resetFilters}>Tampilkan semua Call</button></div>}

          <LiveCallList />
          <p className="predictions-disclaimer">Seluruh Call pada katalog ini adalah skenario demo. Angka dan pilihan lokal bukan metrik video sumber atau transaksi Monad.</p>
        </div>
      </main>
    </div>
  );
}
