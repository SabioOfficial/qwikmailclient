import { request } from "node:https";
import { googleConfig } from "./env.server";

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}

export function buildAuthUrl(state: string): string {
  const { clientId, redirectUri } = googleConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/gmail.modify",
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

async function requestToken(body: Record<string, string>): Promise<TokenResponse> {
  const { clientId, clientSecret } = googleConfig();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      ...body,
    }),
  });
  if (!res.ok) throw new Error(`some google token bs happened: ${res.status} ${await res.text()}`);
  return (await res.json()) as TokenResponse;
}

export function exchangeCode(code: string): Promise<TokenResponse> {
  return requestToken({
    code,
    grant_type: "authorization_code",
    redirect_uri: googleConfig().redirectUri,
  });
}

export function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  return requestToken({ grant_type: "refresh_token", refresh_token: refreshToken });
}

export async function fetchProfileEmail(accessToken: string): Promise<string> {
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Could not load Gmail profile: ${res.status}`);
  const profile = (await res.json()) as { emailAddress: string };
  return profile.emailAddress;
}
