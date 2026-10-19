"use client";

import { useState, useTransition } from "react";
import {
  addDefaultCategories,
  createCategory,
  deleteCategory,
} from "@/app/(dashboard)/finance/actions";
import type { Category, MoneyFlow } from "@/lib/supabase/database.types";

const field =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

export function CategoryManager({ categories }: { categories: Category[] }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  async function submit(formData: FormData) {
    const result = await createCategory(formData);
    setError(result.error ?? "");
    if (!result.error) setName("");
  }

  function run(action: () => Promise<{ error?: string }>) {
    startTransition(async () => {
      const result = await action();
      setError(result.error ?? "");
    });
  }

  const group = (kind: MoneyFlow, title: string) => {
    const items = categories.filter((c) => c.kind === kind);
    return (
      <div>
        <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">{title}</h3>
        {items.length === 0 ? (
          <p className="text-xs text-muted">Пока нет</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {items.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-1 rounded-md bg-foreground/5 py-0.5 pr-1 pl-2 text-xs"
              >
                {c.name}
                <button
                  type="button"
                  aria-label={`Удалить категорию «${c.name}»`}
                  onClick={() => {
                    if (confirm(`Удалить категорию «${c.name}»? Операции останутся без категории.`)) {
                      run(() => deleteCategory(c.id));
                    }
                  }}
                  className="px-0.5 text-muted hover:text-red-500"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div className={`flex flex-col gap-4 ${pending ? "opacity-60" : ""}`}>
      {categories.length === 0 && (
        <button
          type="button"
          onClick={() => run(addDefaultCategories)}
          className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-accent hover:bg-accent/5"
        >
          Добавить базовые категории
        </button>
      )}
      {group("expense", "Расходы")}
      {group("income", "Доходы")}
      <form action={submit} className="flex gap-2">
        <input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Новая категория"
          aria-label="Название категории"
          className={`${field} min-w-0 flex-1`}
        />
        <select name="kind" defaultValue="expense" aria-label="Тип категории" className={field}>
          <option value="expense">Расход</option>
          <option value="income">Доход</option>
        </select>
        <button
          type="submit"
          className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          disabled={!name.trim()}
        >
          +
        </button>
      </form>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
