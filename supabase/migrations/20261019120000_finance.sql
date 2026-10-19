-- Финансы: начальный остаток счёта, ключ импорта из CSV и представления
-- для балансов и сводки по месяцам. Запускать после первой миграции.

-- Сколько было на счёте до первой внесённой операции.
alter table public.accounts
  add column opening_balance numeric(14, 2) not null default 0;

-- Отпечаток строки из CSV: повторный импорт той же выписки не создаёт дублей.
-- У операций, введённых вручную, ключа нет.
alter table public.transactions
  add column import_key text;

alter table public.transactions
  add constraint transactions_account_import_key_key unique (account_id, import_key);

create index transactions_user_category_idx on public.transactions (user_id, category_id);

-- ---------------------------------------------------------------------------
-- Представления. security_invoker: запрос идёт с правами пользователя,
-- поэтому RLS таблиц продолжает работать и здесь.
-- ---------------------------------------------------------------------------

-- Текущий баланс каждого счёта: начальный остаток + доходы − расходы.
create view public.account_balances
with (security_invoker = true) as
select
  a.id      as account_id,
  a.user_id,
  a.opening_balance + coalesce(
    sum(case when t.kind = 'income' then t.amount else -t.amount end),
    0
  )::numeric(14, 2) as balance,
  count(t.id)::integer as transactions_count
from public.accounts a
left join public.transactions t on t.account_id = a.id
group by a.id;

-- Суммы по месяцам, валютам и категориям. month: первое число месяца.
create view public.monthly_totals
with (security_invoker = true) as
select
  t.user_id,
  date_trunc('month', t.occurred_on)::date as month,
  a.currency,
  t.kind,
  t.category_id,
  sum(t.amount)::numeric(14, 2) as total,
  count(*)::integer as transactions_count
from public.transactions t
join public.accounts a on a.id = t.account_id
group by t.user_id, date_trunc('month', t.occurred_on), a.currency, t.kind, t.category_id;

grant select on public.account_balances to authenticated;
grant select on public.monthly_totals to authenticated;
