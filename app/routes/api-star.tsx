import { getMailbox } from "~/lib/mailbox.server";
import type { Route } from "./+types/api-star";

function errorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "data" in error && typeof (error as { data: unknown }).data === "string") {
    return (error as { data: string }).data;
  }
  return error instanceof Error ? error.message : "Could not update favorite.";
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const id = String(form.get("id") ?? "");
  const starred = form.get("starred") === "true";

  if (!id) return Response.json({ error: "Missing message id." }, { status: 400 });

  try {
    const mailbox = await getMailbox(request);
    await mailbox.setStarred(id, starred);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
