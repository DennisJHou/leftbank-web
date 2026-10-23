/**
 * 本機示範資料：只在 PGlite（沒有 DATABASE_URL）且資料庫是空的時候寫入。
 * 所有人物、故事都是虛構的。示範帳號的密碼見 README。
 */
import type { Db } from "./db";
import { pgArray } from "./db";
import { hashPassword, randomToken } from "./crypto";
import { keywordTags, profileTags, cddqTags, type Tag } from "./tagging";
import { scoreCddq, ITEMS, ITEM_VERSION, type CddqAnswers } from "./cddq";
import type { StoryAnswers } from "./story-questions";

export const DEMO_PASSWORD = "leftbank2026";
export const DEMO_ADMIN = { email: "admin@leftbank.test", password: "leftbank-admin-2026" };

type Edu = [degree: "B" | "M" | "D", studentNo: string | null, entry: number | null, grad: number | null];

type Person = {
  key: string;
  name: string;
  email: string;
  edu: Edu[];
  teacher?: "verified" | "pending";
  status?: "active" | "pending";
  profile?: {
    title: string;
    fields: string[];
    company?: string;
    directory?: boolean;
    question?: boolean;
    coffee?: boolean;
    talk?: boolean;
    hide?: string[];
  };
  story?: { tagline: string; answers: StoryAnswers; daysAgo: number };
};

