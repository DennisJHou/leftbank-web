"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleTalkVote } from "@/app/actions/alumni";

export function VoteButton({ alumniId, initialVoted, loginHref }: { alumniId: string; initialVoted: boolean; loginHref?: string }) {
  const [voted, setVoted] = useState(initialVoted);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const click = () => {
    if (loginHref) return router.push(loginHref);
    start(async () => {
      const res = await toggleTalkVote(alumniId);
      if ("error" in res) {
        if (res.error === "login") router.push(`/login?next=/alumni/${alumniId}`);
        else setMsg(res.error);
        return;
      }
      setVoted(res.voted);
      setMsg(res.voted ? "已收到你的 +1。系上邀請講者時會參考大家的意願。" : "已收回。");
    });
  };

  return (
    <div>
      <button type="button" onClick={click} disabled={pending} aria-pressed={voted} className={`btn ${voted ? "btn-stone" : "btn-outline"}`}>
        {voted ? "✓ 已 +1，想聽他回來分享" : "想聽他回來分享 +1"}
      </button>
      {msg && <p className="mt-2 text-[13px] text-ash" role="status">{msg}</p>}
    </div>
  );
}
