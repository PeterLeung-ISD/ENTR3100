"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { copy, type Copy } from "@/lib/copy";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_STORAGE_KEY,
  LOCALE_TAG,
  normalizeLocale,
  pickLocale,
  type Locale,
} from "@/lib/i18n";

interface LocaleContextValue {
  locale: Locale;
  /** 切換語言：同時寫 cookie（讓 server component 首屏正確）與 localStorage（即時生效）。 */
  setLocale: (next: Locale) => void;
  toggleLocale: () => void;
  /** 目前語言的完整文案字典。 */
  c: Copy;
  /** 取同一個值的中英版本，主要給資料層的零散字串用。 */
  pick: <T>(zh: T, en: T) => T;
  /** 可傳給 toLocaleString / Intl 的語言標籤。 */
  tag: string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

const ONE_YEAR = 60 * 60 * 24 * 365;

function writeCookie(next: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
}

export function LocaleProvider({
  initialLocale = DEFAULT_LOCALE,
  children,
}: {
  initialLocale?: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(() => normalizeLocale(initialLocale));

  // cookie 不存在時，退回 localStorage（例如使用者清掉 cookie 但留有偏好）。
  useEffect(() => {
    if (typeof document === "undefined") return;
    const hasCookie = document.cookie.split(";").some((part) => part.trim().startsWith(`${LOCALE_COOKIE}=`));
    if (hasCookie) return;
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    const next = normalizeLocale(stored);
    if (next) {
      setLocaleState(next);
      writeCookie(next);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "en" ? "en" : "zh-Hant";
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    const normalized = normalizeLocale(next);
    setLocaleState(normalized);
    writeCookie(normalized);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, normalized);
    } catch {
      /* 私密模式寫入失敗時忽略：cookie 仍然有效 */
    }
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === "en" ? "zh" : "en");
  }, [locale, setLocale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      toggleLocale,
      c: copy[locale],
      pick: <T,>(zhValue: T, enValue: T) => pickLocale<T>(locale, zhValue, enValue),
      tag: LOCALE_TAG[locale],
    }),
    [locale, setLocale, toggleLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale() 必須在 <LocaleProvider> 內使用");
  }
  return ctx;
}
