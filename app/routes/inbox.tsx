import { AddressLabel } from "~/components/address-label";
import type { Route } from "./+types/inbox";
import { Link } from "react-router";
import { RelativeTime } from "~/components/relative-time";
import { fullLabel } from "~/lib/address";
import { getMailbox } from "~/lib/mailbox.server";
import { SenderAvatar } from "~/components/sender-avatar";

export function meta() {
  return [{ title: "Inbox" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const mailbox = await getMailbox(request);
  const page = await mailbox.list("inbox");
  return { emails: page.emails };
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
                <SenderAvatar value={e.from} />
                <span>
                  <AddressLabel value={e.from} />
                </span>
                <span>{e.subject}</span>
                <span>
                  <RelativeTime date={e.date} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
