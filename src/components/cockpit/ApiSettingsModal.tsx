"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  PlugZap,
  Trash2,
  X,
} from "lucide-react";
import { useLocale } from "@/lib/LocaleProvider";
import { DEFAULT_AI_CONFIG, normalizeAiConfig, type AiConfig } from "@/lib/aiConfig";

interface ApiSettingsModalProps {
  open: boolean;
  config: AiConfig;
  serverHasKey: boolean;
  onClose: () => void;
  onSave: (config: AiConfig) => void;
  onClear: () => void;
}

interface TestState {
  status: "idle" | "testing" | "ok" | "error";
  message?: string;
}

export default function ApiSettingsModal({
  open,
  config,
  serverHasKey,
  onClose,
  onSave,
  onClear,
}: ApiSettingsModalProps) {
  const { c, locale } = useLocale();
  const copy = c.cockpit.apiSettings;

  const [apiKey, setApiKey] = useState(config.apiKey);
  const [baseUrl, setBaseUrl] = useState(config.baseUrl || DEFAULT_AI_CONFIG.baseUrl);
  const [model, setModel] = useState(config.model || DEFAULT_AI_CONFIG.model);
  const [showKey, setShowKey] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [test, setTest] = useState<TestState>({ status: "idle" });
  const keyRef = useRef<HTMLInputElement>(null);

  // 每次開啟時同步外部設定，並把焦點放進金鑰欄位
  useEffect(() => {
    if (!open) return;
    setApiKey(config.apiKey);
    setBaseUrl(config.baseUrl || DEFAULT_AI_CONFIG.baseUrl);
    setModel(config.model || DEFAULT_AI_CONFIG.model);
    setShowKey(false);
    setTest({ status: "idle" });
    setAdvancedOpen(false);
    const timer = window.setTimeout(() => keyRef.current?.focus(), 60);
    return () => window.clearTimeout(timer);
  }, [open, config]);

  // Esc 關閉
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const trimmedKey = apiKey.trim();

  const runTest = async () => {
    if (!trimmedKey) {
      setTest({ status: "error", message: copy.testMissingKey });
      return;
    }
    setTest({ status: "testing" });
    try {
      const res = await fetch("/api/npc-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-deepseek-api-key": trimmedKey,
          ...(baseUrl.trim() && baseUrl.trim() !== DEFAULT_AI_CONFIG.baseUrl
            ? { "x-deepseek-base-url": baseUrl.trim() }
            : {}),
          ...(model.trim() && model.trim() !== DEFAULT_AI_CONFIG.model
            ? { "x-deepseek-model": model.trim() }
            : {}),
        },
        body: JSON.stringify({ ping: true, locale }),
      });
      const data = (await res.json()) as { ok?: boolean; warningNotice?: string };
      if (data.ok) {
        setTest({ status: "ok", message: copy.testOk });
      } else {
        setTest({ status: "error", message: data.warningNotice ?? copy.testMissingKey });
      }
    } catch {
      setTest({ status: "error", message: copy.testMissingKey });
    }
  };

  const submit = () => {
    onSave(normalizeAiConfig({ apiKey: trimmedKey, baseUrl, model }));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="api-settings-title"
        className="scroll-thin max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-cockpit-line bg-cockpit-panel p-5 text-cockpit-text shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg border border-calm/30 bg-calm/10 text-calm">
              <KeyRound className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="api-settings-title" className="text-[17px] font-semibold text-cockpit-text">
                {copy.title}
              </h2>
              <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-cockpit-muted">
                {copy.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.close}
            className="rounded-lg border border-cockpit-line p-1.5 text-cockpit-muted transition hover:bg-cockpit-elevated hover:text-cockpit-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-calm"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <p
          className={`mt-3 rounded-lg border px-3 py-2 text-[12px] leading-relaxed ${
            serverHasKey
              ? "border-unlocked/40 bg-unlocked/10 text-unlocked"
              : "border-warn/40 bg-warn/10 text-warn"
          }`}
        >
          {serverHasKey ? copy.envActive : copy.envNone}
        </p>

        <div className="mt-4 space-y-3">
          <label className="block text-[12px] font-semibold uppercase tracking-wide text-cockpit-muted">
            {copy.keyLabel}
            <div className="relative mt-1.5">
              <input
                ref={keyRef}
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(event) => {
                  setApiKey(event.target.value);
                  setTest({ status: "idle" });
                }}
                placeholder={copy.keyPlaceholder}
                autoComplete="off"
                spellCheck={false}
                className="tabular-telemetry w-full rounded-lg border border-cockpit-line bg-cockpit-elevated px-3 py-2.5 pr-11 text-[14px] font-normal tracking-normal text-cockpit-text placeholder:text-cockpit-muted/70 focus:border-calm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-calm"
              />
              <button
                type="button"
                onClick={() => setShowKey((prev) => !prev)}
                aria-label={showKey ? copy.hideKey : copy.showKey}
                aria-pressed={showKey}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-cockpit-muted transition hover:text-cockpit-text"
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </label>
          <p className="text-[11.5px] leading-relaxed text-cockpit-muted">{copy.keyHint}</p>

          <button
            type="button"
            onClick={() => setAdvancedOpen((prev) => !prev)}
            aria-expanded={advancedOpen}
            className="flex w-full items-center justify-between rounded-lg border border-cockpit-line bg-cockpit-elevated/60 px-3 py-2 text-[12.5px] font-medium text-cockpit-text transition hover:bg-cockpit-elevated"
          >
            {copy.advanced}
            {advancedOpen ? (
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            )}
          </button>

          {advancedOpen ? (
            <div className="space-y-3 rounded-lg border border-cockpit-line p-3">
              <label className="block text-[12px] font-semibold uppercase tracking-wide text-cockpit-muted">
                {copy.baseUrlLabel}
                <input
                  type="url"
                  value={baseUrl}
                  onChange={(event) => {
                    setBaseUrl(event.target.value);
                    setTest({ status: "idle" });
                  }}
                  placeholder={DEFAULT_AI_CONFIG.baseUrl}
                  spellCheck={false}
                  className="tabular-telemetry mt-1.5 w-full rounded-lg border border-cockpit-line bg-cockpit-elevated px-3 py-2 text-[13px] font-normal tracking-normal text-cockpit-text focus:border-calm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-calm"
                />
                <span className="mt-1 block text-[11px] font-normal normal-case leading-relaxed text-cockpit-muted">
                  {copy.baseUrlHint}
                </span>
              </label>
              <label className="block text-[12px] font-semibold uppercase tracking-wide text-cockpit-muted">
                {copy.modelLabel}
                <input
                  type="text"
                  value={model}
                  onChange={(event) => {
                    setModel(event.target.value);
                    setTest({ status: "idle" });
                  }}
                  placeholder={DEFAULT_AI_CONFIG.model}
                  spellCheck={false}
                  className="tabular-telemetry mt-1.5 w-full rounded-lg border border-cockpit-line bg-cockpit-elevated px-3 py-2 text-[13px] font-normal tracking-normal text-cockpit-text focus:border-calm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-calm"
                />
                <span className="mt-1 block text-[11px] font-normal normal-case leading-relaxed text-cockpit-muted">
                  {copy.modelHint}
                </span>
              </label>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={runTest}
              disabled={test.status === "testing"}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cockpit-line bg-cockpit-elevated px-3 py-2 text-[12.5px] font-medium text-cockpit-text transition hover:border-calm/50 hover:text-calm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {test.status === "testing" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <PlugZap className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {test.status === "testing" ? copy.testing : copy.test}
            </button>
            {test.status === "ok" ? (
              <span className="inline-flex items-center gap-1.5 text-[12.5px] text-unlocked">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                {test.message}
              </span>
            ) : null}
            {test.status === "error" ? (
              <span className="inline-flex items-center gap-1.5 text-[12.5px] text-critical">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                {test.message}
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-cockpit-line pt-4">
          <button
            type="button"
            onClick={() => {
              onClear();
              setApiKey("");
              setTest({ status: "idle" });
            }}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-medium text-cockpit-muted transition hover:text-critical"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            {copy.clear}
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-cockpit-line px-3.5 py-2 text-[12.5px] font-medium text-cockpit-muted transition hover:bg-cockpit-elevated hover:text-cockpit-text"
            >
              {copy.cancel}
            </button>
            <button
              type="button"
              onClick={submit}
              className="rounded-lg bg-cobalt px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-cobalt-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-calm"
            >
              {copy.save}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
