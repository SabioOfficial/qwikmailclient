import { createCookie } from "react-router";

export type Theme = "system" | "light" | "dark";
export type EmailTheme = "system" | "light" | "dark";

export interface Settings {
  loadImages: boolean;
  theme: Theme;
  emailTheme: EmailTheme;
}

export const defaultSettings: Settings = {
  loadImages: false,
  theme: "system",
  emailTheme: "light",
};

export function isTheme(value: unknown): value is Theme {
  return value === "system" || value === "light" || value === "dark";
}

export function isEmailTheme(value: unknown): value is EmailTheme {
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
    emailTheme: isEmailTheme(value?.emailTheme) ? value.emailTheme : defaultSettings.emailTheme,
  };
}

export function resolveEmailMode(settings: Settings): "light" | "dark" | "auto" {
  const choice = settings.emailTheme === "system" ? settings.theme : settings.emailTheme;
  return choice === "system" ? "auto" : choice;
}

export function serializeSettings(settings: Settings): Promise<string> {
  return cookie.serialize(settings);
}
