import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useNavigate, useViewTransitionState } from "react-router";
import { About } from "~/components/About";
import { ContactSection } from "~/components/ContactSection";
import { Header } from "~/components/Header";
import { Hero } from "~/components/Hero";
import { Hud, type View } from "~/components/Hud";
import { ProjectList, type ListProject } from "~/components/ProjectList";
import { Transit } from "~/components/Transit";
import { homePath, localeOfPath, projectPath } from "~/i18n/locale";
import { homePages, languageMeta } from "~/i18n/seo";
import { ui } from "~/i18n/strings";
import { useArrivalFocus } from "~/hooks/useArrivalFocus";
import { useProjectHash } from "~/hooks/useProjectHash";
import { useScene } from "~/hooks/useScene";
import { useScrollPhases } from "~/hooks/useScrollPhases";
import { homeOgImage, ORB_POSTER_SRC } from "~/lib/assets";
import { OG_IMAGE } from "~/lib/case-study";
import type { SceneCore } from "~/lib/phase-dom";
import { cardTextureSrc, collectionSummary, loadProjects } from "~/lib/projects";
import { flyToProject } from "~/lib/scroll-unit";
import { cardsEnd, galleryShown, TIMELINE, trackLength } from "~/lib/timeline";
import type { CardInput } from "~/scene/types";
import { siteIn } from "~/site.config";
import type { Route } from "./+types/_index";

// Runs at build time only (prerender with ssr:false), so the markdown parsers never reach the client bundle.
// The page serves two languages (routes.ts mounts it at / and at /en): the path says which.
export async function loader({ request }: Route.LoaderArgs) {
  const locale = localeOfPath(new URL(request.url).pathname);
  const projects = loadProjects(locale);
  return {
    locale,
    year: new Date().getFullYear(), // build date, so the footer never goes stale by hand
    summary: collectionSummary(projects, locale),
    projects: projects.map(
      ({ slug, title, year, discipline, category }): ListProject => ({ slug, title, year, discipline, category }),
    ),
    cards: projects.map(({ slug, cover, accent }): CardInput => ({ slug, image: cardTextureSrc(cover), accent })),
  };
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [];
  const { locale } = loaderData;
  const site = siteIn(locale);
  const title = `${site.owner.name} · ${site.owner.role}`;
  return [
    { title },
    { name: "description", content: site.hero.sub },
    ...languageMeta(site.origin, locale, homePages()),
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: site.owner.name },
    { property: "og:title", content: title },
    { property: "og:description", content: site.hero.sub },
    // The share image: a JPEG per language, 1200 x 630 (Ruling R42), made by `npm run og`.
    { property: "og:image", content: `${site.origin}${homeOgImage(locale)}` },
    { property: "og:image:width", content: String(OG_IMAGE.width) },
    { property: "og:image:height", content: String(OG_IMAGE.height) },
    { property: "og:image:alt", content: ui[locale].meta.portfolioAlt(site.owner.name, site.owner.role) },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: site.hero.sub },
    { name: "twitter:image", content: `${site.origin}${homeOgImage(locale)}` },
  ];
}

const focusSwitch = (view: View) => document.querySelector<HTMLElement>(`#toggle [data-view="${view}"]`)?.focus();

