import { AddressLabel } from "~/components/address-label";
import type { Route } from "./+types/inbox";
import { Link } from "react-router";
import { RelativeTime } from "~/components/relative-time";
import { fullLabel } from "~/lib/address";
import { getMailbox } from "~/lib/mailbox.server";
import { SenderAvatar } from "~/components/sender-avatar";
import { useInfiniteEmails } from "~/lib/use-infinite-emails";
import { ListFooter } from "~/components/list-footer";
import { StarButton } from "~/components/star-button";

export function meta() {
  return [{ title: "Inbox" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const mailbox = await getMailbox(request);
  return { page: await mailbox.list("inbox") };
}

export default function Inbox({ loaderData }: Route.ComponentProps) {
  const { emails, toggleStar, starError, footer } = useInfiniteEmails("inbox", loaderData.page);

  return (
    <>
      <h2>Inbox</h2>
      {starError ? <p className="error">{starError}</p> : null}
      {emails.length === 0 ? (
        <p className="empty">Your inbox is empty.</p>
      ) : (
        <ul className="email-list">
          {emails.map((e) => (
            <li key={e.id} className="email-item">
              <StarButton starred={Boolean(e.starred)} onToggle={() => toggleStar(e.id)} />
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
      <ListFooter {...footer} />
    </>
  )
}
