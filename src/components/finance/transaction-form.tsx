"use client";

import { useState } from "react";
import { createTransaction } from "@/app/(dashboard)/finance/actions";
import type { Category, MoneyFlow } from "@/lib/supabase/database.types";
import { addDays } from "@/lib/dates";

const field =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

export type AccountOption = { id: string; name: string; currency: string };

export function TransactionForm({
  accounts,
  categories,
  today,
}: {
  accounts: AccountOption[];
  categories: Category[];
  today: string;
}) {
  const [kind, setKind] = useState<MoneyFlow>("expense");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today);
  const [error, setError] = useState("");

  if (accounts.length === 0) {
    return <p className="py-6 text-center text-sm text-muted">Сначала добавьте счёт в блоке «Счета».</p>;
  }

  async function submit(formData: FormData) {
    const result = await createTransaction(formData);
    setError(result.error ?? "");
    if (!result.error) {
      setAmount("");
      setNote("");
    }
  }

  const tab = (value: MoneyFlow, label: string) => (
    <button
      type="button"
      onClick={() => setKind(value)}
      aria-pressed={kind === value}
      className={`flex-1 rounded-md px-3 py-1.5 text-sm ${
        kind === value
          ? value === "expense"
            ? "bg-surface font-medium text-red-500 shadow-sm"
            : "bg-surface font-medium text-emerald-600 shadow-sm"
          : "text-muted hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );

  const chip = (label: string, value: string) => (
    <button
      type="button"
      onClick={() => setDate(value)}
      className={`rounded-md px-2 py-1 text-xs ${
        date === value ? "bg-accent/10 text-accent" : "text-muted hover:bg-foreground/5"
      }`}
    >
      {label}
    </button>
  );

  const options = categories.filter((c) => c.kind === kind);

  return (
    <form action={submit} className="flex flex-col gap-2">
      <input type="hidden" name="kind" value={kind} />
      <div className="flex gap-1 rounded-lg bg-foreground/5 p-1">
        {tab("expense", "Расход")}
        {tab("income", "Доход")}
      </div>
      <div className="flex gap-2">
        <input
          name="amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          placeholder="Сумма"
          aria-label="Сумма"
          className={`${field} min-w-0 flex-1 text-base font-medium`}
        />
        <select name="account_id" aria-label="Счёт" className={`${field} max-w-[45%]`}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
              {a.currency !== "RUB" ? ` (${a.currency})` : ""}
            </option>
          ))}
        </select>
      </div>
      <select key={kind} name="category_id" defaultValue="" aria-label="Категория" className={field}>
        <option value="">Без категории</option>
        {options.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <input
        name="note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Комментарий"
        aria-label="Комментарий"
        className={field}
      />
      <div className="flex flex-wrap items-center gap-1">
        {chip("Сегодня", today)}
        {chip("Вчера", addDays(today, -1))}
        <input
          type="date"
          name="occurred_on"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Дата"
          className={`${field} ml-1 py-1 text-xs`}
        />
        <button
          type="submit"
          className="ml-auto rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          disabled={!amount.trim()}
        >
          Добавить
        </button>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </form>
  );
}
