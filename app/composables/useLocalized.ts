import type { Locale, Localized } from '~~/content/types'

export function useLocalized() {
  const { locale } = useI18n()
  return <T>(value: Localized<T>): T => value[locale.value as Locale]
}
