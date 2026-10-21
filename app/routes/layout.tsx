import { Form, isRouteErrorResponse, NavLink, Outlet } from "react-router";
import "../mail.css";
import type { Route } from "./+types/layout";
import { getSession } from "~/lib/session.server";
import { isGoogleConfigured } from "~/lib/env.server";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  return {
    email: session.get("google")?.email ?? null,
    gmailConfigured: isGoogleConfigured(),
  };
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const message = isRouteErrorResponse(error) && typeof error.data === "string" ? error.data : "Something went wrong.";

  return (
    <div className="app">
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
  const { email, gmailConfigured } = loaderData;

  return (
    <div className="app">
      <nav className="sidebar">
        <h1>QwikMailClient</h1>
        <NavLink to="/" end>
          Inbox
        </NavLink>
        <NavLink to="/sent">Sent</NavLink>
        <NavLink to="/compose">Compose</NavLink>
        <NavLink to="/settings">Settings</NavLink>
        <div className="account">
          {email ? (
            <>
              <p className="account-email">{email}</p>
              <Form method="post" action="/auth/logout" reloadDocument>
                <button type="submit" className="link-button">
                  Disconnect GMail
                </button>
              </Form>
            </>
          ) : (
            <>
              <p className="account-hint">Demo mailbox</p>
              {gmailConfigured ? (
                <a href="/auth/google" className="connect">
                  Connect GMail
                </a>
              ) : (
                <p className="account-hint">
                  Add Google credentials to .env to enable GMail (temporary).
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
