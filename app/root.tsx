import { useEffect } from "react";
import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import { CaseStudyNav } from "~/components/CaseStudy/Nav";
import { homePath, otherLocale } from "~/i18n/locale";
import { useLocale, useSite, useUi } from "~/i18n/use-locale";
import { NotFound } from "~/components/NotFound";
import { afterFirstPaint } from "~/lib/after-first-paint";
import { markFirstRender } from "~/lib/first-render";
import { MONOGRAM_FONT_FACE } from "~/scene/types";
import type { Route } from "./+types/root";
import "./app.css";

/**
 * Runs before the stylesheet applies: with JavaScript, assets the first screen does not show (the space image,
 * the serif face) wait for the first paint. Without JavaScript the attribute is never set and nothing waits.
 * The app sets data-late right after the first paint (see Layout); this script also sets it 2 s after load, so the
 * assets still come if the app's bundle never runs.
 */
const DEFER_SCRIPT =
  "(function(d){d.setAttribute('data-defer','');" +
  "addEventListener('load',function(){setTimeout(function(){d.setAttribute('data-late','')},2e3)})})(document.documentElement)";

export const links: Route.LinksFunction = () => [
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
  { rel: "icon", href: "/favicon.ico", sizes: "48x48" },
  // Only the body face is preloaded; Instrument Serif italic loads after the first paint (see DEFER_SCRIPT).
  // It is also the monogram's face, which the scene worker loads again from the HTTP cache.
  {
    rel: "preload",
    href: MONOGRAM_FONT_FACE.url,
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const locale = useLocale(); // the document's language follows the page's path
  useEffect(() => afterFirstPaint(() => document.documentElement.setAttribute("data-late", "")), []);
  return (
    // The inline script adds data-defer (and later data-late) before hydration; React need not report them.
    <html lang={locale} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script dangerouslySetInnerHTML={{ __html: DEFER_SCRIPT }} />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  // After this, a route that mounts or changes was reached by client-side navigation (see first-render.ts).
  useEffect(markFirstRender, []);
  return <Outlet />;
}

/**
 * Every route is prerendered, so this renders only in the build's SPA fallback, which becomes the static
 * `404.html` (react-router.config.ts) that the host serves for any path it has no file for. Inside the app, the
 * router reaches the same page through the error boundary (no route, or a project that does not exist).
 */
export function HydrateFallback() {
  return <NotFound />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const locale = useLocale();
  const u = useUi();
  const site = useSite();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFound />;
  const status = isRouteErrorResponse(error) ? String(error.status) : "Error";
  let details = isRouteErrorResponse(error) ? error.statusText || "" : "";
  let stack: string | undefined;
  if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  // The 404 page's own style, so it reads the same: cream on night, with the way back.
  return (
    <div className="cs cs-404">
      <title>{`${u.error.title} — ${site.owner.name}`}</title>
      <meta name="robots" content="noindex" />
      <CaseStudyNav switchTo={homePath(otherLocale(locale))} />
      <main className="nf">
        <p className="cs-idx">{status}</p>
        <h1>{u.error.title}</h1>
        <p className="cs-lead">
          {details || u.error.fallback} <span>{u.error.reassure}</span>
        </p>
        {stack && (
          <pre className="nf-stack">
            <code>{stack}</code>
          </pre>
        )}
        <Link className="nf-back" to={homePath(locale)} viewTransition aria-label={u.study.back}>
          <i aria-hidden="true">←</i> {u.study.back}
        </Link>
      </main>
    </div>
  );
}
