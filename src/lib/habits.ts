import type { Habit, HabitLog } from "./supabase/database.types";
import { addDays, weekStart } from "./dates";

export type HabitLogEntry = Pick<HabitLog, "habit_id" | "log_date" | "count">;

export type HabitStats = {
  // Текущая серия: дней (daily) или недель (weekly) подряд с выполненной целью.
  current: number;
  best: number;
  // Сколько сделано в текущем периоде (сегодня или на этой неделе) и цель.
  periodDone: number;
  periodTarget: number;
};

// Длина серии, которая заканчивается в end и идёт назад с шагом step дней.
function runEndingAt(complete: Set<string>, end: string, step: number) {
  let n = 0;
  for (let p = end; complete.has(p); p = addDays(p, -step)) n++;
  return n;
}

// Серии считаются по периодам: для ежедневной привычки период = день,
// для еженедельной = неделя с понедельника. Период выполнен, если сумма
// отметок за него не меньше target_per_period. Невыполненный текущий период
// серию не обрывает: она тянется с прошлого, пока день или неделя не закончились.
export function habitStats(
  habit: Pick<Habit, "frequency" | "target_per_period">,
  logs: HabitLogEntry[],
  today: string,
): HabitStats {
  const weekly = habit.frequency === "weekly";
  const step = weekly ? 7 : 1;
  const periodOf = weekly ? weekStart : (d: string) => d;

  const totals = new Map<string, number>();
  for (const log of logs) {
    const p = periodOf(log.log_date);
    totals.set(p, (totals.get(p) ?? 0) + log.count);
  }

  const complete = new Set<string>();
  for (const [p, total] of totals) {
    if (total >= habit.target_per_period) complete.add(p);
  }

  const thisPeriod = periodOf(today);
  const current = complete.has(thisPeriod)
    ? runEndingAt(complete, thisPeriod, step)
    : runEndingAt(complete, addDays(thisPeriod, -step), step);

  let best = 0;
  for (const p of complete) {
    // Считаем только от начала каждой серии.
    if (!complete.has(addDays(p, -step))) best = Math.max(best, runEndingAt(complete, p, -step));
  }

  return {
    current,
    best,
    periodDone: totals.get(thisPeriod) ?? 0,
    periodTarget: habit.target_per_period,
  };
}
