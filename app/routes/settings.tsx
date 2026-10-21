import { getSettings, serializeSettings } from "~/lib/settings.server";
import type { Route } from "./+types/settings";
import { data, Form, useNavigation } from "react-router";

export function meta() {
  return [{ title: "Settings" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  return { settings: await getSettings(request) };
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const settings = { loadImages: form.get("loadImages") === "on" };

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
        {actionData?.saved ? <p className="saved">Settings saved.</p> : null}
        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
      </Form>
    </>
  )
}
