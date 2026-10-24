import { getMailbox, type EmailPage } from "~/lib/mailbox.server";
import type { Route } from "./+types/api-emails";

function errorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "data" in error && typeof (error as { data: unknown }).data === "string") return (error as { data: string }).data;
  return error instanceof Error ? error.message : "Could not load more messages.";
}

export async function loader({ request }: Route.LoaderArgs): Promise<EmailPage | { error: string }> {
  const url = new URL(request.url);
  const folder = url.searchParams.get("folder");
  const pageToken = url.searchParams.get("pageToken");

  if (folder !== "inbox" && folder !== "sent" && folder !== "starred") return { error: "Unknown folder." };
  if (pageToken && pageToken.length > 512) return { error: "Invalid page token." };

  try {
    const mailbox = await getMailbox(request);
    return await mailbox.list(folder, pageToken);
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
