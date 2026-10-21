import type { Route } from "./+types/sent";
import { Link } from "react-router";
import { getMailbox } from "~/lib/mailbox.server";

export function meta() {
  return [{ title: "Sent" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const mailbox = await getMailbox(request);
  return { emails: await mailbox.list("sent") };
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
                <span>To: {e.to}</span>
                <span>{e.subject}</span>
                <span>{e.date.slice(0, 10)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
