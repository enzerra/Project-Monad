import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth-provider";
import { VibeEntry } from "@/components/vibe-entry";
import "./globals.css";
import "@/components/hive-theme.css";
import "@/components/product-standard.css";
import "@/components/virtual-token.css";
import "@/components/sidebar-motion.css";

export const metadata: Metadata = {
  title: "VIBE — Temukan lebih awal",
  description: "Temukan konten gaming, sports, dan crypto. Prediksi lebih awal, lalu buktikan bersama komunitas.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body><AuthProvider><VibeEntry>{children}</VibeEntry></AuthProvider></body>
    </html>
  );
}
