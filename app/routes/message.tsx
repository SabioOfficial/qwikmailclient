import type { Route } from "./+types/message";
import { data, Form, Link, redirect } from "react-router";
import { EmailHtml } from "~/components/email-html";
import { getMailbox } from "~/lib/mailbox.server";

export async function loader({ request, params }: Route.LoaderArgs) {
  const mailbox = await getMailbox(request);
  const email = await mailbox.get(params.id);
  if (!email) throw data("Message not found", { status: 404 });
  if (!email.read) await mailbox.markRead(email.id);
  return { email: { ...email, read: true } };
}

export async function action({ request, params }: Route.ActionArgs) {
  const mailbox = await getMailbox(request);
  const email = await mailbox.get(params.id);
  await mailbox.remove(params.id);
  return redirect(email?.folder === "sent" ? "/sent" : "/");
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
      {email.html ? (
        <EmailHtml key={email.id} html={email.html} />
      ) : (
        <div className="message-body">{email.body}</div>
      )}
      <Form method="post" className="delete-form">
        <button type="submit">Delete</button>
      </Form>
    </article>
  )
}
