import { data } from "react-router";
import { refreshAccessToken } from "./google.server";
import type { Email, Folder } from "./mail.server";
import type { GoogleTokens } from "./session.server";

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

async function gmailFetch<T>(
  tokens: GoogleTokens,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const accessToken = await getAccessToken(tokens);
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (res.status === 404) throw data("Message not found", { status: 404 });
  if (!res.ok) {
    throw data(`Gmail API error (${res.status}): ${await res.text()}`, {
      status: res.status === 401 ? 401 : 502,
    });
  }
  return (await res.json()) as T;
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
    date: new Date(Number(msg.internalDate)).toISOString(),
    read: !labels.includes("UNREAD"),
  };
}

export async function listGmail(tokens: GoogleTokens, folder: Folder): Promise<Email[]> {
  const list = await gmailFetch<{ messages?: { id: string }[] }>(tokens, `/messages?labelIds=${LABELS[folder]}&maxResults=25`);
  return Promise.all(
    (list.messages ?? []).map(async ({ id }) => {
      const msg = await gmailFetch<GmailMessage>(tokens, `/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject`);
      return toEmail(msg, folder);
    }),
  );
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
