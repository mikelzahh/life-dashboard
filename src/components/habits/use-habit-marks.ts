"use client";

import { useOptimistic, useState, useTransition } from "react";
import type { Habit } from "@/lib/supabase/database.types";
import type { HabitLogEntry } from "@/lib/habits";
import { setHabitCount } from "@/app/(dashboard)/tasks/actions";

const key = (habitId: string, date: string) => `${habitId}:${date}`;

// Следующее значение отметки по клику. Ежедневная привычка с целью N раз
// в день проходит 0 → 1 → … → N → 0; у еженедельной в день одна отметка.
export function nextCount(habit: Pick<Habit, "frequency" | "target_per_period">, count: number) {
  const max = habit.frequency === "daily" ? habit.target_per_period : 1;
  return count >= max ? 0 : count + 1;
}

// Отметки привычек по дням с мгновенным откликом на клик.
export function useHabitMarks(logs: HabitLogEntry[]) {
  const [counts, apply] = useOptimistic(
    new Map(logs.map((l) => [key(l.habit_id, l.log_date), l.count])),
    (state, change: { k: string; count: number }) => new Map(state).set(change.k, change.count),
  );
  const [, startTransition] = useTransition();
  const [error, setError] = useState("");

  const countOf = (habitId: string, date: string) => counts.get(key(habitId, date)) ?? 0;

  function setCount(habitId: string, date: string, count: number) {
    startTransition(async () => {
      apply({ k: key(habitId, date), count });
      const result = await setHabitCount(habitId, date, count);
      setError(result.error ?? "");
    });
  }

  return { countOf, setCount, error };
}
