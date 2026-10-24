import { useFetcher } from "react-router";
import type { Email, Folder, ListFolder } from "./mail.server";
import type { EmailPage } from "./mailbox.server";
import { useCallback, useEffect, useRef, useState } from "react";
import { sendStar } from "./star-client";

type PageResult = EmailPage | { error: string };

export function useInfiniteEmails(folder: ListFolder, initial: EmailPage) {
  const fetcher = useFetcher<PageResult>();
  const { load } = fetcher;

  const [emails, setEmails] = useState<Email[]>(initial.emails);
  const [token, setToken] = useState<string | null>(initial.nextPageToken);
  const [error, setError] = useState(false);
  const [cooling, setCooling] = useState(false);
  const [starError, setStarError] = useState<string | null>(null);

  const busy = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loading = fetcher.state !== "idle";

  useEffect(() => {
    const page = fetcher.data;
    if (!page) return;

    busy.current = false;
    if ("error" in page) {
      setError(true);
    } else {
      setError(false);
      setEmails((prev) => {
        const seen = new Set(prev.map((e) => e.id));
        return [...prev, ...page.emails.filter((e) => !seen.has(e.id))];
      });
      setToken(page.nextPageToken);
    }

    setCooling(true);
    const id = setTimeout(() => setCooling(false), 600);
    return () => clearTimeout(id);
  }, [fetcher.data]);

  const request = useCallback((pageToken: string) => {
    busy.current = true;
    load(`/api/emails?${new URLSearchParams({ folder, pageToken })}`);
  }, [folder, load]);

  const loadMore = useCallback(() => {
    if (!token || busy.current || cooling || error) return;
    request(token);
  }, [token, cooling, error, request]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMore();
    }, { rootMargin: "400px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  const retry = useCallback(() => {
    if (!token) return;
    setError(false);
    request(token);
  }, [token, request]);

  const toggleStar = useCallback(
    async (id: string) => {
      const current = emails.find((e) => e.id === id);
      if (!current) return;

      const starred = !current.starred;
      setStarError(null);
      setEmails((prev) => folder === "starred" && !starred ? prev.filter((e) => e.id !== id) : prev.map((e) => (e.id === id ? { ...e, starred } : e)));

      const failure = await sendStar(id, starred);
      if (failure) {
        setStarError(failure);
        setEmails((prev) => prev.some((e) => e.id === id) ? prev.map((e) => (e.id === id ? { ...e, starred: !starred } : e)) : [...prev, current].sort((a, b) => b.date.localeCompare(a.date)));
      }
    },
    [emails, folder],
  );

  return { emails, toggleStar, starError, footer: { sentinelRef, loading, error, retry } };
}
