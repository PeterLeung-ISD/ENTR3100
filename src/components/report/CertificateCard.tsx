"use client";

import { useRef, useState } from "react";
import { BadgeCheck, Flame, PenLine, ShieldCheck } from "lucide-react";
import { useLocale } from "@/lib/LocaleProvider";
import type { EvaluationDimensions, Grade } from "@/types/simulation";

interface CertificateCardProps {
  candidateName: string;
  onNameChange: (name: string) => void;
  grade: Grade;
  overallScore: number;
  verificationId: string;
  issuedAt: string;
  scenarioTitle: string;
  company: string;
  dimensions: EvaluationDimensions;
}

const STAT_KEYS = [
  "criticalVerification",
  "pressureResilience",
  "crossReferencing",
  "upwardCommunication",
] as const satisfies readonly (keyof EvaluationDimensions)[];

export default function CertificateCard({
  candidateName,
  onNameChange,
  grade,
  overallScore,
  verificationId,
  issuedAt,
  scenarioTitle,
  company,
  dimensions,
}: CertificateCardProps) {
  const { c } = useLocale();
  const t = c.report;
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing = () => {
    setEditing(true);
    // 等 input 掛載後聚焦（autoFocus 在部分瀏覽器會被 aria 檢查擋下）。
    window.setTimeout(() => inputRef.current?.select(), 0);
  };

  return (
    <section
      aria-labelledby="certificate-title"
      className="print-certificate-only relative mx-auto aspect-[1.414/1] min-h-[600px] w-full max-w-4xl overflow-hidden rounded-xl border-2 border-navy bg-surface text-navy print:aspect-auto print:min-h-[168mm] print:max-w-none print:overflow-visible print:rounded-none"
    >
      <div className="flex h-full min-h-0 flex-col p-2 sm:p-3">
        {/* 內層雙框：古典證書的內縮細線 */}
        <div className="flex h-full min-h-0 flex-col border border-hair-strong px-4 py-4 sm:px-8 sm:py-6">
          {/* 抬頭 + 認證編號 */}
          <header className="flex items-start justify-between gap-2">
            <p className="print-accent min-w-0 text-[8.5px] font-bold uppercase leading-relaxed tracking-[0.2em] text-cobalt sm:text-[9.5px] sm:tracking-[0.24em]">
              {t.certificate.headerLine(company)}
            </p>
            <div className="shrink-0 text-right">
              <p className="text-[7.5px] uppercase tracking-[0.18em] text-muted">{t.certificate.certNo}</p>
              <p className="tabular-telemetry break-all text-[9.5px] font-semibold text-navy sm:text-[10.5px]">
                {verificationId}
              </p>
            </div>
          </header>

          {/* 標題 */}
          <div className="mt-3 text-center sm:mt-4">
            <h2
              id="certificate-title"
              className="text-[17px] font-black leading-snug tracking-[0.12em] text-navy sm:text-[22px] sm:tracking-[0.16em]"
            >
              {t.certificate.title}
            </h2>
            <p className="mt-1 hidden text-[8px] uppercase tracking-[0.26em] text-muted sm:block">
              {t.certificate.subtitle}
            </p>
          </div>

          {/* 受測者姓名（點擊編輯） */}
          <div className="mt-3 text-center sm:mt-4">
            <label htmlFor="certificate-name" className="sr-only">
              {t.certificate.nameLabel}
            </label>
            <p className="text-[9.5px] text-muted">{t.certificate.certifies}</p>

            {editing ? (
              <input
                ref={inputRef}
                id="certificate-name"
                value={candidateName}
                onChange={(event) => onNameChange(event.target.value)}
                onBlur={() => setEditing(false)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === "Escape") setEditing(false);
                }}
                maxLength={36}
                placeholder={t.certificate.namePlaceholder}
                aria-describedby="certificate-name-hint"
                className="mt-1 w-full max-w-[340px] rounded-none border-b border-dashed border-cobalt bg-transparent pb-0.5 text-center text-[20px] font-bold tracking-wide text-navy outline-none placeholder:text-muted/60 sm:text-[26px]"
              />
            ) : (
              <button
                type="button"
                onClick={startEditing}
                aria-label={t.certificate.nameEditAria}
                className="group mt-1 inline-flex max-w-full items-baseline justify-center gap-1.5 border-b border-dashed border-hair-strong pb-0.5 text-center transition hover:border-cobalt"
              >
                <span
                  className={`min-w-0 break-words text-[20px] font-bold leading-tight tracking-wide sm:text-[26px] ${
                    candidateName ? "text-navy" : "text-muted/60"
                  }`}
                >
                  {candidateName || t.certificate.namePlaceholder}
                </span>
                <PenLine
                  className="mb-0.5 h-3 w-3 shrink-0 text-muted transition group-hover:text-cobalt sm:h-3.5 sm:w-3.5"
                  aria-hidden="true"
                />
              </button>
            )}

            <p id="certificate-name-hint" className="mt-1 text-[7.5px] leading-relaxed text-muted sm:text-[8.5px]">
              {t.certificate.nameHint}
            </p>
          </div>

          {/* 能力徽章（圖示 + 文字，不以顏色單獨表意） */}
          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5 sm:mt-3 sm:gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-hair bg-canvas px-2.5 py-1 text-[9px] font-semibold text-navy sm:text-[10px]">
              <ShieldCheck className="h-3 w-3 shrink-0 text-unlocked sm:h-3.5 sm:w-3.5" aria-hidden="true" />
              {t.certificate.badges.verification}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-hair bg-canvas px-2.5 py-1 text-[9px] font-semibold text-navy sm:text-[10px]">
              <Flame className="h-3 w-3 shrink-0 text-cobalt sm:h-3.5 sm:w-3.5" aria-hidden="true" />
              {t.certificate.badges.crisis}
            </span>
          </div>

          {/* 完成說明 */}
          <p className="mx-auto mt-2.5 max-w-xl break-words text-center text-[9.5px] leading-relaxed text-muted sm:mt-3 sm:text-[11px]">
            {t.certificate.bodyBefore}{" "}
            <span className="font-semibold text-navy">
              {company} · {scenarioTitle}
            </span>{" "}
            {t.certificate.bodyAfter}
          </p>

          {/* 成績 + 等級 */}
          <div className="mt-3 flex flex-col items-center justify-center gap-2 rounded-lg border border-hair bg-canvas px-3 py-2 sm:mt-4 sm:flex-row sm:gap-5 sm:px-4 sm:py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-12 w-12 flex-col items-center justify-center rounded-full border-2 border-navy sm:h-14 sm:w-14">
                <span className="tabular-telemetry text-[19px] font-black leading-none text-navy sm:text-[22px]">
                  {grade}
                </span>
                <span className="mt-0.5 text-[6.5px] uppercase tracking-widest text-muted">
                  {t.certificate.gradeLabel}
                </span>
              </div>
              <div className="text-left">
                <p className="tabular-telemetry text-[22px] font-bold leading-none text-navy sm:text-[26px]">
                  {overallScore}
                  <span className="text-[11px] font-medium text-muted"> / 100</span>
                </p>
                <p className="mt-1 text-[8.5px] font-semibold text-navy sm:text-[9.5px]">
                  {t.certificate.gradeCopy[grade]}
                </p>
              </div>
            </div>
            <span className="hidden h-9 w-px bg-hair sm:block" aria-hidden="true" />
            <p className="hidden max-w-[230px] items-center gap-1 text-[8px] leading-relaxed text-muted sm:flex">
              <BadgeCheck className="h-3 w-3 shrink-0 text-cobalt" aria-hidden="true" />
              {t.certificate.engineNote}
            </p>
          </div>

          {/* 四大維度迷你數據 */}
          <div className="mt-3 grid grid-cols-4 gap-1.5 border-y border-hair py-2 sm:gap-2 sm:py-2.5">
            {STAT_KEYS.map((key) => (
              <div key={key} className="min-w-0 text-center">
                <p className="tabular-telemetry text-[12px] font-bold text-navy sm:text-[14px]">
                  {Math.round(dimensions[key])}
                </p>
                <p className="mt-0.5 break-words text-[7px] leading-tight tracking-wide text-muted sm:text-[8px]">
                  {t.dimensions.compact[key]}
                </p>
              </div>
            ))}
          </div>

          {/* 簽名 + 完成日期 */}
          <div className="mt-auto flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div className="min-w-0 sm:max-w-[46%]">
              <p className="text-[7.5px] font-semibold uppercase tracking-[0.16em] text-muted">
                {t.certificate.completedOn}
              </p>
              <p className="tabular-telemetry text-[9.5px] font-semibold text-navy sm:text-[10.5px]">{issuedAt}</p>
              <p className="mt-1 flex items-start gap-1 text-[7.5px] leading-relaxed text-muted">
                <ShieldCheck className="mt-px h-2.5 w-2.5 shrink-0 text-cobalt" aria-hidden="true" />
                <span className="break-words">{t.certificate.verify}</span>
              </p>
            </div>

            <div className="w-full sm:w-44">
              <p className="text-center font-serif text-[15px] italic leading-none text-navy sm:text-[17px]">
                NexusSim
              </p>
              <div className="mt-1.5 border-t border-hair-strong pt-1.5 text-center">
                <p className="break-words text-[8px] font-semibold text-navy sm:text-[9px]">
                  {t.certificate.signatureRole}
                </p>
                <p className="mt-0.5 text-[7px] uppercase tracking-[0.14em] text-muted">NexusSim Workplace Simulation</p>
              </div>
            </div>
          </div>

          <p className="mt-2 break-words text-center text-[7px] leading-relaxed text-muted sm:text-[7.5px]">
            {t.certificate.fineprint}
          </p>
        </div>
      </div>
    </section>
  );
}
