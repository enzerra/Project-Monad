"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Compass, Plus, TrendingUp, UserRound, Users } from "lucide-react";
import { VibeBrand } from "@/components/vibe-brand";
import "./discover-viewer.css";
import "./upload-nav.css";

type SidebarSection = "discover" | "predictions" | "upload" | "community" | "profile";

const links = [
  { section: "discover", href: "/discover", label: "Discover", icon: Compass },
  { section: "predictions", href: "/predictions", label: "Calls", icon: TrendingUp },
  { section: "upload", href: "/upload", label: "Upload", icon: Plus },
  { section: "community", href: "/community", label: "Community", icon: Users },
] as const;

export function HiveSidebar({ active, onExpandedChange }: { active: SidebarSection; onExpandedChange: (expanded: boolean) => void }) {
  const [expanded, setExpanded] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (leaveTimer.current) clearTimeout(leaveTimer.current); }, []);
  const expand = (next: boolean) => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setExpanded(next);
    onExpandedChange(next);
  };
  return (
    <nav
      className="discover-sidebar"
      data-expanded={expanded}
      aria-label="Main navigation"
      onPointerEnter={(event) => { if (event.pointerType === "mouse") expand(true); }}
      onPointerLeave={(event) => {
        if (event.pointerType !== "mouse" || event.currentTarget.contains(document.activeElement)) return;
        leaveTimer.current = setTimeout(() => expand(false), 100);
      }}
      onFocusCapture={() => expand(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null) && !event.currentTarget.matches(":hover")) expand(false); }}
    >
      <Link href="/" className="discover-logo" aria-label="VIBE Discover"><VibeBrand /></Link>
      <div className="discover-sidebar-links">
        {links.map(({ section, href, label, icon: Icon }) => (
          <Link key={section} href={href} className={`discover-nav-link ${section === "upload" ? "discover-upload-link" : ""} ${active === section ? "is-active" : ""}`} aria-current={active === section ? "page" : undefined} aria-label={label} title={label}><Icon size={24} strokeWidth={1.8} aria-hidden="true" /><span>{label}</span></Link>
        ))}
      </div>
      <Link href="/profile" className={`discover-nav-link discover-profile-link ${active === "profile" ? "is-active" : ""}`} aria-current={active === "profile" ? "page" : undefined} aria-label="Profile" title="Profile"><UserRound size={24} strokeWidth={1.8} /><span>Profile</span></Link>
    </nav>
  );
}
