import { listEmails } from "~/lib/mail.server";
import type { Route } from "./+types/inbox";

export function meta() {
  return [{ title: "Inbox" }];
}

export function loader() {
  return { emails: listEmails("inbox") };
}

export default function Inbox({ loaderData }: Route.ComponentProps) {
  const { emails } = loaderData;

  return (
    <>
      <h2>Inbox</h2>
      {emails.length === 0 ? (
        <p className="empty">Your inbox is empty.</p>
      ) : (
        <ul className="email-list">
          {emails.map((e) => (
            <li key={e.id}>
              <div className={`email-row${e.read ? "" : " unread"}`}>
                <span>{e.from}</span>
                <span>{e.subject}</span>
                <span>{e.date.slice(0, 10)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
