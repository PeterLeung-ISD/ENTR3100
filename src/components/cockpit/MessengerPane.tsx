"use client";

import { useEffect, useRef, useState } from "react";
import {
  BellRing,
  ChevronRight,
  CornerDownLeft,
  FileText,
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
    if (!text) return;
    onSend(text);
    setDraft("");
    textareaRef.current?.focus();
  };

  return (
    <section className="flex w-full min-h-0 min-w-0 flex-col overflow-hidden border border-cockpit-line bg-cockpit-panel lg:rounded-lg">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-cockpit-line px-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-3.5 w-3.5 text-calm" aria-hidden="true" />
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-cockpit-text">
            {copy.header}
          </h2>
        </div>
        <span className="rounded border border-cockpit-line bg-cockpit-elevated px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-cockpit-muted">
          Teams
        </span>
      </div>

      {/* channels */}
      <div className="scroll-thin flex shrink-0 gap-1 overflow-x-auto border-b border-cockpit-line p-1.5 sm:flex-col sm:gap-1 sm:overflow-visible">
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
              className={`group flex min-w-[176px] shrink-0 items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition sm:min-w-0 ${
                isActive
                  ? "border-calm/30 bg-cockpit-elevated"
                  : "border-transparent hover:bg-cockpit-elevated/60"
              }`}
            >
              <span className="relative shrink-0">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-bold"
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
                    className={`truncate text-[12px] font-semibold ${
                      isActive ? "text-cockpit-text" : "text-cockpit-text/90"
                    }`}
                  >
                    {npc.name}
                  </span>
                  {count > 0 && (
                    <span className="tabular-telemetry ml-auto flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-critical-deep px-1 text-[9px] font-bold text-white">
                      {count}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-[10px] text-cockpit-muted">{npc.role}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* active thread header */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-cockpit-line px-3 py-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-unlocked" aria-hidden="true" />
            <span className="truncate text-[12px] font-semibold text-cockpit-text">
              {activeProfile.name}
            </span>
            <span className="shrink-0 text-[9px] text-cockpit-muted">{copy.online}</span>
          </div>
          <div className="mt-0.5 truncate text-[10px] text-cockpit-muted">
            {activeProfile.role} · {activeProfile.statusText}
          </div>
        </div>
        <span className="shrink-0 rounded border border-cockpit-line bg-cockpit-elevated px-1.5 py-0.5 text-[9px] text-cockpit-muted">
          {activeProfile.department}
        </span>
      </div>

      {/* cross-channel notification */}
      {crossChannel && (
        <button
          type="button"
          onClick={() => onSelectNpc(crossChannel.npcId)}
          className="flex w-full shrink-0 items-center gap-2 border-b border-calm/25 bg-calm/10 px-3 py-2 text-left transition hover:bg-calm/15"
        >
          <BellRing className="h-3.5 w-3.5 shrink-0 text-calm" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-[10.5px] font-medium text-calm">
            {crossChannel.text}
          </span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-calm" aria-hidden="true" />
        </button>
      )}

      {/* messages */}
      <div ref={scrollRef} className="scroll-thin min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {threads.length === 0 && (
          <div className="rounded-lg border border-dashed border-cockpit-line bg-cockpit-elevated/40 p-3 text-[11px] leading-relaxed text-cockpit-muted">
            {copy.emptyThread(activeProfile.name)}
          </div>
        )}

        {threads.map((msg) => {
          if (msg.sender === "system") {
            return (
              <div key={msg.id} className="flex items-center gap-2 text-[10px] text-cockpit-muted">
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
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold"
                  style={avatarTone(profile.avatarColor)}
                  aria-hidden="true"
                >
                  {profile.name.slice(0, 1)}
                </span>
              )}
              <div className={`flex max-w-[86%] flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
                <div className="flex items-center gap-1.5 text-[9px] text-cockpit-muted">
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
                  className={`whitespace-pre-wrap rounded-xl px-3 py-2 text-[12px] leading-relaxed ${
                    isUser
                      ? "rounded-tr-sm bg-cobalt text-white"
                      : "rounded-tl-sm border border-cockpit-line bg-cockpit-elevated text-cockpit-text"
                  }`}
                >
                  {msg.content}
                </div>
                {msg.attachedDocId && (
                  <button
                    type="button"
                    onClick={() => onOpenDoc(msg.attachedDocId!)}
                    className="group flex items-center gap-2 rounded-lg border border-calm/30 bg-calm/10 px-2.5 py-1.5 text-left transition hover:border-calm/60 hover:bg-calm/15"
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0 text-calm" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block truncate text-[11px] font-medium text-cockpit-text">
                        {docTitle(msg.attachedDocId)}
                      </span>
                      <span className="block text-[9px] text-calm/80">{copy.openInCenter}</span>
                    </span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {typing && (
          <div className="flex items-center gap-2 text-[10px] text-cockpit-muted">
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold"
              style={avatarTone(activeProfile.avatarColor)}
              aria-hidden="true"
            >
              {activeProfile.name.slice(0, 1)}
            </span>
            <span className="flex items-center gap-1 rounded-lg border border-cockpit-line bg-cockpit-elevated px-2.5 py-2">
              <span className="typing-dot" />
              <span className="typing-dot" style={{ animationDelay: "0.15s" }} />
              <span className="typing-dot" style={{ animationDelay: "0.3s" }} />
            </span>
            <span>{copy.typing}</span>
          </div>
        )}
      </div>

      {/* composer */}
      <div className="shrink-0 border-t border-cockpit-line p-2.5">
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
            className="w-full resize-none bg-transparent px-2.5 py-2 text-[12px] text-cockpit-text outline-none placeholder:text-cockpit-muted/70"
          />
          <div className="flex items-center justify-between border-t border-cockpit-line px-2 py-1.5">
            <span className="flex items-center gap-1 text-[9px] text-cockpit-muted">
              <CornerDownLeft className="h-2.5 w-2.5" aria-hidden="true" /> {copy.enterToSend}
            </span>
            <button
              type="button"
              onClick={submit}
              disabled={!draft.trim()}
              className="flex items-center gap-1 rounded-md bg-cobalt px-2.5 py-1 text-[10px] font-semibold text-white transition hover:bg-cobalt-hover disabled:cursor-not-allowed disabled:bg-cockpit-line disabled:text-cockpit-muted"
            >
              <Send className="h-3 w-3" aria-hidden="true" />
              {copy.send}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
