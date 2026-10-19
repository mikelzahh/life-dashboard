"use client";

import { useState, useTransition } from "react";
import { createAccount, removeAccount } from "@/app/(dashboard)/finance/actions";
import type { AccountWithBalance } from "@/lib/data/finance";
import type { AccountKind } from "@/lib/supabase/database.types";
import { currencies, formatMoney } from "@/lib/money";

const field =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

export const accountKindLabel: Record<AccountKind, string> = {
  card: "Карта",
  cash: "Наличные",
  bank: "Счёт в банке",
  savings: "Накопления",
  other: "Другое",
};

export function AccountList({ accounts }: { accounts: AccountWithBalance[] }) {
  const [adding, setAdding] = useState(accounts.length === 0);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  async function submit(formData: FormData) {
    const result = await createAccount(formData);
    setError(result.error ?? "");
    if (!result.error) {
      setName("");
      setAdding(false);
    }
  }

  function remove(account: AccountWithBalance) {
    const question = account.transactionsCount
      ? `Убрать «${account.name}» в архив? Операции останутся в сводке.`
      : `Удалить счёт «${account.name}»?`;
    if (!confirm(question)) return;
    startTransition(async () => {
      const result = await removeAccount(account.id);
      setError(result.error ?? "");
    });
  }

  return (
    <div className={pending ? "opacity-60" : ""}>
      {accounts.length > 0 && (
        <ul className="mb-3 flex flex-col gap-1">
          {accounts.map((a) => (
            <li
              key={a.id}
              className="group flex items-center gap-3 rounded-lg px-1 py-1.5 hover:bg-foreground/5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{a.name}</p>
                <p className="text-xs text-muted">{accountKindLabel[a.kind]}</p>
              </div>
              <span
                className={`shrink-0 text-sm font-medium tabular-nums ${a.balance < 0 ? "text-red-500" : ""}`}
              >
                {formatMoney(a.balance, a.currency)}
              </span>
              <button
                type="button"
                aria-label={a.transactionsCount ? "Убрать счёт в архив" : "Удалить счёт"}
                onClick={() => remove(a)}
                className="shrink-0 px-1 text-muted opacity-60 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      {adding ? (
        <form action={submit} className="flex flex-col gap-2">
          <input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название, например «Тинькофф Black»"
            aria-label="Название счёта"
            className={field}
          />
          <div className="flex gap-2">
            <select name="kind" defaultValue="card" aria-label="Тип счёта" className={`${field} flex-1`}>
              {Object.entries(accountKindLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select name="currency" defaultValue="RUB" aria-label="Валюта" className={field}>
              {currencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <input
            name="opening_balance"
            inputMode="decimal"
            placeholder="Сколько на счёте сейчас (можно оставить пустым)"
            aria-label="Начальный остаток"
            className={field}
          />
          <div className="flex justify-end gap-2">
            {accounts.length > 0 && (
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-foreground/5"
              >
                Отмена
              </button>
            )}
            <button
              type="submit"
              className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              disabled={!name.trim()}
            >
              Добавить счёт
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-xs text-accent hover:underline"
        >
          + Новый счёт
        </button>
      )}
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
