import { commitSession, getSession } from "~/lib/session.server";
import type { Route } from "./+types/auth-google-callback";
import { data, redirect } from "react-router";
import { exchangeCode, fetchProfileEmail } from "~/lib/google.server";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const session = await getSession(request.headers.get("Cookie"));

  const googleError = url.searchParams.get("error");
  if (googleError) {
    throw data(`Google sign-in failed: ${googleError}`, { status: 400 });
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state || state !== session.get("oauthState")) {
    throw data("Invalid sign-in state. Please try connecting again.", { status: 400 });
  }

  const tokens = await exchangeCode(code);
  if (!tokens.refresh_token) {
    throw data("Google didn't return a refresh token. Remove this app from your Google account's third-party access and try again.", { status: 400 });
  }

  const email = await fetchProfileEmail(tokens.access_token);

  session.unset("oauthState");
  session.set("google", {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
    email,
  });

  return redirect("/", {
    headers: { "Set-Cookie": await commitSession(session) },
  });
}
