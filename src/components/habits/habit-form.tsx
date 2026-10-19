"use client";

import { useState } from "react";
import { createHabit } from "@/app/(dashboard)/tasks/actions";

const field =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

export function HabitForm() {
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [error, setError] = useState("");

  async function submit(formData: FormData) {
    const result = await createHabit(formData);
    setError(result.error ?? "");
    if (!result.error) setName("");
  }

  return (
    <form action={submit} className="mb-4 flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Новая привычка"
          aria-label="Название привычки"
          className={`${field} min-w-0 flex-1`}
        />
        <button
          type="submit"
          className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          disabled={!name.trim()}
        >
          Добавить
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <input
          type="number"
          name="target"
          min={1}
          max={99}
          defaultValue={1}
          aria-label="Сколько раз"
          className={`${field} w-16 py-1 text-xs`}
        />
        <span>раз в</span>
        <select
          name="frequency"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          aria-label="Период"
          className={`${field} py-1 text-xs`}
        >
          <option value="daily">день</option>
          <option value="weekly">неделю</option>
        </select>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </form>
  );
}
