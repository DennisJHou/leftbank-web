import { notFound } from "next/navigation";
import { Arrow } from "@/components/ui";

export const metadata = { title: "設計規範（開發用）", robots: { index: false } };

/** 本機開發用：把設計規範（DESIGN.md）裡的顏色、字級、元件實際畫出來。正式環境不會顯示。 */
const COLORS: { group: string; items: { name: string; role: string }[] }[] = [
  {
    group: "底與面",
    items: [
      { name: "canvas", role: "頁面底色（方格紙）" },
      { name: "surface", role: "卡片、輸入框的白" },
      { name: "panel", role: "淺色面板、停用底色" },
      { name: "hairline", role: "細線、卡片外框" },
      { name: "line", role: "輸入框外框、標籤外框" },
    ],
  },
  {
    group: "文字",
    items: [
      { name: "ink-strong", role: "標題" },
      { name: "ink", role: "內文" },
      { name: "ash", role: "次要文字（符合 AA）" },
      { name: "placeholder", role: "輸入框提示字" },
    ],
  },
  {
    group: "互動與強調",
    items: [
      { name: "river", role: "河水綠：全站唯一的互動色" },
      { name: "river-deep", role: "河水綠，按下／滑過" },
      { name: "seal", role: "印章紅，只用在印章" },
    ],
  },
  {
    group: "狀態",
    items: [
      { name: "ok", role: "成功" },
      { name: "accent", role: "待處理、審核中" },
      { name: "error", role: "錯誤、不可逆" },
    ],
  },
  {
    group: "水彩色塊（插畫、編號）",
    items: [
      { name: "wash-sage", role: "鼠尾草" },
      { name: "wash-ochre", role: "赭黃" },
      { name: "wash-clay", role: "陶土" },
      { name: "wash-river", role: "河水" },
    ],
  },
];

const TYPE: { cls: string; label: string; use: string; sample: string }[] = [
  { cls: "h-display", label: "display", use: "首頁主標", sample: "歡迎來到左岸" },
  { cls: "h-feature", label: "feature", use: "介紹性頁面的標題、首頁區塊標題", sample: "學長姐走過的路" },
  { cls: "h-page", label: "page", use: "功能性頁面的標題（登入、我的帳號）", sample: "我的帳號" },
  { cls: "h-section", label: "section", use: "區塊標題", sample: "留下你的故事" },
  { cls: "h-item", label: "item", use: "人名、卡片標題、題目", sample: "林予寧" },
  { cls: "", label: "body", use: "內文", sample: "二十幾歲時，你最迷惘的一段時間是什麼時候？" },
  { cls: "text-meta", label: "meta", use: "次要資訊、按鈕", sample: "臺大心理系 · 2018 屆" },
  { cls: "text-note", label: "note", use: "最小的提示文字", sample: "每題建議 150–400 字" },
];

