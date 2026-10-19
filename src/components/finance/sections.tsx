import Link from "next/link";
import {
  balancesByCurrency,
  getFinanceData,
  monthTotals,
  type FinanceData,
  type FinanceResult,
} from "@/lib/data/finance";
import { addMonths, formatMonth } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { MoneyFlow } from "@/lib/supabase/database.types";
import { Placeholder, Widget } from "@/components/widget";
import { AccountList } from "./account-list";
import { CategoryManager } from "./category-manager";
import { CsvImport } from "./csv-import";
import { TransactionForm, type AccountOption } from "./transaction-form";
import { TransactionList } from "./transaction-list";

// Серверные блоки раздела «Финансы» и финансовых виджетов главной.
// Все читают сессию, поэтому на странице каждый стоит внутри <Suspense>.

const notConfigured = <Placeholder text="Подключите Supabase, чтобы здесь появились данные" />;

const needsMigration = (
  <Placeholder text="Запустите миграцию supabase/migrations/20261019120000_finance.sql в SQL Editor" />
);

function hasData(data: FinanceResult): data is FinanceData {
  return Boolean(data && !("needsMigration" in data));
}

function stub(data: FinanceResult) {
  return data ? needsMigration : notConfigured;
}

function accountOptions(data: FinanceData): AccountOption[] {
  return data.accounts.map(({ id, name, currency }) => ({ id, name, currency }));
}

const monthHref = (month: string) => `/finance?month=${month.slice(0, 7)}`;

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Раздел «Финансы»
// ---------------------------------------------------------------------------

export async function FinanceBoard({ searchParams }: { searchParams: Promise<{ month?: string | string[] }> }) {
  const { month: raw } = await searchParams;
  const data = await getFinanceData(typeof raw === "string" ? raw : undefined);
  if (!hasData(data)) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Widget title="Финансы">{stub(data)}</Widget>
      </div>
    );
  }

  const options = accountOptions(data);
  const accountsRecord = Object.fromEntries(
    [...data.accountsById].map(([id, a]) => [id, { id, name: a.name, currency: a.currency }]),
  );
  const monthName = capitalize(formatMonth(data.month));

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <Widget title="Новая операция">
        <TransactionForm accounts={options} categories={data.categories} today={data.today} />
      </Widget>
      <Widget title="Счета">
        <BalanceTotal data={data} />
        <AccountList accounts={data.accounts} />
      </Widget>
      <Widget title={monthName} className="sm:col-span-2 xl:col-span-1">
        <MonthSwitcher data={data} />
        <MonthTotals data={data} />
        <CategoryBars data={data} kind="expense" />
      </Widget>
      <Widget title={`Операции за ${formatMonth(data.month, { month: "long" })}`} className="sm:col-span-2">
        <TransactionList
          transactions={data.transactions}
          categories={data.categories}
          accounts={accountsRecord}
          today={data.today}
          empty="В этом месяце операций нет"
        />
        {data.transactions.length >= 1000 && (
          <p className="mt-3 text-xs text-muted">Показаны последние 1000 операций месяца.</p>
        )}
      </Widget>
      <Widget title="Сводка по месяцам">
        <MonthlySummary data={data} />
      </Widget>
      <Widget title="Импорт из CSV" className="sm:col-span-2">
        <CsvImport accounts={options} />
      </Widget>
      <Widget title="Категории">
        <CategoryManager categories={data.categories} />
      </Widget>
    </div>
  );
}

function MonthSwitcher({ data }: { data: FinanceData }) {
  const prev = addMonths(data.month, -1);
  const next = addMonths(data.month, 1);
  const link = "rounded-md px-2 py-1 text-xs text-muted hover:bg-foreground/5 hover:text-foreground";
  return (
    <div className="-mt-1 mb-3 flex items-center gap-1">
      <Link href={monthHref(prev)} className={link}>
        ← {formatMonth(prev, { month: "short" })}
      </Link>
      {data.month !== data.currentMonth && (
        <Link href="/finance" className={link}>
          Текущий
        </Link>
      )}
      {data.month < data.currentMonth && (
        <Link href={monthHref(next)} className={`${link} ml-auto`}>
          {formatMonth(next, { month: "short" })} →
        </Link>
      )}
    </div>
  );
}

function MonthTotals({ data }: { data: FinanceData }) {
  const { income, expense } = monthTotals(data);
  const net = income - expense;
  return (
    <div className="mb-4 grid grid-cols-3 gap-2">
      <Stat label="Доходы" value={formatMoney(income, data.currency)} className="text-emerald-600" />
      <Stat label="Расходы" value={formatMoney(expense, data.currency)} />
      <Stat
        label="Итог"
        value={`${net > 0 ? "+" : ""}${formatMoney(net, data.currency)}`}
        className={net < 0 ? "text-red-500" : ""}
      />
      {data.hasOtherCurrencies && (
        <p className="col-span-3 text-xs text-muted">Суммы в {data.currency}, операции в других валютах не учтены.</p>
      )}
    </div>
  );
}

function Stat({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted">{label}</p>
      <p className={`truncate text-base font-semibold tabular-nums ${className}`}>{value}</p>
    </div>
  );
}

