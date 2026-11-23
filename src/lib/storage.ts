"use client";

import type { BehavioralTelemetry, EvaluationResult } from "@/types/simulation";

const NS = "nexussim";
const DRAFT_TTL_MS = 6 * 60 * 60 * 1000;

export interface StoredAttempt {
  scenarioId: string;
  candidateName: string;
  evaluation: EvaluationResult;
  telemetry: BehavioralTelemetry;
  completedAt: string;
}

export interface SimulationDraft {
  scenarioId: string;
  remainingSeconds: number;
  triggeredEventIds: string[];
  unlockedDocIds: string[];
  messages: {
    id: string;
    npcId: string;
    sender: "npc" | "user" | "system";
    content: string;
    timestamp: string;
    isUrgent?: boolean;
    attachedDocId?: string;
    /** 時間軸事件來源：還原草稿或切換語言時用來重新取得當前語系文本 */
    eventId?: string;
    /** 系統文案來源：同上 */
    systemKey?: "vpTimeout" | "vpReplied" | "sendFailed";
  }[];
  telemetry: BehavioralTelemetry;
  savedAt: number;
}

const canStore = () => typeof window !== "undefined" && !!window.localStorage;

function read<T>(key: string): T | null {
  if (!canStore()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  if (!canStore()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — 靜默失敗，不影響模擬 */
  }
}

export const attemptKey = (scenarioId: string) => `${NS}:attempt:${scenarioId}`;
export const draftKey = (scenarioId: string) => `${NS}:draft:${scenarioId}`;
const NAME_KEY = `${NS}:candidate-name`;

export function saveAttempt(attempt: StoredAttempt) {
  write(attemptKey(attempt.scenarioId), attempt);
}

export function loadAttempt(scenarioId: string): StoredAttempt | null {
  return read<StoredAttempt>(attemptKey(scenarioId));
}

export function clearAttempt(scenarioId: string) {
  if (!canStore()) return;
  try {
    window.localStorage.removeItem(attemptKey(scenarioId));
    window.localStorage.removeItem(draftKey(scenarioId));
  } catch {
    /* noop */
  }
}

export function saveDraft(draft: SimulationDraft) {
  write(draftKey(draft.scenarioId), { ...draft, savedAt: Date.now() });
}

export function loadDraft(scenarioId: string): SimulationDraft | null {
  const draft = read<SimulationDraft>(draftKey(scenarioId));
  if (!draft) return null;
  if (Date.now() - (draft.savedAt ?? 0) > DRAFT_TTL_MS) return null;
  return draft;
}

export function clearDraft(scenarioId: string) {
  if (!canStore()) return;
  try {
    window.localStorage.removeItem(draftKey(scenarioId));
  } catch {
    /* noop */
  }
}

export function loadCandidateName(): string {
  if (!canStore()) return "Alex Chen";
  try {
    return window.localStorage.getItem(NAME_KEY) || "Alex Chen";
  } catch {
    return "Alex Chen";
  }
}

export function saveCandidateName(name: string) {
  if (!canStore()) return;
  try {
    window.localStorage.setItem(NAME_KEY, name);
  } catch {
    /* noop */
  }
}

export function newTelemetry(): BehavioralTelemetry {
  return {
    unlockedRawLogs: false,
    viewedDocuments: [],
    questionedAuthority: false,
    consultedLegal: false,
    respondedToVpOnTime: null,
    totalMessagesSent: 0,
    timeSpentSeconds: 0,
    finalDecision: "approve_full",
    decisionRationale: "",
    contactedNpcs: [],
    rushedSubmission: false,
    conversation: [],
  };
}
