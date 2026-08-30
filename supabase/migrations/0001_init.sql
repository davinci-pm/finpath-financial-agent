-- FinPath MVP 初始化 migration
-- 对齐《技术手册》§8 数据模型
-- 金额一律使用 bigint（整数人民币元），禁止浮点累计误差
-- 禁止存储银行卡号、密码、验证码、身份证号码
-- 所有用户表启用 RLS：仅 owner 可读写

-- ============ 扩展 ============
create extension if not exists "uuid-ossp";

-- ============ 公共辅助函数 ============
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============ 1. profiles ============
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  city text,
  risk_preference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = id);

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function set_updated_at();

-- ============ 2. diagnosis_sessions ============
create table if not exists public.diagnosis_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  raw_question text not null,
  scenario_type text not null default 'money_plan',
  status text not null default 'clarifying',
  current_question_key text,
  answers_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.diagnosis_sessions enable row level security;

create policy "diagnosis_sessions_select_own" on public.diagnosis_sessions
  for select using (auth.uid() = user_id);
create policy "diagnosis_sessions_insert_own" on public.diagnosis_sessions
  for insert with check (auth.uid() = user_id);
create policy "diagnosis_sessions_update_own" on public.diagnosis_sessions
  for update using (auth.uid() = user_id);
create policy "diagnosis_sessions_delete_own" on public.diagnosis_sessions
  for delete using (auth.uid() = user_id);

create index if not exists idx_diagnosis_sessions_user on public.diagnosis_sessions (user_id);
create trigger diagnosis_sessions_set_updated_at before update on public.diagnosis_sessions
  for each row execute function set_updated_at();

-- ============ 3. plans ============
create table if not exists public.plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  diagnosis_session_id uuid references public.diagnosis_sessions (id) on delete set null,
  conclusion text not null,
  constraints_json jsonb not null default '{}'::jsonb,
  allocations_json jsonb not null default '[]'::jsonb,
  actions_json jsonb not null default '[]'::jsonb,
  risks_json jsonb not null default '[]'::jsonb,
  source_ids_json jsonb not null default '[]'::jsonb,
  model_metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.plans enable row level security;

create policy "plans_select_own" on public.plans
  for select using (auth.uid() = user_id);
create policy "plans_insert_own" on public.plans
  for insert with check (auth.uid() = user_id);
create policy "plans_update_own" on public.plans
  for update using (auth.uid() = user_id);
create policy "plans_delete_own" on public.plans
  for delete using (auth.uid() = user_id);

create index if not exists idx_plans_user on public.plans (user_id);

-- ============ 4. assets ============
create table if not exists public.assets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('asset', 'liability', 'goal')),
  category text not null,
  label text not null,
  amount_min bigint,
  amount_max bigint,
  amount_exact bigint,
  currency text not null default 'CNY',
  purpose text,
  maturity_date text,
  liquidity text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 至少提供一种金额
  check (
    amount_exact is not null
    or (amount_min is not null and amount_max is not null)
  )
);

alter table public.assets enable row level security;

create policy "assets_select_own" on public.assets
  for select using (auth.uid() = user_id);
create policy "assets_insert_own" on public.assets
  for insert with check (auth.uid() = user_id);
create policy "assets_update_own" on public.assets
  for update using (auth.uid() = user_id);
create policy "assets_delete_own" on public.assets
  for delete using (auth.uid() = user_id);

create index if not exists idx_assets_user on public.assets (user_id);
create trigger assets_set_updated_at before update on public.assets
  for each row execute function set_updated_at();

-- ============ 5. goals ============
create table if not exists public.goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  target_amount bigint not null,
  current_amount bigint not null default 0,
  target_date text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.goals enable row level security;

create policy "goals_select_own" on public.goals
  for select using (auth.uid() = user_id);
create policy "goals_insert_own" on public.goals
  for insert with check (auth.uid() = user_id);
create policy "goals_update_own" on public.goals
  for update using (auth.uid() = user_id);
create policy "goals_delete_own" on public.goals
  for delete using (auth.uid() = user_id);

