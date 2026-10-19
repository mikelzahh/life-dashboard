"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error?: string };

// Server actions доступны прямым POST-запросом, поэтому каждая проверяет вход.
// Чужие строки защищает RLS, user_id подставляет база (default auth.uid()).
async function authed() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) throw new Error("Нужно войти");
  return supabase;
}

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function done(error: { message: string } | null): ActionResult {
  if (error) return { error: error.message };
  refresh();
  return {};
}

// ---------------------------------------------------------------------------
// Задачи
// ---------------------------------------------------------------------------

export async function createTask(formData: FormData): Promise<ActionResult> {
  const title = text(formData, "title");
  if (!title) return { error: "Введите название задачи" };
  const priority = Number(text(formData, "priority")) || 0;

  const supabase = await authed();
  const { error } = await supabase.from("tasks").insert({
    title,
    due_date: text(formData, "due_date") || null,
    priority: Math.min(Math.max(priority, 0), 3),
  });
  return done(error);
}

export async function setTaskDone(id: string, isDone: boolean): Promise<ActionResult> {
  const supabase = await authed();
  const { error } = await supabase
    .from("tasks")
    .update(
      isDone
        ? { status: "done", completed_at: new Date().toISOString() }
        : { status: "todo", completed_at: null },
    )
    .eq("id", id);
  return done(error);
}

export async function deleteTask(id: string): Promise<ActionResult> {
  const supabase = await authed();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  return done(error);
}

// ---------------------------------------------------------------------------
// Привычки
// ---------------------------------------------------------------------------

export async function createHabit(formData: FormData): Promise<ActionResult> {
  const name = text(formData, "name");
  if (!name) return { error: "Введите название привычки" };
  const frequency = text(formData, "frequency") === "weekly" ? "weekly" : "daily";
  const target = Math.max(Math.floor(Number(text(formData, "target"))) || 1, 1);

  const supabase = await authed();
  const { error } = await supabase
    .from("habits")
    .insert({ name, frequency, target_per_period: target });
  return done(error);
}

// Ставит число отметок привычки за день; 0 снимает отметку.
export async function setHabitCount(
  habitId: string,
  date: string,
  count: number,
): Promise<ActionResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Неверная дата" };
  const supabase = await authed();

  const { error } =
    count > 0
      ? await supabase
          .from("habit_logs")
          .upsert(
            { habit_id: habitId, log_date: date, count: Math.floor(count) },
            { onConflict: "habit_id,log_date" },
          )
      : await supabase.from("habit_logs").delete().eq("habit_id", habitId).eq("log_date", date);
  return done(error);
}

export async function archiveHabit(id: string): Promise<ActionResult> {
  const supabase = await authed();
  const { error } = await supabase
    .from("habits")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  return done(error);
}

export async function deleteHabit(id: string): Promise<ActionResult> {
  const supabase = await authed();
  const { error } = await supabase.from("habits").delete().eq("id", id);
  return done(error);
}