export default function Home({ loaderData }: Route.ComponentProps) {
  const { summary, projects, year, cards, locale } = loaderData;
  const site = siteIn(locale);
  const u = ui[locale];
  const count = projects.length;
  /**
   * The view the visitor chose with the switch; null until they do, and again whenever the switch leaves the screen:
   * a chosen view lasts only while the gallery's controls are shown (Ruling R44).
   */
  const [chosen, setChosen] = useState<View | null>(null);
  const [focus, setFocus] = useState(0);
  const [gallery, setGallery] = useState(false);
  const galleryRef = useRef(false);
  const barRef = useRef<HTMLElement | null>(null);
  const centre = useRef<SceneCore | null>(null);
  // While a page transition to here runs, the scene is built but presents nothing: no cross-fade over a drawing
  // canvas (Ruling R35).
  const transitioning = useViewTransitionState(homePath(locale));
  const { scene, still } = useScene(cards, centre, transitioning);
  /** The project "Back to orbit" (or a shared /#<slug> link) arrived on; the list view marks it while it is in focus. */
  const arrival = useProjectHash(useMemo(() => projects.map((p) => p.slug), [projects]));
  const navigate = useNavigate();

  useScrollPhases(
    (ph, P) => {
      scene.current?.setProgress(P);
      const inGallery = galleryShown(ph.hudIn, P, cardsEnd(count));
      if (inGallery !== galleryRef.current) {
        galleryRef.current = inGallery;
        setGallery(inGallery);
        // The switch has left, up toward the hero or down past the cards: a list opened by hand closes with it.
        if (!inGallery) setChosen(null);
      }
      barRef.current ??= document.getElementById("bar");
      if (barRef.current) {
        const progress = Math.min(1, Math.max(0, (ph.cardOffset - TIMELINE.FOCUS_AGE) / (count - 1)));
        barRef.current.style.width = `${progress * 100}%`;
      }
    },
    {
      count,
      onFocus: (i) => {
        setFocus(i);
        arrival.focused(i);
      },
      centre,
      onSceneClip: (clip) => scene.current?.setClip(clip),
    },
  );

  // One shown view: the list only when the visitor chose it (Ruling R44). Without the 3D scene (tier 2, or a scene
  // that failed or lost its context) the gallery is the list view, unless the visitor chose the spiral.
  const listByDefault = still && gallery && chosen !== "spiral";
  const shown: View = listByDefault ? "list" : (chosen ?? "spiral");
  useArrivalFocus(arrival.arrived, gallery, shown);

  // A choice counts only while the gallery is shown: the switch keeps focus and takes Enter while it fades out, and a
  // list chosen then would open with no switch to close it (Ruling R44).
  const choose = useCallback((v: View) => {
    if (galleryRef.current) setChosen(v);
  }, []);

  const pick = useCallback((i: number) => {
    setChosen("spiral");
    flyToProject(i);
    focusSwitch("spiral");
  }, []);

  // A title in the list flies to its card; without the 3D scene there is no card to fly to, so it opens the case study.
  const openFromList = useCallback(
    (i: number) => {
      if (still) void navigate(projectPath(locale, projects[i].slug), { viewTransition: true });
      else pick(i);
    },
    [still, navigate, projects, pick, locale],
  );

  useEffect(() => {
    if (shown !== "list") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setChosen("spiral");
      focusSwitch("list");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shown]);

  return (
    <>
      <div id="studio" aria-hidden="true" />
      <div id="floor" aria-hidden="true" />
      <div id="glow" aria-hidden="true" />
      <div id="hole" aria-hidden="true">
        <div id="space-frame">
          <div id="space" />
        </div>
      </div>
      <div id="horizon" aria-hidden="true" />
      <img id="orb-poster" src={ORB_POSTER_SRC} width={480} height={480} alt="" fetchPriority="high" />
      <canvas id="scene" aria-hidden="true" />
      <div id="unit-probe" aria-hidden="true" />
      <Header />
      <main>
        <Hero />
        <Transit summary={summary} />
        <Hud projects={projects} focus={focus} view={shown} onView={choose} />
        <ProjectList projects={projects} open={shown === "list"} current={arrival.arrived} onPick={openFromList} />
        <div id="track" style={{ "--track-len": trackLength(count) } as CSSProperties} />
        {/* The deep field's credit, on screen wherever the deep field shows (applyPhases fades it). Its anchor sticks
            to the bottom of the viewport, then stays on the closing sections' top edge as they scroll in, so the line
            rides that edge with the real scroll (home.css). Inert while the list, which carries its own, covers it. */}
        <div className="credit-anchor">
          <div className="credit" id="space-credit" inert={shown === "list"}>
            {u.credit(site.imageCredit)}
          </div>
        </div>
        <div className="after">
          <section id="outro" aria-labelledby="outro-heading">
            <h2 id="outro-heading">{site.outro.heading}</h2>
            <a className="cta" href="#contact">
              {site.cta.label} <i aria-hidden="true">↗</i>
            </a>
          </section>
          <About year={year} />
          <ContactSection />
          <footer className="site-footer">
            <span>{u.rights(year, site.owner.name)}</span>
            <span>{u.credit(site.imageCredit)}</span>
          </footer>
        </div>
      </main>
    </>
  );
}