create index if not exists idx_goals_user on public.goals (user_id);
create trigger goals_set_updated_at before update on public.goals
  for each row execute function set_updated_at();

-- ============ 6. tasks ============
create table if not exists public.tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_type text not null default 'manual' check (source_type in ('plan', 'document', 'route', 'manual')),
  source_id text,
  title text not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'pending', 'completed')),
  progress_current bigint not null default 0,
  progress_total bigint not null default 1,
  next_action text,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

create policy "tasks_select_own" on public.tasks
  for select using (auth.uid() = user_id);
create policy "tasks_insert_own" on public.tasks
  for insert with check (auth.uid() = user_id);
create policy "tasks_update_own" on public.tasks
  for update using (auth.uid() = user_id);
create policy "tasks_delete_own" on public.tasks
  for delete using (auth.uid() = user_id);

create index if not exists idx_tasks_user on public.tasks (user_id);
create trigger tasks_set_updated_at before update on public.tasks
  for each row execute function set_updated_at();

-- ============ 7. task_steps ============
create table if not exists public.task_steps (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  position bigint not null,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  estimated_minutes bigint,
  checklist_json jsonb not null default '[]'::jsonb,
  official_entry text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.task_steps enable row level security;

-- 任务步骤通过所属任务的所有权间接控制
create policy "task_steps_select_own" on public.task_steps
  for select using (
    exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
  );
create policy "task_steps_insert_own" on public.task_steps
  for insert with check (
    exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
  );
create policy "task_steps_update_own" on public.task_steps
  for update using (
    exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
  );
create policy "task_steps_delete_own" on public.task_steps
  for delete using (
    exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
  );

create index if not exists idx_task_steps_task on public.task_steps (task_id);

-- ============ 8. documents ============
create table if not exists public.documents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  status text not null default 'uploading'
    check (status in ('uploading', 'analyzing', 'awaiting_confirmation', 'ready', 'failed')),
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.documents enable row level security;

create policy "documents_select_own" on public.documents
  for select using (auth.uid() = user_id);
create policy "documents_insert_own" on public.documents
  for insert with check (auth.uid() = user_id);
create policy "documents_update_own" on public.documents
  for update using (auth.uid() = user_id);
create policy "documents_delete_own" on public.documents
  for delete using (auth.uid() = user_id);

create index if not exists idx_documents_user on public.documents (user_id);

-- ============ 9. document_extractions ============
create table if not exists public.document_extractions (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid not null references public.documents (id) on delete cascade,
  extracted_fields_json jsonb not null default '{}'::jsonb,
  confirmed_fields_json jsonb not null default '{}'::jsonb,
  provenance_json jsonb not null default '{}'::jsonb,
  model_metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.document_extractions enable row level security;

create policy "document_extractions_select_own" on public.document_extractions
  for select using (
    exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
  );
create policy "document_extractions_insert_own" on public.document_extractions
  for insert with check (
    exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
  );
create policy "document_extractions_update_own" on public.document_extractions
  for update using (
    exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
  );
create policy "document_extractions_delete_own" on public.document_extractions
  for delete using (
    exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
  );

create index if not exists idx_document_extractions_doc on public.document_extractions (document_id);
create trigger document_extractions_set_updated_at before update on public.document_extractions
  for each row execute function set_updated_at();

-- ============ 10. knowledge_sources（公共知识，只读） ============
create table if not exists public.knowledge_sources (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  publisher text,
  source_url text,
  region text,
  effective_at date,
  last_verified_at date,
  status text not null default 'active',
  content text,
  tags_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.knowledge_sources enable row level security;

-- 知识条目为公开只读（不含用户隐私）
create policy "knowledge_sources_read_active" on public.knowledge_sources
  for select using (status = 'active');

-- ============ 种子数据：demo 用户（仅开发环境） ============
-- 说明：demo user 由应用层在无 Auth 时使用固定 uuid，便于本地/CI 验证闭环。
-- 生产环境必须通过真实 Supabase Auth 登录。
insert into public.profiles (id, display_name, city, risk_preference)
values
  ('00000000-0000-0000-0000-000000000001', '林默', '上海', 'medium')
on conflict (id) do nothing;
