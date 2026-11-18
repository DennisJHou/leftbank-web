import { after } from "next/server";
import { safeEqual } from "@/lib/crypto";
import { runAgent } from "@/lib/agent/run";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** 內部用：觸發一個 Agent run。帶 Authorization: Bearer $AGENT_SECRET。立即回 202，在 after() 裡執行。 */
export async function POST(req: Request) {
  const secret = process.env.AGENT_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { runId?: string } | null;
  const runId = body?.runId;
  if (!runId || !/^[0-9a-f-]{36}$/i.test(runId)) return Response.json({ error: "bad request" }, { status: 400 });
  // runAgent 內部用 status = 'queued' 條件搶佔，同一個 run 被觸發兩次只會執行一次
  after(() => runAgent(runId));
  return Response.json({ ok: true }, { status: 202 });
}
