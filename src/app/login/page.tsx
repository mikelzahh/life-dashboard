import { LoginForm } from "./login-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6">
        <h1 className="mb-1 text-xl font-semibold">Вход</h1>
        <p className="mb-5 text-sm text-muted">Пришлём ссылку для входа на почту.</p>
        {isSupabaseConfigured ? (
          <LoginForm />
        ) : (
          <p className="text-sm text-muted">Сначала подключите Supabase (см. README).</p>
        )}
      </div>
    </main>
  );
}
