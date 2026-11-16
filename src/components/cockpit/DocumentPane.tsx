"use client";

import {
  AlertOctagon,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Lock,
  MessageCircle,
  Presentation,
  ScrollText,
  ShieldCheck,
  TerminalSquare,
  Unlock,
} from "lucide-react";
import { useLocale } from "@/lib/LocaleProvider";
import type { DocumentType, NpcId, WorkDocument } from "@/types/simulation";

interface DocumentPaneProps {
  documents: WorkDocument[];
  unlockedDocIds: string[];
  newDocIds: string[];
  activeDocId: string;
  docOwners: Record<string, NpcId>;
  ownerNames: Record<string, string>;
  onSelectDoc: (docId: string) => void;
  onAskOwner: (npcId: NpcId) => void;
}

const DOC_ICON: Record<DocumentType, typeof FileText> = {
  deck: Presentation,
  spreadsheet: FileSpreadsheet,
  memo: ScrollText,
  raw_log: TerminalSquare,
};

/** 風險類欄位：幻覺率、錯誤率、賠償敞口等。 */
const RISK_HEADER = /幻覺|錯誤|誤差|風險|失敗|客訴|hallucin|error|risk|fail|complaint/i;
const PERCENT_VALUE = /(\d+(?:\.\d+)?)\s*%/;

/** 只對風險欄位中的百分比做警示，避免把「92% 滿意度」誤判為異常。 */
function metricTone(cell: string, header: string): "critical" | "warn" | null {
  if (!RISK_HEADER.test(header)) return null;
  const match = PERCENT_VALUE.exec(cell);
  if (!match) return null;
  const value = Number.parseFloat(match[1]);
  if (Number.isNaN(value)) return null;
  if (value >= 30) return "critical";
  if (value >= 15) return "warn";
  return null;
}

