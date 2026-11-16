"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";
import { useLocale } from "@/lib/LocaleProvider";
import type { Locale } from "@/lib/i18n";

interface LanguageToggleProps {
  /** 額外的外層樣式。 */
  className?: string;
  /** 只顯示語言縮寫（窄版駕駛艙工具列用）。 */
  compact?: boolean;
  /** 所在介面的底色：淺色頁面（大廳／報告）用 light，戰情室用 dark。 */
  tone?: "light" | "dark";
}

const TONE = {
  light: {
    wrap: "border-hair bg-canvas",
    active: "bg-surface text-navy shadow-sm",
    idle: "text-muted hover:text-navy",
    icon: "text-muted",
    ring: "focus-visible:ring-cobalt/40",
  },
  dark: {
    wrap: "border-cockpit-line bg-cockpit-elevated/70",
    active: "bg-cockpit-elevated text-cockpit-text shadow-sm",
    idle: "text-cockpit-muted hover:text-cockpit-text",
    icon: "text-cockpit-muted",
    ring: "focus-visible:ring-calm/50",
  },
} as const;

/**
 * 中／英切換器。第一屏語言由 cookie 決定（server component 讀取），
 * 按下後立即切換 React 內容，並用 router.refresh() 讓 server component
 * 以新語言重新輸出資料層內容（劇本、NPC、文件、決策選項），因此不會有閃爍。
 */
export default function LanguageToggle({
  className = "",
  compact = false,
  tone = "light",
}: LanguageToggleProps) {
  const { locale, setLocale, c } = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const palette = TONE[tone];

  const select = useCallback(
    (next: Locale) => {
      if (next === locale) return;
      setLocale(next);
      // 重新請求 server component：資料層（劇本／NPC／文件）才會換語言。
      // 客戶端 state（倒數、對話、已解鎖文件）在 refresh 後保留。
      startTransition(() => router.refresh());
    },
    [locale, router, setLocale],
  );

  const buttonBase = `rounded-md px-2 py-1 text-[11px] font-semibold tabular-telemetry transition-colors focus-visible:outline-none focus-visible:ring-2 ${palette.ring}`;

  return (
    <div
      className={`flex shrink-0 items-center gap-0.5 rounded-lg border p-0.5 transition-opacity ${
        palette.wrap
      } ${isPending ? "opacity-60" : "opacity-100"} ${className}`}
      role="group"
      aria-label={c.common.lang.switchAria}
    >
      {!compact && (
        <Languages className={`ml-1 size-3.5 shrink-0 ${palette.icon}`} aria-hidden="true" />
      )}
      <button
        type="button"
        onClick={() => select("zh")}
        aria-pressed={locale === "zh"}
        className={`${buttonBase} ${locale === "zh" ? palette.active : palette.idle}`}
        title={c.common.lang.zh}
      >
        {c.common.lang.zh}
      </button>
      <button
        type="button"
        onClick={() => select("en")}
        aria-pressed={locale === "en"}
        className={`${buttonBase} ${locale === "en" ? palette.active : palette.idle}`}
        title="English"
      >
        {c.common.lang.en}
      </button>
    </div>
  );
}
