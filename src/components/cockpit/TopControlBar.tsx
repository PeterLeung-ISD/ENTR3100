"use client";

import Link from "next/link";
import {
  ArrowLeft,
  FastForward,
  Gauge,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Timer,
} from "lucide-react";
import LanguageToggle from "@/components/ui/LanguageToggle";
import { useLocale } from "@/lib/LocaleProvider";
import { formatClock } from "@/lib/ids";

interface TopControlBarProps {
  scenarioTitle: string;
  roleLabel: string;
  remaining: number;
  total: number;
  pressure: number;
  running: boolean;
  mode: "live" | "offline-mock" | "detecting";
  onToggleRun: () => void;
  onSkipMinute: () => void;
  onNextEvent: () => void;
  onRestart: () => void;
}

export default function TopControlBar({
  scenarioTitle,
  roleLabel,
  remaining,
  total,
  pressure,
  running,
  mode,
  onToggleRun,
  onSkipMinute,
  onNextEvent,
  onRestart,
}: TopControlBarProps) {
  const { c } = useLocale();
  const copy = c.cockpit.topbar;

  const urgent = remaining < 60;
  const warning = remaining < 240;
  const timerTone = urgent ? "text-critical animate-pulse" : warning ? "text-warn" : "text-cockpit-text";

  const pressureValue = Math.max(0, Math.min(100, Math.round(pressure)));
  const pressureFill =
    pressureValue >= 85 ? "bg-critical" : pressureValue >= 70 ? "bg-warn" : "bg-calm";
  const pressureText =
    pressureValue >= 85 ? "text-critical" : pressureValue >= 70 ? "text-warn" : "text-cockpit-text";

  const engineLabel =
    mode === "live" ? copy.engineLive : mode === "offline-mock" ? copy.engineOffline : copy.engineDetecting;
  const engineDot =
    mode === "live"
      ? "bg-unlocked"
      : mode === "offline-mock"
        ? "bg-warn"
        : "bg-cockpit-muted animate-pulse";
  const engineTone =
    mode === "live" ? "text-unlocked" : mode === "offline-mock" ? "text-warn" : "text-cockpit-muted";

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center gap-2 border-b border-cockpit-line bg-cockpit-panel px-2 sm:gap-3 sm:px-3">
      {/* ── Left: back link · title · engine lamp ─────────────────────── */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Link
          href="/"
          aria-label={copy.backToLobby}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cockpit-line bg-cockpit-elevated text-cockpit-muted transition hover:border-calm/40 hover:text-cockpit-text"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="truncate text-[12.5px] font-semibold leading-tight text-cockpit-text">
            {scenarioTitle || copy.fallbackTitle}
          </div>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[10px] leading-none">
            <span
              className="inline-flex min-w-0 items-center gap-1"
              aria-label={copy.engineAria(engineLabel)}
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${engineDot}`} aria-hidden="true" />
              <span className={`truncate font-semibold ${engineTone}`}>{engineLabel}</span>
            </span>
            <span className="shrink-0 text-cockpit-line" aria-hidden="true">
              |
            </span>
            <span className="hidden min-w-0 truncate text-cockpit-muted sm:inline">
              {roleLabel || copy.fallbackRole}
            </span>
          </div>
        </div>
      </div>

      {/* ── Center: demo pill cluster (hidden below lg to protect timer) ─ */}
      <div
        role="group"
        aria-label={copy.demoControls}
        className="hidden shrink-0 items-center gap-1 rounded-lg border border-cockpit-line bg-cockpit-elevated/70 p-1 lg:flex"
      >
        <span className="px-1.5 text-[9px] font-semibold uppercase tracking-widest text-cockpit-muted">
          {copy.demo}
        </span>
        <button
          type="button"
          onClick={onSkipMinute}
          title={copy.skipMinuteTitle(1)}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[10.5px] font-medium text-cockpit-text transition hover:bg-cockpit-base/60"
        >
          <FastForward className="h-3.5 w-3.5 text-calm" aria-hidden="true" />
          {copy.skipMinuteButton(1)}
        </button>
        <button
          type="button"
          onClick={onNextEvent}
          title={copy.nextEventTitle}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[10.5px] font-medium text-warn transition hover:bg-warn/10"
        >
          <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />
          {copy.nextEventButton}
        </button>
      </div>

      {/* ── Right: pressure · timer · language · pause/reset ─────────── */}
      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <div
          className="hidden items-center gap-1.5 md:flex"
          role="img"
          aria-label={copy.pressureAria(pressureValue)}
        >
          <Gauge className="h-3.5 w-3.5 shrink-0 text-cockpit-muted" aria-hidden="true" />
          <div
            className="h-1.5 w-14 overflow-hidden rounded-full bg-cockpit-elevated lg:w-20"
            aria-hidden="true"
          >
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${pressureFill}`}
              style={{ width: `${pressureValue}%` }}
            />
          </div>
          <span className={`tabular-telemetry w-8 text-[10.5px] font-semibold ${pressureText}`}>
            {pressureValue}%
          </span>
        </div>

        <div
          title={`${formatClock(remaining)} / ${formatClock(total)}`}
          className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2 py-1 ${
            urgent ? "border-critical/50 bg-critical/10" : "border-cockpit-line bg-cockpit-elevated/60"
          }`}
        >
          <Timer className={`h-4 w-4 shrink-0 ${timerTone}`} aria-hidden="true" />
          <div className="leading-none">
            <div className={`tabular-telemetry text-2xl font-extrabold leading-none tracking-tight ${timerTone}`}>
              {formatClock(remaining)}
            </div>
            <div className="mt-0.5 hidden text-[9px] uppercase tracking-widest text-cockpit-muted sm:block">
              {copy.timeRemaining}
            </div>
          </div>
        </div>

        <div className="shrink-0">
          <LanguageToggle compact tone="dark" />
        </div>

        <button
          type="button"
          onClick={onToggleRun}
          aria-label={running ? copy.pauseCountdown : copy.resumeCountdown}
          title={running ? copy.pauseCountdown : copy.resumeCountdown}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cockpit-line bg-cockpit-elevated text-cockpit-muted transition hover:border-calm/40 hover:text-cockpit-text"
        >
          {running ? (
            <Pause className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Play className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          onClick={onRestart}
          aria-label={copy.restart}
          title={copy.restart}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cockpit-line bg-cockpit-elevated text-cockpit-muted transition hover:border-warn/40 hover:text-warn"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
