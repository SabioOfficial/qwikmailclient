import { getSettings, isTheme, serializeSettings, type Settings } from "~/lib/settings.server";
import type { Route } from "./+types/settings";
import { data, Form, useNavigation } from "react-router";

const THEME_OPTIONS = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

export function meta() {
  return [{ title: "Settings" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  return { settings: await getSettings(request) };
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const theme = form.get("theme");
  const settings: Settings = {
    loadImages: form.get("loadImages") === "on",
    theme: isTheme(theme) ? theme : "system",
  };

  return data(
    { saved: true },
    { headers: { "Set-Cookie": await serializeSettings(settings) } },
  );
}

export default function Settings({ loaderData, actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const saving = navigation.state === "submitting";

  return (
    <>
      <h2>Settings</h2>
      <Form method="post" className="settings">
        <div className="settings-section">
          <h3>Appearance</h3>
          <fieldset>
            <legend>Theme</legend>
            {THEME_OPTIONS.map((option) => (
              <label key={option.value} className="checkbox">
                <input
                  type="radio"
                  name="theme"
                  value={option.value}
                  defaultChecked={loaderData.settings.theme === option.value}
                />
                <span>
                  <strong>{option.label}</strong>
                </span>
              </label>
            ))}
          </fieldset>
        </div>
        <div className="settings-section">
          <h3>Privacy</h3>
          <label className="checkbox">
            <input
              type="checkbox"
              name="loadImages"
              defaultChecked={loaderData.settings.loadImages}
            />
            <span>
              <strong>Load images by default</strong>
              <small>Show remote images in emails automatically. Senders can use images to tell when you opened a message.</small>
            </span>
          </label>
        </div>
        {actionData?.saved ? <p className="saved">Settings saved.</p> : null}
        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
      </Form>
    </>
  )
}
