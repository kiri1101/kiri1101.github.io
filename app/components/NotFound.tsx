import { Link } from "react-router";
import { homePath, otherLocale } from "~/i18n/locale";
import { useLocale, useSite, useUi } from "~/i18n/use-locale";
import { CaseStudyNav } from "./CaseStudy/Nav";

/**
 * The 404 page, in the case studies' dark style. It sets its own title and keeps itself out of search results:
 * it is rendered where no route's meta applies (the static 404.html, an unknown path).
 */
export function NotFound() {
  const locale = useLocale();
  const site = useSite();
  const u = useUi();
  return (
    <div className="cs cs-404">
      <title>{`${u.notFound.title} — ${site.owner.name}`}</title>
      <meta name="robots" content="noindex" />
      <CaseStudyNav switchTo={homePath(otherLocale(locale))} />
      <main className="nf">
        <p className="cs-idx">404</p>
        <h1>{u.notFound.title}</h1>
        <p className="cs-lead">
          {u.notFound.lead} <span>{u.notFound.rest}</span>
        </p>
        <Link className="nf-back" to={homePath(locale)} viewTransition aria-label={u.study.back}>
          <i aria-hidden="true">←</i> {u.study.back}
        </Link>
      </main>
    </div>
  );
}