export default function DocumentPane({
  documents,
  unlockedDocIds,
  newDocIds,
  activeDocId,
  docOwners,
  ownerNames,
  onSelectDoc,
  onAskOwner,
}: DocumentPaneProps) {
  const { c } = useLocale();
  const copy = c.cockpit.documents;
  const doc = documents.find((item) => item.id === activeDocId) ?? documents[0];
  const isUnlocked = unlockedDocIds.includes(doc.id);
  const Icon = DOC_ICON[doc.type] ?? FileText;
  const ownerId = docOwners[doc.id];

  return (
    <section className="flex w-full min-h-0 min-w-0 flex-col overflow-hidden border border-cockpit-line bg-cockpit-panel lg:rounded-lg">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-cockpit-line px-3">
        <FileText className="h-3.5 w-3.5 text-cockpit-muted" aria-hidden="true" />
        <h2 className="truncate text-[11px] font-semibold uppercase tracking-widest text-cockpit-text">
          {copy.header}
        </h2>
        <span className="ml-auto shrink-0 rounded border border-cockpit-line bg-cockpit-elevated px-1.5 py-0.5 text-[9px] font-medium text-cockpit-muted">
          {copy.unlockedCount(unlockedDocIds.length, documents.length)}
        </span>
      </div>

      {/* doc tabs */}
      <div className="scroll-thin flex shrink-0 gap-1 overflow-x-auto border-b border-cockpit-line bg-cockpit-panel px-2 py-1.5">
        {documents.map((item) => {
          const unlocked = unlockedDocIds.includes(item.id);
          const isNew = unlocked && newDocIds.includes(item.id);
          const isActive = item.id === doc.id;
          const TabIcon = DOC_ICON[item.type] ?? FileText;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectDoc(item.id)}
              aria-current={isActive ? "true" : undefined}
              aria-label={unlocked ? item.title : copy.lockedTabAria(item.title)}
              className={`flex max-w-[220px] shrink-0 items-center gap-1.5 rounded-md border px-2 py-1.5 text-left transition ${
                isNew ? "unlock-sweep " : ""
              }${
                isActive
                  ? "border-calm/50 bg-calm/10"
                  : "border-cockpit-line bg-cockpit-elevated/50 hover:bg-cockpit-elevated"
              }${unlocked ? "" : " opacity-60 grayscale"}`}
            >
              <TabIcon className="h-3 w-3 shrink-0 text-cockpit-muted" aria-hidden="true" />
              <span
                className={`truncate text-[11px] ${
                  isActive ? "font-semibold text-cockpit-text" : "text-cockpit-muted"
                }`}
              >
                {item.title}
              </span>
              {!unlocked && <Lock className="h-2.5 w-2.5 shrink-0 text-cockpit-muted" aria-hidden="true" />}
              {isNew && (
                <>
                  <Unlock className="h-2.5 w-2.5 shrink-0 text-unlocked" aria-hidden="true" />
                  <span className="shrink-0 rounded-full bg-unlocked px-1 py-px text-[8px] font-bold leading-relaxed text-cockpit-base">
                    {copy.newBadge}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>

      {!isUnlocked ? (
        <div className="scroll-thin flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-4">
          <div className="w-full max-w-sm rounded-xl border border-cockpit-line bg-cockpit-elevated/60 p-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-cockpit-line bg-cockpit-base">
              <Lock className="h-5 w-5 text-cockpit-muted" aria-hidden="true" />
            </div>
            <h3 className="mt-3 text-[13px] font-semibold text-cockpit-text">{copy.lockedTitle}</h3>
            <p className="mt-1.5 text-[11px] leading-relaxed text-cockpit-muted">
              {doc.unlockHint ?? copy.lockedHint}
            </p>
            <div className="mt-3 rounded-lg border border-cockpit-line bg-cockpit-panel p-3 text-left">
              <div className="text-[9px] font-semibold uppercase tracking-widest text-cockpit-muted">
                {copy.ownerLabel}
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-[12px] text-cockpit-text">
                  {ownerNames[doc.id] ?? copy.unknownOwner}
                </span>
                {ownerId && (
                  <button
                    type="button"
                    onClick={() => onAskOwner(ownerId)}
                    className="flex shrink-0 items-center gap-1 rounded-md bg-cobalt px-2 py-1 text-[10px] font-semibold text-white transition hover:bg-cobalt-hover"
                  >
                    <MessageCircle className="h-3 w-3" aria-hidden="true" />
                    {copy.askOwner}
                  </button>
                )}
              </div>
            </div>
            <p className="mt-2.5 text-[10px] leading-relaxed text-cockpit-muted/80">
              {copy.lockedFootnote}
            </p>
          </div>
        </div>
      ) : (
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[760px] px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex items-start justify-between gap-3 border-b border-cockpit-line pb-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0 text-calm" aria-hidden="true" />
                  <h1 className="text-[16px] font-semibold leading-snug text-cockpit-text">
                    {doc.title}
                  </h1>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-cockpit-muted">
                  <span>
                    {copy.authorLabel}
                    {doc.author}
                  </span>
                  <span className="text-cockpit-line" aria-hidden="true">
                    |
                  </span>
                  <span>
                    {copy.updatedLabel}
                    {doc.updatedAt}
                  </span>
                  <span className="text-cockpit-line" aria-hidden="true">
                    |
                  </span>
                  <span className="flex items-center gap-1 text-unlocked">
                    <ShieldCheck className="h-3 w-3" aria-hidden="true" /> {copy.authorized}
                  </span>
                </div>
              </div>
              <div className="shrink-0 rotate-2 rounded border border-critical/40 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-critical/80">
                {copy.confidential}
              </div>
            </div>

            <p className="mt-4 rounded-lg border-l-2 border-calm/50 bg-calm/[0.06] px-3 py-2 text-[11px] leading-relaxed text-cockpit-muted">
              {doc.summary}
            </p>

            <div className="mt-5 space-y-5">
              {doc.sections.map((section, index) => (
                <article key={`${doc.id}-${index}`}>
                  <h2 className="text-[12px] font-semibold text-cockpit-text">{section.heading}</h2>
                  <p className="mt-1.5 whitespace-pre-wrap text-[12px] leading-7 text-cockpit-muted">
                    {section.content}
                  </p>

                  {section.tableData && (
                    <div className="scroll-thin mt-3 overflow-x-auto rounded-lg border border-cockpit-line">
                      <table className="w-full border-collapse text-left">
                        <thead>
                          <tr className="bg-cockpit-elevated">
                            {section.tableData.headers.map((header) => (
                              <th
                                key={header}
                                scope="col"
                                className="whitespace-nowrap border-b border-cockpit-line px-3 py-2 text-xs font-semibold uppercase tracking-wide text-cockpit-muted"
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {section.tableData.rows.map((row, rowIndex) => (
                            <tr key={`${doc.id}-${index}-${rowIndex}`} className="even:bg-cockpit-elevated/30">
                              {row.map((cell, cellIndex) => {
                                const header = section.tableData?.headers[cellIndex] ?? "";
                                const tone = metricTone(cell, header);
                                return (
                                  <td
                                    key={`${doc.id}-${index}-${rowIndex}-${cellIndex}`}
                                    className="tabular-telemetry whitespace-nowrap border-b border-cockpit-line/70 px-3 py-2 text-[11px] text-cockpit-text/90 last:border-0"
                                  >
                                    {tone ? (
                                      <span
                                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                          tone === "critical"
                                            ? "border-critical/40 bg-critical/15 text-critical"
                                            : "border-warn/40 bg-warn/15 text-warn"
                                        }`}
                                      >
                                        {tone === "critical" ? (
                                          <AlertOctagon className="h-3 w-3" aria-hidden="true" />
                                        ) : (
                                          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                                        )}
                                        <span>{cell}</span>
                                        <span>
                                          {tone === "critical" ? copy.metricCritical : copy.metricWarn}
                                        </span>
                                      </span>
                                    ) : (
                                      cell
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </article>
              ))}
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-cockpit-line pt-3 text-[9px] text-cockpit-muted">
              <span className="flex items-center gap-1">
                <Unlock className="h-2.5 w-2.5" aria-hidden="true" /> {copy.includedInDecision}
              </span>
              <span className="tabular-telemetry">DOC-{doc.id.toUpperCase()}</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
