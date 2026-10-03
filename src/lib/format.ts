/** Formatação em pt-BR usada em todo o sistema. */

const dayMonth = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" });
const dayMonthYear = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const longDay = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" });
const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

const clean = (text: string) => text.replace(/\./g, "").replace(/ de /g, " ");

/** "26 set" (ano atual) ou "26 set 2025". */
export function formatDate(iso: string) {
  const date = new Date(iso);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return clean((sameYear ? dayMonth : dayMonthYear).format(date));
}

/** "26 set às 10:30". */
export function formatDateTime(iso: string) {
  return `${formatDate(iso)} às ${time.format(new Date(iso))}`;
}

/** "10:30". */
export function formatTime(iso: string) {
  return time.format(new Date(iso));
}

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/** Separador de dia do chat: "Hoje", "Ontem" ou "14 de setembro". */
export function formatDayLabel(iso: string) {
  const days = Math.round(
    (startOfDay(new Date()).getTime() - startOfDay(new Date(iso)).getTime()) / 86_400_000,
  );
  if (days === 0) return "Hoje";
  if (days === 1) return "Ontem";
  return longDay.format(new Date(iso));
}

/** Data de calendário (AAAA-MM-DD) sem problemas de fuso. */
export function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

const longDate = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "short" });
const longDateYear = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** "sábado, 12 de dez." (com o ano quando não é o atual). */
export function formatLongDate(date: Date) {
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return (sameYear ? longDate : longDateYear).format(date);
}

/** "em 77 dias", "amanhã", "hoje", "há 3 dias". */
export function formatRelativeDays(target: Date) {
  const days = Math.round((startOfDay(target).getTime() - startOfDay(new Date()).getTime()) / 86_400_000);
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  if (days === -1) return "ontem";
  return days > 0 ? `em ${days} dias` : `há ${-days} dias`;
}

/** "842 KB", "1,2 MB". */
export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: value < 10 ? 1 : 0 })} ${units[unit]}`;
}

const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long" });
const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });

/** Hora na lista de conversas: "10:30" hoje, "Ontem", "quinta" na semana, "23/09" antes. */
export function formatListTime(iso: string) {
  const date = new Date(iso);
  const days = Math.round((startOfDay(new Date()).getTime() - startOfDay(date).getTime()) / 86_400_000);
  if (days <= 0) return time.format(date);
  if (days === 1) return "Ontem";
  if (days < 7) return weekday.format(date).replace("-feira", "");
  return shortDate.format(date);
}

/** Há quanto tempo, curto: "agora", "12min", "3h", "2d". */
export function formatAgo(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

const relative = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
const relativeUnits: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

/** "há 3 dias", "ontem", "há 2 meses", "agora" (dias até completar um mês). */
export function formatRelativeTime(iso: string) {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
  for (const [unit, size] of relativeUnits) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return "agora";
}
