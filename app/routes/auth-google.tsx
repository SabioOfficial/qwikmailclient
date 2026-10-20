import { commitSession, getSession } from "~/lib/session.server";
import type { Route } from "./+types/auth-google";
import { redirect } from "react-router";
import { buildAuthUrl } from "~/lib/google.server";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const state = crypto.randomUUID();
  session.set("oauthState", state);

  return redirect(buildAuthUrl(state), {
    headers: { "Set-Cookie": await commitSession(session) },
  });
}
