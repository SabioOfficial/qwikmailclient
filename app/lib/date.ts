function isSameDay(a: Date, b: Date): boolean {
  return (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate());
}

function startOfWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

export function formatEmailDate(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const diff = now.getTime() - date.getTime();

  if (diff > -60000 && diff < 60000) return "Just now";

  if (diff >= 60000 && diff < 60 * 60000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  }

  if (diff >= 3600000 && isSameDay(date, now)) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }

  const weekStart = startOfWeek(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  if (date >= weekStart && date < weekEnd) return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date);

  if (date.getFullYear() === now.getFullYear()) return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" }).format(date);

  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

export function formatStaticDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date);
}

export function formatFullDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeStyle: "short" }).format(date);
}
