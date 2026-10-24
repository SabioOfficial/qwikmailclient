import type { Route } from "./+types/message";
import { data, Form, Link, redirect } from "react-router";
import { EmailHtml } from "~/components/email-html";
import { MessageStar } from "~/components/message-star";
import { RelativeTime } from "~/components/relative-time";
import { fullLabel } from "~/lib/address";
import { getMailbox } from "~/lib/mailbox.server";
import { getSettings, resolveEmailMode } from "~/lib/settings.server";

export async function loader({ request, params }: Route.LoaderArgs) {
  const mailbox = await getMailbox(request);
  const email = await mailbox.get(params.id);
  if (!email) throw data("Message not found", { status: 404 });
  if (!email.read) await mailbox.markRead(email.id);
  const settings = await getSettings(request);
  return {
    email: { ...email, read: true },
    loadImages: settings.loadImages,
    emailMode: resolveEmailMode(settings),
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const mailbox = await getMailbox(request);
  const email = await mailbox.get(params.id);
  await mailbox.remove(params.id);
  return redirect(email?.folder === "sent" ? "/sent" : "/");
}

export default function Message({ loaderData }: Route.ComponentProps) {
  const { email, loadImages, emailMode } = loaderData;
  const isSent = email.folder === "sent";

  return (
    <article>
      <p>
        <Link to={isSent ? "/sent" : "/"}>Back</Link>
      </p>
      <div className="message-title">
        <h2>{email.subject}</h2>
        <MessageStar key={email.id} id={email.id} starred={Boolean(email.starred)} />
      </div>
      <dl className="message-meta">
        <dt>From</dt>
        <dd>{fullLabel(email.from)}</dd>
        <dt>To</dt>
        <dd>{fullLabel(email.to)}</dd>
        <dt>Date</dt>
        <dd>
          <RelativeTime date={email.date} />
        </dd>
      </dl>
      {email.html ? (
        <EmailHtml key={email.id} html={email.html} loadImages={loadImages} mode={emailMode} />
      ) : (
        <div className="message-body">{email.body}</div>
      )}
      <Form method="post" className="delete-form">
        <button type="submit">Delete</button>
      </Form>
    </article>
  );
}
