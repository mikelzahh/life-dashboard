"use client";

import type { HabitWithStats } from "@/lib/data/planner";
import type { HabitLogEntry } from "@/lib/habits";
import { nextCount, useHabitMarks } from "./use-habit-marks";

// Привычки на сегодня для главной: прогресс дня и отметка одним нажатием.
export function HabitToday({
  habits,
  logs,
  today,
}: {
  habits: HabitWithStats[];
  logs: HabitLogEntry[];
  today: string;
}) {
  const { countOf, setCount, error } = useHabitMarks(logs);
  const serverToday = new Map(logs.map((l) => [l.habit_id, l.count]));

  const rows = habits.map((habit) => {
    const count = countOf(habit.id, today);
    // periodDone посчитан на сервере; поправляем его на отметку, сделанную только что.
    const done = habit.stats.periodDone - (serverToday.get(habit.id) ?? 0) + count;
    return { habit, count, done, complete: done >= habit.target_per_period };
  });
  const completed = rows.filter((r) => r.complete).length;

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-2xl font-semibold">
          {completed}
          <span className="text-base font-normal text-muted"> из {rows.length}</span>
        </span>
      </div>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-foreground/10">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${rows.length ? (completed / rows.length) * 100 : 0}%` }}
        />
      </div>
      {error && <p className="mb-2 text-sm text-red-500">{error}</p>}
      <ul className="flex flex-col gap-1">
        {rows.map(({ habit, count, done, complete }) => (
          <li key={habit.id} className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCount(habit.id, today, nextCount(habit, count))}
              aria-label={`Отметить «${habit.name}» сегодня`}
              className={`flex size-5 shrink-0 items-center justify-center rounded-md border text-xs ${
                count > 0 ? "border-accent bg-accent text-white" : "border-muted hover:border-accent"
              }`}
            >
              {count > 0 && "✓"}
            </button>
            <span className={`min-w-0 flex-1 truncate text-sm ${complete ? "text-muted" : ""}`}>
              {habit.name}
            </span>
            {habit.target_per_period > 1 || habit.frequency === "weekly" ? (
              <span className="shrink-0 text-xs text-muted">
                {done}/{habit.target_per_period}
                {habit.frequency === "weekly" ? " за неделю" : ""}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
