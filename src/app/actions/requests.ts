"use server";

import { one, query } from "@/lib/db";
import { requestRespondedEmail } from "@/lib/mail";
import { REQUEST_STATUS_LABEL, type ContactType, type RequestStatus } from "@/lib/constants";
import type { FormState } from "./auth";

type Action = "accept" | "decline" | "complete";

/** 系友在信件裡點按鈕後的確認（不需要登入，以 token 辨識） */
export async function respondToRequest(_: FormState, fd: FormData): Promise<FormState> {
  const token = String(fd.get("token") ?? "");
  const action = String(fd.get("action") ?? "") as Action;
  const req = await one<{
    id: string;
    type: ContactType;
    status: RequestStatus;
    student_name: string;
    student_email: string;
    alumni_name: string;
  }>(
    `select r.id, r.type, r.status, s.name as student_name, s.email as student_email, a.name as alumni_name
       from contact_requests r join users s on s.id = r.from_user join users a on a.id = r.to_user
      where r.token = $1`,
    [token],
  );
  if (!req) return { error: "找不到這筆邀請，連結可能不完整。" };

  if (action === "accept" || action === "decline") {
    if (req.status !== "pending") {
      return {
        error:
          req.status === "overdue"
            ? "這筆邀請已經逾期，學生已收到通知。若你仍想聯絡，可以直接回覆原本的邀請信。"
            : `這筆邀請已經回覆過了（${REQUEST_STATUS_LABEL[req.status]}）。`,
      };
    }
    const status = action === "accept" ? "accepted" : "declined";
    const updated = await query(
      "update contact_requests set status = $2, responded_at = now() where id = $1 and status = 'pending' returning 1",
      [req.id, status],
    );
    if (!updated.length) return { error: "這筆邀請剛剛已經被處理了。" };
    await requestRespondedEmail(
      { type: req.type, studentName: req.student_name, studentEmail: req.student_email, alumniName: req.alumni_name },
      action === "accept",
    );
    return {
      ok:
        action === "accept"
          ? `謝謝你！請直接回覆邀請信（會寄到 ${req.student_email}），和 ${req.student_name} 聯絡。兩週後我們會再寫信問你是否完成。`
          : `已婉拒，我們會溫和地通知 ${req.student_name}。謝謝你撥空回應。`,
    };
  }

  if (action === "complete") {
    if (req.status === "completed") return { ok: "已經記錄為完成了，謝謝你！" };
    if (req.status !== "accepted") return { error: `這筆邀請目前是「${REQUEST_STATUS_LABEL[req.status]}」，無法標示為完成。` };
    await query("update contact_requests set status = 'completed', completed_at = now() where id = $1", [req.id]);
    return { ok: `謝謝你陪 ${req.student_name} 走這一段。你的時間，對學弟妹來說很珍貴。` };
  }
  return { error: "無效的操作。" };
}
