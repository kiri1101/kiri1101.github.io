import { Link } from "react-router";
import { projectPath } from "~/i18n/locale";
import { useLocale, useUi } from "~/i18n/use-locale";
import type { ListProject } from "./ProjectList";

const pad = (n: number) => String(n).padStart(2, "0");

export type View = "spiral" | "list";

type Props = {
  projects: ListProject[];
  /** Index of the focused project; always derived from the scroll position, never from the 3D scene. */
  focus: number;
  view: View;
  onView: (v: View) => void;
};

/** Heads-up display for the focused project, plus the spiral/list switch. The scroll choreography fades both in. */
export function Hud({ projects, focus, view, onView }: Props) {
  const project = projects[focus];
  const locale = useLocale();
  const u = useUi().hud;
  return (
    <>
      <div className="toggle" id="toggle" role="group" aria-label={u.view}>
        <button type="button" data-view="spiral" aria-pressed={view === "spiral"} onClick={() => onView("spiral")}>
          {u.spiral}
        </button>
        <button type="button" data-view="list" aria-pressed={view === "list"} onClick={() => onView("list")}>
          {u.list}
        </button>
      </div>
      <div className="hud" id="hud" inert={view === "list"}>
        <div className="info" id="info">
          <div className="idx" id="idx">
            {pad(focus + 1)} / {pad(projects.length)}
          </div>
          <div className="cat" id="cat">
            {project.discipline} · {project.year}
          </div>
          {/* Focusable from script only: "Back to orbit" leaves keyboard focus here (useArrivalFocus). */}
          <h3 id="title" tabIndex={-1}>
            {project.title}
          </h3>
          {/* A client-side navigation: the page cross-fades where the browser has View Transitions (Ruling R35). */}
          <Link className="hud-link" id="hud-link" to={projectPath(locale, project.slug)} viewTransition prefetch="intent">
            {u.viewCase} <i aria-hidden="true">↗</i>
          </Link>
        </div>
        <div className="meter" aria-hidden="true">
          {u.scrollToOrbit}
          <div className="bar">
            <i id="bar" />
          </div>
        </div>
      </div>
    </>
  );
}
