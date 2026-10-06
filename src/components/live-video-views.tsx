"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { formatCount, formatTime } from "@/lib/demo-data";

export function LiveVideoViews({ videoId, initialViews, initialObservedAt }: {
  videoId: string; initialViews: number; initialObservedAt: string;
}) {
  const [snapshot, setSnapshot] = useState({ views: initialViews, observedAt: initialObservedAt });
  const [unavailable, setUnavailable] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    let disposed = false;
    let controller: AbortController | undefined;
    const refresh = async () => {
      if (document.hidden || controller) return;
      controller = new AbortController();
      const timeout = window.setTimeout(() => controller?.abort(), 10_000);
      try {
        const response = await fetch(`/api/videos/${encodeURIComponent(videoId)}/views`, {
          cache: "no-store", signal: controller.signal,
        });
        if (!response.ok) throw new Error("Views unavailable");
        const data = await response.json();
        if (data.videoId !== videoId || !Number.isSafeInteger(data.views) || data.views < 0 ||
            typeof data.observedAt !== "string" || !Number.isFinite(Date.parse(data.observedAt))) {
          throw new Error("Invalid views response");
        }
        if (!disposed) {
          setSnapshot({ views: data.views, observedAt: data.observedAt });
          setUnavailable(false);
        }
      } catch {
        // Keep the last observed number, never replace a failed request with zero.
        if (!disposed) setUnavailable(true);
      } finally { window.clearTimeout(timeout); controller = undefined; }
    };
    void refresh();
    const interval = window.setInterval(() => void refresh(), 30_000);
    const onVisibility = () => { if (!document.hidden) void refresh(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      disposed = true;
      controller?.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [videoId]);

  const description = `${formatCount(snapshot.views)} views YouTube. Diperiksa ${formatTime(snapshot.observedAt)}.${unavailable ? " Pembaruan sementara tidak tersedia; menampilkan angka terakhir." : ""}`;
  return <div className="discover-view-island" role="status" aria-label={`${formatCount(snapshot.views)} views YouTube${unavailable ? ", pembaruan tertunda" : ""}`} title={description}>
    <motion.span key={snapshot.views} aria-hidden="true" initial={reducedMotion ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .18 }}>
      {formatCount(snapshot.views)}
    </motion.span>
  </div>;
}
