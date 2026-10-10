import { LiveCall } from "@/components/live-call";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) return <main className="section-wrap page-main"><h1>Monad Calls are not configured</h1><p>Configure Privy, Supabase and Monad to enable signed Calls.</p></main>;
  return <LiveCall id={id} />;
}
