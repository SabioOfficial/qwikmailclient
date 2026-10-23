export type Folder = "inbox" | "sent";

export interface Email {
  id: string;
  folder: Folder;
  from: string;
  to: string;
  subject: string;
  body: string;
  html?: string;
  date: string;
  read: boolean;
}

export const ME = "me@example.com";

function seed(): Email[] {
  return [
    {
      id: "1",
      folder: "inbox",
      from: "welcome@example.com",
      to: ME,
      subject: "Welcome to Qwik Mail Client",
      body: "Thanks for trying this lightweight email client.\n\nYou can read, compose and delete messages.",
      date: "2026-10-19T18:15:23Z",
      read: false,
    }
  ]
}

const g = globalThis as unknown as { __mailStore?: Email[] }
const emails: Email[] = (g.__mailStore ??= seed());

export function listEmails(folder: Folder): Email[] {
  return emails
    .filter((e) => e.folder === folder)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getEmail(id: string): Email | undefined {
  return emails.find((e) => e.id === id);
}

export function markRead(id: string): void {
  const email = getEmail(id);
  if (email) email.read = true;
}

export function sendEmail(input: {
  to: string;
  subject: string;
  body: string;
}): Email {
  const email: Email = {
    id: crypto.randomUUID(),
    folder: "sent",
    from: ME,
    to: input.to,
    subject: input.subject,
    body: input.body,
    date: new Date().toISOString(),
    read: true,
  };
  emails.push(email);
  return email;
}

export function deleteEmail(id: string): void {
  const index = emails.findIndex((e) => e.id === id);
  if (index !== -1) emails.splice(index, 1);
}