const PEOPLE: Person[] = [
  {
    key: "yuan",
    name: "林予安",
    email: "yuan@leftbank.test",
    edu: [
      ["B", "B03207011", 2014, 2018],
      ["M", "R07227004", 2018, 2020],
    ],
    profile: {
      title: "UX Researcher",
      fields: ["使用者經驗與產品"],
      company: "某金融科技公司",
      question: true,
      coffee: true,
      talk: true,
    },
    story: {
      daysAgo: 2,
      tagline: "實驗設計教會我的，是怎麼好好問一個問題。",
      answers: {
        q1: "高中時讀了一本談認知偏誤的科普書，覺得人腦的「bug」好有趣，就填了心理系。進來才發現，心理系有一半的時間在學統計和實驗設計，和想像中「讀心」的樣子完全不同。但也正是這些看似枯燥的方法學，後來成了我工作上最常用的工具。",
        q3: "碩士讀的是認知組，原本以為會繼續念博士。碩二那年去一間軟體公司做使用者研究的實習，第一次看到自己設計的訪談，真的改變了一個產品的決策，那種「研究被用上」的感覺很強烈。畢業後先進了一間電商公司當 UX Researcher，三年後轉到現在的金融科技公司。每一次轉換，我都問自己同一個問題：在這裡，我還能學到新的研究方法嗎？",
        q6: "想對大四的自己說：不用急著把自己定位成「學術的人」或「業界的人」。研究能力在哪裡都用得到，重要的是先找到你真正想回答的問題。另外，統計課請認真上。",
        q7: "使用者研究這一行最需要的，是能把模糊的商業問題，轉化成可以研究的問題的人。在學期間可以多修質性研究方法，試著幫系上的研究或社團做一次完整的訪談，從招募、設計題綱到寫報告，比任何證書都有用。",
      },
    },
  },
  {
    key: "siyu",
    name: "陳思妤",
    email: "siyu@leftbank.test",
    edu: [
      ["B", "B99207023", 2010, 2014],
      ["M", "R03227012", 2014, 2017],
    ],
    profile: {
      title: "臨床心理師",
      fields: ["臨床與諮商心理", "醫療與公共衛生"],
      company: "區域醫院精神科",
      question: true,
      talk: true,
    },
    story: {
      daysAgo: 5,
      tagline: "陪伴一個人走過低谷，是我選擇的日常。",
      answers: {
        q2: "印象最深的是大三的變態心理學。老師在課堂上分享一位個案的故事，說「診斷是為了理解，不是為了貼標籤」。那句話我到現在執業都還記得。",
        q3: "大學畢業後直接考上臨床組碩士班，碩三在醫院全職實習，之後考取臨床心理師執照，進入區域醫院精神科服務至今。這條路看起來很直，其實中間有一年我很想放棄：實習時每天面對很重的個案，回家常常哭。後來是督導帶著我學會照顧自己，才撐了過來。國考那年我也懷疑過自己是不是適合，但每次個案說「謝謝你聽我說」，就覺得值得。",
        q5: "最迷惘是碩二。同學有人轉去業界、有人出國，我一邊趕論文一邊懷疑：當臨床心理師的薪水和工時，真的是我要的嗎？後來我去和三位不同年資的學姐聊，發現每個人都有過一樣的掙扎。她們沒有給我答案，但讓我知道這個疑問是正常的。",
        q8: "最慶幸的是在實習時，主動申請輪調到兒童青少年病房。那段經驗讓我找到最想服務的族群。",
      },
    },
  },
  {
    key: "borui",
    name: "黃柏睿",
    email: "borui@leftbank.test",
    edu: [["B", "B01207045", 2012, 2016]],
    profile: {
      title: "資深資料科學家",
      fields: ["資料科學與 AI"],
      company: "跨國電商",
      question: true,
      coffee: true,
    },
    story: {
      daysAgo: 9,
      tagline: "心理系給我的，是對「人為什麼這樣做」的好奇。",
      answers: {
        q1: "老實說是分數落點。進來之後發現自己很喜歡心理計量和統計，常常一個人在電腦教室跑 R 跑到半夜。",
        q3: "大學畢業後去美國讀了資料科學碩士，畢業後留在當地的新創做分析師。兩年後公司被併購，我決定回台灣，進了現在的跨國電商。每一次轉換都不是規劃好的，而是在當下問自己：「哪個選擇能讓我繼續學到最多？」出國那個決定最難，因為家裡希望我考公職，我花了半年和爸媽溝通，最後用獎學金說服了他們。",
        q4: "我做的推薦系統，本質上就是在預測人的行為。心理學讓我不會只看數字，而會追問背後的動機：使用者是真的喜歡，還是只是被演算法推著走？",
        q7: "這個領域需要能寫程式、也能把結果講給非技術背景的人聽懂的人。在學期間可以把統計學好，學一門程式語言，並試著用公開資料完成一個完整的小專案。",
      },
    },
  },
  {
    key: "yazhu",
    name: "張雅筑",
    email: "yazhu@leftbank.test",
    edu: [["B", "B97207008", 2008, 2012]],
    profile: {
      title: "HR Business Partner",
      fields: ["人資與組織發展"],
      company: "外商半導體公司",
      coffee: true,
      talk: true,
    },
    story: {
      daysAgo: 14,
      tagline: "組織裡最難的，永遠是人；最有趣的，也是人。",
      answers: {
        q3: "畢業後第一份工作是在人力銀行當招募顧問，每天打幾十通電話，學會了怎麼在短時間內認識一個人。三年後轉到外商擔任人資專員，之後一路做到 HRBP。中間也考慮過回學校讀工商心理碩士，最後選擇邊工作邊上在職課程。我的每一次轉換，都是因為發現自己想更靠近「決策」的位置。",
        q5: "二十七歲那年，我在招募工作上做得很好，但覺得自己只是在「賣職缺」。那時候很迷惘，不知道該繼續衝業績還是轉換。後來我找了一位前主管喝咖啡，他問我：「你喜歡的是成交，還是看到人在對的位置上發光？」我才確定自己要往組織發展走。",
        q6: "想對大一的自己說：多參加社團幹部，學會帶人和處理衝突。那些經驗在職場上比成績單有用很多。",
      },
    },
  },
  {
    key: "chenghan",
    name: "吳承翰",
    email: "chenghan@leftbank.test",
    edu: [
      ["B", "B00207031", 2011, 2015],
      ["M", "R04227008", 2015, 2017],
      ["D", "D06227002", 2017, 2022],
    ],
    profile: {
      title: "博士後研究員",
      fields: ["神經科學與生醫", "學術研究"],
      company: "海外大學認知神經科學研究所",
      question: true,
    },
    story: {
      daysAgo: 21,
      tagline: "做研究像在黑暗中摸索，但偶爾會摸到一扇門。",
      answers: {
        q2: "大三進了一間做腦造影的實驗室當研究助理。第一次看到自己收的 fMRI 資料跑出結果，那種興奮感讓我決定走學術。",
        q3: "在系上一路從學士讀到博士，博士班期間去國外交換一年。畢業後申請到現在的博士後職位，研究注意力的神經機制。走學術這條路，每一步都充滿不確定：論文會不會被接受、經費會不會通過、下一份工作在哪裡。我的方法是每隔一陣子就重新問自己：如果明天要離開學術界，我會後悔嗎？到目前為止答案都是會，所以繼續走。",
        q9: "推薦《Advice for a Young Investigator》。書很薄，但每次迷惘時重讀，都有不同的收穫。",
      },
    },
  },
  {
    key: "yizhen",
    name: "劉宜蓁",
    email: "yizhen@leftbank.test",
    edu: [["B", "B05207019", 2016, 2020]],
    profile: {
      title: "品牌行銷經理",
      fields: ["行銷、品牌與傳播"],
      company: "生活風格品牌",
      question: true,
      coffee: true,
    },
  },
  {
    key: "yuxiang",
    name: "鄭宇翔",
    email: "yuxiang@leftbank.test",
    edu: [["B", "B02207033", 2013, 2018]],
    profile: {
      title: "共同創辦人",
      fields: ["創業", "使用者經驗與產品"],
      company: "心理健康新創",
      coffee: true,
      talk: true,
    },
    story: {
      daysAgo: 30,
      tagline: "延畢那一年，是我人生最好的投資。",
      answers: {
        q3: "我延畢了一年，那一年在一間社會企業實習，第一次接觸到「用產品解決心理健康問題」這件事。畢業後先在新創當產品經理三年，學會怎麼把想法變成真的能用的東西，後來和兩位朋友一起創業，做大學生的心理健康服務。決定創業時最難的是放棄穩定的薪水，家人也很擔心，我和他們約定：給自己兩年，做不起來就回去上班。",
        q5: "大四時看同學都在準備研究所和求職，我卻完全不知道自己要什麼，焦慮到失眠。延畢一年給了我喘息的空間，也讓我有機會用實習去「試」不同的可能。",
        q8: "最慶幸的是延畢那年沒有因為怕別人眼光而急著畢業。",
      },
    },
  },
  {
    key: "teacher",
    name: "葉明哲",
    email: "yeh@leftbank.test",
    edu: [],
    teacher: "verified",
    profile: {
      title: "心理學系教授",
      fields: ["學術研究"],
      company: "臺大心理系",
      question: true,
    },
  },
  {
    key: "pinxuan",
    name: "何品萱",
    email: "pinxuan@leftbank.test",
    edu: [["B", "B04207027", 2015, 2019]],
    profile: {
      title: "國小專任輔導教師",
      fields: ["教育"],
      question: true,
      hide: ["company"],
    },
  },
  // ─── 學生 ───
  { key: "chiayu", name: "許家瑜", email: "chiayu@leftbank.test", edu: [["B", "B12207011", 2023, null]] },
  {
    key: "wenyen",
    name: "蔡文彥",
    email: "wenyen@leftbank.test",
    edu: [
      ["B", "B10207020", 2021, 2025],
      ["M", "R14227003", 2025, null],
    ],
  },
  { key: "yun", name: "周昀", email: "yun@leftbank.test", edu: [["B", "B13207040", 2024, null]] },
  // ─── 待審核、重複學號 ───
  { key: "mengru", name: "李孟儒", email: "mengru@leftbank.test", edu: [], teacher: "pending", status: "pending" },
  { key: "guohua", name: "趙國華", email: "guohua@leftbank.test", edu: [["B", null, null, 1995]], status: "pending" },
  { key: "dup", name: "許佳瑜", email: "chiayu2@leftbank.test", edu: [["B", "B12207011", 2023, null]] },
];

