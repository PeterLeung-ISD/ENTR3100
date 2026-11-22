"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Brain,
  Building2,
  Check,
  ClipboardCheck,
  FileWarning,
  Gauge,
  GraduationCap,
  Layers,
  Lock,
  MessageSquare,
  Radar,
  RotateCcw,
  ShieldAlert,
  Timer,
} from "lucide-react";

import LanguageToggle from "@/components/ui/LanguageToggle";
import { RubricModal } from "@/components/shared/RubricModal";
import { getScenarioCatalog } from "@/data/scenarios";
import { getScoringRubric } from "@/data/scoringRubric";
import type { LobbyCopy } from "@/lib/copy/lobby";
import type { RubricDimension, ScenarioSummary } from "@/types/simulation";
import { useLocale } from "@/lib/LocaleProvider";

const PILLAR_ICONS = [ShieldAlert, Timer, Radar, MessageSquare];
const WHY_ICONS = [BadgeCheck, Brain, FileWarning];

const DIFFICULTY_TONE: Record<string, string> = {
  "高壓進階": "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]",
  "High-pressure advanced": "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]",
};

function difficultyClass(value: string) {
  return (
    DIFFICULTY_TONE[value] ??
    "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]"
  );
}

export function LobbyView({ liveAi }: { liveAi: boolean }) {
  const { c, locale } = useLocale();
  const t = c.lobby;
  const missions = useMemo(() => getScenarioCatalog(locale), [locale]);
  const rubric = useMemo(() => getScoringRubric(locale), [locale]);
  const live = missions.find((mission) => mission.status === "live");
  const liveId = live?.id ?? "nexus-launch-crisis";
  const [rubricOpen, setRubricOpen] = useState(false);
  const [resetNote, setResetNote] = useState<string | null>(null);

  useEffect(() => {
    if (!resetNote) return;
    const timer = window.setTimeout(() => setResetNote(null), 3200);
    return () => window.clearTimeout(timer);
  }, [resetNote]);

  function resetLocalRecords() {
    try {
      const keys: string[] = [];
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        if (!key) continue;
        if (key.startsWith("nexussim:attempt:") || key.startsWith("nexussim:draft:")) {
          keys.push(key);
        }
      }
      keys.forEach((key) => window.localStorage.removeItem(key));
      setResetNote(t.nav.resetDone);
    } catch {
      setResetNote(t.nav.resetDone);
    }
  }

  return (
    <div className="min-h-screen bg-canvas text-navy">
      {/* ── Navigation ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-hair bg-surface">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="NexusSim">
            <span className="grid size-9 place-items-center rounded-lg bg-navy">
              <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
                <path d="M5 18V6l12 12V6" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block font-display text-[17px] font-bold leading-tight tracking-tight">
                NexusSim
              </span>
              <span className="hidden truncate text-[11px] font-medium tracking-wide text-muted sm:block">
                {t.nav.subtitle}
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 lg:flex" aria-label="Main">
            <a href="#missions" className="text-[13px] font-medium text-muted transition-colors hover:text-navy">
              {t.nav.missions}
            </a>
            <a href="#framework" className="text-[13px] font-medium text-muted transition-colors hover:text-navy">
              {t.nav.framework}
            </a>
            <a href="#method" className="text-[13px] font-medium text-muted transition-colors hover:text-navy">
              {t.nav.method}
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setRubricOpen(true)}
              aria-label={t.nav.dimensions}
              title={t.nav.dimensions}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-[13px] font-medium text-muted transition-colors hover:bg-canvas hover:text-navy"
            >
              <Gauge className="size-4" aria-hidden="true" />
              <span className="hidden md:inline">{t.nav.dimensions}</span>
            </button>
            <button
              type="button"
              onClick={resetLocalRecords}
              className="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-muted transition-colors hover:bg-canvas hover:text-navy sm:inline-flex"
              aria-label={t.nav.reset}
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              <span className="hidden lg:inline">{t.nav.reset}</span>
            </button>
            <LanguageToggle />
            <Link
              href={`/simulation/${liveId}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-cobalt px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-cobalt-hover"
            >
              {t.nav.start}
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      {resetNote ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-2.5 text-[13px] font-medium text-[#047857] shadow-sm"
        >
          <Check className="size-4" aria-hidden="true" />
          {resetNote}
        </div>
      ) : null}

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-5 lg:gap-12">
          <div className="min-w-0 lg:col-span-3">
            <p className="inline-flex items-center gap-2 rounded-full border border-hair bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              <span className={`size-1.5 rounded-full ${liveAi ? "bg-unlocked" : "bg-warn"}`} aria-hidden="true" />
              {t.hero.eyebrow}
            </p>
            <h1 className="mt-5 text-[30px] font-bold leading-[1.2] tracking-tight text-navy sm:text-[36px] lg:text-[40px]">
              {t.hero.titleLine1}
              <span className="block text-cobalt">{t.hero.titleLine2}</span>
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-[1.7] text-muted">{t.hero.lead}</p>
            <p className="mt-3 max-w-2xl border-l-2 border-cobalt pl-3 text-[15px] font-semibold leading-[1.65] text-navy">
              {t.hero.leadHighlight}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/simulation/${liveId}`}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-cobalt px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-cobalt-hover"
              >
                {t.hero.primaryCta}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <button
                type="button"
                onClick={() => setRubricOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-hair-strong bg-surface px-5 py-3 text-[14px] font-semibold text-navy transition-colors hover:bg-canvas"
              >
                <ClipboardCheck className="size-4 text-cobalt" aria-hidden="true" />
                {t.hero.secondaryCta}
              </button>
            </div>

            <dl className="mt-9 grid max-w-xl grid-cols-3 gap-4 border-t border-hair pt-6">
              {t.hero.stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="tabular-telemetry text-[22px] font-bold leading-none text-navy">
                    {stat.value}
                  </dt>
                  <dd className="mt-1.5 text-[11px] font-medium leading-snug text-muted">{stat.label}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Cockpit preview */}
          <div className="min-w-0 lg:col-span-2">
            <div className="overflow-hidden rounded-xl border border-[#232D42] bg-[#111622] shadow-lg">
              <div className="flex items-center justify-between gap-3 border-b border-[#232D42] px-4 py-2.5">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[#EF4444]" aria-hidden="true" />
                  <span className="size-2 rounded-full bg-[#F59E0B]" aria-hidden="true" />
                  <span className="size-2 rounded-full bg-[#10B981]" aria-hidden="true" />
                </span>
                <span className="truncate font-mono text-[10px] tracking-wide text-[#94A3B8]">
                  {t.hero.preview.window}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-[#EF4444]" aria-hidden="true" />
                  <span className="tabular-telemetry text-[11px] font-bold text-[#EF4444]">
                    {t.hero.preview.timer}
                  </span>
                </span>
              </div>

              <div className="space-y-3 p-4">
                <div className="flex items-start gap-2">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#1A2234] text-[10px] font-bold text-[#94A3B8]">
                    ML
                  </span>
                  <p className="rounded-lg rounded-tl-sm border border-[#232D42] bg-[#1A2234] px-3 py-2 text-[11.5px] leading-[1.55] text-[#F1F5F9]">
                    {t.hero.preview.marcus}
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#0E2A3D] text-[10px] font-bold text-[#38BDF8]">
                    CW
                  </span>
                  <div className="min-w-0">
                    <span className="mb-1 inline-flex items-center gap-1 rounded border border-[#065F46] bg-[#052E22] px-1.5 py-0.5 text-[9.5px] font-semibold text-[#10B981]">
                      {t.hero.preview.chloeBadge}
                    </span>
                    <p className="rounded-lg rounded-tl-sm border border-[#232D42] bg-[#1A2234] px-3 py-2 text-[11.5px] leading-[1.55] text-[#F1F5F9]">
                      {t.hero.preview.chloe}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-md border border-dashed border-[#232D42] px-2.5 py-2 text-[10.5px] text-[#94A3B8]">
                  <Lock className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{t.hero.preview.lockedDoc}</span>
                </div>

                <div className="rounded-md border border-[#232D42] px-2.5 py-2">
                  <div className="flex items-center justify-between text-[10px] font-medium text-[#94A3B8]">
                    <span>{t.hero.preview.pressure}</span>
                    <span className="tabular-telemetry text-[#F59E0B]">{t.hero.preview.pressureBand}</span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#1A2234]">
                    <div className="h-full w-[62%] rounded-full bg-gradient-to-r from-[#38BDF8] via-[#F59E0B] to-[#EF4444]" />
                  </div>
                </div>

                <ul className="space-y-1.5">
                  {t.hero.preview.options.map((option, index) => (
                    <li
                      key={option}
                      className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[11px] ${
                        index === 2
                          ? "border-[#2563EB] bg-[#12224A] text-[#F1F5F9]"
                          : "border-[#232D42] text-[#94A3B8]"
                      }`}
                    >
                      <span
                        className={`size-2 rounded-full border ${
                          index === 2 ? "border-[#2563EB] bg-[#2563EB]" : "border-[#475569]"
                        }`}
                        aria-hidden="true"
                      />
                      {option}
                    </li>
                  ))}
                </ul>

                <div className="flex items-center justify-between gap-2 rounded-md border border-[#7F1D1D] bg-[#2A1215] px-2.5 py-1.5">
                  <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-[#FCA5A5]">
                    <span className="size-1.5 animate-pulse rounded-full bg-[#EF4444]" aria-hidden="true" />
                    {t.hero.preview.vpPopup}
                  </span>
                  <span className="tabular-telemetry text-[11px] font-bold text-[#FCA5A5]">45.0</span>
                </div>
              </div>
            </div>
            <p className="mt-2.5 text-center text-[11px] font-medium tracking-wide text-muted">
              {t.hero.previewSubtitle}
            </p>
          </div>
        </div>
      </section>

      {/* ── Flagship scenario ──────────────────────────────────────── */}
      {live ? (
        <section id="missions" className="border-t border-hair bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cobalt">{t.flagship.eyebrow}</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-navy sm:text-3xl">
                {t.flagship.title}
              </h2>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">{t.flagship.lead}</p>
            </div>

            <div className="mt-8">
              <FlagshipCard mission={live} t={t} rubric={rubric} liveAi={liveAi} />
            </div>

            {/* 低調的擴充預告：單行條狀，不做卡片格 */}
            <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-dashed border-hair-strong px-4 py-3 text-[12.5px] leading-snug text-muted">
              <Layers className="mt-0.5 size-4 shrink-0 text-muted/80" aria-hidden="true" />
              <p className="min-w-0">{t.teaser}</p>
            </div>
          </div>
        </section>
      ) : null}

      {/* ── Framework ──────────────────────────────────────────────── */}
      <section id="framework" className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cobalt">{t.pillars.eyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-navy sm:text-3xl">
            {t.pillars.title}
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">{t.pillars.lead}</p>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.pillars.items.map((item, index) => {
            const Icon = PILLAR_ICONS[index] ?? ShieldAlert;
            return (
              <article key={item.title} className="rounded-xl border border-hair bg-surface p-5 shadow-sm">
                <span className="grid size-10 place-items-center rounded-lg bg-canvas">
                  <Icon className="size-5 text-cobalt" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-[15px] font-semibold leading-snug text-navy">{item.title}</h3>
                <p className="mt-2 text-[13px] leading-[1.65] text-muted">{item.copy}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* ── Method ─────────────────────────────────────────────────── */}
      <section id="method" className="border-t border-hair bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cobalt">{t.why.eyebrow}</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-navy sm:text-3xl">
                {t.why.title}
              </h2>
              <p className="mt-4 text-[14px] leading-[1.75] text-muted">{t.why.paragraph1}</p>
              <p className="mt-3 text-[14px] leading-[1.75] text-muted">{t.why.paragraph2}</p>

              <ul className="mt-6 space-y-3">
                {t.why.features.map((feature, index) => {
                  const Icon = WHY_ICONS[index] ?? BadgeCheck;
                  return (
                    <li key={feature.title} className="flex gap-3">
                      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md bg-[#EFF6FF]">
                        <Icon className="size-4 text-cobalt" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13.5px] font-semibold text-navy">{feature.title}</span>
                        <span className="mt-0.5 block text-[12.5px] leading-[1.6] text-muted">{feature.copy}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                {t.why.flowEyebrow}
              </p>
              <ol className="mt-3 space-y-2">
                {t.why.flow.map((step) => (
                  <li
                    key={step.step}
                    className="flex gap-3 rounded-lg border border-hair bg-canvas px-4 py-3.5"
                  >
                    <span className="tabular-telemetry text-[12px] font-bold leading-5 text-cobalt">
                      {step.step}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-semibold text-navy">{step.title}</span>
                      <span className="mt-0.5 block text-[12.5px] leading-[1.6] text-muted">{step.copy}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="border-t border-hair bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-[12.5px] font-semibold text-navy">{t.footer.brand}</p>
          <p className="flex items-center gap-3 text-[11.5px] text-muted">
            <span>{t.footer.disclaimer}</span>
            <span className="tabular-telemetry">{t.footer.version}</span>
          </p>
        </div>
      </footer>

      <RubricModal open={rubricOpen} onClose={() => setRubricOpen(false)} />
    </div>
  );
}

function FlagshipCard({
  mission,
  t,
  rubric,
  liveAi,
}: {
  mission: ScenarioSummary;
  t: LobbyCopy;
  rubric: RubricDimension[];
  liveAi: boolean;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-hair border-l-4 border-l-cobalt bg-surface shadow-sm transition-shadow hover:shadow-md">
      <div className="grid lg:grid-cols-5">
        {/* LEFT — scenario identity + scoring + CTA */}
        <div className="flex min-w-0 flex-col p-5 sm:p-7 lg:col-span-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#A7F3D0] bg-[#ECFDF5] px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#047857]">
              <span className="size-1.5 rounded-full bg-unlocked" aria-hidden="true" />
              {t.flagship.status}
            </span>
            <span className="tabular-telemetry inline-flex items-center gap-1.5 rounded-md bg-navy px-2.5 py-1 text-[10.5px] font-bold tracking-wide text-white">
              <Timer className="size-3.5" aria-hidden="true" />
              {t.flagship.telemetry(mission.durationMinutes)}
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-[10.5px] font-semibold ${difficultyClass(mission.difficulty)}`}>
              {mission.difficulty}
            </span>
          </div>

          <p className="mt-5 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            <Building2 className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="text-navy">{mission.company}</span>
            <span className="text-hair-strong" aria-hidden="true">
              /
            </span>
            <span>{mission.industry}</span>
          </p>

          <h3 className="mt-2 break-words font-display text-[21px] font-bold leading-snug tracking-tight text-navy sm:text-[25px]">
            {mission.title}
          </h3>
          <p className="mt-2.5 text-[13.5px] leading-[1.7] text-muted">{mission.tagline}</p>

          <div className="mt-5 rounded-lg border border-hair bg-canvas px-3.5 py-2.5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted">
              {t.flagship.roleLabel}
            </p>
            <p className="mt-0.5 break-words text-[13px] font-semibold leading-snug text-navy">
              {t.flagship.roleValue}
            </p>
          </div>

          <div className="mt-5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted">
              {t.flagship.rubricLabel}
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {rubric.map((dimension) => (
                <li
                  key={dimension.key}
                  className="inline-flex items-center gap-1.5 rounded-full border border-hair bg-surface px-2.5 py-1 text-[11px] font-medium text-navy"
                >
                  {dimension.title}
                  <span className="tabular-telemetry rounded-sm bg-[#EFF6FF] px-1 py-0.5 text-[10px] font-bold text-cobalt">
                    {dimension.weight}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-auto pt-6">
            <Link
              href={`/simulation/${mission.id}`}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-cobalt px-4 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-cobalt-hover"
            >
              {t.flagship.cta}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-muted">
              <span className={`size-1.5 rounded-full ${liveAi ? "bg-unlocked" : "bg-warn"}`} aria-hidden="true" />
              {liveAi ? t.flagship.engineLive : t.flagship.engineOffline}
            </p>
          </div>
        </div>

        {/* RIGHT — four-stage flow preview */}
        <div className="flex min-w-0 flex-col border-t border-hair bg-canvas p-5 sm:p-7 lg:col-span-2 lg:border-l lg:border-t-0">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted">
            {t.flagship.flowLabel}
          </p>

          <ol className="relative mt-4 space-y-4">
            <span
              className="absolute bottom-3 left-3.5 top-3 w-px bg-hair-strong"
              aria-hidden="true"
            />
            {t.flagship.flow.map((step) => (
              <li key={step.step} className="relative flex gap-3">
                <span className="tabular-telemetry relative z-10 grid size-7 shrink-0 place-items-center rounded-full border border-cobalt/40 bg-[#EFF6FF] text-[10.5px] font-bold text-cobalt">
                  {step.step}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold leading-snug text-navy">{step.title}</span>
                  <span className="mt-0.5 block text-[12px] leading-[1.6] text-muted">{step.copy}</span>
                </span>
              </li>
            ))}
          </ol>

          <div className="mt-auto pt-5">
            <div className="flex gap-2.5 rounded-lg border border-hair bg-surface px-3.5 py-3">
              <GraduationCap className="mt-0.5 size-4 shrink-0 text-cobalt" aria-hidden="true" />
              <p className="min-w-0 text-[11.5px] leading-[1.65] text-muted">{t.flagship.debriefNote}</p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
