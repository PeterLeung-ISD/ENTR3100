"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  Info,
  Rocket,
  ShieldAlert,
  Users,
  X,
} from "lucide-react";
import TopControlBar from "@/components/cockpit/TopControlBar";
import MessengerPane from "@/components/cockpit/MessengerPane";
import DocumentPane from "@/components/cockpit/DocumentPane";
import DecisionPane, { type ActivityItem } from "@/components/cockpit/DecisionPane";
import UrgentPopupModal from "@/components/cockpit/UrgentPopupModal";
import ApiSettingsModal from "@/components/cockpit/ApiSettingsModal";
import PreSimGuideModal from "@/components/cockpit/PreSimGuideModal";
import RubricModal from "@/components/shared/RubricModal";
import { computeRuleDimensions } from "@/lib/evaluationEngine";
import { levelForScore } from "@/data/scoringRubric";
import { useLocale } from "@/lib/LocaleProvider";
import { formatSimTime, makeId } from "@/lib/ids";
import {
  DEFAULT_AI_CONFIG,
  aiHeaders,
  clearAiConfig,
  hasLocalAiKey,
  loadAiConfig,
  saveAiConfig,
  type AiConfig,
} from "@/lib/aiConfig";
import {
  clearDraft,
  loadCandidateName,
  loadDraft,
  newTelemetry,
  saveAttempt,
  saveDraft,
} from "@/lib/storage";
import type {
  BehavioralTelemetry,
  ChatMessage,
  EvaluationResult,
  FinalDecision,
  NpcChatHistoryEntry,
  NpcId,
  Scenario,
  TimelineEvent,
} from "@/types/simulation";

interface CockpitProps {
  scenario: Scenario;
}

interface Toast {
  id: string;
  text: string;
  tone: "info" | "success" | "warn";
}

interface ModalState {
  eventId: string;
  title: string;
  prompt: string;
  secondsLeft: number;
  totalSeconds: number;
}

type MobilePane = "chat" | "doc" | "decision";

const DOC_OWNERS: Record<string, NpcId> = {
  "doc-exec-deck": "marcus",
  "doc-raw-logs": "chloe",
  "doc-legal-memo": "david",
};

const uniq = <T,>(list: T[]): T[] => Array.from(new Set(list));

