import { getMailbox } from "~/lib/mailbox.server";
import type { Route } from "./+types/favorites";
import { useInfiniteEmails } from "~/lib/use-infinite-emails";
import { StarButton } from "~/components/star-button";
import { Link } from "react-router";
import { SenderAvatar } from "~/components/sender-avatar";
import { AddressLabel } from "~/components/address-label";
import { RelativeTime } from "~/components/relative-time";
import { ListFooter } from "~/components/list-footer";

export function meta() {
  return [{ title: "Favorites" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const mailbox = await getMailbox(request);
  return { page: await mailbox.list("starred") };
}

export default function Favorites({ loaderData }: Route.ComponentProps) {
  const { emails, toggleStar, starError, footer } = useInfiniteEmails("starred", loaderData.page);

  return (
    <>
      <h2>Favorites</h2>
      {starError ? <p className="error">{starError}</p> : null}
      {emails.length === 0 ? (
        <p className="empty">No favorites yet. Click the star on an email to add it here.</p>
      ) : (
        <ul className="email-list">
          {emails.map((e) => {
            const sent = e.folder === "sent";
            return (
              <li key={e.id} className="email-item">
                <StarButton starred={Boolean(e.starred)} onToggle={() => toggleStar(e.id)} />
                <Link
                  to={`/message/${e.id}`}
                  className={`email-row${e.read ? "" : " unread"}`}
                >
                  <SenderAvatar value={sent ? e.to : e.from} />
                  <span>
                    {sent ? "To: " : null}
                    <AddressLabel value={sent ? e.to : e.from} />
                  </span>
                  <span>{e.subject}</span>
                  <span>
                    <RelativeTime date={e.date} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <ListFooter {...footer} />
    </>
  )
}
