import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { query } from "./db";
import { CONTACT_TYPE_LABEL, MEETING_MODE_LABEL, RESPONSE_DAYS, type ContactType } from "./constants";

export function appUrl(path = "") {
  const base =
    process.env.APP_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
    "http://localhost:3000";
  return base + path;
}

/** 寄信最多等多久；對方伺服器沒回應時不要讓寄信一直掛著 */
const MAIL_TIMEOUT_MS = 15_000;

const resendConfigured = () => Boolean(process.env.RESEND_API_KEY);

export function smtpConfigured() {
  return resendConfigured() || Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

/** 優先用 Resend（沒有自己的網域時，寄件人只能是 onboarding@resend.dev，而且只寄得到註冊 Resend 的那個信箱） */
async function sendViaResend(mail: Mail) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(MAIL_TIMEOUT_MS),
    body: JSON.stringify({
      from: process.env.MAIL_FROM || "左岸計畫 <onboarding@resend.dev>",
      to: [mail.to],
      reply_to: mail.replyTo,
      subject: mail.subject,
      html: mail.html,
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

let transporter: Transporter | null = null;
function getTransporter() {
  transporter ??= nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    connectionTimeout: MAIL_TIMEOUT_MS,
    greetingTimeout: MAIL_TIMEOUT_MS,
    socketTimeout: MAIL_TIMEOUT_MS,
  });
  return transporter;
}

type Mail = { to: string; subject: string; html: string; kind: string; replyTo?: string };

/** 寄信並記錄。沒有設定 SMTP 時只寫進 email_log（本機可在 /dev/mailbox 查看）。寄信失敗不會讓主要流程失敗。 */
export async function sendMail(mail: Mail) {
  let status: "sent" | "failed" | "logged" = "logged";
  let error: string | null = null;
  if (smtpConfigured()) {
    try {
      if (resendConfigured()) await sendViaResend(mail);
      else
        await getTransporter().sendMail({
          from: `左岸計畫 <${process.env.GMAIL_USER}>`,
          to: mail.to,
          replyTo: mail.replyTo,
          subject: mail.subject,
          html: mail.html,
        });
      status = "sent";
    } catch (e) {
      status = "failed";
      error = e instanceof Error ? e.message : String(e);
      console.error("[mail] 寄信失敗", mail.kind, mail.to, error);
    }
  } else {
    console.info(`[mail] (未設定 SMTP，只記錄) ${mail.kind} → ${mail.to}：${mail.subject}`);
  }
  await query(
    "insert into email_log (to_email, reply_to, subject, kind, html, status, error) values ($1, $2, $3, $4, $5, $6, $7)",
    [mail.to, mail.replyTo ?? null, mail.subject, mail.kind, mail.html, status, error],
  );
  return status !== "failed";
}

// ─── 版型 ──────────────────────────────────────────────

export function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const para = (s: string) => `<p style="margin:0 0 16px">${esc(s).replace(/\n/g, "<br>")}</p>`;

function button(label: string, href: string, solid = true) {
  const style = solid
    ? "background:#333333;color:#ffffff;border:1px solid #333333"
    : "background:#ffffff;color:#333333;border:1px solid #333333";
  return `<a href="${esc(href)}" style="${style};display:inline-block;padding:14px 28px;border-radius:0;font-weight:500;font-size:15px;text-decoration:none;margin:0 8px 8px 0">${esc(label)}</a>`;
}

function layout(title: string, body: string) {
  return `<!doctype html><html lang="zh-Hant"><body style="margin:0;background:#fffef2;padding:32px 16px;font-family:'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif;color:#333333;font-size:16px;line-height:1.75">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e3e0d3;padding:36px">
<div style="font-family:'Noto Serif TC',serif;font-size:16px;letter-spacing:3px;color:#333333;margin-bottom:28px">左岸計畫</div>
<h1 style="font-family:'Noto Serif TC',serif;font-weight:400;font-size:26px;line-height:1.35;margin:0 0 20px;color:#1d1d1b">${esc(title)}</h1>
${body}
</div>
<p style="max-width:560px;margin:16px auto 0;color:#5f5e58;font-size:14px;text-align:center">臺大心理系 · 左岸計畫｜這封信由網站自動寄出</p>
</body></html>`;
}

function quoteBlock(inner: string) {
  return `<div style="background:#f5f3e4;padding:18px 20px;margin:0 0 20px">${inner}</div>`;
}

// ─── 各種信件 ──────────────────────────────────────────

export function verifyEmail(to: string, name: string, link: string) {
  return sendMail({
    to,
    kind: "verify",
    subject: "請驗證你的 email｜左岸計畫",
    html: layout(
      `${name}，歡迎來到左岸`,
      para("請點下面的按鈕完成 email 驗證，帳號才算正式成立。連結 24 小時內有效。") +
        button("驗證 email", link) +
        para("如果你沒有註冊左岸計畫，請忽略這封信。"),
    ),
  });
}

export function resetPasswordEmail(to: string, name: string, link: string) {
  return sendMail({
    to,
    kind: "reset",
    subject: "重設密碼｜左岸計畫",
    html: layout(
      "重設你的密碼",
      para(`${name}，我們收到了重設密碼的要求。請在 1 小時內點下面的按鈕設定新密碼。`) +
        button("設定新密碼", link) +
        para("如果這不是你本人操作，請忽略這封信，你的密碼不會改變。"),
    ),
  });
}

export function accountApprovedEmail(to: string, name: string) {
  return sendMail({
    to,
    kind: "approved",
    subject: "帳號審核通過｜左岸計畫",
    html: layout(
      "你的帳號已經審核通過",
      para(`${name}，謝謝你的耐心等候。現在可以登入左岸計畫，開始使用所有功能了。`) +
        button("登入左岸計畫", appUrl("/login")),
    ),
  });
}

type RequestMailData = {
  type: ContactType;
  studentName: string;
  studentEmail: string;
  alumniName: string;
  alumniEmail: string;
  intro: string;
  questions: string[];
  mode?: string | null;
  availability?: string | null;
  token: string;
};

function requestSummary(r: RequestMailData) {
  const qs = r.questions.map((q, i) => `<li style="margin:0 0 8px">${esc(q)}</li>`).join("");
  let extra = "";
  if (r.type === "coffee") {
    extra =
      `<p style="margin:0 0 6px"><strong>形式：</strong>${esc(MEETING_MODE_LABEL[r.mode as keyof typeof MEETING_MODE_LABEL] ?? "都可以")}</p>` +
      (r.availability ? `<p style="margin:0"><strong>方便的時段：</strong>${esc(r.availability)}</p>` : "");
  }
  return quoteBlock(
    `<p style="margin:0 0 8px;color:#5f5e58;font-size:14px">自我介紹</p>${para(r.intro)}` +
      `<p style="margin:0 0 8px;color:#5f5e58;font-size:14px">想請教的問題</p><ol style="margin:0 0 12px;padding-left:20px">${qs}</ol>` +
      extra,
  );
}

/** 寄給系友：新的提問或咖啡邀請。回覆對象設成學生信箱，系友直接回信即可。 */
export function newRequestEmail(r: RequestMailData) {
  const label = CONTACT_TYPE_LABEL[r.type];
  const intro =
    r.type === "coffee"
      ? `${r.studentName} 想約你喝一杯咖啡，聊聊下面幾個問題。依照左岸計畫的約定，學生會以 200 元內的實物（例如一杯咖啡）向你致意。`
      : `${r.studentName} 透過左岸計畫寫了一封信給你，想請教下面幾個問題。`;
  return sendMail({
    to: r.alumniEmail,
    replyTo: r.studentEmail,
    kind: `request_new_${r.type}`,
    subject: `${r.studentName} 想${r.type === "coffee" ? "約你喝一杯咖啡" : "向你請教幾個問題"}｜左岸計畫`,
    html: layout(
      `一則新的${label}`,
      para(`${r.alumniName}，你好：`) +
        para(intro) +
        requestSummary(r) +
        para(`願意的話，請點「我會聯絡他」，然後直接回覆這封信——回信會寄到學生的信箱（${r.studentEmail}），你的 email 不會出現在網站上。`) +
        button("我會聯絡他", appUrl(`/r/${r.token}?action=accept`)) +
        button("這次先婉拒", appUrl(`/r/${r.token}?action=decline`), false) +
        para(`你不需要登入。若 ${RESPONSE_DAYS} 天內沒有回應，這筆邀請會自動標示為逾期。`),
    ),
  });
}

export function requestSentEmail(r: RequestMailData) {
  return sendMail({
    to: r.studentEmail,
    kind: "request_sent",
    subject: `已送出給 ${r.alumniName} 的${CONTACT_TYPE_LABEL[r.type]}｜左岸計畫`,
    html: layout(
      "已經幫你送出了",
      para(
        `你寫給 ${r.alumniName} 的${CONTACT_TYPE_LABEL[r.type]}已經寄出。系友回應後，我們會再寫信通知你；系友決定聯絡你時，會直接寄信到這個信箱。`,
      ) +
        requestSummary(r) +
        para(`系友通常都很忙，請給他一點時間。若 ${RESPONSE_DAYS} 天內沒有回應，這筆邀請會自動結束，你可以再試試其他系友。`) +
        button("查看我的提問紀錄", appUrl("/me?tab=records"), false),
    ),
  });
}

export function requestRespondedEmail(
  r: Pick<RequestMailData, "type" | "studentName" | "studentEmail" | "alumniName">,
  accepted: boolean,
) {
  const label = CONTACT_TYPE_LABEL[r.type];
  return sendMail({
    to: r.studentEmail,
    kind: accepted ? "request_accepted" : "request_declined",
    subject: accepted ? `${r.alumniName} 會聯絡你｜左岸計畫` : `${r.alumniName} 這次先婉拒了｜左岸計畫`,
    html: layout(
      accepted ? `${r.alumniName} 會聯絡你` : "這次先錯過了",
      accepted
        ? para(`${r.studentName}，好消息：${r.alumniName} 收到了你的${label}，會直接寄信到這個信箱聯絡你。請留意收件匣（也看一下垃圾郵件）。`) +
            (r.type === "coffee" ? para("見面時，記得帶著你的 3 個問題，並準備 200 元內的小心意向系友致謝。") : "")
        : para(
            `${r.studentName}，${r.alumniName} 這次沒辦法回應你的${label}。這通常只是時機不巧，和你的問題無關。系友園地還有很多願意聊聊的學長姐。`,
          ) + button("回到系友園地", appUrl("/alumni"), false),
    ),
  });
}

export function requestOverdueEmail(r: Pick<RequestMailData, "type" | "studentName" | "studentEmail" | "alumniName">) {
  return sendMail({
    to: r.studentEmail,
    kind: "request_overdue",
    subject: `給 ${r.alumniName} 的${CONTACT_TYPE_LABEL[r.type]}已逾期｜左岸計畫`,
    html: layout(
      "這次沒有等到回音",
      para(
        `${r.studentName}，你寫給 ${r.alumniName} 的${CONTACT_TYPE_LABEL[r.type]}在 ${RESPONSE_DAYS} 天內沒有收到回應，已經自動結束。系友可能只是太忙或沒看到信——不妨試試其他系友。`,
      ) + button("回到系友園地", appUrl("/alumni"), false),
    ),
  });
}

export function followupEmail(r: Pick<RequestMailData, "type" | "studentName" | "alumniName" | "alumniEmail" | "token">) {
  const label = CONTACT_TYPE_LABEL[r.type];
  return sendMail({
    to: r.alumniEmail,
    kind: "request_followup",
    subject: `和 ${r.studentName} 的${label}，完成了嗎？｜左岸計畫`,
    html: layout(
      "已經完成了嗎？",
      para(
        `${r.alumniName}，你好：兩週前你答應了 ${r.studentName} 的${label}。如果已經${r.type === "coffee" ? "見過面" : "回覆了"}，請點一下按鈕告訴我們，這能幫助左岸計畫了解成效。謝謝你願意花時間陪學弟妹。`,
      ) + button("已經完成了", appUrl(`/r/${r.token}?action=complete`)),
    ),
  });
}
