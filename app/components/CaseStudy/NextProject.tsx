import { Link } from "react-router";
import { projectPath } from "~/i18n/locale";
import { useLocale, useUi } from "~/i18n/use-locale";
import type { CaseStudy } from "~/lib/case-study";

/** "Next in orbit": the following project in the collection (the last one leads back to the first). */
export function NextProject({ next }: { next: CaseStudy["next"] }) {
  const locale = useLocale();
  const u = useUi().study;
  return (
    <nav className="cs-next" aria-label={u.next}>
      <Link to={projectPath(locale, next.slug)} viewTransition prefetch="viewport">
        <span className="cs-core" aria-hidden="true" />
        <span className="cs-next-text">
          <small>{u.nextIn}</small>
          <span className="cs-next-title">
            {next.title} <i aria-hidden="true">→</i>
          </span>
        </span>
      </Link>
    </nav>
  );
}
