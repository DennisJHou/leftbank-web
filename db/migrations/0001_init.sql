-- 左岸計畫網站 初始資料表
-- 同一份檔案在本機的 PGlite 與正式環境的 Supabase Postgres 都能執行。
-- 網站只透過伺服器端連線存取資料；所有資料表都開啟 RLS 且不開任何 policy，
-- 因此 Supabase 的公開 API（anon / authenticated）讀不到任何一筆資料。

-- ─── 前台帳號 ──────────────────────────────────────────

create table users (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  email            text not null unique,
  password_hash    text not null,
  role_teacher     boolean not null default false,
  -- 老師身分需管理員審核；審核前若同時是系友，可以先用系友身分使用
  teacher_verified boolean not null default false,
  status           text not null default 'pending'
                   check (status in ('active', 'pending', 'suspended')),
  email_verified_at timestamptz,
  failed_attempts  int not null default 0,
  locked_until     timestamptz,
  created_at       timestamptz not null default now()
);

create table education (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  degree      text not null check (degree in ('B', 'M', 'D')),
  student_no  text,
  entry_year  int,
  grad_year   int,              -- 空白代表在學中
  created_at  timestamptz not null default now()
);
create index education_user_idx on education(user_id);
create index education_student_no_idx on education(student_no);

create table alumni_profiles (
  user_id           uuid primary key references users(id) on delete cascade,
  title             text,
  field_category    text[] not null default '{}',
  company           text,
  photo_url         text,
  show_in_directory boolean not null default false,
  accept_question   boolean not null default false,
  accept_coffee     boolean not null default false,
  willing_to_talk   boolean not null default false,
  -- 各欄位的公開設定：photo/title/field/company = public|hidden，class_year/education = members|hidden
  visibility        jsonb not null default
    '{"photo":"public","title":"public","field":"public","company":"public","class_year":"members","education":"members"}',
  updated_at        timestamptz not null default now()
);

-- ─── 系友故事 ──────────────────────────────────────────

create table stories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  campaign_id uuid,             -- 預留：未來不同寫作企劃，可支援一人多篇
  tagline     text not null,
  answers     jsonb not null default '{}',   -- {q1..q9, free}
  status      text not null default 'published' check (status in ('published', 'hidden')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- 這次的規則：每人一篇（沒有企劃的故事）
create unique index stories_one_per_user on stories(user_id) where campaign_id is null;

-- ─── 線上提問／約咖啡 ──────────────────────────────────

create table contact_requests (
  id            uuid primary key default gen_random_uuid(),
  from_user     uuid not null references users(id) on delete cascade,
  to_user       uuid not null references users(id) on delete cascade,
  type          text not null check (type in ('question', 'coffee')),
  intro         text not null,
  questions     text[] not null default '{}',
  mode          text check (mode in ('in_person', 'online', 'either')),
  availability  text,
  status        text not null default 'pending'
                check (status in ('pending', 'accepted', 'declined', 'overdue', 'completed')),
  token         text not null unique,
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  followup_sent_at timestamptz,
  completed_at  timestamptz
);
create index contact_requests_from_idx on contact_requests(from_user);
create index contact_requests_to_idx on contact_requests(to_user);
create index contact_requests_status_idx on contact_requests(status);

-- ─── 演講意願投票 ──────────────────────────────────────

create table talk_votes (
  user_id    uuid not null references users(id) on delete cascade,
  alumni_id  uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, alumni_id)
);
create index talk_votes_alumni_idx on talk_votes(alumni_id);

-- ─── 職涯羅盤 ──────────────────────────────────────────

create table compass_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  kind         text not null check (kind in ('cddq', 'ai')),
  status       text not null default 'completed' check (status in ('in_progress', 'completed')),
  answers      jsonb not null default '{}',   -- CDDQ 作答，或 AI 對談的訊息紀錄
  scores       jsonb,
  report       jsonb,
  consent_at   timestamptz not null,
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);
create index compass_sessions_user_idx on compass_sessions(user_id, created_at desc);

-- ─── 推薦系統 ──────────────────────────────────────────

create table tag_vocab (
  id        serial primary key,
  dimension text not null check (dimension in ('field', 'function', 'experience', 'value')),
  label     text not null,
  unique (dimension, label)
);

create table user_tags (
  user_id    uuid not null references users(id) on delete cascade,
  tag_id     int not null references tag_vocab(id) on delete cascade,
  weight     real not null check (weight >= 0 and weight <= 1),
  source     text not null check (source in ('story', 'profile', 'cddq', 'ai')),
  updated_at timestamptz not null default now(),
  primary key (user_id, tag_id, source)
);

create table ai_usage (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references users(id) on delete set null,
  purpose       text not null,   -- chat / report / story_tags
  model         text not null,
  input_tokens  int not null default 0,
  output_tokens int not null default 0,
  cost_usd      numeric(12, 6) not null default 0,
  created_at    timestamptz not null default now()
);

-- ─── 後台 ──────────────────────────────────────────────

create table admin_accounts (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique,
  name            text not null default '',
  password_hash   text,            -- 環境變數設定的超級管理員不存密碼
  level           text not null check (level in ('super', 'admin')),
  failed_attempts int not null default 0,
  locked_until    timestamptz,
  created_by      uuid references admin_accounts(id) on delete set null,
  created_at      timestamptz not null default now()
);

create table site_content (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

-- ─── 登入、驗證、寄信紀錄 ──────────────────────────────

create table sessions (
  token_hash text primary key,
  user_id    uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index sessions_user_idx on sessions(user_id);

create table admin_sessions (
  token_hash text primary key,
  admin_id   uuid not null references admin_accounts(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table auth_tokens (
  token_hash text primary key,
  user_id    uuid not null references users(id) on delete cascade,
  purpose    text not null check (purpose in ('verify', 'reset')),
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

create table email_log (
  id         uuid primary key default gen_random_uuid(),
  to_email   text not null,
  reply_to   text,
  subject    text not null,
  kind       text not null,
  html       text not null,
  status     text not null check (status in ('sent', 'failed', 'logged')),
  error      text,
  created_at timestamptz not null default now()
);

-- ─── RLS：全部開啟，不開 policy（只允許伺服器端連線） ───

alter table users            enable row level security;
alter table education        enable row level security;
alter table alumni_profiles  enable row level security;
alter table stories          enable row level security;
alter table contact_requests enable row level security;
alter table talk_votes       enable row level security;
alter table compass_sessions enable row level security;
alter table tag_vocab        enable row level security;
alter table user_tags        enable row level security;
alter table ai_usage         enable row level security;
alter table admin_accounts   enable row level security;
alter table site_content     enable row level security;
alter table sessions         enable row level security;
alter table admin_sessions   enable row level security;
alter table auth_tokens      enable row level security;
alter table email_log        enable row level security;
