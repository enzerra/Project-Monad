import { LiveCall } from "@/components/live-call";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) return <main className="section-wrap page-main"><h1>Live Call belum aktif</h1><p>Isi konfigurasi Privy, Supabase, dan Monad untuk mengaktifkan alur ini.</p></main>;
  return <LiveCall id={id} />;
}
