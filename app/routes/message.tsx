import { getEmail, markRead } from "~/lib/mail.server";
import type { Route } from "./+types/message";
import { data, Link } from "react-router";

export function loader({ params }: Route.LoaderArgs) {
  const email = getEmail(params.id);
  if (!email) throw data("Message not found", { status: 404 });
  markRead(email.id);
  return { email };
}

export default function Message({ loaderData }: Route.ComponentProps) {
  const { email } = loaderData;
  const isSent = email.folder === "sent";

  return (
    <article>
      <p>
        <Link to={isSent ? "/sent" : "/"}>{isSent ? "Sent" : "Inbox"}</Link>
      </p>
      <h2>{email.subject}</h2>
      <dl className="message-meta">
        <dt>From</dt>
        <dd>{email.from}</dd>
        <dt>To</dt>
        <dd>{email.to}</dd>
        <dt>Date</dt>
        <dd>{email.date.slice(0, 10)}</dd>
      </dl>
      <div className="message-body">{email.body}</div>
    </article>
  )
}
