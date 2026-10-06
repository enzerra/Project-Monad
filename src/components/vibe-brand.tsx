import Image from "next/image";

export function VibeBrand({ compact = false }: { compact?: boolean }) {
  return <span className={`hive-brand ${compact ? "hive-brand-compact" : ""}`} aria-label="VIBE">
    <Image className="hive-brand-mark" src="/brand/vibe-symbol.png" alt="" width={1254} height={1254} />
    <Image className="hive-brand-name" src="/brand/vibe-wordmark.png" alt="" width={2172} height={724} />
  </span>;
}
