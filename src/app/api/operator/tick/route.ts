import { runOperatorTick } from "@/lib/server/operator";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!process.env.OPERATOR_API_KEY || request.headers.get("authorization") !== `Bearer ${process.env.OPERATOR_API_KEY}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try { return Response.json(await runOperatorTick()); }
  catch { return Response.json({ error: "Operator unavailable; retry pending" }, { status: 503 }); }
}
