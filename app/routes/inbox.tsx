import type { Route } from "./+types/inbox";
import { Link } from "react-router";
import { fullLabel } from "~/lib/address";
import { getMailbox } from "~/lib/mailbox.server";

export function meta() {
  return [{ title: "Inbox" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const mailbox = await getMailbox(request);
  return { emails: await mailbox.list("inbox") };
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
              <Link
                to={`/message/${e.id}`}
                className={`email-row${e.read ? "" : " unread"}`}
              >
                <span>{fullLabel(e.from)}</span>
                <span>{e.subject}</span>
                <span>{e.date.slice(0, 10)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
