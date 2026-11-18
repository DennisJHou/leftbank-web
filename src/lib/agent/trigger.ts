import "server-only";
import { headers } from "next/headers";
import { runAgent } from "./run";

/**
 * 在 after() 裡呼叫：有 AGENT_SECRET 時，打到 /api/agent/run（獨立的函式，maxDuration 300 秒）；
 * 本機沒有設定時，直接在同一個行程裡執行。
 */
export async function originFromHeaders() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return process.env.APP_URL || (host ? `${proto}://${host}` : "http://localhost:3000");
}

export async function triggerRun(runId: string, origin: string) {
  const secret = process.env.AGENT_SECRET;
  if (!secret) {
    await runAgent(runId);
    return;
  }
  try {
    const res = await fetch(`${origin}/api/agent/run`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
      body: JSON.stringify({ runId }),
    });
    if (!res.ok) throw new Error(`agent route ${res.status}`);
  } catch (e) {
    console.error("[agent] trigger failed, running inline", e);
    await runAgent(runId);
  }
}
