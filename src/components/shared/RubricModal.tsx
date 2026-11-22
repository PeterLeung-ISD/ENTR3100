"use client";

// ---------------------------------------------------------------------------
// 透明評分標準視窗（RubricModal）
// 大廳、行前導覽、戰情室頂部、結算報告共用同一個元件。
// ---------------------------------------------------------------------------

import { useEffect, useRef } from "react";
import { ClipboardCheck, Target, X } from "lucide-react";
import { getScoringRubric, LEVEL_THRESHOLDS } from "@/data/scoringRubric";
import { useLocale } from "@/lib/LocaleProvider";
import type { EvaluationDimensionKey } from "@/types/simulation";

interface RubricModalProps {
  open: boolean;
  onClose: () => void;
  /** 使用者在各維度目前所在的等級（戰情室/報告頁傳入才顯示「你目前在此」） */
  levels?: Partial<Record<EvaluationDimensionKey, number>>;
  /** 亮色（大廳／報告）或暗色（戰情室）介面 */
  tone?: "light" | "dark";
}

export function RubricModal({ open, onClose, levels, tone = "light" }: RubricModalProps) {
  const { c, locale } = useLocale();
  const t = c.rubric;
  const rubric = getScoringRubric(locale);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const dark = tone === "dark";
  const shell = dark
    ? "border-cockpit-line bg-cockpit-panel text-cockpit-text"
    : "border-hair bg-surface text-navy";
  const muted = dark ? "text-cockpit-muted" : "text-muted";
  const card = dark ? "border-cockpit-line bg-cockpit-elevated" : "border-hair bg-canvas";
  const rowBorder = dark ? "border-cockpit-line" : "border-hair";
  const accent = dark ? "text-calm" : "text-cobalt";
  const accentBorder = dark ? "border-calm/50" : "border-cobalt/50";
  const accentBg = dark ? "bg-calm/10" : "bg-cobalt/[0.06]";
  const weightBg = dark ? "bg-cockpit-elevated text-cockpit-text" : "bg-navy/[0.06] text-navy";

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t.title}
        tabIndex={-1}
        className={`animate-pop my-auto w-full max-w-3xl rounded-2xl border p-5 shadow-2xl outline-none sm:p-7 ${shell}`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${accentBorder} ${accentBg} ${accent}`}
            aria-hidden="true"
          >
            <ClipboardCheck size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold leading-tight sm:text-2xl">{t.title}</h2>
            <p className={`mt-1.5 text-sm leading-relaxed ${muted}`}>{t.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border transition ${
              dark
                ? "border-cockpit-line text-cockpit-muted hover:text-cockpit-text"
                : "border-hair text-muted hover:text-navy"
            }`}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className={`mt-4 rounded-xl border p-3.5 ${card}`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[13px] font-semibold uppercase tracking-wide ${muted}`}>
              {t.scoreBandsLabel}
            </span>
            {LEVEL_THRESHOLDS.map((band) => (
              <span
                key={band.level}
                className={`tabular-telemetry rounded-md px-2 py-1 text-[12.5px] font-semibold ${
                  dark ? "bg-cockpit-panel text-cockpit-muted" : "bg-surface text-muted"
                }`}
              >
                L{band.level} · {band.min}–{band.max}
              </span>
            ))}
          </div>
          <p className={`mt-2 text-[13px] leading-relaxed ${muted}`}>{t.scoringNote}</p>
        </div>

        <div className="mt-5 space-y-5">
          {rubric.map((dimension) => {
            const currentLevel = levels?.[dimension.key];
            return (
              <section
                key={dimension.key}
                className={`overflow-hidden rounded-xl border ${card}`}
                aria-label={dimension.title}
              >
                <div className={`flex flex-wrap items-start justify-between gap-2 border-b px-4 py-3 ${rowBorder}`}>
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-semibold">{dimension.title}</h3>
                    <p className={`mt-1 text-[13px] leading-relaxed ${muted}`}>{dimension.description}</p>
                  </div>
                  <span className={`tabular-telemetry shrink-0 rounded-md px-2 py-1 text-[12.5px] font-semibold ${weightBg}`}>
                    {t.weightLabel} {dimension.weight}
                  </span>
                </div>

                <ul className="divide-y">
                  {dimension.levels.map((level) => {
                    const isCurrent = currentLevel === level.level;
                    const isTarget = level.level === 5;
                    return (
                      <li
                        key={level.level}
                        className={`flex gap-3 px-4 py-3 ${rowBorder} ${
                          isCurrent ? accentBg : ""
                        } ${isCurrent ? "border-l-2" : ""} ${isCurrent ? accentBorder : ""}`}
                      >
                        <div className="flex w-16 shrink-0 flex-col items-start gap-1">
                          <span
                            className={`tabular-telemetry rounded-md px-1.5 py-0.5 text-[12px] font-bold ${
                              isTarget
                                ? dark
                                  ? "bg-calm/15 text-calm"
                                  : "bg-cobalt/10 text-cobalt"
                                : dark
                                  ? "bg-cockpit-panel text-cockpit-muted"
                                  : "bg-surface text-muted"
                            }`}
                          >
                            {t.levelBadge(level.level)}
                          </span>
                          <span className={`tabular-telemetry text-[11.5px] ${muted}`}>{level.scoreRange}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[14.5px] font-semibold">{level.label}</span>
                            {isCurrent ? (
                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11.5px] font-semibold ${accentBorder} ${accent}`}
                              >
                                <Target size={11} aria-hidden="true" />
                                {t.currentBadge}
                              </span>
                            ) : null}
                            {isTarget ? (
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[11.5px] font-medium ${
                                  dark ? "border-calm/40 text-calm" : "border-cobalt/40 text-cobalt"
                                }`}
                              >
                                {t.targetBadge}
                              </span>
                            ) : null}
                          </div>
                          <p className={`mt-1 text-[14px] leading-relaxed ${dark ? "text-cockpit-muted" : "text-muted"}`}>
                            {level.criteria}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>

        <p className={`mt-4 text-[12.5px] leading-relaxed ${muted}`}>{t.footerHint}</p>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              dark
                ? "bg-cockpit-elevated text-cockpit-text hover:bg-cockpit-line"
                : "bg-navy text-white hover:bg-navy/90"
            }`}
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RubricModal;
