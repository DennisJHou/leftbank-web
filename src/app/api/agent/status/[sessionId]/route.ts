import { getCurrentUser } from "@/lib/auth";
import { statusFor } from "@/lib/agent/store";

export const dynamic = "force-dynamic";

/** 結果頁輪詢：只回本人的狀態；別人的 session 一律 404 */
export async function GET(_req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const user = await getCurrentUser();
  if (!user || !/^[0-9a-f-]{36}$/i.test(sessionId)) return Response.json({ error: "not found" }, { status: 404 });
  const status = await statusFor(sessionId, user.id);
  if (!status) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(status, { headers: { "cache-control": "no-store" } });
}
