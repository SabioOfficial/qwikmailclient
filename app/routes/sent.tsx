import { AddressLabel } from "~/components/address-label";
import type { Route } from "./+types/sent";
import { Link } from "react-router";
import { RelativeTime } from "~/components/relative-time";
import { getMailbox } from "~/lib/mailbox.server";
import { SenderAvatar } from "~/components/sender-avatar";
import { useInfiniteEmails } from "~/lib/use-infinite-emails";
import { ListFooter } from "~/components/list-footer";
import { StarButton } from "~/components/star-button";

export function meta() {
  return [{ title: "Sent" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const mailbox = await getMailbox(request);
  return { page: await mailbox.list("sent") };
}

export default function Sent({ loaderData }: Route.ComponentProps) {
  const { emails, toggleStar, starError, footer } = useInfiniteEmails("sent", loaderData.page);

  return (
    <>
      <h2>Sent</h2>
      {starError ? <p className="error">{starError}</p> : null}
      {emails.length === 0 ? (
        <p className="empty">You haven't sent anything yet.</p>
      ) : (
        <ul className="email-list">
          {emails.map((e) => (
            <li key={e.id} className="email-list">
              <StarButton starred={Boolean(e.starred)} onToggle={() => toggleStar(e.id)} />
              <Link to={`/message/${e.id}`} className="email-row">
                <SenderAvatar value={e.to} />
                <span>
                  To: <AddressLabel value={e.to} />
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
  );
}
