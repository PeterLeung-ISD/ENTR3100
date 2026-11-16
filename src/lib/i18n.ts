export type Locale = "zh" | "en";

export const LOCALES: Locale[] = ["zh", "en"];
export const DEFAULT_LOCALE: Locale = "zh";

/** 語言選擇存在 cookie（讓 server component 首屏就渲染正確語言）＋ localStorage（跨頁即時生效）。 */
export const LOCALE_COOKIE = "nexussim_locale";
export const LOCALE_STORAGE_KEY = "nexussim:locale";

export const LOCALE_TAG: Record<Locale, string> = {
  zh: "zh-HK",
  en: "en-HK",
};

export function normalizeLocale(value: string | null | undefined): Locale {
  if (!value) return DEFAULT_LOCALE;
  const v = value.trim().toLowerCase();
  if (v === "en" || v.startsWith("en-") || v === "english") return "en";
  return "zh";
}

/** 從 `Cookie` 標頭字串取出語言，供 server component 使用。 */
export function localeFromCookieHeader(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  for (const part of header.split(";")) {
    const [rawKey, ...rest] = part.split("=");
    if (rawKey?.trim() === LOCALE_COOKIE) {
      return normalizeLocale(decodeURIComponent(rest.join("=").trim()));
    }
  }
  return DEFAULT_LOCALE;
}

/** 依 locale 選字串；資料層（劇本、NPC、文件）雙語內容都走這支。 */
export function pickLocale<T>(locale: Locale, zh: T, en: T): T {
  return locale === "en" ? en : zh;
}
