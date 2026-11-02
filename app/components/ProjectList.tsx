import type { MouseEvent } from "react";
import { isPlainClick } from "~/lib/scroll-unit";
import { projectPath } from "~/i18n/locale";
import { useLocale, useSite, useUi } from "~/i18n/use-locale";
import type { Project } from "~/lib/projects";

export type ListProject = Pick<Project, "slug" | "title" | "year" | "discipline" | "category">;

type Props = {
  projects: ListProject[];
  open: boolean;
  /** The project the visitor came back from ("Back to orbit"), marked in the list; null when there is none. */
  current: number | null;
  onPick: (index: number) => void;
};

/**
 * The list view: every project as a real link (no-JS and crawlers use the hrefs). Opened from the switch only, or
 * shown by default in the gallery without the 3D scene (Ruling R44).
 */
export function ProjectList({ projects, open, current, onPick }: Props) {
  const locale = useLocale();
  const u = useUi();
  const site = useSite();
  const pick = (e: MouseEvent<HTMLAnchorElement>, index: number) => {
    // Closed, the list is for screen readers: a link there opens its case study. New-tab clicks are the browser's too.
    if (!open || !isPlainClick(e)) return;
    e.preventDefault();
    onPick(index);
  };
  return (
    <div className={`list${open ? " on" : ""}`} id="list">
      <h2 className="sr-only">{u.hud.allProjects}</h2>
      <ol id="project-list">
        {projects.map((p, i) => (
          <li key={p.slug}>
            <a href={projectPath(locale, p.slug)} tabIndex={open ? undefined : -1} onClick={(e) => pick(e, i)} aria-current={i === current ? "true" : undefined}>
              {p.title}
              <small>{p.category}</small>
            </a>
          </li>
        ))}
      </ol>
      {/* The overlay covers the page's credit (#space-credit), so the list carries its own, at the same place and in
          the same style. */}
      <div className="credit">{u.credit(site.imageCredit)}</div>
    </div>
  );
}
