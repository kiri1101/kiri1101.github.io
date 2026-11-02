import { type RouteConfig, index, route } from "@react-router/dev/routes";

// One route module per page kind, mounted once per language: the module reads its language from the path
// (i18n/locale.ts). French lives at the root, English under /en. `en/404` is the English 404 page, which the build
// writes as `en/404.html`: Cloudflare Pages serves the nearest 404.html, so `/en/*` gets it and the rest gets the root one.
export default [
  index("routes/_index.tsx"),
  route("en", "routes/_index.tsx", { id: "routes/_index.en" }),
  route("projets/:slug", "routes/case-study.tsx"),
  route("en/projects/:slug", "routes/case-study.tsx", { id: "routes/case-study.en" }),
  route("en/404", "routes/not-found.tsx"),
] satisfies RouteConfig;
