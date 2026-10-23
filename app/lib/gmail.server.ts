import { data } from "react-router";
import { refreshAccessToken } from "./google.server";
import type { Email, Folder } from "./mail.server";
import type { GoogleTokens } from "./session.server";
import type { EmailPage, SendInput } from "./mailbox.server";

const LABELS: Record<Folder, string> = { inbox: "INBOX", sent: "SENT" };
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

interface Bucket {
  units: number;
  updatedAt: number;
}

const buckets = new Map<string, Bucket>();

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function acquire(key: string, cost: number): Promise<void> {
  const bucket = buckets.get(key) ?? { units: 100, updatedAt: Date.now() };
  buckets.set(key, bucket);

  for (; ;) {
    const now = Date.now();
    bucket.units = Math.min(100, bucket.units + ((now - bucket.updatedAt) / 1000) * 100);
    bucket.updatedAt = now;

    if (bucket.units >= cost) {
      bucket.units -= cost;
      return;
    }
    await sleep(Math.ceil(((cost - bucket.units) / 100) * 1000));
  }
}

function retryDelay(res: Response, attempt: number): number {
  const header = Number(res.headers.get("Retry-After"));
  if (Number.isFinite(header) && header > 0) return Math.min(header * 1000, 10000);
  return 1000 * 2 ** attempt + Math.random() * 250;
}

async function gmailFetch<T>(tokens: GoogleTokens, path: string, init: RequestInit = {}, cost: number = 5): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    await acquire(tokens.refreshToken, cost);
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
    const rateLimited = res.status === 429;
    const transient = res.status === 503;

    if ((rateLimited || transient) && attempt < 3) {
      await sleep(retryDelay(res, attempt));
      continue;
    }
    if (rateLimited) throw data("Gmail is limiting requests right now. Please wait a few seconds and try again.", {status: 429});
    throw data(`Gmail API error (${res.status}): ${body}`, { status: res.status === 401 ? 401 : 502 });
  }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
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
    date: new Date(Number(msg.internalDate)).toISOString(),
    read: !labels.includes("UNREAD"),
  };
}

function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "init" in error && (error as { init?: { status?: number } }).init?.status === 404;
}

export async function listGmail(tokens: GoogleTokens, folder: Folder, pageToken: string | null, pageSize: number): Promise<EmailPage> {
  const params = new URLSearchParams({ labelIds: LABELS[folder], maxResults: String(pageSize) });
  if (pageToken) params.set("pageToken", pageToken);

  const list = await gmailFetch<{
    messages?: { id: string }[];
    nextPageToken?: string;
  }>(tokens, `/messages?${params}`);

  const found = await mapLimit(list.messages ?? [], 5, async ({ id }) => {
    try {
      const msg = await gmailFetch<GmailMessage>(tokens, `/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject`);
      return toEmail(msg, folder);
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  });

  return {
    emails: found.filter((e): e is Email => e !== null),
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
}
