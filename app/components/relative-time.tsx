import { useEffect, useState } from "react";
import { formatEmailDate, formatFullDate, formatStaticDate } from "~/lib/date";

export function RelativeTime({ date }: { date: string }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <time dateTime={date} title={now ? formatFullDate(date) : undefined}>
      {now ? formatEmailDate(date, now) : formatStaticDate(date)}
    </time>
  )
}