export async function seedIfEmpty(db: Db) {
  const row = await db.one<{ n: number }>("select count(*)::int as n from users");
  if ((row?.n ?? 0) > 0) return;
  if (process.env.NODE_ENV === "production" && process.env.SEED_DEMO !== "1") return;
  await seed(db);
  console.info("[seed] 已寫入示範資料");
}

async function seed(db: Db) {
  const hash = await hashPassword(DEMO_PASSWORD);
  const ids: Record<string, string> = {};

  await db.tx(async (t) => {
    for (const p of PEOPLE) {
      const u = await t.one<{ id: string }>(
        `insert into users (name, email, password_hash, role_teacher, teacher_verified, status, email_verified_at, created_at)
         values ($1, $2, $3, $4, $5, $6, now(), now() - make_interval(days => $7)) returning id`,
        [p.name, p.email, hash, Boolean(p.teacher), p.teacher === "verified", p.status ?? "active", 40 - PEOPLE.indexOf(p)],
      );
      ids[p.key] = u!.id;
      for (const [degree, no, entry, grad] of p.edu) {
        await t.query(
          "insert into education (user_id, degree, student_no, entry_year, grad_year) values ($1, $2, $3, $4, $5)",
          [u!.id, degree, no, entry, grad],
        );
      }
      if (p.profile) {
        const vis = {
          photo: "public",
          title: "public",
          field: "public",
          company: "public",
          class_year: "members",
          education: "members",
        } as Record<string, string>;
        for (const h of p.profile.hide ?? []) vis[h] = "hidden";
        await t.query(
          `insert into alumni_profiles (user_id, title, field_category, company, show_in_directory, accept_question, accept_coffee, willing_to_talk, visibility)
           values ($1, $2, $3::text[], $4, $5, $6, $7, $8, $9::jsonb)`,
          [
            u!.id,
            p.profile.title,
            pgArray(p.profile.fields),
            p.profile.company ?? null,
            p.profile.directory ?? true,
            Boolean(p.profile.question),
            Boolean(p.profile.coffee),
            Boolean(p.profile.talk),
            JSON.stringify(vis),
          ],
        );
        await writeTags(t, u!.id, "profile", profileTags({ title: p.profile.title, field_category: p.profile.fields }));
      }
      if (p.story) {
        await t.query(
          `insert into stories (user_id, tagline, answers, created_at, updated_at)
           values ($1, $2, $3::jsonb, now() - make_interval(days => $4), now() - make_interval(days => $4))`,
          [u!.id, p.story.tagline, JSON.stringify(p.story.answers), p.story.daysAgo],
        );
        const text = [p.profile?.title ?? "", p.story.tagline, ...Object.values(p.story.answers)].join("\n");
        await writeTags(t, u!.id, "story", keywordTags(text));
      }
    }

    // 提問與咖啡紀錄
    const req = async (
      from: string,
      to: string,
      type: "question" | "coffee",
      status: string,
      createdDaysAgo: number,
      respondedDaysAgo: number | null,
    ) => {
      await t.query(
        `insert into contact_requests (from_user, to_user, type, intro, questions, mode, availability, status, token, created_at, responded_at, completed_at)
         values ($1, $2, $3, $4, $5::text[], $6, $7, $8, $9, now() - make_interval(days => $10),
                 case when $11::int is null then null else now() - make_interval(days => $11::int) end,
                 case when $8 = 'completed' then now() - make_interval(days => greatest(coalesce($11::int, 0) - 3, 0)) else null end)`,
        [
          ids[from],
          ids[to],
          type,
          "我是心理系的學生，對你的工作領域很好奇，想請教幾個問題。",
          pgArray(
            type === "coffee"
              ? ["你每天的工作內容大概是什麼？", "在學期間可以先做哪些準備？", "當初是怎麼決定走這條路的？"]
              : ["這個領域的新人最常遇到什麼困難？", "如果重來一次，你會修哪些課？"],
          ),
          type === "coffee" ? "either" : null,
          type === "coffee" ? "平日晚上或週末下午" : null,
          status,
          randomToken(),
          createdDaysAgo,
          respondedDaysAgo,
        ],
      );
    };
    await req("chiayu", "yuan", "coffee", "accepted", 6, 4);
    await req("chiayu", "siyu", "question", "pending", 2, null);
    await req("yun", "borui", "question", "completed", 40, 38);
    await req("yun", "yazhu", "coffee", "declined", 20, 18);
    await req("wenyen", "chenghan", "question", "overdue", 30, null);
    await req("wenyen", "yuan", "question", "completed", 60, 59);

    // 演講意願票
    const votes: [string, string][] = [
      ["chiayu", "yuan"],
      ["yun", "yuan"],
      ["wenyen", "yuan"],
      ["chiayu", "siyu"],
      ["yun", "yuxiang"],
      ["wenyen", "yuxiang"],
      ["chiayu", "yazhu"],
    ];
    for (const [u, a] of votes) await t.query("insert into talk_votes (user_id, alumni_id) values ($1, $2)", [ids[u], ids[a]]);

    // 職涯羅盤：許家瑜做過兩次，可以看到前後比較
    await compass(t, ids.chiayu, 35, 7, ["使用者經驗與產品", "臨床與諮商心理"], "senior", "occupation");
    await compass(t, ids.chiayu, 3, 5, ["使用者經驗與產品", "臨床與諮商心理"], "senior", "occupation");
    await compass(t, ids.yun, 12, 4, ["資料科學與 AI"], "early", "direction");
  });

  // 後台：一個一般管理員（超級管理員來自環境變數）
  await db.query("insert into admin_accounts (email, name, password_hash, level) values ($1, $2, $3, 'admin')", [
    DEMO_ADMIN.email,
    "系辦（示範）",
    await hashPassword(DEMO_ADMIN.password),
  ]);
}

