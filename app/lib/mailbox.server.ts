import { data } from "react-router";
import { deleteEmail, getEmail, listEmails, markRead, sendEmail, type Email, type Folder } from "./mail.server";
import { getSession, type GoogleTokens } from "./session.server";
import { getGmail, listGmail, markGmailRead, sendGmail, trashGmail } from "./gmail.server";

export interface EmailPage {
  emails: Email[];
  nextPageToken: string | null;
}

export interface SendInput {
  to: string;
  subject: string;
  body: string;
}

export interface Mailbox {
  source: "demo" | "gmail";
  list(folder: Folder, pageToken?: string | null): Promise<EmailPage>;
  get(id: string): Promise<Email | undefined>;
  markRead(id: string): Promise<void>;
  send(input: SendInput): Promise<void>;
  remove(id: string): Promise<void>;
}

const demoMailbox: Mailbox = {
  source: "demo",
  list: async (folder, pageToken) => {
    const all = listEmails(folder);
    const start = Math.max(0, Number.parseInt(pageToken ?? "0", 10) || 0);
    const end = start + 25;
    return {
      emails: all.slice(start, end),
      nextPageToken: end < all.length ? String(end) : null,
    };
  },
  get: async (id) => getEmail(id),
  markRead: async (id) => markRead(id),
  send: async (input) => {
    sendEmail(input);
  },
  remove: async (id) => deleteEmail(id),
};

function notYet(action: string): never {
  throw data(`${action} through Gmail isn't implemented yet.`, { status: 501 });
}

function gmailMailbox(tokens: GoogleTokens): Mailbox {
  return {
    source: "gmail",
    list: (folder, pageToken) => listGmail(tokens, folder, pageToken ?? null, 25),
    get: (id) => getGmail(tokens, id),
    markRead: (id) => markGmailRead(tokens, id),
    send: (input) => sendGmail(tokens, input),
    remove: (id) => trashGmail(tokens, id),
  }
}

export async function getMailbox(request: Request): Promise<Mailbox> {
  const session = await getSession(request.headers.get("Cookie"));
  const tokens = session.get("google");
  return tokens ? gmailMailbox(tokens) : demoMailbox;
}
