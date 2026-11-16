"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Eye,
  FileSearch,
  Flame,
  Loader2,
  MessageSquare,
  Printer,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
  XCircle,
} from "lucide-react";
import CompetencyRadar, { DimensionBars } from "@/components/report/CompetencyRadar";
import CertificateCard from "@/components/report/CertificateCard";
import LanguageToggle from "@/components/ui/LanguageToggle";
import { getScenario } from "@/data/flagshipScenario";
import { useLocale } from "@/lib/LocaleProvider";
import {
  clearAttempt,
  loadAttempt,
  loadCandidateName,
  saveAttempt,
  saveCandidateName,
} from "@/lib/storage";
import type { StoredAttempt } from "@/lib/storage";
import type { EvaluationResult, Grade, XRayItem } from "@/types/simulation";

/** 只保留配色；等級文字取自字典（與證書用同一組 copy）。 */
const GRADE_TONE: Record<Grade, string> = {
  S: "border-warn/40 bg-warn/10 text-amber-700",
  A: "border-unlocked/40 bg-unlocked/10 text-emerald-700",
  B: "border-cobalt/30 bg-cobalt/10 text-cobalt",
  C: "border-critical/30 bg-critical/10 text-critical",
};

/** X-Ray 行為狀態：圖示 + 文字標籤並用，不單靠顏色表意。 */
const XRAY_META: Record<XRayItem["status"], { icon: typeof CheckCircle2; chip: string }> = {
  pass: { icon: CheckCircle2, chip: "border-unlocked/30 bg-unlocked/10 text-emerald-700" },
  warn: { icon: AlertTriangle, chip: "border-warn/30 bg-warn/10 text-amber-700" },
  fail: { icon: XCircle, chip: "border-critical/30 bg-critical/10 text-critical" },
};

