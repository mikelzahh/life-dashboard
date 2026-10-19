import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Habit, Task } from "@/lib/supabase/database.types";
import { addDays, toLocalISO, weekStart } from "@/lib/dates";
import { habitStats, type HabitLogEntry, type HabitStats } from "@/lib/habits";

// Сколько недель истории показывает календарь выполнения.
export const CALENDAR_WEEKS = 18;

export type HabitWithStats = Habit & { stats: HabitStats };

export type PlannerData = {
  today: string;
  openTasks: Task[];
  // Выполненные задачи с начала календаря, новые сверху.
  doneTasks: Task[];
  habits: HabitWithStats[];
  logs: HabitLogEntry[];
  calendarFrom: string;
};

// Задачи и привычки текущего пользователя. Обёрнуто в cache(), чтобы виджеты
// главной страницы делили один запрос к базе. Читает cookies, поэтому
// вызывающие компоненты должны быть внутри <Suspense>.
export const getPlannerData = cache(async (): Promise<PlannerData | null> => {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const today = toLocalISO();
  const calendarFrom = weekStart(addDays(today, -7 * (CALENDAR_WEEKS - 1)));

  const [open, done, habits, logs] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .neq("status", "done")
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("tasks")
      .select("*")
      .eq("status", "done")
      .gte("completed_at", `${addDays(calendarFrom, -1)}T00:00:00Z`)
      .order("completed_at", { ascending: false }),
    supabase.from("habits").select("*").is("archived_at", null).order("created_at"),
    // Вся история нужна для лучшей серии; для личного дашборда это немного строк.
    supabase.from("habit_logs").select("habit_id, log_date, count"),
  ]);

  const error = open.error ?? done.error ?? habits.error ?? logs.error;
  if (error) throw new Error(`Не удалось загрузить задачи и привычки: ${error.message}`);

  const logRows = logs.data ?? [];
  const logsByHabit = new Map<string, HabitLogEntry[]>();
  for (const log of logRows) {
    logsByHabit.set(log.habit_id, [...(logsByHabit.get(log.habit_id) ?? []), log]);
  }

  return {
    today,
    calendarFrom,
    openTasks: open.data ?? [],
    doneTasks: done.data ?? [],
    habits: (habits.data ?? []).map((h) => ({
      ...h,
      stats: habitStats(h, logsByHabit.get(h.id) ?? [], today),
    })),
    logs: logRows,
  };
});
