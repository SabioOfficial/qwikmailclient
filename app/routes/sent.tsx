import { AddressLabel } from "~/components/address-label";
import type { Route } from "./+types/sent";
import { Link } from "react-router";
import { RelativeTime } from "~/components/relative-time";
import { getMailbox } from "~/lib/mailbox.server";
import { SenderAvatar } from "~/components/sender-avatar";

export function meta() {
  return [{ title: "Sent" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const mailbox = await getMailbox(request);
  const page = await mailbox.list("sent");
  return { emails: page.emails };
}

export default function Sent({ loaderData }: Route.ComponentProps) {
  const { emails } = loaderData;

  return (
    <>
      <h2>Sent</h2>
      {emails.length === 0 ? (
        <p className="empty">You haven't sent anything yet.</p>
      ) : (
        <ul className="email-list">
          {emails.map((e) => (
            <li key={e.id}>
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
    </>
  );
}
