import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Account, Category, MoneyFlow, Transaction } from "@/lib/supabase/database.types";
import { addMonths, monthStart, toLocalISO } from "@/lib/dates";

// Сколько месяцев показывает сводка по месяцам.
export const SUMMARY_MONTHS = 12;

export type AccountWithBalance = Account & { balance: number; transactionsCount: number };

export type MonthSummary = { month: string; income: number; expense: number };

export type CategoryTotal = { categoryId: string | null; kind: MoneyFlow; total: number };

export type FinanceData = {
  today: string;
  // Выбранный и текущий месяцы, первое число: YYYY-MM-01.
  month: string;
  currentMonth: string;
  // Сводки считаем в основной валюте: в ней больше всего счетов.
  currency: string;
  hasOtherCurrencies: boolean;
  // Активные счета; архивные нужны только для подписей у старых операций.
  accounts: AccountWithBalance[];
  accountsById: Map<string, Account>;
  categories: Category[];
  // Операции выбранного месяца, новые сверху.
  transactions: Transaction[];
  // Помесячные итоги, старые слева.
  months: MonthSummary[];
  // Итоги выбранного месяца по категориям, по убыванию.
  byCategory: CategoryTotal[];
};

export type FinanceResult = FinanceData | { needsMigration: true } | null;

// Ошибки PostgREST, когда миграция финансов ещё не запущена:
// нет представления или нет нового столбца.
const missingSchema = new Set(["PGRST205", "PGRST204", "42P01", "42703"]);

// «2026-10» или «2026-10-15» из адреса → первое число месяца; иначе текущий месяц.
export function parseMonth(value: unknown, today = toLocalISO()) {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])(-\d{2})?$/.test(value)
    ? monthStart(value)
    : monthStart(today);
}

function mainCurrency(accounts: Account[]) {
  const counts = new Map<string, number>([["RUB", 0]]);
  for (const a of accounts) counts.set(a.currency, (counts.get(a.currency) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1])[0][0];
}

// Финансы текущего пользователя за месяц из адреса (?month=2026-10), по умолчанию текущий. Обёрнуто в cache(),
// чтобы виджеты главной делили один запрос. Читает cookies, поэтому
// вызывающие компоненты должны быть внутри <Suspense>.
export const getFinanceData = cache(async (rawMonth?: string): Promise<FinanceResult> => {
  if (!isSupabaseConfigured) return null;

  // Данные и «сегодня» только во время запроса: при пререндере их считать нельзя.
  await connection();
  const supabase = await createClient();
  const today = toLocalISO();
  const month = parseMonth(rawMonth, today);
  const currentMonth = monthStart(today);
  // Окно сводки заканчивается текущим месяцем, а если выбран месяц вне окна, то им.
  const windowEnd =
    month > currentMonth || month <= addMonths(currentMonth, -SUMMARY_MONTHS) ? month : currentMonth;
  const windowStart = addMonths(windowEnd, -(SUMMARY_MONTHS - 1));

  const [accounts, balances, categories, transactions, totals] = await Promise.all([
    supabase.from("accounts").select("*").order("created_at"),
    supabase.from("account_balances").select("account_id, balance, transactions_count"),
    supabase.from("categories").select("*").order("name"),
    // Месяц личных операций укладывается в лимит PostgREST в 1000 строк.
    supabase
      .from("transactions")
      .select("*")
      .gte("occurred_on", month)
      .lt("occurred_on", addMonths(month, 1))
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("monthly_totals")
      .select("month, currency, kind, category_id, total")
      .gte("month", windowStart)
      .lte("month", windowEnd),
  ]);

  const error =
    accounts.error ?? balances.error ?? categories.error ?? transactions.error ?? totals.error;
  if (error && missingSchema.has(error.code)) return { needsMigration: true };
  if (error) throw new Error(`Не удалось загрузить финансы: ${error.message}`);

  const balanceOf = new Map((balances.data ?? []).map((b) => [b.account_id, b]));
  const allAccounts = accounts.data ?? [];
  const active = allAccounts
    .filter((a) => !a.archived_at)
    .map((a) => ({
      ...a,
      opening_balance: Number(a.opening_balance),
      balance: Number(balanceOf.get(a.id)?.balance ?? a.opening_balance),
      transactionsCount: balanceOf.get(a.id)?.transactions_count ?? 0,
    }));
  const currency = mainCurrency(active.length > 0 ? active : allAccounts);

  const months: MonthSummary[] = [];
  for (let m = windowStart; m <= windowEnd; m = addMonths(m, 1)) {
    months.push({ month: m, income: 0, expense: 0 });
  }
  const byMonth = new Map(months.map((s) => [s.month, s]));
  const byCategory = new Map<string, CategoryTotal>();
  let hasOtherCurrencies = active.some((a) => a.currency !== currency);

  for (const row of totals.data ?? []) {
    if (row.currency !== currency) {
      hasOtherCurrencies = true;
      continue;
    }
    const total = Number(row.total);
    const summary = byMonth.get(row.month);
    if (summary) summary[row.kind] += total;
    if (row.month === month) {
      const key = `${row.kind}:${row.category_id}`;
      const entry = byCategory.get(key) ?? { categoryId: row.category_id, kind: row.kind, total: 0 };
      entry.total += total;
      byCategory.set(key, entry);
    }
  }

  return {
    today,
    month,
    currentMonth,
    currency,
    hasOtherCurrencies,
    accounts: active,
    accountsById: new Map(allAccounts.map((a) => [a.id, a])),
    categories: categories.data ?? [],
    transactions: (transactions.data ?? []).map((t) => ({ ...t, amount: Number(t.amount) })),
    months,
    byCategory: [...byCategory.values()].sort((a, b) => b.total - a.total),
  };
});

// Итоги месяца в основной валюте.
export function monthTotals(data: FinanceData, month = data.month) {
  const summary = data.months.find((m) => m.month === month);
  return { income: summary?.income ?? 0, expense: summary?.expense ?? 0 };
}

// Сумма балансов по валютам: { RUB: 120000, USD: 300 }.
export function balancesByCurrency(accounts: AccountWithBalance[]) {
  const sums = new Map<string, number>();
  for (const a of accounts) sums.set(a.currency, (sums.get(a.currency) ?? 0) + a.balance);
  return [...sums];
}
