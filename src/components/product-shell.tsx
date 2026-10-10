"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { HiveSidebar } from "@/components/hive-sidebar";
import { VirtualBalance, type VirtualAccount } from "@/components/virtual-wallet";

export function ProductShell({ children, section = "predictions", title = "Prediksi", account }: {
  children: React.ReactNode;
  account: VirtualAccount;
  section?: "discover" | "predictions" | "upload" | "profile";
  title?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  return <div className={`app-shell discover-shell hive-theme product-standard ${expanded ? "is-sidebar-expanded" : ""}`}>
    <HiveSidebar active={section} onExpandedChange={setExpanded} />
    <div className="product-detail-area">
      <header className="product-topbar"><span>{title}</span><div className="virtual-header-controls"><VirtualBalance account={account} /><Link href={section === "upload" ? "/profile" : section === "discover" ? "/discover" : "/predictions"}>{section === "upload" ? "Lihat profil" : `Jelajahi ${section === "discover" ? "video" : "Call"}`}<ArrowUpRight size={16} aria-hidden="true" /></Link></div></header>
      {children}
    </div>
  </div>;
}