export default function ReportView({ scenarioId }: { scenarioId: string }) {
  const router = useRouter();
  const { c, tag, locale } = useLocale();
  const t = c.report;
  const scenario = useMemo(() => getScenario(scenarioId), [scenarioId]);
  const [attempt, setAttempt] = useState<StoredAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("Alex Chen");

  useEffect(() => {
    const stored = loadAttempt(scenarioId);
    setAttempt(stored);
    setName(stored?.candidateName ?? loadCandidateName());
    setLoading(false);
  }, [scenarioId]);

  // ── 評語語言同步：已存的評語語言與目前介面不同時，背景重新生成一次 ──
  const [regenerating, setRegenerating] = useState(false);
  /** 已送出重新生成請求的 `劇本|語言|完成時間`，確保同一次嘗試只跑一次（不會迴圈）。 */
  const regeneratedKey = useRef<string | null>(null);
  const latestAttempt = useRef<StoredAttempt | null>(null);

  useEffect(() => {
    latestAttempt.current = attempt;
  }, [attempt]);

  useEffect(() => {
    if (!attempt || attempt.evaluation.locale === locale) return;

    const key = `${scenarioId}|${locale}|${attempt.completedAt}`;
    if (regeneratedKey.current === key) return;
    regeneratedKey.current = key;

    const snapshot = attempt;
    setRegenerating(true);

    void (async () => {
      try {
        const response = await fetch("/api/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scenarioId,
            candidateName: snapshot.candidateName,
            locale,
            telemetry: snapshot.telemetry,
          }),
        });
        if (!response.ok) return;

        const fresh = (await response.json()) as EvaluationResult;
        if (regeneratedKey.current !== key) return;

        // 以最新狀態為底，只換掉評語；保留原認證編號與當下編輯中的姓名。
        const latest = latestAttempt.current ?? snapshot;
        const updated: StoredAttempt = {
          ...latest,
          evaluation: {
            ...fresh,
            verificationId: latest.evaluation.verificationId,
            candidateName: latest.candidateName,
          },
        };
        setAttempt(updated);
        saveAttempt(updated);
      } catch {
        /* 重新生成失敗：保留原有評語，介面照常渲染 */
      } finally {
        if (regeneratedKey.current === key) setRegenerating(false);
      }
    })();
  }, [attempt, locale, scenarioId]);

  const evaluation: EvaluationResult | null = attempt?.evaluation ?? null;

  const handleNameChange = (value: string) => {
    setName(value);
    saveCandidateName(value);
    if (!attempt) return;
    const updated: StoredAttempt = {
      ...attempt,
      candidateName: value,
      evaluation: { ...attempt.evaluation, candidateName: value },
    };
    setAttempt(updated);
    saveAttempt(updated);
  };

  const retry = () => {
    clearAttempt(scenarioId);
    saveCandidateName(name);
    router.push(`/simulation/${scenarioId}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas">
        <div className="flex items-center gap-2 text-[12px] text-muted">
          <Loader2 className="h-4 w-4 animate-spin text-cobalt" aria-hidden="true" />
          {t.empty.loading}
        </div>
      </div>
    );
  }

  if (!attempt || !evaluation) {
    return (
      <div className="relative flex min-h-dvh items-center justify-center bg-canvas px-4 py-10 text-navy">
        <div className="absolute right-4 top-4">
          <LanguageToggle compact />
        </div>
        <div className="w-full max-w-md rounded-2xl border border-hair bg-surface p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-hair bg-canvas">
            <FileSearch className="h-6 w-6 text-muted" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-[16px] font-semibold text-navy">{t.empty.title}</h1>
          <p className="mt-2 break-words text-[11.5px] leading-relaxed text-muted">{t.empty.body}</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/"
              className="rounded-lg border border-hair-strong px-3 py-2 text-[11px] font-medium text-navy transition hover:border-navy"
            >
              {t.empty.backToLobby}
            </Link>
            <Link
              href={`/simulation/${scenarioId}`}
              className="flex items-center gap-1.5 rounded-lg bg-cobalt px-3.5 py-2 text-[11px] font-bold text-white transition hover:bg-cobalt-hover"
            >
              {t.empty.start}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const tone = GRADE_TONE[evaluation.grade];
  const modeTone =
    evaluation.mode === "live"
      ? "border-unlocked/30 bg-unlocked/10 text-emerald-700"
      : "border-warn/30 bg-warn/10 text-amber-700";
  const decisionLabel =
    scenario?.decisionOptions.find((option) => option.value === attempt.telemetry.finalDecision)?.label ??
    attempt.telemetry.finalDecision;
  const minutesSpent = Math.floor(attempt.telemetry.timeSpentSeconds / 60);
  const secondsSpent = attempt.telemetry.timeSpentSeconds % 60;
  const issuedAt = new Date(attempt.completedAt).toLocaleDateString(tag, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const runFacts = [
    { label: t.metrics.decision, value: decisionLabel, icon: Trophy },
    {
      label: t.metrics.rawLogs,
      value: attempt.telemetry.unlockedRawLogs ? t.metrics.rawLogsYes : t.metrics.rawLogsNo,
      icon: Eye,
    },
    {
      label: t.metrics.vp,
      value:
        attempt.telemetry.respondedToVpOnTime === true
          ? t.metrics.vpOnTime
          : attempt.telemetry.respondedToVpOnTime === false
            ? t.metrics.vpLate
            : t.metrics.vpNone,
      icon: Flame,
    },
    {
      label: t.metrics.challenge,
      value: attempt.telemetry.questionedAuthority ? t.metrics.challengeYes : t.metrics.challengeNo,
      icon: BrainCircuit,
    },
  ];

  return (
    <div className="min-h-dvh bg-canvas pb-16 text-navy">
      <header className="no-print sticky top-0 z-30 border-b border-hair bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-6 py-3">
          <Link
            href="/"
            aria-label={t.actions.backAria}
            className="flex items-center gap-1.5 text-[11px] font-medium text-muted transition hover:text-navy"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            {t.actions.backToLobby}
          </Link>
          <span className="hidden text-hair-strong sm:inline" aria-hidden="true">
            /
          </span>
          <span className="hidden text-[11px] text-muted sm:inline">{t.header.breadcrumb}</span>

          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <LanguageToggle />
            <button
              type="button"
              onClick={retry}
              aria-label={t.actions.retryAria}
              className="flex items-center gap-1.5 rounded-lg border border-hair-strong px-3 py-1.5 text-[11px] font-medium text-navy transition hover:border-navy hover:bg-canvas"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              {t.actions.retry}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              aria-label={t.actions.printAria}
              className="flex items-center gap-1.5 rounded-lg bg-cobalt px-3.5 py-2 text-[11px] font-bold text-white transition hover:bg-cobalt-hover"
            >
              <Printer className="h-3.5 w-3.5" aria-hidden="true" />
              {t.actions.print}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
        <div className="no-print grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* ── 左欄：總分、等級、雷達 ─────────────────────────────── */}
          <section
            aria-labelledby="report-score-title"
            className="rounded-2xl border border-hair bg-surface p-6 shadow-sm lg:col-span-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                  {scenario?.company ?? "NovaTech"}
                </p>
                <h1
                  id="report-score-title"
                  className="mt-1 break-words text-[15px] font-semibold leading-snug text-navy"
                >
                  {scenario?.summary.title ?? scenarioId}
                </h1>
              </div>
              <span
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${tone}`}
              >
                <span className="sr-only">{t.dashboard.gradeLabel}: </span>
                <span className="tabular-telemetry text-[13px] font-bold leading-none">{evaluation.grade}</span>
                {t.grade[evaluation.grade]}
              </span>
            </div>

            <div className="mt-5 flex flex-wrap items-end gap-x-2 gap-y-1">
              <span className="text-[11px] font-medium text-muted">{t.metrics.score}</span>
              <span className="tabular-telemetry text-4xl font-bold leading-none text-navy">
                {evaluation.overallScore}
              </span>
              <span className="tabular-telemetry pb-0.5 text-[11px] text-muted">{t.dashboard.scoreUnit}</span>
            </div>

            <div className="mt-6 border-t border-hair pt-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-1.5 text-[12px] font-semibold text-navy">
                  <Target className="h-3.5 w-3.5 text-cobalt" aria-hidden="true" />
                  {t.radar.title}
                </h2>
                <span className="tabular-telemetry text-[9px] text-muted">{t.dashboard.radarScale}</span>
              </div>
              <CompetencyRadar dimensions={evaluation.dimensions} />
              <div className="mt-2 border-t border-hair pt-3">
                <DimensionBars dimensions={evaluation.dimensions} />
              </div>
            </div>
          </section>

          {/* ── 右欄：執行摘要、X-Ray、陷阱解析 ─────────────────────── */}
          <div className="space-y-6 lg:col-span-7">
            <section
              aria-labelledby="executive-title"
              className="rounded-2xl border border-hair bg-surface p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2
                  id="executive-title"
                  className="flex min-w-0 items-center gap-2 break-words text-[13px] font-semibold text-navy"
                >
                  <MessageSquare className="h-4 w-4 shrink-0 text-cobalt" aria-hidden="true" />
                  {t.hero.greeting(evaluation.candidateName)}
                </h2>
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${modeTone}`}
                >
                  <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
                  {evaluation.mode === "live" ? t.hero.modeLive : t.hero.modeOffline}
                </span>
              </div>

              {regenerating && (
                <p className="mt-1.5 flex items-center gap-1 text-[10px] text-cobalt">
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                  {t.hero.regeneratingHint}
                </p>
              )}

              <p className="mt-3 break-words text-[12.5px] leading-relaxed text-muted">
                {evaluation.executiveFeedback}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-hair pt-3 text-[10.5px] text-muted">
                <span className="flex items-center gap-1">
                  <Clock3 className="h-3 w-3" aria-hidden="true" />
                  <span className="tabular-telemetry">
                    {t.metrics.elapsed(String(minutesSpent), String(secondsSpent).padStart(2, "0"))}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" aria-hidden="true" />
                  <span className="tabular-telemetry font-semibold text-navy">
                    {attempt.telemetry.totalMessagesSent}
                  </span>
                  {t.metrics.messagesAfter}
                </span>
                <span className="flex min-w-0 items-center gap-1">
                  <Award className="h-3 w-3 shrink-0" aria-hidden="true" />
                  {t.metrics.verificationId}
                  <span className="tabular-telemetry break-all font-semibold text-navy">
                    {evaluation.verificationId}
                  </span>
                </span>
              </div>

              <dl className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {runFacts.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-lg border border-hair bg-canvas px-3 py-2">
                      <dt className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
                        <Icon className="h-3 w-3" aria-hidden="true" />
                        {item.label}
                      </dt>
                      <dd className="mt-1 break-words text-[11.5px] font-medium text-navy">{item.value}</dd>
                    </div>
                  );
                })}
              </dl>
            </section>

            <section
              aria-labelledby="xray-title"
              className="rounded-2xl border border-hair bg-surface p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="xray-title" className="flex items-center gap-2 text-[13px] font-semibold text-navy">
                  <BrainCircuit className="h-4 w-4 text-cobalt" aria-hidden="true" />
                  {t.xray.title}
                </h2>
                <span className="rounded-full border border-hair bg-canvas px-2 py-0.5 text-[9px] font-semibold text-muted">
                  {t.xray.badge}
                </span>
              </div>

              <ol className="mt-4 space-y-2.5">
                {evaluation.xray.map((item, index) => {
                  const meta = XRAY_META[item.status];
                  const Icon = meta.icon;
                  return (
                    <li key={index} className="rounded-xl border border-hair bg-canvas p-3">
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${meta.chip}`}
                        >
                          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <p className="break-words text-[11.5px] font-semibold text-navy">{item.title}</p>
                            <span
                              className={`rounded-full border px-1.5 py-0.5 text-[8.5px] font-semibold ${meta.chip}`}
                            >
                              {t.xray.status[item.status]}
                            </span>
                          </div>
                          <p className="mt-1 break-words text-[10.5px] leading-relaxed text-muted">{item.detail}</p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {/* 優勢：翡翠綠 + CheckCircle2 + 文字標籤 */}
                <div className="rounded-xl border border-unlocked/30 bg-unlocked/[0.05] p-3.5">
                  <h3 className="flex items-center gap-1.5 text-[11.5px] font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {t.strengths.title}
                  </h3>
                  <ul className="mt-2.5 space-y-2">
                    {evaluation.strengths.map((item) => (
                      <li key={item} className="flex gap-2 rounded-lg border border-unlocked/20 bg-surface p-2">
                        <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-unlocked" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                            {t.xray.strengthLabel}
                          </p>
                          <p className="mt-0.5 break-words text-[10.5px] leading-relaxed text-navy">{item}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 盲點：琥珀 / 紅 + AlertTriangle + 文字標籤 */}
                <div className="rounded-xl border border-warn/40 bg-warn/[0.06] p-3.5">
                  <h3 className="flex items-center gap-1.5 text-[11.5px] font-semibold text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                    {t.strengths.blindSpots}
                  </h3>
                  <ul className="mt-2.5 space-y-2">
                    {evaluation.blindSpots.map((item) => (
                      <li key={item} className="flex gap-2 rounded-lg border border-warn/25 bg-surface p-2">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-warn" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                            {t.xray.blindSpotLabel}
                          </p>
                          <p className="mt-0.5 break-words text-[10.5px] leading-relaxed text-navy">{item}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* 埋設陷阱全解析 */}
            <section aria-labelledby="traps-title" className="rounded-2xl border border-hair bg-surface p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 id="traps-title" className="flex items-center gap-2 text-[13px] font-semibold text-navy">
                    <FileSearch className="h-4 w-4 text-critical" aria-hidden="true" />
                    {t.traps.title}
                  </h2>
                  <p className="mt-1 break-words text-[10px] text-muted">{t.traps.subtitle}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                {evaluation.trapAnalysis.map((item) => (
                  <article key={item.docId} className="rounded-xl border border-hair bg-canvas p-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded border border-critical/30 bg-critical/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.14em] text-critical">
                        <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" />
                        {t.traps.badge}
                      </span>
                      <h3 className="min-w-0 break-words text-[11px] font-semibold text-navy">{item.docTitle}</h3>
                    </div>
                    <p className="mt-2 break-words text-[10.5px] leading-relaxed text-muted">{item.trap}</p>
                    <div className="mt-2 rounded-lg border border-unlocked/20 bg-surface px-2 py-1.5">
                      <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                        {t.traps.lesson}
                      </p>
                      <p className="mt-0.5 break-words text-[10.5px] leading-relaxed text-navy">{item.lesson}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* ── 結業憑證 ───────────────────────────────────────────── */}
        <section aria-labelledby="certificate-section-title" className="space-y-3">
          <div className="no-print flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2
                id="certificate-section-title"
                className="flex items-center gap-1.5 text-[12px] font-semibold text-navy"
              >
                <Award className="h-3.5 w-3.5 text-cobalt" aria-hidden="true" />
                {t.certificate.sectionTitle}
              </h2>
              <p className="mt-0.5 text-[10px] text-muted">{t.certificate.editHint}</p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              aria-label={t.actions.printAria}
              className="flex items-center gap-1.5 rounded-lg border border-hair-strong px-3 py-1.5 text-[10.5px] font-medium text-navy transition hover:border-navy hover:bg-surface"
            >
              <Printer className="h-3 w-3" aria-hidden="true" />
              {t.print.certificate}
            </button>
          </div>

          <CertificateCard
            candidateName={name}
            onNameChange={handleNameChange}
            grade={evaluation.grade}
            overallScore={evaluation.overallScore}
            verificationId={evaluation.verificationId}
            issuedAt={issuedAt}
            scenarioTitle={scenario?.summary.title ?? "NovaAssist 2.0 上線風暴"}
            company={scenario?.company ?? "NovaTech"}
            dimensions={evaluation.dimensions}
          />
        </section>

        {/* ── 頁尾 CTA ───────────────────────────────────────────── */}
        <section className="no-print flex flex-col items-start gap-4 rounded-2xl border border-hair bg-surface px-6 py-6 text-left sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-[13px] font-semibold text-navy">{t.footer.ctaTitle}</h2>
            <p className="mt-1 break-words text-[11px] text-muted">{t.footer.ctaBody}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Link
              href="/"
              className="rounded-lg border border-hair-strong px-3 py-2 text-[11px] font-medium text-navy transition hover:border-navy"
            >
              {t.footer.backToLobby}
            </Link>
            <button
              type="button"
              onClick={retry}
              className="flex items-center gap-1.5 rounded-lg bg-cobalt px-4 py-2 text-[11px] font-bold text-white transition hover:bg-cobalt-hover"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              {t.footer.retry}
            </button>
          </div>
        </section>

        <p className="no-print text-center text-[9.5px] text-muted">{t.footer.disclaimer}</p>
      </main>
    </div>
  );
}
