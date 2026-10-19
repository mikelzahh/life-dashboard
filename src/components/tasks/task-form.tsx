"use client";

import { useState } from "react";
import { createTask } from "@/app/(dashboard)/tasks/actions";
import { addDays } from "@/lib/dates";

const field =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

export function TaskForm({ today }: { today: string }) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState(today);
  const [error, setError] = useState("");

  async function submit(formData: FormData) {
    const result = await createTask(formData);
    setError(result.error ?? "");
    if (!result.error) setTitle("");
  }

  const chip = (label: string, value: string) => (
    <button
      type="button"
      onClick={() => setDue(value)}
      className={`rounded-md px-2 py-1 text-xs ${
        due === value ? "bg-accent/10 text-accent" : "text-muted hover:bg-foreground/5"
      }`}
    >
      {label}
    </button>
  );

  return (
    <form action={submit} className="mb-4 flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Новая задача"
          aria-label="Название задачи"
          className={`${field} min-w-0 flex-1`}
        />
        <button
          type="submit"
          className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          disabled={!title.trim()}
        >
          Добавить
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {chip("Сегодня", today)}
        {chip("Завтра", addDays(today, 1))}
        {chip("Без срока", "")}
        <input
          type="date"
          name="due_date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          aria-label="Срок"
          className={`${field} ml-1 py-1 text-xs`}
        />
        <select name="priority" defaultValue="0" aria-label="Приоритет" className={`${field} py-1 text-xs`}>
          <option value="0">Без приоритета</option>
          <option value="1">Низкий</option>
          <option value="2">Средний</option>
          <option value="3">Высокий</option>
        </select>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </form>
  );
}
