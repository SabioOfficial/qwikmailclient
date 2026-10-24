import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  layout("routes/layout.tsx", [
    index("routes/inbox.tsx"),
    route("favorites", "routes/favorites.tsx"),
    route("message/:id", "routes/message.tsx"),
    route("compose", "routes/compose.tsx"),
    route("sent", "routes/sent.tsx"),
    route("settings", "routes/settings.tsx"),
  ]),
  route("auth/google", "routes/auth-google.tsx"),
  route("auth/google/callback", "routes/auth-google-callback.tsx"),
  route("auth/logout", "routes/auth-logout.tsx"),
  route("api/emails", "routes/api-emails.tsx"),
  route("api/star", "routes/api-star.tsx"),
] satisfies RouteConfig;
