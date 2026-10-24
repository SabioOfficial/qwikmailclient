import { useFetcher } from "react-router";
import type { Email, Folder } from "./mail.server";
import type { EmailPage } from "./mailbox.server";
import { useCallback, useEffect, useRef, useState } from "react";

type PageResult = EmailPage | { error: string };

export function useInfiniteEmails(folder: Folder, initial: EmailPage) {
  const fetcher = useFetcher<PageResult>();
  const { load } = fetcher;

  const [emails, setEmails] = useState<Email[]>(initial.emails);
  const [token, setToken] = useState<string | null>(initial.nextPageToken);
  const [error, setError] = useState(false);
  const [cooling, setCooling] = useState(false);

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

  return { emails, footer: { sentinelRef, loading, error, retry } };
}
