import { isSupabaseConfigured } from "@/lib/supabase/env";

export function SetupBanner() {
  if (isSupabaseConfigured) return null;

  return (
    <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
      Supabase ещё не подключён: данные не сохраняются, вход отключён. Заполните{" "}
      <code className="font-mono">.env.local</code> по инструкции из README.
    </div>
  );
}
