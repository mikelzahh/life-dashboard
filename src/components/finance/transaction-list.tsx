"use client";

import { useOptimistic, useState, useTransition } from "react";
import type { Category, Transaction } from "@/lib/supabase/database.types";
import { deleteTransaction, setTransactionCategory } from "@/app/(dashboard)/finance/actions";
import { addDays, formatDay } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { AccountOption } from "./transaction-form";

type Change = { id: string; categoryId: string | null } | { id: string; deleted: true };

function dayTitle(day: string, today: string) {
  if (day === today) return "Сегодня";
  if (day === addDays(today, -1)) return "Вчера";
  return formatDay(day, { day: "numeric", month: "long", weekday: "short" });
}

// Операции по дням. Категорию можно сменить прямо в списке,
// это удобно после импорта выписки.
export function TransactionList({
  transactions,
  categories,
  accounts,
  today,
  empty = "Операций нет",
}: {
  transactions: Transaction[];
  categories: Category[];
  accounts: Record<string, AccountOption>;
  today: string;
  empty?: string;
}) {
  const [optimistic, apply] = useOptimistic(transactions, (state, change: Change) =>
    "deleted" in change
      ? state.filter((t) => t.id !== change.id)
      : state.map((t) => (t.id === change.id ? { ...t, category_id: change.categoryId } : t)),
  );
  const [, startTransition] = useTransition();
  const [error, setError] = useState("");

  function run(change: Change, action: () => Promise<{ error?: string }>) {
    startTransition(async () => {
      apply(change);
      const result = await action();
      setError(result.error ?? "");
    });
  }

  if (optimistic.length === 0) return <p className="py-6 text-center text-sm text-muted">{empty}</p>;

  const days: { day: string; items: Transaction[] }[] = [];
  for (const t of optimistic) {
    const last = days.at(-1);
    if (last?.day === t.occurred_on) last.items.push(t);
    else days.push({ day: t.occurred_on, items: [t] });
  }
  const showAccount = new Set(optimistic.map((t) => t.account_id)).size > 1;

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-red-500">{error}</p>}
      {days.map(({ day, items }) => (
        <div key={day}>
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">
            {dayTitle(day, today)}
          </h3>
          <ul>
            {items.map((t) => {
              const account = accounts[t.account_id];
              const options = categories.filter((c) => c.kind === t.kind);
              return (
                <li
                  key={t.id}
                  className="group flex items-center gap-3 rounded-lg px-1 py-1.5 hover:bg-foreground/5"
                >
                  <div className="min-w-0 flex-1">
                    <select
                      value={t.category_id ?? ""}
                      onChange={(e) =>
                        run({ id: t.id, categoryId: e.target.value || null }, () =>
                          setTransactionCategory(t.id, e.target.value || null),
                        )
                      }
                      aria-label="Категория"
                      className={`-ml-1 max-w-full cursor-pointer truncate rounded-md bg-transparent px-1 text-sm outline-none hover:bg-foreground/5 ${
                        t.category_id ? "" : "text-muted"
                      }`}
                    >
                      <option value="">Без категории</option>
                      {options.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    {(t.note || showAccount) && (
                      <p className="truncate text-xs text-muted">
                        {[t.note, showAccount ? account?.name : null].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 text-sm font-medium tabular-nums ${
                      t.kind === "income" ? "text-emerald-600" : ""
                    }`}
                  >
                    {t.kind === "income" ? "+" : "−"}
                    {formatMoney(t.amount, account?.currency)}
                  </span>
                  <button
                    type="button"
                    aria-label="Удалить операцию"
                    onClick={() => run({ id: t.id, deleted: true }, () => deleteTransaction(t.id))}
                    className="shrink-0 px-1 text-muted opacity-60 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100"
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
