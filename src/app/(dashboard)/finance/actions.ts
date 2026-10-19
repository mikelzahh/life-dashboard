"use server";

import { createHash } from "node:crypto";
import { refresh } from "next/cache";
import { authed, done, text, type ActionResult } from "@/lib/actions";
import { IMPORT_CHUNK } from "@/lib/csv";
import { currencies, parseAmount } from "@/lib/money";
import type { AccountKind, MoneyFlow } from "@/lib/supabase/database.types";

const accountKinds: AccountKind[] = ["cash", "card", "bank", "savings", "other"];
const isoDate = /^\d{4}-\d{2}-\d{2}$/;

function flow(value: unknown): MoneyFlow {
  return value === "income" ? "income" : "expense";
}

// ---------------------------------------------------------------------------
// Счета
// ---------------------------------------------------------------------------

export async function createAccount(formData: FormData): Promise<ActionResult> {
  const name = text(formData, "name");
  if (!name) return { error: "Введите название счёта" };
  const kind = accountKinds.find((k) => k === text(formData, "kind")) ?? "card";
  const currency = currencies.find((c) => c === text(formData, "currency")) ?? "RUB";
  const opening = text(formData, "opening_balance");
  const openingBalance = opening ? parseAmount(opening) : 0;
  if (openingBalance === null) return { error: "Не понял сумму начального остатка" };

  const supabase = await authed();
  const { error } = await supabase
    .from("accounts")
    .insert({ name, kind, currency, opening_balance: openingBalance });
  return done(error);
}

// Счёт без операций удаляем, а с операциями прячем в архив,
// чтобы не потерять историю в сводке по месяцам.
export async function removeAccount(id: string): Promise<ActionResult & { archived?: boolean }> {
  const supabase = await authed();
  const { count, error: countError } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("account_id", id);
  if (countError) return { error: countError.message };

  if (count) {
    const { error } = await supabase
      .from("accounts")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", id);
    return { ...done(error), archived: !error };
  }
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  return done(error);
}

// ---------------------------------------------------------------------------
// Категории
// ---------------------------------------------------------------------------

export async function createCategory(formData: FormData): Promise<ActionResult> {
  const name = text(formData, "name");
  if (!name) return { error: "Введите название категории" };
  const supabase = await authed();
  const { error } = await supabase.from("categories").insert({ name, kind: flow(text(formData, "kind")) });
  if (error?.code === "23505") return { error: "Такая категория уже есть" };
  return done(error);
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const supabase = await authed();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  return done(error);
}

const defaultCategories: Record<MoneyFlow, string[]> = {
  expense: [
    "Продукты",
    "Кафе и рестораны",
    "Транспорт",
    "Жильё и коммуналка",
    "Связь и подписки",
    "Здоровье",
    "Одежда",
    "Развлечения",
    "Подарки",
    "Прочее",
  ],
  income: ["Зарплата", "Подработка", "Проценты и кэшбэк", "Подарки", "Прочее"],
};

export async function addDefaultCategories(): Promise<ActionResult> {
  const supabase = await authed();
  const rows = (["expense", "income"] as const).flatMap((kind) =>
    defaultCategories[kind].map((name) => ({ name, kind })),
  );
  const { error } = await supabase
    .from("categories")
    .upsert(rows, { onConflict: "user_id,kind,name", ignoreDuplicates: true });
  return done(error);
}

// ---------------------------------------------------------------------------
// Операции
// ---------------------------------------------------------------------------

export async function createTransaction(formData: FormData): Promise<ActionResult> {
  const amount = parseAmount(text(formData, "amount"));
  if (amount === null || amount === 0) return { error: "Введите сумму" };
  const accountId = text(formData, "account_id");
  if (!accountId) return { error: "Сначала добавьте счёт" };
  const occurredOn = text(formData, "occurred_on");
  if (occurredOn && !isoDate.test(occurredOn)) return { error: "Неверная дата" };

  const supabase = await authed();
  const { error } = await supabase.from("transactions").insert({
    kind: flow(text(formData, "kind")),
    amount: Math.abs(amount),
    account_id: accountId,
    category_id: text(formData, "category_id") || null,
    occurred_on: occurredOn || undefined,
    note: text(formData, "note") || null,
  });
  return done(error);
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  const supabase = await authed();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  return done(error);
}

