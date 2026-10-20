import { createCookieSessionStorage } from "react-router";
import { sessionSecret } from "./env.server";

export interface GoogleTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  email: string;
}

type SessionData = {
  google: GoogleTokens;
  oauthState: string;
};

const storage = createCookieSessionStorage<SessionData>({
  cookie: {
    name: "__mail_session",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secrets: [sessionSecret()],
    secure: process.env.NODE_ENV === "production",
    maxAge: 2592000,
  },
});

export const { getSession, commitSession, destroySession } = storage;