export default function Cockpit({ scenario }: CockpitProps) {
  const router = useRouter();
  const { c, locale } = useLocale();
  const copy = c.cockpit;
  const total = scenario.totalSeconds;

  const [remaining, setRemaining] = useState(total);
  const [running, setRunning] = useState(false);
  const [guideOpen, setGuideOpen] = useState(true);
  const [firstVisit, setFirstVisit] = useState(true);
  const [rubricOpen, setRubricOpen] = useState(false);
  const [mode, setMode] = useState<"live" | "offline-mock" | "detecting">("detecting");
  const [mobilePane, setMobilePane] = useState<MobilePane>("chat");
  const [aiConfig, setAiConfig] = useState<AiConfig>(() => ({ ...DEFAULT_AI_CONFIG }));
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const [serverHasKey, setServerHasKey] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeNpc, setActiveNpc] = useState<NpcId>("marcus");
  const [typingNpc, setTypingNpc] = useState<NpcId | null>(null);
  const [unread, setUnread] = useState<Record<string, number>>({});

  const [unlockedDocIds, setUnlockedDocIds] = useState<string[]>(
    scenario.documents.filter((doc) => !doc.isLocked).map((doc) => doc.id),
  );
  const [newDocIds, setNewDocIds] = useState<string[]>([]);
  const [activeDocId, setActiveDocId] = useState<string>(
    scenario.documents.find((doc) => !doc.isLocked)?.id ?? scenario.documents[0].id,
  );

  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [telemetry, setTelemetry] = useState<BehavioralTelemetry>(newTelemetry);

  const [decision, setDecision] = useState<FinalDecision | "">("");
  const [rationale, setRationale] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const firedRef = useRef<Set<string>>(new Set());
  const submittedRef = useRef(false);
  const hydratedRef = useRef(false);
  /** 開啟導覽／Rubric 前的計時器狀態，關閉後據此恢復 */
  const wasRunningRef = useRef(false);
  // 事件／toast 回呼保持穩定 identity，但永遠取用目前語言的文案。
  const copyRef = useRef(copy);

  useEffect(() => {
    copyRef.current = copy;
  }, [copy]);

  const npcName = useCallback(
    (id?: NpcId) => scenario.npcs.find((npc) => npc.id === id)?.name ?? "",
    [scenario.npcs],
  );

  const pushToast = useCallback((text: string, tone: Toast["tone"] = "info") => {
    const id = makeId("toast");
    setToasts((prev) => [...prev.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 4200);
  }, []);

  const simTime = useCallback((atRemaining: number) => formatSimTime(total - atRemaining), [total]);

  const pushMessage = useCallback((message: Omit<ChatMessage, "id">) => {
    setMessages((prev) => [...prev, { ...message, id: makeId("msg") }]);
  }, []);

  const unlockDoc = useCallback(
    (docId: string, opts?: { silent?: boolean }) => {
      setUnlockedDocIds((prev) => {
        if (prev.includes(docId)) return prev;
        return [...prev, docId];
      });
      setNewDocIds((prev) => (prev.includes(docId) ? prev : [...prev, docId]));
      if (docId === "doc-raw-logs") {
        setTelemetry((prev) => (prev.unlockedRawLogs ? prev : { ...prev, unlockedRawLogs: true }));
      }
      if (!opts?.silent) {
        const doc = scenario.documents.find((item) => item.id === docId);
        pushToast(copyRef.current.toasts.docUnlocked(doc?.title ?? docId), "success");
      }
    },
    [pushToast, scenario.documents],
  );

  // ---------------------------------------------------------------------
  // 時間軸事件引擎
  // ---------------------------------------------------------------------
  const fireEvent = useCallback(
    (event: TimelineEvent) => {
      firedRef.current.add(event.id);
      setActivity((prev) => [
        ...prev,
        { id: event.id, label: event.label, type: event.type, time: simTime(event.triggerAtSecondsRemaining) },
      ]);

      if (event.type === "urgent_modal") {
        setModal({
          eventId: event.id,
          title: event.payload.modalTitle ?? copyRef.current.urgent.defaultTitle,
          prompt: event.payload.modalPrompt ?? "",
          secondsLeft: event.payload.modalTimeoutSeconds ?? 45,
          totalSeconds: event.payload.modalTimeoutSeconds ?? 45,
        });
      }

      if (event.payload.docId) {
        unlockDoc(event.payload.docId, { silent: event.type === "unlock_doc" });
      }

      if (event.payload.message) {
        const npcId = event.npcId ?? "marcus";
        pushMessage({
          npcId,
          sender: "npc",
          content: event.payload.message,
          timestamp: simTime(event.triggerAtSecondsRemaining),
          isUrgent: event.type === "urgent_modal" || event.type === "system",
          attachedDocId: event.payload.docId,
          eventId: event.id,
        });
        if ((event.type === "message" || event.type === "unlock_doc") && npcId !== activeNpc) {
          setUnread((prev) => ({ ...prev, [npcId]: (prev[npcId] ?? 0) + 1 }));
        }
      }

      if (event.type === "unlock_doc" && event.payload.docId) {
        const doc = scenario.documents.find((item) => item.id === event.payload.docId);
        pushToast(
          copyRef.current.toasts.npcUnlockedDoc(
            npcName(event.npcId),
            doc?.title ?? copyRef.current.documents.documentFallback,
          ),
          "success",
        );
      }
    },
    [activeNpc, npcName, pushMessage, pushToast, scenario.documents, simTime, unlockDoc],
  );

  useEffect(() => {
    if (!running && remaining !== 0) return;
    const due = scenario.timeline
      .filter((event) => !firedRef.current.has(event.id) && remaining <= event.triggerAtSecondsRemaining)
      .sort((a, b) => b.triggerAtSecondsRemaining - a.triggerAtSecondsRemaining);
    due.forEach(fireEvent);
  }, [remaining, running, scenario.timeline, fireEvent]);

  // 倒數
  useEffect(() => {
    if (!running || remaining <= 0) return;
    const timer = window.setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running, remaining]);

  // VP 彈窗倒數
  useEffect(() => {
    if (!modal) return;
    if (modal.secondsLeft <= 0) {
      setTelemetry((prev) => ({ ...prev, respondedToVpOnTime: false }));
      setModal(null);
      pushToast(copyRef.current.toasts.vpTimeout(45), "warn");
      pushMessage({
        npcId: "sarah",
        sender: "system",
        content: copyRef.current.messages.vpTimeoutOffline,
        timestamp: simTime(remaining),
        systemKey: "vpTimeout",
      });
      return;
    }
    const timer = window.setTimeout(
      () => setModal((prev) => (prev ? { ...prev, secondsLeft: prev.secondsLeft - 1 } : prev)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [modal, pushMessage, pushToast, remaining, simTime]);

  // 點閱文件 → 記錄
  useEffect(() => {
    if (!unlockedDocIds.includes(activeDocId)) return;
    setTelemetry((prev) =>
      prev.viewedDocuments.includes(activeDocId)
        ? prev
        : { ...prev, viewedDocuments: [...prev.viewedDocuments, activeDocId] },
    );
  }, [activeDocId, unlockedDocIds]);

  // 模式偵測：本機金鑰優先，其次伺服器環境變數
  useEffect(() => {
    let cancelled = false;
    const local = loadAiConfig();
    setAiConfig(local);
    fetch("/api/npc-chat")
      .then((res) => res.json())
      .then((data: { mode?: string; hasServerKey?: boolean }) => {
        if (cancelled) return;
        setServerHasKey(Boolean(data.hasServerKey));
        setMode(hasLocalAiKey(local) || data.mode === "live" ? "live" : "offline-mock");
      })
      .catch(() => {
        if (cancelled) setMode(hasLocalAiKey(local) ? "live" : "offline-mock");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 還原草稿
  useEffect(() => {
    const draft = loadDraft(scenario.id);
    if (draft) {
      setMessages(
        draft.messages.map((message) => ({
          ...message,
          npcId: message.npcId as NpcId,
        })),
      );
      setUnlockedDocIds(draft.unlockedDocIds);
      setRemaining(draft.remainingSeconds);
      setTelemetry(draft.telemetry);
      draft.triggeredEventIds.forEach((id) => firedRef.current.add(id));
      setActivity(
        scenario.timeline
          .filter((event) => draft.triggeredEventIds.includes(event.id))
          .map((event) => ({
            id: event.id,
            label: event.label,
            type: event.type,
            time: simTime(event.triggerAtSecondsRemaining),
          })),
      );
      setGuideOpen(false);
      setFirstVisit(false);
      setRunning(true);
      pushToast(copyRef.current.toasts.draftRestored, "info");
    }
    hydratedRef.current = true;
  }, [pushToast, scenario.id, scenario.timeline, simTime]);

  // 自動存檔
  useEffect(() => {
    if (!hydratedRef.current || submittedRef.current) return;
    const timer = window.setTimeout(() => {
      saveDraft({
        scenarioId: scenario.id,
        remainingSeconds: remaining,
        triggeredEventIds: Array.from(firedRef.current),
        unlockedDocIds,
        messages: messages.map((message) => ({
          id: message.id,
          npcId: message.npcId,
          sender: message.sender,
          content: message.content,
          timestamp: message.timestamp,
          isUrgent: message.isUrgent,
          attachedDocId: message.attachedDocId,
          eventId: message.eventId,
          systemKey: message.systemKey,
        })),
        telemetry,
        savedAt: Date.now(),
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [remaining, unlockedDocIds, messages, telemetry, scenario.id]);

  /**
   * 切換語言時，把「系統自動產生」的內容重新套用當前語言：
   * - 時間軸事件訊息（eventId）→ 用當前語系的 scenario.timeline 文本
   * - 系統提示訊息（systemKey）→ 用當前語系的 copy
   * - 動態事件列（activity）→ 用當前語系的 timeline label
   * - VP 緊急彈窗（modal）→ 用當前語系的 modalTitle / modalPrompt
   * 學生輸入與 AI 回覆屬於對話歷史，保留原語言（翻譯對話會誤導）。
   */
  useEffect(() => {
    const bubbleText = (message: ChatMessage): string | undefined => {
      if (message.eventId) {
        return scenario.timeline.find((event) => event.id === message.eventId)?.payload.message;
      }
      if (message.systemKey === "vpTimeout") return copy.messages.vpTimeoutOffline;
      if (message.systemKey === "vpReplied") return copy.messages.vpRepliedOffline;
      if (message.systemKey === "sendFailed") return copy.messages.sendFailed;
      return undefined;
    };

    setMessages((prev) => {
      let changed = false;
      const next = prev.map((message) => {
        const text = bubbleText(message);
        if (!text || text === message.content) return message;
        changed = true;
        return { ...message, content: text };
      });
      return changed ? next : prev;
    });

    setActivity((prev) => {
      let changed = false;
      const next = prev.map((item) => {
        const label = scenario.timeline.find((event) => event.id === item.id)?.label;
        if (!label || label === item.label) return item;
        changed = true;
        return { ...item, label };
      });
      return changed ? next : prev;
    });

    // VP 緊急彈窗若正在顯示，同樣換語言（倒數不受影響）。
    setModal((prev) => {
      if (!prev) return prev;
      const event = scenario.timeline.find((item) => item.id === prev.eventId);
      if (!event) return prev;
      const title = event.payload.modalTitle ?? copy.urgent.defaultTitle;
      const prompt = event.payload.modalPrompt ?? "";
      if (title === prev.title && prompt === prev.prompt) return prev;
      return { ...prev, title, prompt };
    });
    // copy 為模組層級常數，locale 改變即代表語系切換。
  }, [copy, locale, scenario.timeline]);

  // ---------------------------------------------------------------------
  // 互動
  // ---------------------------------------------------------------------
  const selectNpc = useCallback((npcId: NpcId) => {
    setActiveNpc(npcId);
    setUnread((prev) => ({ ...prev, [npcId]: 0 }));
    setMobilePane("chat");
  }, []);

  // AI 設定：儲存 / 清除本機金鑰
  const handleAiSave = useCallback(
    (next: AiConfig) => {
      const saved = saveAiConfig(next);
      setAiConfig(saved);
      setAiSettingsOpen(false);
      setMode(hasLocalAiKey(saved) || serverHasKey ? "live" : "offline-mock");
      pushToast(copyRef.current.apiSettings.saved, "success");
    },
    [pushToast, serverHasKey],
  );

  const handleAiClear = useCallback(() => {
    const cleared = clearAiConfig();
    setAiConfig(cleared);
    setMode(serverHasKey ? "live" : "offline-mock");
    pushToast(copyRef.current.apiSettings.cleared, "info");
  }, [pushToast, serverHasKey]);

  // 行前導覽：開啟時暫停倒數，關閉後若原本在跑就恢復
  const openGuide = useCallback(() => {
    wasRunningRef.current = running;
    setRunning(false);
    setGuideOpen(true);
  }, [running]);

  const closeGuide = useCallback((startNow = false) => {
    setGuideOpen(false);
    if (startNow || wasRunningRef.current) setRunning(true);
  }, []);

  const openRubric = useCallback(() => {
    wasRunningRef.current = running;
    setRunning(false);
    setRubricOpen(true);
  }, [running]);

  const closeRubric = useCallback(() => {
    setRubricOpen(false);
    if (wasRunningRef.current) setRunning(true);
    wasRunningRef.current = false;
  }, []);

  const openDoc = useCallback((docId: string) => {
    setActiveDocId(docId);
    setNewDocIds((prev) => prev.filter((id) => id !== docId));
    setMobilePane("doc");
  }, []);

  const askOwner = useCallback(
    (npcId: NpcId) => {
      selectNpc(npcId);
      pushToast(copyRef.current.toasts.switchedChannel(npcName(npcId)), "info");
    },
    [npcName, pushToast, selectNpc],
  );

  // 送出訊息：帶上多輪對話歷史、戰情狀態與（可選）瀏覽器端 API Key
  const sendMessage = useCallback(
    async (text: string) => {
      const npcId = activeNpc;
      pushMessage({ npcId, sender: "user", content: text, timestamp: simTime(remaining) });
      setTelemetry((prev) => ({
        ...prev,
        totalMessagesSent: prev.totalMessagesSent + 1,
        contactedNpcs: uniq([...prev.contactedNpcs, npcId]),
        consultedLegal: prev.consultedLegal || npcId === "david",
      }));
      setTypingNpc(npcId);
      setMobilePane("chat");

      // 該頻道的多輪歷史（不含系統提示與即將送出的這一句）
      const chatHistory: NpcChatHistoryEntry[] = messages
        .filter((message) => message.npcId === npcId && message.sender !== "system")
        .slice(-10)
        .map((message) => ({
          sender: message.sender === "user" ? "user" : "npc",
          content: message.content,
          timestamp: message.timestamp,
        }));

      // 壓力值快照（與右欄顯示的公式一致）
      const elapsed = total - remaining;
      const fired = new Set(activity.map((item) => item.id));
      const deltaSum = scenario.timeline.reduce(
        (acc, event) => acc + (fired.has(event.id) ? (event.payload.pressureDelta ?? 0) : 0),
        0,
      );
      const pressureLevel = Math.min(100, 12 + (elapsed / total) * 35 + deltaSum * 0.7);

      try {
        const res = await fetch("/api/npc-chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...aiHeaders(loadAiConfig()),
          },
          body: JSON.stringify({
            npcId,
            userMessage: text,
            chatHistory,
            simulationContext: {
              remainingSeconds: remaining,
              unlockedDocIds,
              pressureLevel: Math.round(pressureLevel),
            },
            scenarioId: scenario.id,
            locale,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          reply: string;
          mode?: "live" | "offline-mock";
          isLiveAi?: boolean;
          unlockDocumentId?: string | null;
          questionedAuthority?: boolean;
          warningNotice?: string;
        };
        const live = data.isLiveAi ?? data.mode === "live";
        setMode(live ? "live" : "offline-mock");

        pushMessage({
          npcId,
          sender: "npc",
          content: data.reply,
          timestamp: simTime(remaining),
          attachedDocId: data.unlockDocumentId ?? undefined,
          isUrgent: npcId === "sarah",
        });
        if (data.unlockDocumentId) {
          unlockDoc(data.unlockDocumentId);
        }
        if (data.questionedAuthority) {
          setTelemetry((prev) => ({ ...prev, questionedAuthority: true }));
        }
        if (data.warningNotice) {
          pushToast(data.warningNotice, "warn");
        }
        if (npcId !== activeNpc) {
          setUnread((prev) => ({ ...prev, [npcId]: (prev[npcId] ?? 0) + 1 }));
        }
      } catch {
        pushMessage({
          npcId,
          sender: "npc",
          content: copyRef.current.messages.sendFailed,
          timestamp: simTime(remaining),
          systemKey: "sendFailed",
        });
        pushToast(copyRef.current.toasts.communicationsFailed, "warn");
      } finally {
        setTypingNpc(null);
      }
    },
    [
      activeNpc,
      activity,
      locale,
      messages,
      pushMessage,
      pushToast,
      remaining,
      scenario.id,
      scenario.timeline,
      simTime,
      total,
      unlockDoc,
      unlockedDocIds,
    ],
  );

  const replyToVp = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      setModal(null);
      setTelemetry((prev) => ({
        ...prev,
        respondedToVpOnTime: true,
        vpResponseText: trimmed || copyRef.current.messages.vpEmptyResponse,
        totalMessagesSent: prev.totalMessagesSent + 1,
        contactedNpcs: uniq([...prev.contactedNpcs, "sarah" as NpcId]),
      }));
      pushMessage({
        npcId: "sarah",
        sender: "user",
        content: trimmed || copyRef.current.messages.vpFallbackReply,
        timestamp: simTime(remaining),
        isUrgent: true,
      });
      pushMessage({
        npcId: "sarah",
        sender: "system",
        content: copyRef.current.messages.vpRepliedOffline,
        timestamp: simTime(remaining),
        systemKey: "vpReplied",
      });
      pushToast(copyRef.current.toasts.repliedToVp, "success");
      setRunning(true);
    },
    [pushMessage, pushToast, remaining, simTime],
  );

  const skipMinute = useCallback(() => {
    setRemaining((prev) => Math.max(0, prev - 60));
    pushToast(copyRef.current.toasts.skippedSeconds(60), "info");
  }, [pushToast]);

  const nextEvent = useCallback(() => {
    const pending = scenario.timeline
      .filter((event) => !firedRef.current.has(event.id) && event.triggerAtSecondsRemaining < remaining)
      .sort((a, b) => b.triggerAtSecondsRemaining - a.triggerAtSecondsRemaining)[0];
    if (!pending) {
      pushToast(copyRef.current.toasts.noPendingEvents, "info");
      return;
    }
    setRemaining(pending.triggerAtSecondsRemaining);
    pushToast(copyRef.current.toasts.jumpedTo(pending.label), "info");
  }, [pushToast, remaining, scenario.timeline]);

  const restart = useCallback(() => {
    if (!window.confirm(copyRef.current.restart.confirm)) return;
    firedRef.current.clear();
    submittedRef.current = false;
    clearDraft(scenario.id);
    setRemaining(total);
    setRunning(false);
    setGuideOpen(true);
    setFirstVisit(false);
    setMessages([]);
    setActivity([]);
    setUnread({});
    setUnlockedDocIds(scenario.documents.filter((doc) => !doc.isLocked).map((doc) => doc.id));
    setNewDocIds([]);
    setActiveDocId(scenario.documents.find((doc) => !doc.isLocked)?.id ?? scenario.documents[0].id);
    setTelemetry(newTelemetry());
    setDecision("");
    setRationale("");
    setError(null);
    setModal(null);
    setActiveNpc("marcus");
    pushToast(copyRef.current.toasts.reset, "info");
  }, [pushToast, scenario.documents, scenario.id, total]);

  const submitDecision = useCallback(
    async (auto = false) => {
      if (submittedRef.current || submitting) return;

      if (!auto) {
        if (!decision) {
          setError(copyRef.current.validation.decisionRequired);
          pushToast(copyRef.current.validation.decisionRequired, "warn");
          return;
        }
        if (rationale.trim().length < 12) {
          setError(copyRef.current.validation.rationaleTooShort(12));
          pushToast(copyRef.current.validation.rationaleTooShort(12), "warn");
          return;
        }
      }

      submittedRef.current = true;
      setSubmitting(true);
      setError(null);
      if (modal) setModal(null);
      setRunning(false);

      const elapsedSeconds = total - remaining;
      const finalDecision: FinalDecision = auto ? "approve_full" : (decision as FinalDecision);
      const finalRationale = auto
        ? copyRef.current.validation.autoRationale
        : rationale.trim();

      const payload: BehavioralTelemetry = {
        ...telemetry,
        finalDecision,
        decisionRationale: finalRationale,
        timeSpentSeconds: elapsedSeconds,
        rushedSubmission: !auto && elapsedSeconds < 150 && !telemetry.unlockedRawLogs,
        conversation: messages
          .filter((message) => message.sender !== "system")
          .map((message) => ({
            npcId: message.npcId,
            sender: message.sender as "npc" | "user",
            content: message.content,
          })),
      };

      try {
        const res = await fetch("/api/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scenarioId: scenario.id,
            candidateName: loadCandidateName(),
            locale,
            telemetry: payload,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const evaluation = (await res.json()) as EvaluationResult;
        saveAttempt({
          scenarioId: scenario.id,
          candidateName: evaluation.candidateName,
          evaluation,
          telemetry: payload,
          completedAt: new Date().toISOString(),
        });
        clearDraft(scenario.id);
        router.push(`/report/${scenario.id}`);
      } catch {
        submittedRef.current = false;
        setSubmitting(false);
        setRunning(true);
        setError(copyRef.current.validation.submitFailed);
        pushToast(copyRef.current.toasts.submitFailed, "warn");
      }
    },
    [
      decision,
      locale,
      messages,
      modal,
      pushToast,
      rationale,
      remaining,
      router,
      scenario.id,
      submitting,
      telemetry,
      total,
    ],
  );

  // 時間歸零 → 自動放行
  useEffect(() => {
    if (remaining === 0 && !submittedRef.current) {
      void submitDecision(true);
    }
  }, [remaining, submitDecision]);

  const pressure = useMemo(() => {
    const elapsed = total - remaining;
    const fired = new Set(activity.map((item) => item.id));
    const deltaSum = scenario.timeline.reduce(
      (acc, event) => acc + (fired.has(event.id) ? (event.payload.pressureDelta ?? 0) : 0),
      0,
    );
    return Math.min(100, 12 + (elapsed / total) * 35 + deltaSum * 0.7);
  }, [activity, remaining, scenario.timeline, total]);

  const ownerNames = useMemo(() => {
    const map: Record<string, string> = {};
    scenario.documents.forEach((doc) => {
      const owner = DOC_OWNERS[doc.id];
      const npc = scenario.npcs.find((item) => item.id === owner);
      map[doc.id] = npc ? `${npc.name} · ${npc.role}` : copy.documents.unknownOwner;
    });
    return map;
  }, [copy.documents.unknownOwner, scenario.documents, scenario.npcs]);

  // Rubric 視窗內即時顯示「你目前在此」：以當前行為埋點推算的暫定等級
  const provisionalLevels = useMemo(() => {
    const dims = computeRuleDimensions(telemetry, locale).dimensions;
    return {
      criticalVerification: levelForScore(dims.criticalVerification),
      crossReferencing: levelForScore(dims.crossReferencing),
      pressureResilience: levelForScore(dims.pressureResilience),
      upwardCommunication: levelForScore(dims.upwardCommunication),
    };
  }, [telemetry, locale]);

  const readableCount = telemetry.viewedDocuments.length;
  const unreadTotal = useMemo(
    () => Object.values(unread).reduce((sum, count) => sum + count, 0),
    [unread],
  );

  const mobileTabs = [
    { key: "chat", label: copy.shell.mobileChat, icon: Users, badge: unreadTotal, badgeAria: copy.shell.mobileChatBadge(unreadTotal) },
    { key: "doc", label: copy.shell.mobileDocs, icon: FileText, badge: unlockedDocIds.length, badgeAria: copy.shell.mobileDocsBadge(unlockedDocIds.length) },
    { key: "decision", label: copy.shell.mobileDecision, icon: ShieldAlert, badge: 0, badgeAria: "" },
  ] as const;

  return (
    <div className="surface-cockpit flex h-dvh flex-col overflow-hidden bg-cockpit-base text-cockpit-text">
      <TopControlBar
        scenarioTitle={scenario.summary.title}
        roleLabel={scenario.studentRole}
        remaining={remaining}
        total={total}
        pressure={pressure}
        running={running}
        mode={mode}
        onToggleRun={() => setRunning((prev) => !prev)}
        onSkipMinute={skipMinute}
        onNextEvent={nextEvent}
        onRestart={restart}
        onOpenApiSettings={() => setAiSettingsOpen(true)}
        onOpenGuide={openGuide}
        onOpenRubric={openRubric}
      />

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-2.5 p-2.5 pb-16 lg:grid-cols-[310px_minmax(0,1fr)_360px] lg:gap-3 lg:pb-3 xl:grid-cols-[350px_minmax(0,1fr)_410px]">
        <div className={`${mobilePane === "chat" ? "flex" : "hidden"} scroll-thin min-h-0 min-w-0 overflow-y-auto lg:flex`}>
          <MessengerPane
            npcs={scenario.npcs}
            activeNpc={activeNpc}
            messages={messages}
            unread={unread}
            typing={typingNpc === activeNpc}
            documents={scenario.documents}
            unlockedDocIds={unlockedDocIds}
            onSelectNpc={selectNpc}
            onSend={sendMessage}
            onOpenDoc={openDoc}
          />
        </div>
        <div className={`${mobilePane === "doc" ? "flex" : "hidden"} scroll-thin min-h-0 min-w-0 overflow-y-auto lg:flex`}>
          <DocumentPane
            documents={scenario.documents}
            unlockedDocIds={unlockedDocIds}
            newDocIds={newDocIds}
            activeDocId={activeDocId}
            docOwners={DOC_OWNERS}
            ownerNames={ownerNames}
            onSelectDoc={(docId) => {
              setActiveDocId(docId);
              setNewDocIds((prev) => prev.filter((id) => id !== docId));
            }}
            onAskOwner={askOwner}
          />
        </div>
        <div className={`${mobilePane === "decision" ? "flex" : "hidden"} scroll-thin min-h-0 min-w-0 overflow-y-auto lg:flex`}>
          <DecisionPane
            decisionOptions={scenario.decisionOptions}
            activity={activity}
            pressure={pressure}
            stats={{
              unlockedDocs: unlockedDocIds.length,
              totalDocs: scenario.documents.length,
              messages: telemetry.totalMessagesSent,
              readDocs: readableCount,
            }}
            decision={decision}
            onDecisionChange={(value) => {
              setDecision(value);
              setError(null);
            }}
            rationale={rationale}
            onRationaleChange={setRationale}
            onSubmit={() => void submitDecision(false)}
            onInvalid={() => void submitDecision(false)}
            submitting={submitting}
            error={error}
            remaining={remaining}
          />
        </div>
      </main>

      {/* mobile bottom tab bar */}
      <nav
        aria-label={copy.shell.mobileNavAria}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-cockpit-line bg-cockpit-panel lg:hidden"
      >
        <div className="flex h-14 items-stretch px-1">
          {mobileTabs.map((tab) => {
            const Icon = tab.icon;
            const active = mobilePane === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setMobilePane(tab.key)}
                aria-current={active ? "page" : undefined}
                aria-label={tab.badge > 0 ? tab.badgeAria : tab.label}
                className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-md text-[11.5px] font-medium transition ${
                  active ? "text-calm" : "text-cockpit-muted hover:text-cockpit-text"
                }`}
              >
                {active && (
                  <span
                    className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-calm"
                    aria-hidden="true"
                  />
                )}
                <span className="relative">
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  {tab.badge > 0 && (
                    <span className="tabular-telemetry absolute -right-3 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-critical-deep px-1 text-[8px] font-bold leading-none text-white">
                      {tab.badge > 99 ? "99+" : tab.badge}
                    </span>
                  )}
                </span>
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <ApiSettingsModal
        open={aiSettingsOpen}
        config={aiConfig}
        serverHasKey={serverHasKey}
        onClose={() => setAiSettingsOpen(false)}
        onSave={handleAiSave}
        onClear={handleAiClear}
      />

      <UrgentPopupModal
        open={Boolean(modal)}
        title={modal?.title ?? ""}
        prompt={modal?.prompt ?? ""}
        senderName="Sarah Lin"
        senderRole={copy.urgent.senderRole}
        secondsLeft={modal?.secondsLeft ?? 0}
        totalSeconds={modal?.totalSeconds ?? 45}
        onSubmit={replyToVp}
        onDismiss={() => {
          setModal(null);
          setTelemetry((prev) => ({ ...prev, respondedToVpOnTime: false }));
          pushToast(copy.toasts.vpSkipped, "warn");
          setRunning(true);
        }}
      />

      {/* 行前分步導覽：開啟時倒數暫停 */}
      <PreSimGuideModal
        open={guideOpen}
        firstVisit={firstVisit}
        briefing={scenario.openingBrief}
        roster={scenario.npcs.map((npc) => ({
          name: npc.name,
          role: npc.role,
          color: npc.avatarColor,
        }))}
        onStart={() => closeGuide(true)}
        onSkip={() => closeGuide(true)}
        onOpenRubric={() => setRubricOpen(true)}
        onClose={() => closeGuide(false)}
      />

      {/* 透明評分標準：模擬前中後隨時查閱 */}
      <RubricModal
        open={rubricOpen}
        onClose={closeRubric}
        levels={provisionalLevels}
        tone="dark"
      />

      {/* submitting overlay */}
      {submitting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-cockpit-base/90 backdrop-blur">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-cobalt/30 border-t-cobalt" />
          <p className="text-[12px] text-cockpit-text">{copy.shell.analyzing}</p>
          <p className="text-[10px] text-cockpit-muted">{copy.shell.analysisSplit(60, 40)}</p>
        </div>
      )}

      {/* toasts：固定於頂部工具列下方，且滑鼠事件穿透，避免遮擋簽核按鈕等互動元件 */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-3 top-16 z-[60] flex w-[min(300px,86vw)] flex-col gap-1.5 lg:right-4 lg:top-[4.25rem]"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`animate-slide-in pointer-events-none flex items-start gap-2 rounded-lg border px-3 py-2 text-[11px] leading-snug shadow-xl ${
              toast.tone === "success"
                ? "border-unlocked/35 bg-cockpit-elevated text-unlocked"
                : toast.tone === "warn"
                  ? "border-warn/35 bg-cockpit-elevated text-warn"
                  : "border-cockpit-line bg-cockpit-elevated text-cockpit-text"
            }`}
          >
            {toast.tone === "success" ? (
              <CheckCircle2 className="mt-px h-3 w-3 shrink-0" aria-hidden="true" />
            ) : toast.tone === "warn" ? (
              <AlertTriangle className="mt-px h-3 w-3 shrink-0" aria-hidden="true" />
            ) : (
              <Info className="mt-px h-3 w-3 shrink-0" aria-hidden="true" />
            )}
            <span className="flex-1">{toast.text}</span>
            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== toast.id))}
              aria-label={copy.shell.dismissToast}
              className="pointer-events-auto shrink-0 text-cockpit-muted transition hover:text-cockpit-text"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
