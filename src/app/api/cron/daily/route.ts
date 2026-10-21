import { runDailyJobs } from "@/lib/cron";
import { safeEqual } from "@/lib/crypto";

export const dynamic = "force-dynamic";

/** Vercel Cron 每天呼叫一次（vercel.json），帶 Authorization: Bearer $CRON_SECRET */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runDailyJobs();
  return Response.json({ ok: true, ...result });
}
