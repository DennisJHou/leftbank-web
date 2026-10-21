# 左岸計畫網站

臺大心理系「左岸計畫」的網站：串起**系友 × 學生 × 系上**。學生可以讀系友的學思歷程、低門檻地向系友提問或約 Coffee Chat，並透過「職涯羅盤」知道自己卡在哪裡、哪項服務最能幫到自己。

依據上一層資料夾的 [網站規格書.md](../網站規格書.md)（v0.2）與 [DESIGN.md](../DESIGN.md) 建置。

---

## 本機開發

需要 Node.js 20.9 以上。

```bash
npm install
cp .env.example .env.local   # 至少填 SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD，AI 宣傳期也在這裡設定
npm run dev                  # http://localhost:3000
```

- **不用安裝資料庫**：沒有設定 `DATABASE_URL` 時，會自動使用內嵌的 PGlite（真正的 Postgres，資料存在 `.data/pglite`），第一次啟動自動建立空的資料表。網站不含任何示範資料；沒有內容的區塊會顯示「資料建置中」。
- **不用設定寄信**：沒有設定 `GMAIL_APP_PASSWORD` 時，信件不會寄出，而是記錄在資料庫，可以在 [/dev/mailbox](http://localhost:3000/dev/mailbox) 查看並點信裡的按鈕（例如註冊驗證信）。
- **不用 AI 金鑰**：沒有設定 `ANTHROPIC_API_KEY` 時，本機的 AI 對談會用固定回覆代替（畫面會標示「開發模式」，正式環境不會出現）。
- 想從頭來過：先停掉開發伺服器，再執行 `npm run db:reset`。

後台在 [/admin](http://localhost:3000/admin)（前台沒有任何連結），用 `.env.local` 裡的 `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` 登入。

---

## 技術架構

| 項目 | 選擇 |
|---|---|
| 前端＋API | Next.js 16（App Router、Server Actions）、TypeScript、Tailwind CSS 4 |
| 資料庫 | Postgres：正式環境是 **Supabase**（`DATABASE_URL`），本機是 PGlite。同一份 SQL migration |
| 照片 | **Supabase Storage**（有設定時），否則存在本機 `.data/uploads` |
| 會員 | 自建：scrypt 雜湊密碼、httpOnly session cookie、email 驗證與重設密碼 |
| 寄信 | Gmail SMTP（nodemailer） |
| AI | Anthropic Claude API（`@anthropic-ai/sdk`），預設 `claude-opus-5-5`，可用 `AI_MODEL` 更換 |
| 排程 | Vercel Cron 每天呼叫 `/api/cron/daily`（逾期判定、14 天完成確認信） |

### ⚠️ 和規格書不同的地方

1. **會員登入沒有使用 Supabase Auth，而是自己實作。**
   開發時沒有 Supabase 專案與 Docker，無法在本機跑 Supabase Auth；改成自建後，整個網站可以在本機完整測試。資料仍然放在 Supabase 的 Postgres。
   自建的部分包含：email 驗證（24 小時）、重設密碼（1 小時）、前後台登入失敗 5 次鎖 15 分鐘、所有密碼以 scrypt 雜湊。驗證信直接用 Gmail SMTP 寄出（規格書原本也要求 Supabase Auth 改用同一組 SMTP）。
   如果之後想換回 Supabase Auth，需要改寫的範圍集中在 `src/lib/auth.ts` 與 `src/app/actions/auth.ts`。
2. **RLS**：所有資料表都開啟 RLS，但**不開任何 policy**——網站只透過伺服器端連線讀寫，Supabase 公開的 Data API（anon key）讀不到任何資料。「羅盤結果只有本人看得到」由伺服器端程式保證（查詢一律綁定登入者）。因此不需要 `NEXT_PUBLIC_SUPABASE_ANON_KEY`。
3. **資料表**：在規格書的資料模型之外，多了登入需要的 `sessions`、`admin_sessions`、`auth_tokens`、`email_log`；`users` 多了 `password_hash`、`teacher_verified`（老師身分審核）、`email_verified_at` 與登入失敗計數。完整定義見 [db/migrations/0001_init.sql](db/migrations/0001_init.sql)。

---

## 部署到 Vercel + Supabase

1. **Supabase**：建立專案。
   - Project Settings → Database → Connection string，選 **Transaction pooler**（port 6543），這就是 `DATABASE_URL`。
   - Storage → 建立 bucket `public-media`，設為 **Public**。
   - Project Settings → API：取得 Project URL（`NEXT_PUBLIC_SUPABASE_URL`）與 `service_role` key（`SUPABASE_SERVICE_ROLE_KEY`，只放在伺服器端）。
2. **建立資料表**（在自己的電腦執行一次；之後有新的 migration 也是同一個指令）：
   ```bash
   DATABASE_URL="postgres://..." npm run db:migrate
   ```
3. **Gmail**：`leftbank.psy@gmail.com` 開啟兩步驟驗證 → 建立「應用程式密碼」→ 填入 `GMAIL_APP_PASSWORD`。每天上限約 500 封。
4. **Vercel**：把這個資料夾推上 GitHub（它本身就是 git repo 的根目錄），在 Vercel 匯入後，於 Environment Variables 填入 [.env.example](.env.example) 的所有變數：
   - `APP_URL`：網站網址（例如 `https://leftbank.vercel.app`），信裡的連結會用它
   - `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD`：第一個超級管理員，請用長而隨機的密碼
   - `CRON_SECRET`：隨機字串，Vercel Cron 會自動帶上
   - `ANTHROPIC_API_KEY`、`AI_*`：AI 宣傳期設定（見下方）
5. 部署後，用超級管理員登入 `/admin`，在「後台帳號」建立系辦、系主任的管理員帳號，在「首頁內容」上傳主視覺照片。

### AI 生涯對談的設定

| 變數 | 說明 |
|---|---|
| `AI_PROMO_START` / `AI_PROMO_END` | 宣傳期（含當天，臺灣時間）。期間外顯示「即將推出」 |
| `AI_TOTAL_BUDGET_USD` | 全站總預算。所有 AI 呼叫（對談、報告、故事標籤）的花費加總超過就顯示「名額已滿」 |
| `AI_MAX_TURNS` | 每次對談最多幾輪（學生發言次數），預設 8 |
| `AI_MODEL` | 預設 `claude-opus-5-5`；想降低成本可改 `claude-sonnet-5-5` 或 `claude-haiku-5-5` |

每個帳號限用 1 次；預算用完時，已經開始的對談仍可以完成。花費依照官方定價即時記錄在 `ai_usage`，後台儀表板看得到已用金額與剩餘預算。請求帶有 server-side fallback，若模型因安全政策婉拒，會自動改由備援模型回答。

---

## 功能與程式位置

| 規格書 | 位置 |
|---|---|
| 首頁三區塊（主視覺、關於計畫、最新 3 篇故事） | `src/app/(site)/page.tsx` |
| 系友園地（篩選、搜尋、屆別僅登入可見） | `src/app/(site)/alumni/` |
| 系友個人頁（故事、聯絡、演講 +1） | `src/app/(site)/alumni/[id]/` |
| 線上提問／約咖啡表單 | `src/app/(site)/alumni/[id]/contact/`、`src/app/actions/alumni.ts` |
| 信裡的「我會聯絡他／這次先婉拒／已完成」 | `src/app/(site)/r/[token]/`（不用登入；按鈕確認，避免信箱掃描誤觸） |
| 逾期與完成確認排程 | `src/lib/cron.ts`、`src/app/api/cron/daily/route.ts`、`vercel.json` |
| 我的帳號（個人資料、學歷、公開層級、紀錄） | `src/app/(site)/me/` |
| 留下你的故事 | `src/app/(site)/me/story/`、`src/lib/story-questions.ts` |
| 職涯羅盤：量表、AI 對談、結果頁 | `src/app/(site)/compass/`、`src/lib/cddq.ts`、`src/lib/ai.ts` |
| 推薦系統（詞彙表、標籤、cosine 配對） | `src/lib/tags.ts`、`src/lib/tagging.ts`、`src/lib/recommend.ts` |
| 註冊、驗證、登入、重設密碼 | `src/app/(site)/{signup,verify,login,forgot-password,reset-password}/`、`src/app/actions/auth.ts` |
| 身分由學歷推算 | `src/lib/identity.ts` |
| 後台 | `src/app/admin/`、`src/lib/admin-auth.ts` |
| Email 一覽（7 種） | `src/lib/mail.ts` |
| 設計系統（字級、按鈕、色彩） | `src/app/globals.css`、`src/components/ui.tsx` |

### 幾個實作上的決定

- **每位學生 24 小時內最多送出 5 則**提問／咖啡邀請（`DAILY_REQUEST_LIMIT`），避免大量寄信打擾系友；系友接受的次數沒有上限。
- **進行中的申請**：「待回應」，或「已接受且接受未滿 30 天」。同一位學生對同一位系友，同時只能有一筆（`ACCEPTED_ACTIVE_DAYS`，`src/lib/constants.ts`）。
- **接受率**（後台 KPI）＝已接受（含已完成）÷ 已有結果的申請（不含待回應）。學期依臺灣學年度（8 月起為上學期）。
- **管理員的去識別化統計**：人數少於 3 的分組不顯示；同一人同學期重測只計最後一次。
- **屆別**：最早一筆學歷的畢業年（例如「學士 2018 屆」），沒有畢業年時顯示入學年。
- **老師**：註冊選「教師」需要審核；若同時填了有學號的系友學歷，審核前可以先用系友身分使用。審核通過時會寄信通知。
- **故事被下架後**，作者仍可編輯，但維持下架，由管理員決定是否恢復。

---

## 設計系統

視覺參考 Aesop：淺米白底（`#fffef2`）、深灰文字（`#333`）、直角元件、大量留白。全站只用以下字級（定義在 `src/app/globals.css`）：

| 名稱 | 用途 | 大小 |
|---|---|---|
| `h-display` | 首頁主標題 | 36–60px，襯線 |
| `h-page` | 每頁最大的標題 | 32–48px，襯線 |
| `h-section` | 區塊標題、「某某的故事」 | 24–32px，襯線 |
| `h-item` | 人名、卡片標題、題目 | 18px，無襯線粗體 |
| `text-body` | 內文 | 17px |
| `text-meta` | 次要資訊、按鈕 | 15px |
| `text-note` | 最小的提示文字 | 14px（不再更小） |

- 按鈕一律直角，只有兩種尺寸：`btn`（48px 高）與 `btn-sm`（40px，用在導覽列與後台表格）。樣式：`btn-dark`（主要）、`btn-outline`（次要）、`btn-light`（深色圖片上）、`btn-text`（文字型）。導覽列的「註冊／登入」是全站唯一的藍色按鈕。
- 篩選與分頁用底線式的 `tabs`／`tab`；表單裡的選項用直角的 `option`；狀態用 `tag`。
- 全站不使用 emoji，也不使用膠囊形（全圓角）的按鈕與標籤。
- 首頁預設主視覺是黃昏的河岸咖啡館插畫（`src/components/HeroIllustration.tsx`），後台可以換成照片；照片上會自動加深色漸層，讓白色標題清楚。

---

## 職涯羅盤量表（重要）

`src/lib/cddq.ts` 依照 Gati 生涯決策困難問卷（CDDQ）的架構：3 大類、10 個小項、32 題計分＋2 題效度題、9 點量表；平均 > 6.33 為「明顯卡關」、< 3.67 為「穩定」。

**目前的題目文字是依各小項定義自行撰寫的「試行版」，不是田秀蘭（2001）中文版的原題。** 取得授權後，只要替換 `ITEMS` 的 `text`（小項與題數不變）並更新 `ITEM_VERSION`，計分、結果頁、推薦都不用改。若改用 CAAS 或自編量表，需要一併調整 `SUBSCALES` 與 `CATEGORIES`。

---

## 常用指令

| 指令 | 用途 |
|---|---|
| `npm run dev` | 開發伺服器 |
| `npm run build` / `npm start` | 正式版建置與啟動 |
| `npm run typecheck` | TypeScript 檢查 |
| `npm run db:migrate` | 對 `DATABASE_URL` 執行 migration |
| `npm run db:reset` | 清空本機 PGlite 資料（下次啟動重建空的資料表） |

---

## 待辦

1. **CDDQ 授權**：由家安寫信給田秀蘭老師確認；取得後替換題目（見上方）。
2. **AI 宣傳期參數**：起訖日期、總預算、輪數上限，上線前在 Vercel 設定。
3. **老師的額外權限**：之後再討論（目前與一般使用者相同，只是標示「老師」）。
4. **隱私權說明頁**：知情同意已寫在羅盤開始前；正式上線前建議補一頁完整的隱私權政策。
