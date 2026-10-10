import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth-provider";
import { VibeEntry } from "@/components/vibe-entry";
import { UiMotion } from "@/components/ui-motion";
import "./globals.css";
import "@/components/hive-theme.css";
import "@/components/product-standard.css";
import "@/components/virtual-token.css";
import "@/components/sidebar-motion.css";
import "@/components/brand-system.css";
import "@/components/ink-theme.css";

export const metadata: Metadata = {
  title: "VIBE — Spot it early",
  description: "Discover Gaming, Sports and Crypto. Spot the next moment. Make your Call.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><UiMotion><AuthProvider><VibeEntry>{children}</VibeEntry></AuthProvider></UiMotion></body>
    </html>
  );
}
