import { useEffect, type CSSProperties } from "react";
import { data, useLocation } from "react-router";
import { localeOfPath } from "~/i18n/locale";
import { languageMeta, projectPages } from "~/i18n/seo";
import { siteIn } from "~/site.config";
import { CaseStudyGallery } from "~/components/CaseStudy/Gallery";
import { CaseStudyIntro, TITLE_ID } from "~/components/CaseStudy/Intro";
import { CaseStudyNav } from "~/components/CaseStudy/Nav";
import { NextProject } from "~/components/CaseStudy/NextProject";
import { caseStudyOf, OG_IMAGE } from "~/lib/case-study";
import { afterFirstRender } from "~/lib/first-render";
import { loadProjects } from "~/lib/projects";
import type { Route } from "./+types/case-study";

// Runs at build time only: every /projets/<slug> and /en/projects/<slug> is prerendered (react-router.config.ts), so the content tooling never
// reaches the browser. An unknown slug is a 404, which the static host answers with the 404 page.
export async function loader({ params, request }: Route.LoaderArgs) {
  const locale = localeOfPath(new URL(request.url).pathname);
  const cs = caseStudyOf(loadProjects(locale), params.slug, locale);
  if (!cs) throw data(null, { status: 404, statusText: "Not Found" });
  return { ...cs, locale };
}

export function meta({ loaderData: cs }: Route.MetaArgs) {
  // The 404 page sets its own title (NotFound).
  if (!cs) return [];
  const site = siteIn(cs.locale);
  const title = `${cs.title} — ${site.owner.name}`;
  return [
    { title },
    { name: "description", content: cs.description },
    ...languageMeta(site.origin, cs.locale, projectPages(cs.slug)),
    { property: "og:type", content: "article" },
    { property: "og:site_name", content: site.owner.name },
    { property: "og:title", content: title },
    { property: "og:description", content: cs.description },
    { property: "og:image", content: cs.ogImage },
    { property: "og:image:width", content: String(OG_IMAGE.width) },
    { property: "og:image:height", content: String(OG_IMAGE.height) },
    { property: "og:image:alt", content: cs.ogImageAlt },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}

export default function CaseStudyPage({ loaderData: cs }: Route.ComponentProps) {
  const { key } = useLocation();
  // Arriving by a link (not the page load), focus starts at the title, as a page load would start at the top.
  useEffect(() => {
    if (afterFirstRender()) document.getElementById(TITLE_ID)?.focus({ preventScroll: true });
  }, [key]);

  const colours = {
    "--cs-bg": cs.colours.background,
    "--cs-from": cs.colours.from,
    "--cs-to": cs.colours.to,
    "--cs-highlight": cs.colours.highlight,
    "--cs-glow": cs.colours.glow,
  } as CSSProperties;
  return (
    <div className="cs" style={colours}>
      <CaseStudyNav slug={cs.slug} />
      <main>
        <article className="cs-grid">
          <CaseStudyIntro cs={cs} />
          <CaseStudyGallery cs={cs} />
        </article>
        <NextProject next={cs.next} />
      </main>
    </div>
  );
}
