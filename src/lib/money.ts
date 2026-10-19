// Деньги: суммы в базе numeric(14, 2), в коде number в рублях (не копейках).

const formats = new Map<string, Intl.NumberFormat>();

function formatter(currency: string, cents: boolean) {
  const key = `${currency}:${cents}`;
  let format = formats.get(key);
  if (!format) {
    format = new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency,
      minimumFractionDigits: cents ? 2 : 0,
      maximumFractionDigits: cents ? 2 : 0,
    });
    formats.set(key, format);
  }
  return format;
}

// «12 345 ₽», «12 345,50 ₽»: копейки показываем, только если они есть.
export function formatMoney(amount: number, currency = "RUB") {
  const cents = Math.round(Math.abs(amount) * 100) % 100 !== 0;
  return formatter(currency, cents).format(amount);
}

// Разбирает сумму, как её пишут люди и банки: «1 234,56», «-1234.56», «−500 ₽», «1,234.56».
// Возвращает число со знаком или null, если суммы в строке нет.
export function parseAmount(input: string): number | null {
  let s = input
    .replace(/[\s  ']/g, "")
    .replace(/[−–—]/g, "-")
    .replace(/[^\d.,+-]/g, "");
  if (!/\d/.test(s)) return null;
  const negative = s.startsWith("-") || s.endsWith("-");
  s = s.replace(/[+-]/g, "");

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    // Разделитель дробной части тот, что стоит последним; другой отделяет тысячи.
    const decimal = lastComma > lastDot ? "," : ".";
    const thousands = decimal === "," ? "." : ",";
    s = s.split(thousands).join("").replace(decimal, ".");
  } else if (lastComma >= 0) {
    // «1,234» без дробной части — тысячи; «12,5» и «12,50» — копейки.
    s = /^\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    // «1.234» и «1.234.567» — тоже тысячи: у денег не бывает трёх знаков после точки.
    s = s.replace(/\./g, "");
  }

  const value = Number(s);
  if (!Number.isFinite(value)) return null;
  return Math.round((negative ? -value : value) * 100) / 100;
}

export const currencies = ["RUB", "USD", "EUR", "CNY", "KZT", "BYN", "GEL", "AMD", "TRY", "AED"];
