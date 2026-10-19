"use client";

import { useMemo, useState } from "react";
import { importTransactions, type ImportPayloadRow } from "@/app/(dashboard)/finance/actions";
import {
  IMPORT_CHUNK,
  decodeCsv,
  guessMapping,
  parseCsv,
  toImportRows,
  type CsvField,
  type CsvMapping,
  type SignMode,
} from "@/lib/csv";
import { formatDay } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { AccountOption } from "./transaction-form";

const field =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

const fieldLabels: Record<CsvField, string> = {
  date: "Дата",
  amount: "Сумма",
  note: "Описание",
  category: "Категория",
  status: "Статус",
};
const requiredFields: CsvField[] = ["date", "amount"];

type FileData = { name: string; header: string[]; rows: string[][] };

// Импорт выписки: файл разбираем в браузере, показываем, что получилось,
// и отправляем на сервер частями. Повторный импорт той же выписки дублей не создаёт.
export function CsvImport({ accounts }: { accounts: AccountOption[] }) {
  const [file, setFile] = useState<FileData | null>(null);
  const [mapping, setMapping] = useState<CsvMapping | null>(null);
  const [sign, setSign] = useState<SignMode>("signed");
  const [chosenAccount, setAccountId] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const parsed = useMemo(
    () => (file && mapping ? toImportRows(file.rows, mapping, sign) : null),
    [file, mapping, sign],
  );

  // Счёт мог появиться или исчезнуть после первого рендера: берём первый доступный.
  const accountId = accounts.some((a) => a.id === chosenAccount) ? chosenAccount : (accounts[0]?.id ?? "");

  if (accounts.length === 0) {
    return <p className="py-6 text-center text-sm text-muted">Сначала добавьте счёт, на который грузить выписку.</p>;
  }

  async function choose(input: HTMLInputElement) {
    const selected = input.files?.[0];
    setMessage("");
    setError("");
    if (!selected) return;
    const rows = parseCsv(decodeCsv(await selected.arrayBuffer()));
    if (rows.length < 2) {
      setError("В файле не нашлось строк с операциями");
      return;
    }
    const [header, ...body] = rows;
    setFile({ name: selected.name, header, rows: body });
    setMapping(guessMapping(header));
  }

  async function run() {
    if (!parsed || parsed.rows.length === 0) return;
    setError("");
    setMessage("");

    // Одинаковые строки (две покупки кофе за день) нумеруем, чтобы обе дошли до базы.
    const seen = new Map<string, number>();
    const payload: ImportPayloadRow[] = parsed.rows.map((r) => {
      const key = [r.occurred_on, r.kind, r.amount, r.note.toLowerCase()].join("|");
      const occurrence = seen.get(key) ?? 0;
      seen.set(key, occurrence + 1);
      return { ...r, occurrence };
    });

    let added = 0;
    let skipped = 0;
    setProgress(0);
    for (let i = 0; i < payload.length; i += IMPORT_CHUNK) {
      const result = await importTransactions(accountId, payload.slice(i, i + IMPORT_CHUNK));
      if (result.error) {
        setError(
          `Остановились на строке ${i + 1}: ${result.error}` +
            (added ? `. До этого добавлено операций: ${added}.` : ""),
        );
        setProgress(null);
        return;
      }
      added += result.added ?? 0;
      skipped += result.skipped ?? 0;
      setProgress(Math.min(i + IMPORT_CHUNK, payload.length));
    }
    setProgress(null);
    setMessage(
      `Добавлено операций: ${added}.` + (skipped ? ` Уже были в базе и пропущены: ${skipped}.` : ""),
    );
    setFile(null);
    setMapping(null);
  }

  const income = parsed?.rows.filter((r) => r.kind === "income") ?? [];
  const expense = parsed?.rows.filter((r) => r.kind === "expense") ?? [];
  const currency = accounts.find((a) => a.id === accountId)?.currency;
  const sum = (rows: typeof income) => rows.reduce((s, r) => s + r.amount, 0);
  const missingRequired = mapping ? requiredFields.some((f) => mapping[f] < 0) : true;

  return (
    <div className="flex flex-col gap-3">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border px-4 py-5 text-center text-sm text-muted hover:border-accent hover:text-accent">
        <span>{file ? `Файл: ${file.name}` : "Выберите CSV-выписку банка"}</span>
        <span className="text-xs">UTF-8 или Windows-1251, разделитель «;», «,» или табуляция</span>
        <input
          type="file"
          accept=".csv,.txt,text/csv"
          className="sr-only"
          onChange={(e) => {
            choose(e.currentTarget);
            e.currentTarget.value = "";
          }}
        />
      </label>

      {file && mapping && parsed && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(Object.keys(fieldLabels) as CsvField[]).map((f) => (
              <label key={f} className="flex flex-col gap-1 text-xs text-muted">
                {fieldLabels[f]}
                {requiredFields.includes(f) ? "" : " (необязательно)"}
                <select
                  value={mapping[f]}
                  onChange={(e) => setMapping({ ...mapping, [f]: Number(e.target.value) })}
                  className={`${field} py-1.5 text-xs text-foreground`}
                >
                  <option value={-1}>—</option>
                  {file.header.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `Столбец ${i + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label className="flex flex-col gap-1 text-xs text-muted">
              Знак суммы
              <select
                value={sign}
                onChange={(e) => setSign(e.target.value as SignMode)}
                className={`${field} py-1.5 text-xs text-foreground`}
              >
                <option value="signed">Минус — расход, плюс — доход</option>
                <option value="all-expense">Все строки — расходы</option>
                <option value="all-income">Все строки — доходы</option>
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">На счёт</span>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              aria-label="Счёт для импорта"
              className={`${field} py-1.5`}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {missingRequired ? (
            <p className="text-sm text-red-500">Укажите столбцы с датой и суммой.</p>
          ) : (
            <>
              <p className="text-sm">
                Готово к импорту: <b>{parsed.rows.length}</b> операций · доходы{" "}
                <span className="text-emerald-600">{formatMoney(sum(income), currency)}</span> · расходы{" "}
                {formatMoney(sum(expense), currency)}
                {parsed.skippedByStatus > 0 && (
                  <span className="text-muted"> · отклонённых пропущено: {parsed.skippedByStatus}</span>
                )}
              </p>
              {parsed.invalid.length > 0 && (
                <p className="text-xs text-amber-600">
                  Не разобрал {parsed.invalid.length} строк (номера в файле:{" "}
                  {parsed.invalid.slice(0, 10).join(", ")}
                  {parsed.invalid.length > 10 ? "…" : ""}). Проверьте выбранные столбцы.
                </p>
              )}
              {parsed.rows.length > 0 && (
                <ul className="flex flex-col divide-y divide-border rounded-lg border border-border text-sm">
                  {parsed.rows.slice(0, 5).map((r, i) => (
                    <li key={i} className="flex items-center gap-3 px-3 py-1.5">
                      <span className="w-16 shrink-0 text-xs text-muted">
                        {formatDay(r.occurred_on, { day: "numeric", month: "short" })}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {r.note || r.category || "Без описания"}
                        {r.category && r.note && <span className="text-xs text-muted"> · {r.category}</span>}
                      </span>
                      <span className={`shrink-0 tabular-nums ${r.kind === "income" ? "text-emerald-600" : ""}`}>
                        {r.kind === "income" ? "+" : "−"}
                        {formatMoney(r.amount, currency)}
                      </span>
                    </li>
                  ))}
                  {parsed.rows.length > 5 && (
                    <li className="px-3 py-1.5 text-xs text-muted">и ещё {parsed.rows.length - 5}</li>
                  )}
                </ul>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setMapping(null);
                  }}
                  className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-foreground/5"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={run}
                  disabled={progress !== null || parsed.rows.length === 0}
                  className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {progress !== null
                    ? `Загружаю… ${progress} из ${parsed.rows.length}`
                    : `Импортировать ${parsed.rows.length}`}
                </button>
              </div>
            </>
          )}
        </>
      )}
      {message && <p className="text-sm text-emerald-600">{message}</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
