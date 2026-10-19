// Даты дня храним строками YYYY-MM-DD (как log_date и due_date в базе).
// «Сегодня» считаем в часовом поясе пользователя, а не сервера: на хостинге
// сервер обычно живёт в UTC, и около полуночи день бы съезжал.
export const timeZone = process.env.APP_TIME_ZONE || "Europe/Moscow";

const isoFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// День в часовом поясе пользователя для момента времени (по умолчанию сейчас).
export function toLocalISO(date: Date | string = new Date()) {
  return isoFormat.format(typeof date === "string" ? new Date(date) : date);
}

function toUTC(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(iso: string, days: number) {
  const d = toUTC(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Понедельник недели, в которую попадает день.
export function weekStart(iso: string) {
  const dayOfWeek = (toUTC(iso).getUTCDay() + 6) % 7;
  return addDays(iso, -dayOfWeek);
}

// Дни от from до to включительно.
export function daysBetween(from: string, to: string) {
  const days: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  return days;
}

// Месяц храним как его первое число: YYYY-MM-01.
export function monthStart(iso: string) {
  return `${iso.slice(0, 7)}-01`;
}

export function addMonths(month: string, months: number) {
  const d = toUTC(month);
  d.setUTCMonth(d.getUTCMonth() + months, 1);
  return d.toISOString().slice(0, 10);
}

// «октябрь 2026», «окт.»: название месяца по его первому числу.
export function formatMonth(month: string, options: Intl.DateTimeFormatOptions = { month: "long", year: "numeric" }) {
  return formatDay(month, options).replace(/\s*г\.$/, "");
}

export function formatDay(iso: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("ru-RU", { ...options, timeZone: "UTC" }).format(toUTC(iso));
}

// «5 дней», «1 неделя»: выбирает форму слова для числа.
export function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
