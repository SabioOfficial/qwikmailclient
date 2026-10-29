import { Form, isRouteErrorResponse, NavLink, Outlet } from "react-router";
import "../mail.css";
import type { Route } from "./+types/layout";
import { getSession } from "~/lib/session.server";
import { isGoogleConfigured } from "~/lib/env.server";
import { getSettings } from "~/lib/settings.server";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const settings = await getSettings(request);
  return {
    email: session.get("google")?.email ?? null,
    gmailConfigured: isGoogleConfigured(),
    theme: settings.theme,
  };
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const message = isRouteErrorResponse(error) && typeof error.data === "string" ? error.data : "Something went wrong.";

  return (
    <div className="app" data-theme="system">
      <nav className="sidebar">
        <h1>QwikMailClient</h1>
        <NavLink to="/" end>
          Inbox
        </NavLink>
        <div className="account">
          <Form method="post" action="/auth/logout" reloadDocument>
            <button type="submit" className="link-button">
              Disconnect Gmail
            </button>
          </Form>
        </div>
      </nav>
      <main className="content">
        <h2>Error</h2>
        <p className="error">{message}</p>
      </main>
    </div>
  );
}

export default function Layout({ loaderData }: Route.ComponentProps) {
  const { email, gmailConfigured, theme } = loaderData;

  return (
    <div className="app" data-theme={theme}>
      <nav className="topbar">
        <div className="topleftarea">
          <div className="logo">
            <img src="QwikMailClient(1).png" />
            <p>by SabioOfficial</p>
          </div>
          <div className="topbar-thingy-section">
            <NavLink to="/" end>Inbox</NavLink>
            <NavLink to="/favorites">Favorites</NavLink>
            <NavLink to="/sent">Sent</NavLink>
            <NavLink to="/compose">Compose</NavLink>
            <NavLink to="/settings">Settings</NavLink>
          </div>
        </div>
        <div className="account">
          {email ? (
            <>
              <p className="account-email">{email}</p>
              <Form method="post" action="/auth/logout" reloadDocument>
                <button type="submit" className="link-button">
                  Disconnect Gmail
                </button>
              </Form>
            </>
          ) : (
            <>
              <p className="account-hint">Demo mailbox</p>
              {gmailConfigured ? (
                <a href="/auth/google" className="connect">
                  Connect Gmail
                </a>
              ) : (
                <p className="account-hint">
                  Add Google credentials to .env to enable Gmail (temporary).
                </p>
              )}
            </>
          )}
        </div>
      </nav>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
