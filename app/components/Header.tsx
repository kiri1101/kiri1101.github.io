import { LanguageSwitch } from "~/components/LanguageSwitch";
import { homePath } from "~/i18n/locale";
import { useLocale, useSite, useUi } from "~/i18n/use-locale";
import { monogramOf } from "~/site.config";
import { flyToProject, isPlainClick } from "~/lib/scroll-unit";

/**
 * Fixed header. On phones the logo shows the monogram and the full name stays in its accessible name (WCAG 2.5.3: the
 * visible text is part of the name, so it reads "JT Jordan Tukum Folem"), as on the case-study pages; the full name and
 * the tracking would otherwise wrap beside the language switch and the call to action.
 * The scroll choreography sets the `data-dark` attribute once the page turns dark.
 */
export function Header() {
  const locale = useLocale();
  const u = useUi();
  const site = useSite();
  return (
    <header className="site-header">
      <a className="logo" href={homePath(locale)}>
        <span className="logo-narrow">{monogramOf(site.owner.name)}</span>{" "}
        <span className="logo-wide">{site.owner.name}</span>
      </a>
      <nav aria-label={u.nav.primary}>
        <a
          href="#track"
          onClick={(e) => {
            if (!isPlainClick(e)) return;
            e.preventDefault();
            flyToProject(0);
          }}
        >
          {u.nav.work}
        </a>
        <a href="#about">{u.nav.about}</a>
        <LanguageSwitch />
        <a href="#contact">{site.cta.label} ↗</a>
      </nav>
    </header>
  );
}
