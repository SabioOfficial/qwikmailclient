import { deleteEmail, getEmail, listEmails, markRead, sendEmail, type Email, type Folder } from "./mail.server";

export interface SendInput {
  to: string;
  subject: string;
  body: string;
}

export interface Mailbox {
  source: "demo" | "gmail";
  list(folder: Folder): Promise<Email[]>;
  get(id: string): Promise<Email | undefined>;
  markRead(id: string): Promise<void>;
  send(input: SendInput): Promise<void>;
  remove(id: string): Promise<void>;
}

const demoMailbox: Mailbox = {
  source: "demo",
  list: async (folder) => listEmails(folder),
  get: async (id) => getEmail(id),
  markRead: async (id) => markRead(id),
  send: async (input) => {
    sendEmail(input);
  },
  remove: async (id) => deleteEmail(id),
};

export async function getMailbox(request: Request): Promise<Mailbox> {
  return demoMailbox;
}
