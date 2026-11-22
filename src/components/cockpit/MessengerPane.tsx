"use client";

import { useEffect, useRef, useState } from "react";
import {
  BellRing,
  ChevronRight,
  CornerDownLeft,
  FileLock2,
  MessageSquare,
  Send,
  ShieldAlert,
} from "lucide-react";
import { useLocale } from "@/lib/LocaleProvider";
import type { ChatMessage, NpcId, NpcProfile, WorkDocument } from "@/types/simulation";

interface MessengerPaneProps {
  npcs: NpcProfile[];
  activeNpc: NpcId;
  messages: ChatMessage[];
  unread: Record<string, number>;
  typing: boolean;
  documents: WorkDocument[];
  unlockedDocIds: string[];
  onSelectNpc: (npcId: NpcId) => void;
  onSend: (text: string) => void;
  onOpenDoc: (docId: string) => void;
}

function avatarTone(color: string) {
  return { backgroundColor: `${color}1f`, color, borderColor: `${color}44` };
}

export default function MessengerPane({
  npcs,
  activeNpc,
  messages,
  unread,
  typing,
  documents,
  unlockedDocIds,
  onSelectNpc,
  onSend,
  onOpenDoc,
}: MessengerPaneProps) {
  const { c } = useLocale();
  const copy = c.cockpit.messenger;
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeProfile = npcs.find((npc) => npc.id === activeNpc) ?? npcs[0];
  const threads = messages.filter((m) => m.npcId === activeNpc);
  const suggestions = copy.suggestions[activeNpc] ?? [];

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [threads.length, typing, activeNpc]);

  const docTitle = (docId?: string) =>
    documents.find((doc) => doc.id === docId)?.title ?? copy.attachmentFallback;

  // 跨頻道提示：另一個頻道有未讀訊息（含剛解鎖的文件）時，在對話串上方顯示通知條。
  const crossChannel = ((): { npcId: NpcId; text: string } | null => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const message = messages[i];
      if (message.npcId === activeNpc) continue;
      if ((unread[message.npcId] ?? 0) === 0) continue;
      const profile = npcs.find((npc) => npc.id === message.npcId);
      if (!profile) continue;
      return {
        npcId: message.npcId,
        text: message.attachedDocId
          ? copy.notifyDoc(profile.name, docTitle(message.attachedDocId))
          : copy.notifyMessage(profile.name),
      };
    }
    return null;
  })();

  const submit = () => {
    const text = draft.trim();
    if (!text || typing) return;
    onSend(text);
    setDraft("");
    textareaRef.current?.focus();
  };

  const useSuggestion = (text: string) => {
    setDraft(text);
    textareaRef.current?.focus();
  };

  return (
    <section className="flex w-full min-h-0 min-w-0 flex-col overflow-hidden border border-cockpit-line bg-cockpit-panel lg:rounded-lg">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-cockpit-line px-3.5">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-calm" aria-hidden="true" />
          <h2 className="text-[12px] font-semibold uppercase tracking-widest text-cockpit-text">
            {copy.header}
          </h2>
        </div>
        <span className="rounded border border-cockpit-line bg-cockpit-elevated px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-cockpit-muted">
          Teams
        </span>
      </div>

      {/* channels */}
      <div className="scroll-thin flex shrink-0 gap-1.5 overflow-x-auto border-b border-cockpit-line p-2 sm:flex-col sm:gap-1.5 sm:overflow-visible">
        {npcs.map((npc) => {
          const isActive = npc.id === activeNpc;
          const count = unread[npc.id] ?? 0;
          return (
            <button
              key={npc.id}
              type="button"
              onClick={() => onSelectNpc(npc.id)}
              aria-current={isActive ? "true" : undefined}
              aria-label={`${npc.name} · ${npc.role} · ${copy.online}${count > 0 ? ` · ${copy.unreadAria(count)}` : ""}`}
              className={`group flex min-w-[190px] shrink-0 items-center gap-2.5 rounded-lg border px-2.5 py-2.5 text-left transition sm:min-w-0 sm:py-2 ${
                isActive
                  ? "border-calm/30 bg-cockpit-elevated"
                  : "border-transparent hover:bg-cockpit-elevated/60"
              }`}
            >
              <span className="relative shrink-0">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full border text-[12px] font-bold"
                  style={avatarTone(npc.avatarColor)}
                  aria-hidden="true"
                >
                  {npc.name.slice(0, 1)}
                </span>
                <span
                  className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-cockpit-panel bg-unlocked"
                  aria-hidden="true"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`truncate text-[13px] font-semibold ${
                      isActive ? "text-white" : "text-cockpit-text/90"
                    }`}
                  >
                    {npc.name}
                  </span>
                  {count > 0 && (
                    <span className="tabular-telemetry ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-critical-deep px-1 text-[10.5px] font-bold text-white">
                      {count}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-[11.5px] text-cockpit-muted">{npc.role}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* active thread header */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-cockpit-line px-3.5 py-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full bg-unlocked" aria-hidden="true" />
            <span className="truncate text-[14px] font-semibold text-white">{activeProfile.name}</span>
            <span className="shrink-0 text-[10.5px] text-cockpit-muted">{copy.online}</span>
          </div>
          <div className="mt-0.5 truncate text-[11.5px] text-cockpit-muted">
            {activeProfile.role} · {activeProfile.statusText}
          </div>
        </div>
        <span className="shrink-0 rounded border border-cockpit-line bg-cockpit-elevated px-2 py-0.5 text-[10.5px] text-cockpit-muted">
          {activeProfile.department}
        </span>
      </div>

      {/* cross-channel notification */}
      {crossChannel && (
        <button
          type="button"
          onClick={() => onSelectNpc(crossChannel.npcId)}
          className="flex w-full shrink-0 items-center gap-2 border-b border-calm/25 bg-calm/10 px-3.5 py-2.5 text-left transition hover:bg-calm/15"
        >
          <BellRing className="h-4 w-4 shrink-0 text-calm" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-calm">
            {crossChannel.text}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-calm" aria-hidden="true" />
        </button>
      )}

      {/* messages */}
      <div ref={scrollRef} className="scroll-thin min-h-0 flex-1 space-y-3.5 overflow-y-auto px-3.5 py-3.5">
        {threads.length === 0 && (
          <div className="rounded-lg border border-dashed border-cockpit-line bg-cockpit-elevated/40 p-3.5 text-[13.5px] leading-relaxed text-cockpit-muted">
            {copy.emptyThread(activeProfile.name)}
          </div>
        )}

        {threads.map((msg) => {
          if (msg.sender === "system") {
            return (
              <div key={msg.id} className="flex items-center gap-2 text-[11.5px] text-cockpit-muted">
                <span className="h-px flex-1 bg-cockpit-line" aria-hidden="true" />
                <span className="flex items-center gap-1 rounded bg-cockpit-elevated px-2 py-1">
                  <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                  {msg.content}
                </span>
                <span className="h-px flex-1 bg-cockpit-line" aria-hidden="true" />
              </div>
            );
          }

          const isUser = msg.sender === "user";
          const profile = npcs.find((npc) => npc.id === msg.npcId) ?? activeProfile;
          return (
            <div key={msg.id} className={`flex gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
              {!isUser && (
                <span
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold"
                  style={avatarTone(profile.avatarColor)}
                  aria-hidden="true"
                >
                  {profile.name.slice(0, 1)}
                </span>
              )}
              <div className={`flex max-w-[86%] flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
                <div className="flex items-center gap-1.5 text-[11px] text-cockpit-muted">
                  <span className={isUser ? "text-calm/90" : ""}>
                    {isUser ? copy.you : profile.name}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-telemetry">{msg.timestamp}</span>
                  {msg.isUrgent && (
                    <span className="rounded bg-critical/15 px-1 font-semibold text-critical">
                      {copy.urgent}
                    </span>
                  )}
                </div>
                <div
                  className={`whitespace-pre-wrap break-words rounded-xl px-3.5 py-2.5 text-[15px] leading-relaxed ${
                    isUser
                      ? "rounded-tr-sm bg-cobalt text-white"
                      : "rounded-tl-sm border border-cockpit-bubble-line bg-cockpit-bubble text-cockpit-text"
                  }`}
                >
                  {msg.content}
                </div>
                {msg.attachedDocId && (
                  <button
                    type="button"
                    onClick={() => onOpenDoc(msg.attachedDocId!)}
                    className="group mt-0.5 flex w-full max-w-sm items-start gap-2.5 rounded-xl border border-emerald-500/60 bg-emerald-950/50 p-3.5 text-left transition hover:border-emerald-400/80 hover:bg-emerald-950/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
                      <FileLock2 className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-[12.5px] font-semibold leading-snug text-emerald-200">
                        {copy.secureFileTitle(docTitle(msg.attachedDocId))}
                      </span>
                      <span className="mt-1 flex items-center gap-1 text-[11.5px] font-medium text-emerald-300/90">
                        {copy.openSecureFile}
                        <ChevronRight className="h-3 w-3" aria-hidden="true" />
                      </span>
                      {unlockedDocIds.includes(msg.attachedDocId) ? null : (
                        <span className="mt-1 block text-[11px] text-emerald-300/70">
                          {copy.openInCenter}
                        </span>
                      )}
                    </span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {typing && (
          <div className="flex items-center gap-2 text-[12px] text-cockpit-muted" aria-live="polite">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-bold"
              style={avatarTone(activeProfile.avatarColor)}
              aria-hidden="true"
            >
              {activeProfile.name.slice(0, 1)}
            </span>
            <span className="flex items-center gap-1 rounded-lg border border-cockpit-bubble-line bg-cockpit-bubble px-2.5 py-2">
              <span className="typing-dot" />
              <span className="typing-dot" style={{ animationDelay: "0.15s" }} />
              <span className="typing-dot" style={{ animationDelay: "0.3s" }} />
            </span>
            <span>{copy.typingName(activeProfile.name)}</span>
          </div>
        )}
      </div>

      {/* composer */}
      <div className="shrink-0 border-t border-cockpit-line p-3">
        {suggestions.length > 0 && (
          <div
            role="group"
            aria-label={copy.suggestionsAria}
            className="mb-2 flex flex-wrap gap-1.5"
          >
            {suggestions.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => useSuggestion(question)}
                disabled={typing}
                className="max-w-full rounded-full border border-cockpit-line bg-cockpit-elevated/70 px-2.5 py-1 text-left text-[11.5px] leading-snug text-cockpit-muted transition hover:border-calm/50 hover:bg-cockpit-elevated hover:text-cockpit-text disabled:cursor-not-allowed disabled:opacity-50"
              >
                {question}
              </button>
            ))}
          </div>
        )}
        <div className="rounded-lg border border-cockpit-line bg-cockpit-elevated/60 focus-within:border-cobalt/60">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            rows={2}
            placeholder={copy.placeholder(activeProfile.name)}
            className="min-h-[56px] w-full resize-none bg-transparent px-3 py-2.5 text-[15px] leading-relaxed text-cockpit-text outline-none placeholder:text-cockpit-muted/70"
          />
          <div className="flex items-center justify-between border-t border-cockpit-line px-2.5 py-2">
            <span className="flex items-center gap-1 text-[10.5px] text-cockpit-muted">
              <CornerDownLeft className="h-3 w-3" aria-hidden="true" /> {copy.enterToSend}
            </span>
            <button
              type="button"
              onClick={submit}
              disabled={!draft.trim() || typing}
              className="flex items-center gap-1.5 rounded-md bg-cobalt px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-cobalt-hover disabled:cursor-not-allowed disabled:bg-cockpit-line disabled:text-cockpit-muted"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              {copy.send}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
