export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

// Пока ключей нет, приложение работает без Supabase и показывает заглушки.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
