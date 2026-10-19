import "server-only";
import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Общие помощники server actions.
// Server actions доступны прямым POST-запросом, поэтому каждая проверяет вход.
// Чужие строки защищает RLS, user_id подставляет база (default auth.uid()).

export type ActionResult = { error?: string };

export async function authed() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) throw new Error("Нужно войти");
  return supabase;
}

export function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function done(error: { message: string } | null): ActionResult {
  if (error) return { error: error.message };
  refresh();
  return {};
}
