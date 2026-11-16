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
import { useLocale } from "@/lib/LocaleProvider";
import { formatSimTime, makeId } from "@/lib/ids";
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
  const { c } = useLocale();
  const copy = c.cockpit;
  const total = scenario.totalSeconds;

  const [remaining, setRemaining] = useState(total);
  const [running, setRunning] = useState(false);
  const [introOpen, setIntroOpen] = useState(true);
  const [mode, setMode] = useState<"live" | "offline-mock" | "detecting">("detecting");
  const [mobilePane, setMobilePane] = useState<MobilePane>("chat");

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

  // 模式偵測
  useEffect(() => {
    let cancelled = false;
    fetch("/api/npc-chat")
      .then((res) => res.json())
      .then((data: { mode?: string }) => {
        if (cancelled) return;
        setMode(data.mode === "live" ? "live" : "offline-mock");
      })
      .catch(() => {
        if (!cancelled) setMode("offline-mock");
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
      setIntroOpen(false);
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
        })),
        telemetry,
        savedAt: Date.now(),
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [remaining, unlockedDocIds, messages, telemetry, scenario.id]);

  // ---------------------------------------------------------------------
  // 互動
  // ---------------------------------------------------------------------
  const selectNpc = useCallback((npcId: NpcId) => {
    setActiveNpc(npcId);
    setUnread((prev) => ({ ...prev, [npcId]: 0 }));
    setMobilePane("chat");
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

  const sendMessage = useCallback(
    async (text: string) => {
      const npcId = activeNpc;
      pushMessage({ npcId, sender: "user", content: text, timestamp: simTime(remaining) });
      setTelemetry((prev) => ({
        ...prev,
        totalMessagesSent: prev.totalMessagesSent + 1,
        contactedNpcs: uniq([...prev.contactedNpcs, npcId]),
      }));
      setTypingNpc(npcId);
      setMobilePane("chat");

      try {
        const res = await fetch("/api/npc-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            npcId,
            message: text,
            scenarioId: scenario.id,
            unlockedDocuments: unlockedDocIds,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          reply: string;
          mode: "live" | "offline-mock";
          unlockDocumentId?: string;
          questionedAuthority?: boolean;
        };

        setMode(data.mode === "live" ? "live" : "offline-mock");
        pushMessage({
          npcId,
          sender: "npc",
          content: data.reply,
          timestamp: simTime(remaining),
          attachedDocId: data.unlockDocumentId,
          isUrgent: npcId === "sarah",
        });
        if (data.unlockDocumentId) {
          unlockDoc(data.unlockDocumentId);
        }
        if (data.questionedAuthority) {
          setTelemetry((prev) => ({ ...prev, questionedAuthority: true }));
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
        });
        pushToast(copyRef.current.toasts.communicationsFailed, "warn");
      } finally {
        setTypingNpc(null);
      }
    },
    [activeNpc, pushMessage, pushToast, remaining, scenario.id, simTime, unlockDoc, unlockedDocIds],
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
    setRunning(true);
    setIntroOpen(false);
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
          return;
        }
        if (rationale.trim().length < 12) {
          setError(copyRef.current.validation.rationaleTooShort(12));
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

      {/* intro brief */}
      {introOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="animate-pop w-full max-w-xl overflow-hidden rounded-2xl border border-cockpit-line bg-cockpit-panel shadow-2xl">
            <div className="flex items-center gap-2 border-b border-cockpit-line bg-cockpit-elevated px-5 py-3">
              <Rocket className="h-4 w-4 text-calm" aria-hidden="true" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-calm">Mission Brief</span>
              <span className="ml-auto rounded bg-cockpit-base px-1.5 py-0.5 text-[9px] text-cockpit-muted">
                {copy.shell.introDuration(Math.round(total / 60), total)}
              </span>
            </div>
            <div className="max-h-[70dvh] overflow-y-auto scroll-thin px-5 py-4">
              <h1 className="text-[20px] font-bold leading-snug text-cockpit-text">
                {scenario.summary.title}
              </h1>
              <p className="mt-1 text-[12.5px] text-cockpit-muted">{scenario.studentRole}</p>
              <p className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-cockpit-text/85">
                {scenario.openingBrief}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {scenario.npcs.map((npc) => (
                  <div
                    key={npc.id}
                    className="flex items-center gap-2 rounded-lg border border-cockpit-line bg-cockpit-elevated/60 px-2.5 py-2"
                  >
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-bold"
                      style={{
                        backgroundColor: `${npc.avatarColor}1f`,
                        color: npc.avatarColor,
                        borderColor: `${npc.avatarColor}44`,
                      }}
                      aria-hidden="true"
                    >
                      {npc.name.slice(0, 1)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[12.5px] font-medium text-cockpit-text">{npc.name}</span>
                      <span className="block truncate text-[11px] text-cockpit-muted">{npc.role}</span>
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2 rounded-lg border border-warn/25 bg-warn/[0.07] px-3 py-2.5">
                <p className="flex items-start gap-1.5 text-[12.5px] leading-relaxed text-warn/90">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {copy.shell.introNoticeData}
                </p>
                <p className="flex items-start gap-1.5 text-[12.5px] leading-relaxed text-warn/90">
                  <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {copy.shell.introNoticeTimeout}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-cockpit-line bg-cockpit-base/60 px-5 py-3">
              <span className="hidden text-[9.5px] text-cockpit-muted sm:inline">
                {copy.shell.introDemoHint(1)}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIntroOpen(false);
                  setRunning(true);
                }}
                className="ml-auto flex items-center gap-1.5 rounded-lg bg-cobalt px-4 py-2 text-[12px] font-bold text-white transition hover:bg-cobalt-hover"
              >
                {copy.shell.enterCockpit}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* submitting overlay */}
      {submitting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-cockpit-base/90 backdrop-blur">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-cobalt/30 border-t-cobalt" />
          <p className="text-[12px] text-cockpit-text">{copy.shell.analyzing}</p>
          <p className="text-[10px] text-cockpit-muted">{copy.shell.analysisSplit(60, 40)}</p>
        </div>
      )}

      {/* toasts */}
      <div className="pointer-events-none fixed bottom-20 right-3 z-[60] flex w-[min(300px,86vw)] flex-col gap-1.5 lg:bottom-4 lg:right-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`animate-slide-in pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2 text-[11px] leading-snug shadow-xl ${
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
              className="shrink-0 text-cockpit-muted transition hover:text-cockpit-text"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