function Block({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="mt-16">
      <h2 className="h-section">{title}</h2>
      {note && <p className="mt-2 max-w-2xl text-meta text-ash">{note}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function DesignGuide() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div>
      <div className="container-page pb-16 pt-12 md:pt-20">
        <span className="eyebrow">#設計規範</span>
        <h1 className="h-feature mt-3">左岸計畫的樣子</h1>
        <p className="prose-airy mt-5 max-w-2xl text-ash">
          這一頁把 DESIGN.md 的規則畫出來。容器像紙，是直角；動作與選擇像鵝卵石，是膠囊；全站只有一個互動色，河水綠。
        </p>

        <Block title="顏色" note="所有顏色都是 globals.css 裡的 token。新頁面只用這裡列出的顏色。">
          <div className="space-y-8">
            {COLORS.map((g) => (
              <div key={g.group}>
                <p className="eyebrow text-ash">{g.group}</p>
                <ul className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
                  {g.items.map((c) => (
                    <li key={c.name}>
                      <div className="h-16 ring-1 ring-hairline" style={{ background: `var(--color-${c.name})` }} />
                      <p className="mt-2 text-meta text-ink-strong">{c.name}</p>
                      <p className="text-note text-ash">{c.role}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Block>

        <Block title="字級" note="只用這八個。印章、編號、姓名卡、品牌字是裝飾字，不在此列。">
          <ul className="divide-y divide-hairline border-y border-hairline">
            {TYPE.map((t) => (
              <li key={t.label} className="grid items-baseline gap-2 py-5 md:grid-cols-[180px_1fr]">
                <p className="text-note text-ash">
                  {t.label}
                  <span className="block">{t.use}</span>
                </p>
                <p className={t.cls}>{t.sample}</p>
              </li>
            ))}
            <li className="grid items-baseline gap-2 py-5 md:grid-cols-[180px_1fr]">
              <p className="text-note text-ash">
                quote-kai
                <span className="block">楷體引文</span>
              </p>
              <p className="quote-kai">對話，正是左岸精神的核心。</p>
            </li>
            <li className="grid items-baseline gap-2 py-5 md:grid-cols-[180px_1fr]">
              <p className="text-note text-ash">
                text-tagline
                <span className="block">系友的一句話</span>
              </p>
              <p className="text-tagline">「我花了很久才知道，迷惘本身就是一種方向。」</p>
            </li>
          </ul>
        </Block>

        <Block title="按鈕" note="同一組 class 全站通用。一個畫面只放一個主要按鈕；次要是外框；第三層用文字型或 link-arrow。">
          <div className="space-y-8">
            <div className="flex flex-wrap items-center gap-4">
              <button className="btn btn-primary">主要 <Arrow /></button>
              <button className="btn">次要 <Arrow /></button>
              <button className="btn btn-text">文字型</button>
              <button className="btn btn-text btn-danger">移除</button>
              <button className="btn" disabled>停用</button>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <button className="btn btn-primary btn-sm">小：主要</button>
              <button className="btn btn-sm">小：次要</button>
              <a className="link-arrow" href="#">連結型 <Arrow /></a>
            </div>
            <div className="flex flex-wrap items-center gap-4 bg-ink-band p-6">
              <button className="btn btn-light">深色圖片上</button>
            </div>
            <div className="admin-ui flex flex-wrap items-center gap-4 border border-dashed border-line p-6">
              <span className="text-note text-ash">後台（直角、墨色）</span>
              <button className="btn btn-primary btn-sm">主要</button>
              <button className="btn btn-sm">次要</button>
              <span className="tag">已下架</span>
            </div>
          </div>
        </Block>

        <Block title="選擇與標籤" note="篩選、選項、標籤都是膠囊。有說明文字的選項卡是例外，維持直角。">
          <div className="flex flex-wrap items-center gap-3">
            <span className="chip" aria-pressed="true">線上提問</span>
            <span className="chip">約咖啡</span>
            <span className="chip">願意回校分享</span>
            <span className="tag">使用者經驗與產品</span>
            <span className="tag tag-ok">已完成</span>
            <span className="tag tag-accent">待回應</span>
            <span className="tag tag-error">逾期</span>
          </div>
        </Block>

        <Block title="表單" note="填寫是在「寫」，所以輸入框像紙，是直角；聚焦時外框轉河水綠。">
          <div className="grid max-w-3xl gap-6 md:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="d-name">姓名</label>
              <input id="d-name" className="input" defaultValue="林予寧" />
              <p className="field-hint">我們會寄一封驗證信到這個信箱。</p>
            </div>
            <div>
              <label className="field-label" htmlFor="d-field">領域</label>
              <select id="d-field" className="input">
                <option>使用者經驗與產品</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="field-label" htmlFor="d-text">想問的問題</label>
              <textarea id="d-text" rows={3} className="input" placeholder="例如：從心理系轉到產品設計，一開始最難的是什麼？" />
            </div>
            <label className="option">
              <input type="checkbox" className="checkbox mr-3" defaultChecked />
              出現在系友園地
            </label>
          </div>
        </Block>

        <Block title="卡片與提示" note="容器像紙：直角、細線外框。方格紙上的卡片是半透明白。">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="paper-card p-7">
              <p className="h-item tracking-[0.12em]">方格紙上的卡片</p>
              <p className="prose-airy mt-2 text-ash">半透明白底，隱約透出格線。</p>
            </div>
            <div className="card p-7">
              <p className="h-item tracking-[0.12em]">一般卡片</p>
              <p className="prose-airy mt-2 text-ash">白底，用在表單頁與後台。</p>
            </div>
            <p className="notice">一般提示：已寄出驗證信。</p>
            <p className="notice notice-ok">成功：已發布。</p>
            <p className="notice notice-error md:col-span-2">錯誤：密碼至少需要 8 個字元。</p>
          </div>
        </Block>

        <Block title="印章與編號" note="印章只用在「左岸計畫」與「老師」；編號用水彩色塊。">
          <div className="flex items-center gap-6">
            <span className="seal text-[0.9375rem]">左岸計畫</span>
            <span className="numeral" style={{ background: "var(--color-wash-sage)" }}>一</span>
            <span className="numeral" style={{ background: "var(--color-wash-ochre)" }}>二</span>
            <span className="numeral" style={{ background: "var(--color-wash-clay)" }}>三</span>
          </div>
        </Block>
      </div>
    </div>
  );
}
