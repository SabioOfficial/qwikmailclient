import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  layout("routes/layout.tsx", [
    index("routes/inbox.tsx"),
    route("message/:id", "routes/message.tsx"),
    route("compose", "routes/compose.tsx"),
    route("sent", "routes/sent.tsx"),
  ]),
] satisfies RouteConfig;
