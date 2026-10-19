import { NavLink, Outlet } from "react-router";
import "../mail.css";

export default function Layout() {
  return (
    <div className="app">
      <nav className="sidebar">
        <h1>QwikMailClient</h1>
        <NavLink to="/" end>
          Inbox
        </NavLink>
      </nav>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
