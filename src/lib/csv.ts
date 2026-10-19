import { parseAmount } from "@/lib/money";
import type { MoneyFlow } from "@/lib/supabase/database.types";

// Разбор банковских выписок в CSV прямо в браузере.

// Строки уходят на сервер частями по столько штук (лимит тела server action 1 МБ).
export const IMPORT_CHUNK = 500;

// Выписки российских банков часто в windows-1251. Пробуем UTF-8 и,
// если байты в нём невалидны, читаем как windows-1251.
export function decodeCsv(buffer: ArrayBuffer) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1251").decode(buffer);
  }
}

// Разделитель угадываем по первой строке: какой символ встречается чаще вне кавычек.
function detectDelimiter(text: string) {
  const firstLine = text.split(/\r?\n/, 1)[0].replace(/"[^"]*"/g, "");
  const candidates = [";", ",", "\t", "|"];
  return candidates
    .map((d) => [d, firstLine.split(d).length] as const)
    .sort((a, b) => b[1] - a[1])[0][0];
}

// CSV по RFC 4180: кавычки, "" внутри кавычек, переводы строк в ячейках.
export function parseCsv(text: string): string[][] {
  const source = text.replace(/^﻿/, "");
  const delimiter = detectDelimiter(source);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quoted) {
      if (ch === '"' && source[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"' && cell === "") {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && source[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows
    .map((r) => r.map((c) => c.trim()))
    .filter((r) => r.some((c) => c !== ""));
}

// «03.10.2026», «03.10.2026 14:05:00», «2026-10-03», «03/10/2026», «03.10.26» → YYYY-MM-DD.
export function parseDate(input: string): string | null {
  const s = input.trim();
  let y: number, m: number, d: number;
  let match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if ((match = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})(?!\d)/))) {
    [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
    if (y < 100) y += 2000;
  } else {
    return null;
  }
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

export type CsvField = "date" | "amount" | "note" | "category" | "status";

export type CsvMapping = Record<CsvField, number>; // -1: столбца нет

// Подсказки по заголовкам выписок Т-Банка, Сбера, Альфы и общих форматов.
const fieldPatterns: Record<CsvField, RegExp[]> = {
  date: [/^дата операции/i, /^дата/i, /date/i],
  amount: [/^сумма операции$/i, /^сумма в валюте счета/i, /^сумма/i, /amount|sum/i],
  note: [/^описание/i, /назначение/i, /комментарий/i, /description|memo|payee|note/i],
  category: [/категория/i, /category/i],
  status: [/статус/i, /status/i],
};

export function guessMapping(header: string[]): CsvMapping {
  const used = new Set<number>();
  const pick = (field: CsvField) => {
    for (const pattern of fieldPatterns[field]) {
      const index = header.findIndex((h, i) => !used.has(i) && pattern.test(h));
      if (index >= 0) {
        used.add(index);
        return index;
      }
    }
    return -1;
  };
  // Порядок важен: сначала поля с самыми точными заголовками.
  const date = pick("date");
  const amount = pick("amount");
  const category = pick("category");
  const status = pick("status");
  const note = pick("note");
  return { date, amount, note, category, status };
}

// Как понимать знак суммы.
export type SignMode = "signed" | "all-expense" | "all-income";

export type ImportRow = {
  occurred_on: string;
  kind: MoneyFlow;
  amount: number;
  note: string;
  category: string;
};

export type ParsedImport = {
  rows: ImportRow[];
  // Номера строк файла (с 1, считая заголовок), которые не удалось разобрать.
  invalid: number[];
  // Отклонённые и отменённые операции, пропущенные по статусу.
  skippedByStatus: number;
};

const failedStatus = /fail|отклон|отмен|cancel|declin/i;

export function toImportRows(
  data: string[][],
  mapping: CsvMapping,
  sign: SignMode,
): ParsedImport {
  const rows: ImportRow[] = [];
  const invalid: number[] = [];
  let skippedByStatus = 0;
  const cell = (r: string[], i: number) => (i >= 0 ? (r[i] ?? "") : "");

  data.forEach((r, index) => {
    if (mapping.status >= 0 && failedStatus.test(cell(r, mapping.status))) {
      skippedByStatus++;
      return;
    }
    const occurred_on = parseDate(cell(r, mapping.date));
    const amount = parseAmount(cell(r, mapping.amount));
    if (!occurred_on || amount === null || amount === 0) {
      invalid.push(index + 2);
      return;
    }
    const kind: MoneyFlow =
      sign === "all-expense" ? "expense" : sign === "all-income" ? "income" : amount < 0 ? "expense" : "income";
    rows.push({
      occurred_on,
      kind,
      amount: Math.abs(amount),
      note: cell(r, mapping.note),
      category: cell(r, mapping.category),
    });
  });
  return { rows, invalid, skippedByStatus };
}
