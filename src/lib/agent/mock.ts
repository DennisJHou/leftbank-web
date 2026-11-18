import "server-only";
import { SUBSCALES, type CddqAnswers, type CddqScores, type SubscaleKey } from "../cddq";
import { INTERVENTIONS } from "../diagnosis-config";
import { cosine, mergeVector, tagKey } from "../tags";
import { cddqTags, type Tag } from "../tagging";
import { searchResources } from "../resources";
import { ROUTE_LABEL, WRITING_EXAMPLES } from "./copy";
import type { AgentPlan, Component, Diagnosis } from "./types";
import type { EligibleStory } from "./tools";

/**
 * 沒有 ANTHROPIC_API_KEY 的本機示範：用固定規則組一份處置包。
 * 系友引言一樣從資料庫的故事原文擷取，所以會通過 validate.ts，整個流程（進度、驗證、呈現）照常跑。
 */

const ACTIONS: Record<SubscaleKey, string> = {
  motivation: "這週讀兩篇系友故事，記下他們「開始認真想未來」是在什麼時候、因為什麼事。",
  indecisiveness: "挑一個眼前的小選擇，給自己 48 小時做決定，並先說好「之後可以改」。",
  beliefs: "找一位系友的故事，畫出他轉過幾次彎；再想想你身邊有沒有人走過不只一條路。",
  process: "花 30 分鐘列出你在意的 5 個條件，排出前三名，下週再看一次有沒有變。",
  self: "預約一次職涯中心諮詢，請諮詢師陪你一起看測驗結果，而不是只看分數。",
  occupations: "挑一位系友，寫一封線上提問，問他一份工作「一天實際在做什麼」。",
  ways: "這週在系友園地收藏三位你想認識的系友，寫下想問每個人的一個問題。",
  unreliable: "把一個你聽來的說法，拿去問一位真的在那個領域工作的系友核對。",
  internal: "把彼此拉扯的兩個選項寫下來，各列三個「選了會得到」和「選了會失去」。",
  external: "找一個不趕時間的時刻，問家人一個問題：「你最擔心我的，是哪一件事？」",
};

/** 從故事裡挑最適合引用的一句（原文子字串） */
function pickQuote(story: EligibleStory) {
  const order = ["q5", "q6", "q8", "q3", "q7", "q4", "q1", "q2", "q9", "free"] as const;
  for (const k of order) {
    const body = story.answers[k]?.trim();
    if (!body) continue;
    const sentences = body.split(/(?<=[。！？])/).map((s) => s.trim()).filter(Boolean);
    let quote = "";
    for (const s of sentences) {
      if ((quote + s).length > 110) break;
      quote += s;
    }
    if (quote.length < 12) quote = body.slice(0, 100);
    return { question: k, quote };
  }
  return null;
}

export async function mockPlan(
  d: Diagnosis,
  scores: CddqScores,
  answers: CddqAnswers,
  stories: EligibleStory[],
): Promise<AgentPlan> {
  const studentTags: Tag[] = cddqTags(answers, scores);
  const want = mergeVector(studentTags);
  const ranked = [...stories].sort((a, b) => cosine(want, mergeVector(b.tags as Tag[])) - cosine(want, mergeVector(a.tags as Tag[])));
  const used = new Set<string>();

  const focuses: AgentPlan["focuses"] = [];
  for (const k of d.salient.slice(0, 3)) {
    // 優先用臺大與全國的資源；左岸自己的服務改由系友故事與推薦系友呈現
    const all = await searchResources([k]);
    const outside = all.filter((r) => r.level !== "leftbank");
    const resources = outside.length ? outside : all;
    // 一個有人帶領、一個自己來，讓學生有兩種選擇
    const human = resources.find((r) => r.needs_human);
    const self = resources.find((r) => !r.needs_human && r.id !== human?.id);
    const resource_ids = [human?.id, self?.id].filter(Boolean).slice(0, 2) as string[];
    if (!resource_ids.length && resources[0]) resource_ids.push(resources[0].id);

    const story = ranked.find((s) => !used.has(s.id));
    const picked = story ? pickQuote(story) : null;
    if (story && picked) used.add(story.id);

    const comps = new Set<Component>([...INTERVENTIONS[k].components, "writing_exercise", "individualized_feedback"]);
    if (resources.some((r) => resource_ids.includes(r.id) && r.needs_human)) comps.add("counselor_support");
    if (story && picked) comps.add("modeling");

    focuses.push({
      subscale: k,
      title: SUBSCALES[k].label,
      why: `你在「${SUBSCALES[k].label}」的分數是 ${scores.subscales[k].toFixed(1)}，是你相對比較卡的地方。${SUBSCALES[k].explain.split("。")[0]}。`,
      alumni_quote: story && picked ? { alumni_id: story.id, question: picked.question, quote: picked.quote } : null,
      resource_ids,
      links: [],
      action: ACTIONS[k],
      writing_prompt: WRITING_EXAMPLES[k][0],
      components: [...comps],
    });
  }
  if (focuses.length && !focuses.some((f) => f.components.includes("support_network") || f.components.includes("counselor_support"))) {
    focuses[0].components.push("support_network");
  }

  return {
    overview: `（示範模式：沒有設定 API 金鑰，不會上網查資料，以下只用資源目錄與系友故事產生。）下面是依你最突出的 ${focuses.length} 個面向整理的建議，每一項都附上一個這週就能做的小行動。`,
    focuses,
    tags: studentTags.slice(0, 10).map((t) => ({ tag: tagKey(t.dimension, t.label), weight: t.weight })),
  };
}
