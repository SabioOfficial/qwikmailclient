import { createCookie } from "react-router";

export type Theme = "system" | "light" | "dark";

export interface Settings {
  loadImages: boolean;
  theme: Theme;
}

export const defaultSettings: Settings = {
  loadImages: false,
  theme: "system",
}

export function isTheme(value: unknown): value is Theme {
  return value === "system" || value === "light" || value === "dark";
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
    theme: isTheme(value?.theme) ? value.theme : defaultSettings.theme,
  };
}

export function serializeSettings(settings: Settings): Promise<string> {
  return cookie.serialize(settings);
}