async function writeTags(t: Db, userId: string, source: string, tags: Tag[]) {
  const seen = new Map<string, Tag>();
  for (const tag of tags) {
    const k = tag.dimension + tag.label;
    if (!seen.has(k) || seen.get(k)!.weight < tag.weight) seen.set(k, tag);
  }
  for (const tag of seen.values()) {
    await t.query(
      `insert into user_tags (user_id, tag_id, weight, source)
       select $1, id, $4, $5 from tag_vocab where dimension = $2 and label = $3
       on conflict (user_id, tag_id, source) do update set weight = excluded.weight, updated_at = now()`,
      [userId, tag.dimension, tag.label, tag.weight, source],
    );
  }
}

/** 產生一份示範的量表作答：level 越高，困難越明顯 */
async function compass(
  t: Db,
  userId: string,
  daysAgo: number,
  level: number,
  interests: string[],
  stage: CddqAnswers["stage"],
  goal: CddqAnswers["goal"],
) {
  const items: Record<string, number> = {};
  ITEMS.forEach((item, i) => {
    if ("validity" in item) items[item.id] = item.validity;
    else {
      const bump = /^[osw]/.test(item.id) ? 2 : /^[mb]/.test(item.id) ? -2 : 0;
      items[item.id] = Math.min(9, Math.max(1, level + bump + ((i * 7) % 3) - 1));
    }
  });
  const answers: CddqAnswers = { version: ITEM_VERSION, items, interests, stage, goal };
  const scores = scoreCddq(items);
  await t.query(
    `insert into compass_sessions (user_id, kind, answers, scores, consent_at, created_at, completed_at)
     values ($1, 'cddq', $2::jsonb, $3::jsonb, now() - make_interval(days => $4), now() - make_interval(days => $4), now() - make_interval(days => $4))`,
    [userId, JSON.stringify(answers), JSON.stringify(scores), daysAgo],
  );
  await writeTags(t, userId, "cddq", cddqTags(answers, scores));
}
