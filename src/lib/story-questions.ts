/** 系友故事的寫作框架：九題任選至少 1 題回答，最後是選填的自由段 */

export type StoryKey = "q1" | "q2" | "q3" | "q4" | "q5" | "q6" | "q7" | "q8" | "q9" | "free";

export const STORY_QUESTIONS: { key: Exclude<StoryKey, "free">; text: string }[] = [
  { key: "q1", text: "當初為什麼選擇心理系？進來之後，和你想像的有什麼不一樣？" },
  { key: "q2", text: "在系上，印象最深刻的一門課、一位老師，或一件事是什麼？" },
  { key: "q3", text: "離開臺大心理系之後，你曾在哪些地方求學或任職？每一次生涯的轉換，是怎麼決定的？" },
  { key: "q4", text: "心理學在你的工作與生活中，扮演著什麼樣的角色？" },
  { key: "q5", text: "二十幾歲時，你最迷惘的一段時間是什麼時候？後來是怎麼走過來的？" },
  { key: "q6", text: "如果能回到大一，或大四畢業前夕，你會想對當時的自己說什麼？" },
  { key: "q7", text: "你現在所在的領域，最需要什麼樣的人？在學期間可以先做哪些準備？" },
  { key: "q8", text: "這一路上，有沒有哪個決定讓你特別慶幸？" },
  { key: "q9", text: "你最推薦的一本書、一門課，或一個資源是什麼？為什麼？" },
];

export const STORY_FREE = { key: "free" as const, text: "還想對學弟妹說的話" };

/** 九題至少要回答幾題 */
export const STORY_MIN_ANSWERS = 1;

/** 每題建議字數（軟性提示，不強制） */
export const STORY_SUGGESTED = { min: 150, max: 400 };

export const TAGLINE_MAX = 60;

export type StoryAnswers = Partial<Record<StoryKey, string>>;

/** 依題目順序回傳有作答的段落 */
export function storySections(answers: StoryAnswers) {
  const sections = STORY_QUESTIONS.filter((q) => answers[q.key]?.trim()).map((q) => ({
    key: q.key,
    title: q.text,
    body: answers[q.key]!.trim(),
  }));
  if (answers.free?.trim()) sections.push({ key: "free" as never, title: STORY_FREE.text, body: answers.free.trim() });
  return sections;
}

export function countAnswered(answers: StoryAnswers) {
  return STORY_QUESTIONS.filter((q) => answers[q.key]?.trim()).length;
}

export function validateStory(tagline: string, answers: StoryAnswers): string | null {
  if (!tagline.trim()) return "請寫下一句話，它會出現在首頁的故事卡上。";
  if (tagline.trim().length > TAGLINE_MAX) return `一句話請在 ${TAGLINE_MAX} 字以內。`;
  if (countAnswered(answers) < STORY_MIN_ANSWERS) return `九題裡請至少回答 ${STORY_MIN_ANSWERS} 題。`;
  return null;
}