// Полоски по категориям за выбранный месяц.
function CategoryBars({ data, kind, limit = 6 }: { data: FinanceData; kind: MoneyFlow; limit?: number }) {
  const rows = data.byCategory.filter((c) => c.kind === kind);
  if (rows.length === 0) {
    return <p className="py-4 text-center text-sm text-muted">Расходов в этом месяце нет</p>;
  }
  const names = new Map(data.categories.map((c) => [c.id, c.name]));
  const shown = rows.slice(0, limit);
  const rest = rows.slice(limit).reduce((s, r) => s + r.total, 0);
  const items = [
    ...shown.map((r) => ({ name: r.categoryId ? (names.get(r.categoryId) ?? "Удалённая категория") : "Без категории", total: r.total })),
    ...(rest > 0 ? [{ name: "Остальное", total: rest }] : []),
  ];
  const max = Math.max(...items.map((i) => i.total));
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.name} className="text-sm">
          <div className="mb-0.5 flex items-baseline gap-2">
            <span className="min-w-0 flex-1 truncate">{item.name}</span>
            <span className="shrink-0 tabular-nums text-muted">{formatMoney(item.total, data.currency)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-foreground/5">
            <div className="h-full rounded-full bg-accent" style={{ width: `${(item.total / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function MonthlySummary({ data }: { data: FinanceData }) {
  // Пустые месяцы до первой операции не показываем.
  const first = data.months.findIndex((m) => m.income > 0 || m.expense > 0);
  if (first < 0) return <p className="py-6 text-center text-sm text-muted">Операций пока нет</p>;
  const months = data.months.slice(first).reverse();
  const max = Math.max(...months.map((m) => Math.max(m.income, m.expense)));
  return (
    <ul className="flex flex-col gap-1">
      {months.map((m) => {
        const net = m.income - m.expense;
        return (
          <li key={m.month}>
            <Link
              href={monthHref(m.month)}
              className={`block rounded-lg px-2 py-1.5 hover:bg-foreground/5 ${
                m.month === data.month ? "bg-accent/5 ring-1 ring-accent/30" : ""
              }`}
            >
              <div className="flex items-baseline gap-2 text-sm">
                <span className="min-w-0 flex-1 capitalize">{formatMonth(m.month)}</span>
                <span className={`shrink-0 font-medium tabular-nums ${net < 0 ? "text-red-500" : ""}`}>
                  {net > 0 ? "+" : ""}
                  {formatMoney(net, data.currency)}
                </span>
              </div>
              <p className="text-xs text-muted tabular-nums">
                <span className="text-emerald-600">+{formatMoney(m.income, data.currency)}</span> · −
                {formatMoney(m.expense, data.currency)}
              </p>
              <div className="mt-1 flex flex-col gap-0.5" aria-hidden>
                <div className="h-1 rounded-full bg-emerald-500/70" style={{ width: `${(m.income / max) * 100}%` }} />
                <div className="h-1 rounded-full bg-foreground/30" style={{ width: `${(m.expense / max) * 100}%` }} />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function BalanceTotal({ data }: { data: FinanceData }) {
  if (data.accounts.length === 0) return null;
  return (
    <div className="mb-3">
      {balancesByCurrency(data.accounts).map(([currency, total]) => (
        <p key={currency} className="text-2xl font-semibold tabular-nums">
          {formatMoney(total, currency)}
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Виджеты главной
// ---------------------------------------------------------------------------

export async function BalanceWidget() {
  const data = await getFinanceData();
  if (!hasData(data)) return stub(data);
  if (data.accounts.length === 0) {
    return (
      <Link href="/finance" className="block py-6 text-center text-sm text-muted hover:text-accent">
        Добавьте счета в разделе «Финансы» →
      </Link>
    );
  }
  const accounts = [...data.accounts].sort((a, b) => b.balance - a.balance);
  return (
    <>
      <BalanceTotal data={data} />
      <ul className="flex flex-col gap-1.5">
        {accounts.slice(0, 5).map((a) => (
          <li key={a.id} className="flex items-center gap-3 text-sm">
            <span className="min-w-0 flex-1 truncate">{a.name}</span>
            <span className={`shrink-0 tabular-nums ${a.balance < 0 ? "text-red-500" : "text-muted"}`}>
              {formatMoney(a.balance, a.currency)}
            </span>
          </li>
        ))}
      </ul>
      {accounts.length > 5 && <p className="mt-1 text-xs text-muted">и ещё {accounts.length - 5}</p>}
      <Link href="/finance" className="mt-3 inline-block text-xs text-accent hover:underline">
        Все финансы →
      </Link>
    </>
  );
}

export async function MonthExpensesWidget() {
  const data = await getFinanceData();
  if (!hasData(data)) return stub(data);
  const { income, expense } = monthTotals(data);
  const previous = monthTotals(data, addMonths(data.month, -1)).expense;
  return (
    <>
      <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="text-2xl font-semibold tabular-nums">{formatMoney(expense, data.currency)}</span>
        <span className="text-xs text-muted">
          {capitalize(formatMonth(data.month, { month: "long" }))}
          {previous > 0 && ` · в прошлом месяце ${formatMoney(previous, data.currency)}`}
          {income > 0 && ` · доходы ${formatMoney(income, data.currency)}`}
        </span>
      </div>
      <CategoryBars data={data} kind="expense" limit={5} />
      <Link href="/finance" className="mt-3 inline-block text-xs text-accent hover:underline">
        Подробнее →
      </Link>
    </>
  );
}
