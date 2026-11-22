"use client";

// ---------------------------------------------------------------------------
// 行前分步導覽（PreSimGuideModal）
// 進入戰情室時自動彈出，倒數計時保持暫停，直到按下「開始」。
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ClipboardCheck,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  Timer,
  X,
  FileLock2,
  Gavel,
} from "lucide-react";
import { useLocale } from "@/lib/LocaleProvider";

interface PreSimGuideModalProps {
  open: boolean;
  /** 首次進入時顯示「跳過導覽直接開始」 */
  firstVisit?: boolean;
  onStart: () => void;
  onSkip: () => void;
  onOpenRubric: () => void;
  onClose?: () => void;
  /** 劇本開場任務簡報（Step 1 顯示） */
  briefing?: string;
  /** 戰情室同事名單（Step 2 顯示） */
  roster?: { name: string; role: string; color: string }[];
}

const STEP_ICONS = [ShieldAlert, MessageSquare, ClipboardCheck];

export function PreSimGuideModal({
  open,
  firstVisit = false,
  onStart,
  onSkip,
  onOpenRubric,
  onClose,
  briefing,
  roster,
}: PreSimGuideModalProps) {
  const { c } = useLocale();
  const t = c.guide;
  const [step, setStep] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const total = 3;

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const StepIcon = useMemo(() => STEP_ICONS[step] ?? Sparkles, [step]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center overflow-y-auto bg-black/75 p-3 backdrop-blur-md sm:p-6">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t.title}
        tabIndex={-1}
        className="animate-pop my-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-cockpit-line bg-cockpit-panel text-cockpit-text shadow-2xl outline-none sm:max-h-[calc(100dvh-3rem)]"
      >
        <div className="flex shrink-0 items-start gap-3 px-5 pt-5 sm:px-7 sm:pt-6">
          <span
            className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-calm/40 bg-calm/10 text-calm"
            aria-hidden="true"
          >
            <StepIcon size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="tabular-telemetry text-[12px] font-semibold uppercase tracking-[0.18em] text-calm">
              {t.eyebrow} · {t.stepLabel(step + 1, total)}
            </p>
            <h2 className="mt-1 text-xl font-semibold leading-tight sm:text-2xl">{t.title}</h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-cockpit-muted">{t.subtitle}</p>
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label={t.closeAria}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-cockpit-line text-cockpit-muted transition hover:text-white"
            >
              <X size={16} aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div className="mt-4 flex shrink-0 items-center gap-2 px-5 sm:px-7">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-warn/40 bg-warn/10 px-2.5 py-1 text-[12px] font-semibold text-warn">
            <Timer size={12} aria-hidden="true" />
            {t.pausedBanner}
          </span>
          <div className="ml-auto flex items-center gap-1.5" aria-hidden="true">
            {Array.from({ length: total }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-6 bg-calm" : i < step ? "w-3 bg-calm/50" : "w-3 bg-cockpit-line"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-4 sm:px-7">
          {step === 0 ? (
            <div>
              <p className="text-[12.5px] font-semibold uppercase tracking-wide text-cockpit-muted">
                {t.step1.kicker}
              </p>
              <h3 className="mt-1 text-lg font-semibold">{t.step1.title}</h3>
              <div className="mt-3 space-y-2.5">
                {t.step1.body.map((line) => (
                  <p key={line.slice(0, 18)} className="text-[15px] leading-relaxed text-cockpit-muted">
                    {line}
                  </p>
                ))}
              </div>
              <p className="mt-4 rounded-xl border border-calm/40 bg-calm/10 px-4 py-3 text-[14.5px] font-medium leading-relaxed text-calm">
                {t.step1.callout}
              </p>
              {briefing ? (
                <details className="mt-3 rounded-xl border border-cockpit-line bg-cockpit-elevated/60 px-4 py-3">
                  <summary className="cursor-pointer text-[13px] font-semibold text-cockpit-text">
                    {t.openBrief}
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-cockpit-muted">
                    {briefing}
                  </p>
                </details>
              ) : null}
            </div>
          ) : null}

          {step === 1 ? (
            <div>
              <p className="text-[12.5px] font-semibold uppercase tracking-wide text-cockpit-muted">
                {t.step2.kicker}
              </p>
              <h3 className="mt-1 text-lg font-semibold">{t.step2.title}</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {t.step2.columns.map((col, i) => {
                  const Icon = [MessageSquare, FileLock2, Gavel][i] ?? ShieldAlert;
                  return (
                    <div
                      key={col.tag}
                      className="rounded-xl border border-cockpit-line bg-cockpit-elevated p-3.5"
                    >
                      <div className="flex items-center gap-2">
                        <Icon size={15} className="text-calm" aria-hidden="true" />
                        <span className="text-[12px] font-semibold uppercase tracking-wide text-calm">
                          {col.tag}
                        </span>
                      </div>
                      <h4 className="mt-1.5 text-[14.5px] font-semibold leading-snug">{col.title}</h4>
                      <p className="mt-1.5 text-[13.5px] leading-relaxed text-cockpit-muted">{col.body}</p>
                      <p className="mt-2 border-t border-cockpit-line pt-2 text-[13.5px] leading-relaxed text-white/90">
                        {col.use}
                      </p>
                    </div>
                  );
                })}
              </div>
              {roster && roster.length > 0 ? (
                <div className="mt-3">
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-cockpit-muted">
                    {t.rosterLabel}
                  </p>
                  <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {roster.map((person) => (
                      <div
                        key={person.name}
                        className="flex items-center gap-2 rounded-lg border border-cockpit-line bg-cockpit-elevated/60 px-2 py-1.5"
                      >
                        <span
                          className="grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[10.5px] font-bold"
                          style={{
                            backgroundColor: `${person.color}1f`,
                            color: person.color,
                            borderColor: `${person.color}44`,
                          }}
                          aria-hidden="true"
                        >
                          {person.name.slice(0, 1)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[12.5px] font-medium text-cockpit-text">
                            {person.name}
                          </span>
                          <span className="block truncate text-[11px] text-cockpit-muted">{person.role}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 2 ? (
            <div>
              <p className="text-[12.5px] font-semibold uppercase tracking-wide text-cockpit-muted">
                {t.step3.kicker}
              </p>
              <h3 className="mt-1 text-lg font-semibold">{t.step3.title}</h3>
              <ol className="mt-3 space-y-2">
                {t.step3.flow.map((item) => (
                  <li
                    key={item.step}
                    className="flex gap-3 rounded-xl border border-cockpit-line bg-cockpit-elevated p-3"
                  >
                    <span className="tabular-telemetry grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-calm/15 text-[13px] font-bold text-calm">
                      {item.step}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[14.5px] font-semibold leading-snug">{item.title}</p>
                      <p className="mt-1 text-[13.5px] leading-relaxed text-cockpit-muted">{item.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <p className="text-[13.5px] leading-relaxed text-cockpit-muted">{t.step3.rubricNote}</p>
                <button
                  type="button"
                  onClick={onOpenRubric}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-calm/50 bg-calm/10 px-3 py-1.5 text-[13px] font-semibold text-calm transition hover:bg-calm/20"
                >
                  <ClipboardCheck size={13} aria-hidden="true" />
                  {t.viewRubric}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-cockpit-line px-5 py-4 sm:px-7">
          <button
            type="button"
            onClick={backOrSkip}
            className="rounded-lg border border-cockpit-line px-3 py-2 text-[13px] font-medium text-cockpit-muted transition hover:text-white"
          >
            {step === 0 ? (firstVisit ? t.skip : t.close) : t.back}
          </button>
          <div className="ml-auto flex items-center gap-2">
            {step < total - 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(total - 1, s + 1))}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-[13.5px] font-semibold text-cockpit-base transition hover:bg-white/90"
              >
                {t.next}
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onStart}
                className="inline-flex items-center gap-1.5 rounded-lg bg-cobalt px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-cobalt-hover"
              >
                {t.start}
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  function backOrSkip() {
    if (step === 0) {
      if (firstVisit) onSkip();
      else if (onClose) onClose();
      return;
    }
    setStep((s) => Math.max(0, s - 1));
  }
}

export default PreSimGuideModal;
