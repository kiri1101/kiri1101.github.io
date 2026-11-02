import { useLocation } from "react-router";
import { siteIn } from "~/site.config";
import { localeOfPath, type Locale } from "./locale";
import { ui, type Strings } from "./strings";

/** The language of the page being shown, from its path. */
export function useLocale(): Locale {
  return localeOfPath(useLocation().pathname);
}

/** The UI dictionary of the page's language. */
export function useUi(): Strings {
  return ui[useLocale()];
}

/** `site.config` in the page's language. */
export function useSite() {
  return siteIn(useLocale());
}
