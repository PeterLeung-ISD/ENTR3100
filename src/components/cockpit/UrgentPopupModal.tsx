"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CornerDownLeft, Send, Siren, Timer } from "lucide-react";
import { useLocale } from "@/lib/LocaleProvider";

interface UrgentPopupModalProps {
  open: boolean;
  title: string;
  prompt: string;
  senderName: string;
  senderRole: string;
  secondsLeft: number;
  totalSeconds: number;
  onSubmit: (text: string) => void;
  onDismiss: () => void;
}

export default function UrgentPopupModal({
  open,
  title,
  prompt,
  senderName,
  senderRole,
  secondsLeft,
  totalSeconds,
  onSubmit,
  onDismiss,
}: UrgentPopupModalProps) {
  const { c } = useLocale();
  const copy = c.cockpit.urgent;
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (open) {
      setText("");
      const timer = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!open) return null;

  const remaining = Math.max(0, secondsLeft);
  const ratio = totalSeconds > 0 ? Math.max(0, Math.min(1, remaining / totalSeconds)) : 0;
  const circumference = 2 * Math.PI * 22;
  const urgent = remaining <= 15;
  const countdown = `${remaining.toFixed(1)}s`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="animate-pop w-full max-w-lg overflow-hidden rounded-2xl border-2 border-critical bg-cockpit-panel p-6 shadow-2xl"
      >
        {/* header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-critical/40 bg-critical/15">
              <Siren className="h-4 w-4 text-critical" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-critical">
                {copy.executivePing}
              </p>
              <p className="mt-0.5 truncate text-[13px] font-semibold text-cockpit-text">{senderName}</p>
              <p className="truncate text-[10px] text-cockpit-muted">{senderRole}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="text-right">
              <span
                aria-label={copy.countdownAria(countdown)}
                className={`tabular-telemetry block text-[18px] font-bold leading-none ${
                  urgent ? "animate-pulse text-critical" : "text-critical"
                }`}
              >
                {countdown}
              </span>
              <span className="mt-0.5 flex items-center justify-end gap-0.5 text-[8.5px] uppercase tracking-widest text-cockpit-muted">
                <Timer className="h-2.5 w-2.5" aria-hidden="true" />
                {copy.remainingLabel}
              </span>
            </div>
            <svg width="44" height="44" viewBox="0 0 56 56" className="-rotate-90" aria-hidden="true">
              <circle
                cx="28"
                cy="28"
                r="22"
                fill="none"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="5"
              />
              <circle
                cx="28"
                cy="28"
                r="22"
                fill="none"
                stroke="#EF4444"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - ratio)}
                style={{ transition: "stroke-dashoffset 0.9s linear" }}
              />
            </svg>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <span className="flex items-center gap-1 rounded border border-critical/30 bg-critical/10 px-1.5 py-0.5 text-[9px] font-semibold text-critical">
            <Timer className="h-2.5 w-2.5" aria-hidden="true" />
            {copy.replyWithin(totalSeconds)}
          </span>
          <span className="truncate text-[9.5px] text-cockpit-muted">{copy.footer}</span>
        </div>

        <h2 id={titleId} className="mt-3 text-[17px] font-bold leading-snug text-cockpit-text">
          {title}
        </h2>
        <p className="mt-1.5 whitespace-pre-wrap rounded-lg border border-cockpit-line bg-cockpit-elevated/60 px-3 py-2.5 text-[14px] leading-relaxed text-cockpit-text/85">
          {prompt}
        </p>

        <textarea
          ref={inputRef}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              onSubmit(text);
            }
          }}
          rows={3}
          placeholder={copy.placeholder}
          className="mt-3 w-full resize-none rounded-lg border border-cockpit-line bg-cockpit-elevated px-3 py-2.5 text-[15px] leading-relaxed text-cockpit-text outline-none transition placeholder:text-cockpit-muted/70 focus:border-critical/60"
        />

        <div className="mt-3 flex items-center gap-2">
          <span className="mr-auto flex items-center gap-1 text-[9px] text-cockpit-muted">
            <CornerDownLeft className="h-2.5 w-2.5" aria-hidden="true" /> {copy.shortcut}
          </span>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg border border-cockpit-line px-3.5 py-2 text-[13px] font-medium text-cockpit-muted transition hover:border-cockpit-muted/50 hover:text-cockpit-text"
          >
            {copy.dismiss}
          </button>
          <button
            type="button"
            onClick={() => onSubmit(text)}
            className="flex items-center gap-1.5 rounded-lg bg-critical-deep px-4 py-2.5 text-[13px] font-bold text-white transition hover:bg-critical"
          >
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
            {copy.replyNow}
          </button>
        </div>
      </div>
    </div>
  );
}
