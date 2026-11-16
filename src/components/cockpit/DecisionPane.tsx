"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Check,
  CircleDollarSign,
  Clock3,
  FileKey2,
  Info,
  Loader2,
  MessageSquare,
  Send,
  ShieldQuestionMark,
  Siren,
  Stamp,
} from "lucide-react";
import { useLocale } from "@/lib/LocaleProvider";
import type { FinalDecision, TimelineEventType } from "@/types/simulation";

export interface ActivityItem {
  id: string;
  label: string;
  type: TimelineEventType;
  time: string;
}

interface DecisionPaneProps {
  decisionOptions: { value: FinalDecision; label: string; description: string }[];
  activity: ActivityItem[];
  pressure: number;
  stats: { unlockedDocs: number; totalDocs: number; messages: number; readDocs: number };
  decision: FinalDecision | "";
  onDecisionChange: (decision: FinalDecision) => void;
  rationale: string;
  onRationaleChange: (value: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
  remaining: number;
}

const ACTIVITY_ICON: Record<TimelineEventType, typeof Info> = {
  message: MessageSquare,
  unlock_doc: FileKey2,
  urgent_modal: Siren,
  system: Info,
};

const ACTIVITY_TONE: Record<TimelineEventType, string> = {
  message: "text-cockpit-muted border-cockpit-line bg-cockpit-elevated",
  unlock_doc: "text-unlocked border-unlocked/30 bg-unlocked/10",
  urgent_modal: "text-critical border-critical/30 bg-critical/10",
  system: "text-warn border-warn/30 bg-warn/10",
};

export default function DecisionPane({
  decisionOptions,
  activity,
  pressure,
  stats,
  decision,
  onDecisionChange,
  rationale,
  onRationaleChange,
  onSubmit,
  submitting,
  error,
  remaining,
}: DecisionPaneProps) {
  const { c } = useLocale();
  const copy = c.cockpit.decision;
  const [confirming, setConfirming] = useState(false);
  const canSubmit = Boolean(decision) && rationale.trim().length >= 12 && !submitting;

  const pressureTone =
    pressure >= 70
      ? "bg-critical/15 text-critical"
      : pressure >= 45
        ? "bg-warn/15 text-warn"
        : "bg-cockpit-elevated text-cockpit-muted";

  return (
    <aside className="flex w-full min-h-0 min-w-0 flex-col overflow-hidden border border-cockpit-line bg-cockpit-panel lg:rounded-lg">
      {/* activity wall */}
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-cockpit-line px-3.5">
        <div className="flex min-w-0 items-center gap-2">
          <Clock3 className="h-4 w-4 shrink-0 text-warn" aria-hidden="true" />
          <h2 className="truncate text-[12px] font-semibold uppercase tracking-widest text-cockpit-text">
            {copy.activityHeader}
          </h2>
          <span className="hidden shrink-0 text-[10px] text-cockpit-muted sm:inline">
            {copy.activityLatestFirst}
          </span>
        </div>
        <span
          className={`flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[10.5px] font-semibold ${pressureTone}`}
        >
          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
          <span className="tabular-telemetry">{copy.pressure(Math.round(pressure))}</span>
        </span>
      </div>

      <div className="scroll-thin max-h-[36%] min-h-[96px] shrink-0 space-y-1.5 overflow-y-auto border-b border-cockpit-line p-2.5">
        {activity.length === 0 && (
          <p className="px-1 py-2 text-[12.5px] leading-relaxed text-cockpit-muted">{copy.noActivity}</p>
        )}
        {[...activity].reverse().map((item) => {
          const Icon = ACTIVITY_ICON[item.type] ?? Info;
          return (
            <div
              key={item.id}
              className="flex items-start gap-2 rounded-md border border-cockpit-line/70 bg-cockpit-elevated/40 px-2.5 py-2"
            >
              <span
                className={`mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded border ${ACTIVITY_TONE[item.type]}`}
              >
                <Icon className="h-3 w-3" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] leading-snug text-cockpit-text">{item.label}</p>
                <p className="tabular-telemetry mt-0.5 text-[10.5px] text-cockpit-muted">{item.time}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* stats */}
      <div className="grid shrink-0 grid-cols-3 border-b border-cockpit-line">
        {[
          { id: "unlocked", label: copy.statUnlocked, value: `${stats.unlockedDocs}/${stats.totalDocs}` },
          { id: "read", label: copy.statRead, value: `${stats.readDocs}` },
          { id: "messages", label: copy.statMessages, value: `${stats.messages}` },
        ].map((stat, index) => (
          <div
            key={stat.id}
            className={`px-3.5 py-2.5 ${index < 2 ? "border-r border-cockpit-line" : ""}`}
          >
            <div className="tabular-telemetry text-[16px] font-bold text-white">{stat.value}</div>
            <div className="truncate text-[10px] uppercase tracking-widest text-cockpit-muted">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* sign-off */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b border-cockpit-line px-3.5 py-2.5">
          <Stamp className="h-4 w-4 shrink-0 text-unlocked" aria-hidden="true" />
          <h2 className="truncate text-[12px] font-semibold uppercase tracking-widest text-cockpit-text">
            {copy.signOffHeader}
          </h2>
          <span className="ml-auto shrink-0 text-[10px] text-cockpit-muted">{copy.rationaleRequired}</span>
        </div>

        <div className="scroll-thin min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5">
          {decisionOptions.map((option) => {
            const checked = decision === option.value;
            return (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
                  checked
                    ? "border-cobalt bg-cobalt/10"
                    : "border-cockpit-line bg-cockpit-elevated/40 hover:border-cockpit-muted/40 hover:bg-cockpit-elevated"
                }`}
              >
                <input
                  type="radio"
                  name="final-decision"
                  value={option.value}
                  checked={checked}
                  onChange={() => {
                    setConfirming(false);
                    onDecisionChange(option.value);
                  }}
                  className="mt-1 h-4 w-4 shrink-0 accent-cobalt"
                />
                <span className="min-w-0">
                  <span
                    className={`block text-[15px] font-semibold leading-snug ${
                      checked ? "text-white" : "text-cockpit-text/90"
                    }`}
                  >
                    {option.label}
                  </span>
                  <span className="mt-1 block text-[13.5px] leading-relaxed text-cockpit-muted">
                    {option.description}
                  </span>
                </span>
              </label>
            );
          })}
        </div>

        <div className="shrink-0 border-t border-cockpit-line p-3">
          <textarea
            value={rationale}
            onChange={(event) => onRationaleChange(event.target.value)}
            rows={3}
            placeholder={copy.rationalePlaceholder}
            className="w-full resize-none rounded-lg border border-cockpit-line bg-cockpit-elevated/60 px-3 py-2.5 text-[15px] leading-relaxed text-cockpit-text outline-none transition placeholder:text-cockpit-muted/70 focus:border-cobalt/60"
          />
          <div className="mt-1.5 flex items-center justify-between gap-2 text-[10.5px] text-cockpit-muted">
            <span className="tabular-telemetry">{copy.charCount(rationale.trim().length)}</span>
            <span className="truncate text-right">{copy.rationaleScoring}</span>
          </div>

          {error && (
            <p className="mt-2 flex items-start gap-1.5 rounded border border-critical/30 bg-critical/10 px-2.5 py-2 text-[12.5px] leading-snug text-critical">
              <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}

          {confirming && !submitting ? (
            <div
              role="alertdialog"
              aria-label={copy.confirmAria}
              className="mt-2 rounded-lg border border-cobalt/50 bg-cobalt/10 p-3"
            >
              <p className="flex items-start gap-1.5 text-[13.5px] font-semibold leading-snug text-cockpit-text">
                <ShieldQuestionMark className="mt-px h-4 w-4 shrink-0 text-cobalt" aria-hidden="true" />
                {copy.confirmTitle}
              </p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-cockpit-muted">{copy.confirmBody}</p>
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="flex-1 rounded-md border border-cockpit-line bg-cockpit-elevated px-2 py-2 text-[12.5px] font-semibold text-cockpit-muted transition hover:text-cockpit-text"
                >
                  {copy.confirmCancel}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirming(false);
                    onSubmit();
                  }}
                  className="flex flex-1 items-center justify-center gap-1 rounded-md bg-cobalt px-2 py-2 text-[12.5px] font-bold text-white transition hover:bg-cobalt-hover"
                >
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  {copy.confirmSubmit}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (!canSubmit) return;
                setConfirming(true);
              }}
              disabled={!canSubmit}
              className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-lg bg-cobalt py-3 text-[14px] font-bold text-white transition hover:bg-cobalt-hover disabled:cursor-not-allowed disabled:bg-cockpit-line disabled:text-cockpit-muted"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-4 w-4" aria-hidden="true" />
              )}
              {submitting ? copy.submitting : copy.submit}
            </button>
          )}

          <p className="mt-2 flex items-center justify-center gap-1 text-center text-[10.5px] text-cockpit-muted">
            <CircleDollarSign className="h-3 w-3" aria-hidden="true" />
            {copy.remainingMinutes(Math.max(0, Math.ceil(remaining / 60)))}
          </p>
        </div>
      </div>
    </aside>
  );
}
