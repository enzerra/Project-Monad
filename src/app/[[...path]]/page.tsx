import { HiveApp } from "@/components/hive-app";

export default async function Page({ searchParams }: { searchParams: Promise<{ video?: string | string[] }> }) {
  const query = await searchParams;
  const initialVideoId = Array.isArray(query.video) ? query.video[0] : query.video;
  return <HiveApp initialVideoId={initialVideoId} />;
}
