-- Первая схема личного дашборда: задачи, привычки, финансы.
-- Каждая строка принадлежит пользователю (user_id), доступ закрыт RLS:
-- пользователь видит и меняет только свои данные.

-- ---------------------------------------------------------------------------
-- Общее
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Задачи
-- ---------------------------------------------------------------------------

create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title        text not null check (length(trim(title)) > 0),
  notes        text,
  status       text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority     smallint not null default 0 check (priority between 0 and 3),
  due_date     date,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index tasks_user_status_idx on public.tasks (user_id, status);
create index tasks_user_due_idx on public.tasks (user_id, due_date);

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Привычки
-- ---------------------------------------------------------------------------

create table public.habits (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name              text not null check (length(trim(name)) > 0),
  description       text,
  frequency         text not null default 'daily' check (frequency in ('daily', 'weekly')),
  target_per_period integer not null default 1 check (target_per_period > 0),
  archived_at       timestamptz,
  created_at        timestamptz not null default now()
);

create index habits_user_idx on public.habits (user_id);

-- Одна запись на привычку в день; count — сколько раз выполнено за день.
create table public.habit_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  habit_id   uuid not null references public.habits (id) on delete cascade,
  log_date   date not null default current_date,
  count      integer not null default 1 check (count > 0),
  created_at timestamptz not null default now(),
  unique (habit_id, log_date)
);

create index habit_logs_user_date_idx on public.habit_logs (user_id, log_date);

-- ---------------------------------------------------------------------------
-- Финансы
-- ---------------------------------------------------------------------------

create table public.accounts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  kind        text not null default 'card' check (kind in ('cash', 'card', 'bank', 'savings', 'other')),
  currency    char(3) not null default 'RUB',
  archived_at timestamptz,
  created_at  timestamptz not null default now()
);

create index accounts_user_idx on public.accounts (user_id);

create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (length(trim(name)) > 0),
  kind       text not null check (kind in ('income', 'expense')),
  created_at timestamptz not null default now(),
  unique (user_id, kind, name)
);

-- amount всегда положительный, направление задаёт kind.
create table public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_id  uuid not null references public.accounts (id) on delete restrict,
  category_id uuid references public.categories (id) on delete set null,
  kind        text not null check (kind in ('income', 'expense')),
  amount      numeric(14, 2) not null check (amount > 0),
  occurred_on date not null default current_date,
  note        text,
  created_at  timestamptz not null default now()
);

create index transactions_user_date_idx on public.transactions (user_id, occurred_on desc);
create index transactions_account_idx on public.transactions (account_id);

-- ---------------------------------------------------------------------------
-- Row Level Security: владелец видит только свои строки
-- ---------------------------------------------------------------------------

alter table public.tasks        enable row level security;
alter table public.habits       enable row level security;
alter table public.habit_logs   enable row level security;
alter table public.accounts     enable row level security;
alter table public.categories   enable row level security;
alter table public.transactions enable row level security;

create policy "tasks: owner only" on public.tasks
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "habits: owner only" on public.habits
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "habit_logs: owner only" on public.habit_logs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = (select auth.uid()))
  );

create policy "accounts: owner only" on public.accounts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "categories: owner only" on public.categories
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "transactions: owner only" on public.transactions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.accounts a where a.id = account_id and a.user_id = (select auth.uid()))
  );
