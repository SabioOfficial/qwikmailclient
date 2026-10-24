import { data } from "react-router";
import { refreshAccessToken } from "./google.server";
import type { Email, Folder, ListFolder } from "./mail.server";
import type { GoogleTokens } from "./session.server";
import type { EmailPage, SendInput } from "./mailbox.server";

const LABELS: Record<ListFolder, string> = { inbox: "INBOX", sent: "SENT", starred: "STARRED" };

interface LimiterState {
  spent: { at: number; cost: number }[];
  blockedUntil: number;
}

const globals = globalThis as unknown as {
  __gmailLimiter?: LimiterState;
  __gmailMeta?: Map<string, { msg: GmailMessage, at: number }>;
};
const limiter: LimiterState = (globals.__gmailLimiter ??= { spent: [], blockedUntil: 0 });
const metaCache = (globals.__gmailMeta ??= new Map<string, { msg: GmailMessage; at: number }>());

const refreshed = new Map<string, { accessToken: string, expiresAt: number }>();

async function getAccessToken(tokens: GoogleTokens): Promise<string> {
  const cached = refreshed.get(tokens.refreshToken);
  const current = cached && cached.expiresAt > tokens.expiresAt ? cached : tokens;
  if (current.expiresAt - Date.now() > 60000) return current.accessToken;

  try {
    const fresh = await refreshAccessToken(tokens.refreshToken);
    const entry = {
      accessToken: fresh.access_token,
      expiresAt: Date.now() + fresh.expires_in * 1000,
    };
    refreshed.set(tokens.refreshToken, entry);
    return entry.accessToken;
  } catch {
    throw data("Your Google session has expired. Disconnect and connect Gmail again.", { status: 401 });
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function tooMany(ms: number): never {
  const seconds = Math.max(1, Math.ceil(ms / 1000));
  throw data(`Too many Gmail requests in a short time. Try again in about ${seconds} seconds.`, { status: 429 });
}

function totalSince(since: number): number {
  let sum = 0;
  for (const entry of limiter.spent) {
    if (entry.at > since) sum += entry.cost;
  }
  return sum;
}

export function unitsLastMinute(): number {
  return totalSince(Date.now() - 60000);
}

async function acquire(cost: number): Promise<void> {
  for (; ;) {
    const now = Date.now();
    if (now < limiter.blockedUntil) tooMany(limiter.blockedUntil - now);

    limiter.spent = limiter.spent.filter((entry) => entry.at > now - 60000);

    let wait = 0;
    const minuteTotal = totalSince(now - 60000);
    if (minuteTotal + cost > 700) {
      let remaining = minuteTotal;
      wait = 60000;
      for (const entry of limiter.spent) {
        remaining -= entry.cost;
        if (remaining + cost <= 700) {
          wait = entry.at + 60000 - now + 1;
          break;
        }
      }
    }
    if (totalSince(now - 1000) + cost > 100) wait = Math.max(wait, 250);

    if (wait === 0) {
      limiter.spent.push({ at: now, cost });
      return;
    }
    if (wait > 8000) tooMany(wait);
    await sleep(wait);
  }
}

function retryDelay(res: Response, attempt: number): number {
  const header = Number(res.headers.get("Retry-After"));
  if (Number.isFinite(header) && header > 0) return Math.min(header * 1000, 10000);
  return 1000 * 2 ** attempt + Math.random() * 250;
}

async function gmailFetch<T>(tokens: GoogleTokens, path: string, init: RequestInit = {}, cost: number = 5): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    await acquire(cost);
    const accessToken = await getAccessToken(tokens);
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });

    if (res.ok) return (await res.json()) as T;
    if (res.status === 404) throw data("Message not found", { status: 404 });

    const body = await res.text();
    const rateLimited = res.status === 429 || (res.status === 403 && /rateLimitExceeded/i.test(body));

    if (rateLimited) {
      console.error(`[gmail] rate limited (${res.status}):`, body);
      const perMinute = /per minute/i.test(body);
      const delay = perMinute ? 65000 : retryDelay(res, attempt);
      if (perMinute || attempt >= 2) {
        limiter.blockedUntil = Date.now() + delay;
        tooMany(delay);
      }
      await sleep(delay);
      continue;
    }

    if (res.status === 503 && attempt < 2) {
      await sleep(retryDelay(res, attempt));
      continue;
    }

    console.error(`[gmail] error (${res.status}) on ${path.split("?")[0]}:`, body);
    throw data(`Gmail API error (${res.status}): ${body}`, { status: res.status === 401 ? 401 : 502 });
  }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  let failed = false;

  async function worker() {
    while (!failed && next < items.length) {
      const i = next++;
      try {
        results[i] = await fn(items[i]);
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function cacheKey(tokens: GoogleTokens, id: string): string {
  return `${tokens.email}:${id}`;
}

function cacheGet(tokens: GoogleTokens, id: string): GmailMessage | null {
  const key = cacheKey(tokens, id);
  const hit = metaCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > 300000) {
    metaCache.delete(key);
    return null;
  }
  return hit.msg;
}

function cacheSet(tokens: GoogleTokens, msg: GmailMessage): void {
  const key = cacheKey(tokens, msg.id);
  metaCache.delete(key);
  if (metaCache.size >= 2000) {
    const oldest = metaCache.keys().next().value;
    if (oldest !== undefined) metaCache.delete(oldest);
  }
  metaCache.set(key, { msg, at: Date.now() });
}

interface GmailPart {
  mimeType: string;
  body?: { data?: string };
  parts?: GmailPart[];
  headers?: { name: string; value: string }[];
}

interface GmailMessage {
  id: string;
  labelIds?: string[];
  snippet?: string;
  internalDate: string;
  payload?: GmailPart;
}

function header(msg: GmailMessage, name: string): string {
  const wanted = name.toLowerCase();
  return msg.payload?.headers?.find((h) => h.name.toLowerCase() === wanted)?.value ?? "";
}

function decode(encoded: string): string {
  return Buffer.from(encoded, "base64url").toString("utf-8");
}

function findPart(part: GmailPart | undefined, mimeType: string): string | null {
  if (!part) return null;
  if (part.mimeType === mimeType && part.body?.data) return decode(part.body.data);
  for (const child of part.parts ?? []) {
    const found = findPart(child, mimeType);
    if (found) return found;
  }
  return null;
}

function htmlToText(html: string): string {
  return html
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function extractBody(msg: GmailMessage): string {
  const plain = findPart(msg.payload, "text/plain");
  if (plain) return plain;
  const html = findPart(msg.payload, "text/html");
  if (html) return htmlToText(html);
  return msg.snippet ?? "";
}

function toEmail(msg: GmailMessage, folder?: Folder): Email {
  const labels = msg.labelIds ?? [];
  return {
    id: msg.id,
    folder: folder ?? (labels.includes("SENT") ? "sent" : "inbox"),
    from: header(msg, "From"),
    to: header(msg, "To"),
    subject: header(msg, "Subject") || "(no subject)",
    body: extractBody(msg),
    html: findPart(msg.payload, "text/html") ?? undefined,
    starred: labels.includes("STARRED"),
    date: new Date(Number(msg.internalDate)).toISOString(),
    read: !labels.includes("UNREAD"),
  };
}

function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "init" in error && (error as { init?: { status?: number } }).init?.status === 404;
}

export async function listGmail(tokens: GoogleTokens, folder: ListFolder, pageToken: string | null, pageSize: number): Promise<EmailPage> {
  const params = new URLSearchParams({ labelIds: LABELS[folder], maxResults: String(pageSize) });
  if (pageToken) params.set("pageToken", pageToken);

  const list = await gmailFetch<{
    messages?: { id: string }[];
    nextPageToken?: string;
  }>(tokens, `/messages?${params}`);

  const found = await mapLimit(list.messages ?? [], 5, async ({ id }) => {
    const cached = cacheGet(tokens, id);
    if (cached) return toEmail(cached, folder === "starred" ? undefined : folder);

    try {
      const msg = await gmailFetch<GmailMessage>(tokens, `/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject`);
      cacheSet(tokens, msg);
      return toEmail(msg, folder === "starred" ? undefined : folder);
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  });

  return {
    emails: found
      .filter((e): e is Email => e !== null)
      .map((e) => (folder === "starred" ? { ...e, starred: true } : e)),
    nextPageToken: list.nextPageToken ?? null,
  };
}

export async function getGmail(tokens: GoogleTokens, id: string): Promise<Email> {
  const msg = await gmailFetch<GmailMessage>(
    tokens,
    `/messages/${encodeURIComponent(id)}?format=full`,
  );
  return toEmail(msg);
}

export async function markGmailRead(tokens: GoogleTokens, id: string): Promise<void> {
  await gmailFetch(tokens, `/messages/${encodeURIComponent(id)}/modify`, {
    method: "POST",
    body: JSON.stringify({ removeLabelIds: ["UNREAD"] }),
  });

  const hit = metaCache.get(cacheKey(tokens, id));
  if (hit) hit.msg.labelIds = (hit.msg.labelIds ?? []).filter((l) => l !== "UNREAD");
}

export async function setGmailStarred(tokens: GoogleTokens, id: string, starred: boolean): Promise<void> {
  await gmailFetch(tokens, `/messages/${encodeURIComponent(id)}/modify`, {
    method: "POST",
    body: JSON.stringify(starred ? { addLabelIds: ["STARRED"] } : { removeLabelIds: ["STARRED"] }),
  });

  const hit = metaCache.get(cacheKey(tokens, id));
  if (hit) {
    const labels = (hit.msg.labelIds ?? []).filter((l) => l !== "STARRED");
    hit.msg.labelIds = starred ? [...labels, "STARRED"] : labels;
  }
}

function cleanHeader(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function encodeHeader(value: string): string {
  return /^[\x20-\x7e]*$/.test(value) ? value : `=?UTF-8?B?${Buffer.from(value, "utf-8").toString("base64")}?=`;
}

function buildRaw({ to, subject, body }: SendInput): string {
  const encodedBody = Buffer.from(body, "utf-8").toString("base64").match(/.{1,76}/g)?.join("\r\n") ?? "";

  const message = [
    `To: ${cleanHeader(to)}`,
    `Subject: ${encodeHeader(cleanHeader(subject))}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    encodedBody,
  ].join("\r\n");

  return Buffer.from(message, "utf-8").toString("base64url");
}

export async function sendGmail(tokens: GoogleTokens, input: SendInput): Promise<void> {
  await gmailFetch(
    tokens,
    "/messages/send",
    { method: "POST", body: JSON.stringify({ raw: buildRaw(input) }) },
    100
  );
}

export async function trashGmail(tokens: GoogleTokens, id: string): Promise<void> {
  await gmailFetch(tokens, `/messages/${encodeURIComponent(id)}/trash`, {
    method: "POST",
  });
  metaCache.delete(cacheKey(tokens, id));
}
