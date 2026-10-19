export type Folder = "inbox" | "sent";

export interface Email {
  id: string;
  folder: Folder;
  from: string;
  to: string;
  subject: string;
  body: string;
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
    },
    {
      id: "2",
      folder: "inbox",
      from: "funnytemporary@example.com",
      to: ME,
      subject: "idk vro what do i put in this",
      body: "i want to become a furry",
      date: "6969-6-9T4:20:00Z",
      read: true,
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
