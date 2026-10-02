"use client";

import Link from "next/link";
import { Compass, TrendingUp, UserRound, Users } from "lucide-react";
import "./discover-viewer.css";

type SidebarSection = "discover" | "predictions" | "community" | "profile";

const links = [
  { section: "discover", href: "/discover", label: "Discover", icon: Compass },
  { section: "predictions", href: "/predictions", label: "Prediksi", icon: TrendingUp },
  { section: "community", href: "/community", label: "Komunitas", icon: Users },
] as const;

export function HiveSidebar({ active, onExpandedChange }: { active: SidebarSection; onExpandedChange: (expanded: boolean) => void }) {
  return (
    <nav
      className="discover-sidebar"
      aria-label="Navigasi utama"
      onPointerEnter={(event) => { if (event.pointerType === "mouse") onExpandedChange(true); }}
      onPointerLeave={(event) => { if (event.pointerType === "mouse") onExpandedChange(false); }}
      onFocusCapture={() => onExpandedChange(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null) && !event.currentTarget.matches(":hover")) onExpandedChange(false); }}
    >
      <Link href="/" className="discover-logo" aria-label="HIVE Discover"><span className="discover-logo-mark">H<span>.</span></span><span className="discover-logo-full">HIVE<span>.</span></span></Link>
      <div className="discover-sidebar-links">
        {links.map(({ section, href, label, icon: Icon }) => (
          <Link key={section} href={href} className={`discover-nav-link ${active === section ? "is-active" : ""}`} aria-current={active === section ? "page" : undefined} aria-label={label} title={label}><Icon size={24} strokeWidth={1.8} /><span>{label}</span></Link>
        ))}
      </div>
      <Link href="/profile" className={`discover-nav-link discover-profile-link ${active === "profile" ? "is-active" : ""}`} aria-current={active === "profile" ? "page" : undefined} aria-label="Profil" title="Profil"><UserRound size={24} strokeWidth={1.8} /><span>Profil</span></Link>
    </nav>
  );
}