export async function setTransactionCategory(
  id: string,
  categoryId: string | null,
): Promise<ActionResult> {
  const supabase = await authed();
  const { error } = await supabase
    .from("transactions")
    .update({ category_id: categoryId })
    .eq("id", id);
  return done(error);
}

// ---------------------------------------------------------------------------
// Импорт из CSV
// ---------------------------------------------------------------------------

export type ImportPayloadRow = {
  occurred_on: string;
  kind: MoneyFlow;
  amount: number;
  note: string;
  category: string;
  // Какая это по счёту одинаковая строка в файле: две одинаковые покупки
  // за день должны остаться двумя операциями.
  occurrence: number;
};

export type ImportResult = ActionResult & { added?: number; skipped?: number };

export async function importTransactions(
  accountId: string,
  rows: ImportPayloadRow[],
): Promise<ImportResult> {
  if (!accountId) return { error: "Выберите счёт" };
  if (!Array.isArray(rows) || rows.length === 0) return { added: 0, skipped: 0 };
  if (rows.length > IMPORT_CHUNK) return { error: `Не больше ${IMPORT_CHUNK} строк за раз` };

  const clean = rows.flatMap((r) => {
    const amount = Math.round(Math.abs(Number(r?.amount)) * 100) / 100;
    if (!isoDate.test(String(r?.occurred_on)) || !Number.isFinite(amount) || amount === 0) return [];
    return [
      {
        occurred_on: String(r.occurred_on),
        kind: flow(r.kind),
        amount,
        note: String(r.note ?? "").trim().slice(0, 500),
        category: String(r.category ?? "").trim().slice(0, 100),
        occurrence: Math.max(0, Math.floor(Number(r.occurrence)) || 0),
      },
    ];
  });

  const supabase = await authed();

  // Категории из выписки сопоставляем по имени и создаём недостающие.
  const wanted = new Map<string, { name: string; kind: MoneyFlow }>();
  for (const r of clean) {
    if (r.category) wanted.set(`${r.kind}:${r.category.toLowerCase()}`, { name: r.category, kind: r.kind });
  }
  const { data: existing, error: categoriesError } = await supabase
    .from("categories")
    .select("id, name, kind");
  if (categoriesError) return { error: categoriesError.message };
  const categoryIds = new Map(
    (existing ?? []).map((c) => [`${c.kind}:${c.name.toLowerCase()}`, c.id]),
  );
  const missing = [...wanted].filter(([key]) => !categoryIds.has(key)).map(([, c]) => c);
  if (missing.length > 0) {
    const { data: created, error } = await supabase
      .from("categories")
      .insert(missing)
      .select("id, name, kind");
    if (error) return { error: error.message };
    for (const c of created ?? []) categoryIds.set(`${c.kind}:${c.name.toLowerCase()}`, c.id);
  }

  const payload = clean.map((r) => ({
    account_id: accountId,
    kind: r.kind,
    amount: r.amount,
    occurred_on: r.occurred_on,
    note: r.note || null,
    category_id: r.category ? (categoryIds.get(`${r.kind}:${r.category.toLowerCase()}`) ?? null) : null,
    import_key: createHash("sha1")
      .update([r.occurred_on, r.kind, r.amount.toFixed(2), r.note.toLowerCase(), r.occurrence].join("|"))
      .digest("hex"),
  }));

  // Строки, которые уже импортировались раньше, база пропускает по (account_id, import_key).
  const { data, error } = await supabase
    .from("transactions")
    .upsert(payload, { onConflict: "account_id,import_key", ignoreDuplicates: true })
    .select("id");
  if (error) return { error: error.message };
  refresh();
  const added = data?.length ?? 0;
  return { added, skipped: rows.length - added };
}
