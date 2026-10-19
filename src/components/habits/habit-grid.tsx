"use client";

import type { HabitWithStats } from "@/lib/data/planner";
import type { HabitLogEntry } from "@/lib/habits";
import { archiveHabit, deleteHabit } from "@/app/(dashboard)/tasks/actions";
import { formatDay, plural } from "@/lib/dates";
import { nextCount, useHabitMarks } from "./use-habit-marks";

// Таблица привычек за последние дни: клик по клетке ставит или снимает отметку.
// На узком экране видна только последняя неделя.
export function HabitGrid({
  habits,
  logs,
  days,
  today,
}: {
  habits: HabitWithStats[];
  logs: HabitLogEntry[];
  days: string[];
  today: string;
}) {
  const { countOf, setCount, error } = useHabitMarks(logs);
  const narrowFrom = days.length - 7;

  if (habits.length === 0) {
    return <p className="py-6 text-center text-sm text-muted">Добавьте первую привычку</p>;
  }

  const hideNarrow = (i: number) => (i < narrowFrom ? "hidden sm:flex" : "flex");

  return (
    <div>
      {error && <p className="mb-2 text-sm text-red-500">{error}</p>}
      <div className="mb-1 flex gap-1 pr-6 text-[10px] text-muted">
        {days.map((d, i) => (
          <div
            key={d}
            className={`${hideNarrow(i)} flex-1 flex-col items-center ${d === today ? "text-accent" : ""}`}
          >
            <span>{formatDay(d, { weekday: "short" })}</span>
            <span>{formatDay(d, { day: "numeric" })}</span>
          </div>
        ))}
      </div>
      <ul className="flex flex-col gap-3">
        {habits.map((habit) => {
          const weekly = habit.frequency === "weekly";
          const { current, best } = habit.stats;
          return (
            <li key={habit.id}>
              <div className="mb-1 flex items-baseline gap-2">
                <span className="min-w-0 truncate text-sm font-medium" title={habit.name}>
                  {habit.name}
                </span>
                <span className="shrink-0 text-xs text-muted">
                  {habit.target_per_period} {plural(habit.target_per_period, "раз", "раза", "раз")} в{" "}
                  {weekly ? "неделю" : "день"}
                </span>
                <span className="ml-auto shrink-0 text-xs">
                  {current > 0 && (
                    <>
                      🔥 {current}{" "}
                      {weekly
                        ? plural(current, "неделя", "недели", "недель")
                        : plural(current, "день", "дня", "дней")}
                    </>
                  )}
                  {best > current && <span className="text-muted"> · рекорд {best}</span>}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {days.map((d, i) => {
                  const count = countOf(habit.id, d);
                  const full = weekly ? count > 0 : count >= habit.target_per_period;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setCount(habit.id, d, nextCount(habit, count))}
                      aria-label={`${habit.name}, ${formatDay(d, { day: "numeric", month: "long" })}: ${count}`}
                      className={`${hideNarrow(i)} h-7 flex-1 items-center justify-center rounded-md text-[10px] font-medium transition-colors ${
                        full
                          ? "bg-accent text-white"
                          : count > 0
                            ? "bg-accent/30 text-accent"
                            : "bg-foreground/5 hover:bg-foreground/10"
                      } ${d === today ? "ring-1 ring-accent/50" : ""}`}
                    >
                      {!weekly && habit.target_per_period > 1 && count > 0 ? count : ""}
                    </button>
                  );
                })}
                <HabitMenu id={habit.id} name={habit.name} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function HabitMenu({ id, name }: { id: string; name: string }) {
  return (
    <details className="relative w-5 shrink-0 text-center">
      <summary className="cursor-pointer list-none px-1 text-muted hover:text-foreground" aria-label="Действия">
        ⋯
      </summary>
      <div className="absolute right-0 z-10 mt-1 flex w-40 flex-col rounded-lg border border-border bg-surface p-1 text-sm shadow-lg">
        <button
          type="button"
          onClick={() => archiveHabit(id)}
          className="rounded-md px-2 py-1.5 text-left hover:bg-foreground/5"
        >
          В архив
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm(`Удалить «${name}» вместе со всей историей отметок?`)) deleteHabit(id);
          }}
          className="rounded-md px-2 py-1.5 text-left text-red-500 hover:bg-foreground/5"
        >
          Удалить
        </button>
      </div>
    </details>
  );
}
