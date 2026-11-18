-- 職涯羅盤改造：CDDQ 後接分流 Agent（CDDQ-Agent改造計畫書 §2.2）

-- 診斷結果（確定性規則）與作答時間
alter table compass_sessions add column if not exists diagnosis jsonb;
alter table compass_sessions add column if not exists timing jsonb;   -- {started_at, submitted_at, per_item_ms?}

-- Agent 執行紀錄
create table if not exists agent_runs (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references compass_sessions(id) on delete cascade,
  user_id      uuid not null references users(id) on delete cascade,
  status       text not null default 'queued'
               check (status in ('queued', 'running', 'succeeded', 'failed', 'fallback', 'skipped')),
  attempt      int  not null default 1,
  model        text,
  steps        jsonb not null default '[]',   -- [{key, status, at}]，給前端進度條
  trace        jsonb,                          -- 工具呼叫摘要（只給超級管理員）
  result       jsonb,                          -- AgentPlan（驗證通過後）
  error        text,
  cost_usd     numeric(12, 6) not null default 0,
  created_at   timestamptz not null default now(),
  started_at   timestamptz,
  finished_at  timestamptz
);
create index if not exists agent_runs_session_idx on agent_runs(session_id, created_at desc);
create index if not exists agent_runs_user_idx on agent_runs(user_id, created_at desc);
alter table agent_runs enable row level security;

-- 資源目錄：Agent 只能推薦這裡面的資源
create table if not exists resources (
  id             text primary key,
  title          text not null,
  provider       text not null,
  level          text not null check (level in ('national', 'university', 'college', 'department', 'leftbank')),
  url            text not null,
  summary        text not null,
  subscales      text[] not null,
  components     text[] not null default '{}',
  evidence       text not null check (evidence in ('direct', 'inferred', 'preliminary')),
  needs_human    boolean not null default false,
  active         boolean not null default true,
  last_verified  date not null,
  updated_at     timestamptz not null default now()
);
alter table resources enable row level security;
