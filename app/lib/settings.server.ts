import { createCookie } from "react-router";

export interface Settings {
  loadImages: boolean;
}

export const defaultSettings: Settings = {
  loadImages: false,
}

const cookie = createCookie("__mail_settings", {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  maxAge: 31536000,
  secure: process.env.NODE_ENV === "production",
});

export async function getSettings(request: Request): Promise<Settings> {
  const value = await cookie.parse(request.headers.get("Cookie"));
  return {
    ...defaultSettings,
    loadImages: value?.loadImages === true,
  };
}

export function serializeSettings(settings: Settings): Promise<string> {
  return cookie.serialize(settings);
}
