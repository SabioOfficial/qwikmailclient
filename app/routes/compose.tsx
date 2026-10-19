import { sendEmail } from "~/lib/mail.server";
import type { Route } from "./+types/compose";
import { Form, redirect, useNavigation } from "react-router";

export function meta() {
  return [{ title: "Compose" }];
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const to = String(form.get("to") ?? "").trim();
  const subject = String(form.get("subject") ?? "").trim();
  const body = String(form.get("body") ?? "");

  if (!to.includes("@")) {
    return { error: "Please enter a valid recipient address." };
  }

  sendEmail({ to, subject: subject || "(no subject)", body });
  return redirect("/sent");
}

export default function Compose({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const sending = navigation.state === "submitting";

  return (
    <>
      <h2>New Message</h2>
      <Form method="post" className="compose">
        <label>
          To
          <input type="email" name="to" required />
        </label>
        <label>
          Subject
          <input type="text" name="subject" />
        </label>
        <label>
          Message
          <textarea name="body" rows={10} />
        </label>
        {actionData?.error ? <p className="error">{actionData.error}</p> : null}
        <button type="submit" disabled={sending}>
          {sending ? "Sending..." : "Send"}
        </button>
      </Form>
    </>
  )
}
