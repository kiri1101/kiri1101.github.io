import { useLocation } from "react-router";
import { pathInLocale, otherLocale } from "~/i18n/locale";
import { useLocale, useUi } from "~/i18n/use-locale";

/**
 * The link to the same page in the other language. It is a plain link, a full page load, so the document's
 * `lang`, its metadata and its fonts all start over in the new language. `to` overrides the target (a 404 page,
 * which has no counterpart, sends the visitor to the other language's home). It reads the other language's name
 * ("English", "Français"), in that language: the visible text is the accessible name (WCAG 2.5.3).
 */
export function LanguageSwitch({ to, className }: { to?: string; className?: string }) {
  const locale = useLocale();
  const { pathname } = useLocation();
  const u = useUi().lang;
  return (
    <a
      className={className ?? "lang-switch"}
      href={to ?? pathInLocale(pathname, otherLocale(locale))}
      hrefLang={u.code}
      lang={u.code}
    >
      {u.name}
    </a>
  );
}
