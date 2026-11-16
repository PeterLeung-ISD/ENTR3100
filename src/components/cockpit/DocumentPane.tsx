"use client";

import {
  AlertOctagon,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Gauge,
  Lock,
  MessageCircle,
  Presentation,
  ScrollText,
  ShieldCheck,
  TerminalSquare,
  Unlock,
} from "lucide-react";
import { useLocale } from "@/lib/LocaleProvider";
import type { DocumentMetric, DocumentType, MetricTone, NpcId, WorkDocument } from "@/types/simulation";

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

/** 數值型儲存格（含貨幣、約數、少於等寫法），用等寬粗體白字呈現。 */
const NUMERIC_CELL = /^[\s\d.,%+\-<>~≈約约約HK$NT秒s×xKMB/]+$/i;

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

const KPI_TONE: Record<MetricTone, { card: string; value: string }> = {
  positive: { card: "border-unlocked/40 bg-unlocked/[0.07]", value: "text-unlocked" },
  negative: { card: "border-red-500/40 bg-red-950/40", value: "text-red-300" },
  neutral: { card: "border-cockpit-line bg-cockpit-elevated", value: "text-white" },
};

function KpiCard({ metric }: { metric: DocumentMetric }) {
  const tone = KPI_TONE[metric.tone ?? "neutral"];
  const long = metric.value.length > 6;
  return (
    <div className={`rounded-lg border p-3 ${tone.card}`}>
      <div className="text-[10.5px] font-semibold uppercase leading-tight tracking-wide text-cockpit-muted">
        {metric.label}
      </div>
      <div
        className={`tabular-telemetry mt-2 break-words font-extrabold leading-none ${tone.value} ${
          long ? "text-xl xl:text-2xl" : "text-2xl xl:text-3xl"
        }`}
      >
        {metric.value}
      </div>
      {metric.note && (
        <div className="mt-1.5 text-[11px] leading-snug text-cockpit-muted">{metric.note}</div>
      )}
    </div>
  );
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
    <section className="flex min-h-0 w-full min-w-0 flex-col overflow-hidden border border-cockpit-line bg-cockpit-panel lg:rounded-lg">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-cockpit-line px-3.5">
        <FileText className="h-4 w-4 text-cockpit-muted" aria-hidden="true" />
        <h2 className="truncate text-[12px] font-semibold uppercase tracking-widest text-cockpit-text">
          {copy.header}
        </h2>
        <span className="ml-auto shrink-0 rounded border border-cockpit-line bg-cockpit-elevated px-2 py-0.5 text-[10px] font-medium text-cockpit-muted">
          {copy.unlockedCount(unlockedDocIds.length, documents.length)}
        </span>
      </div>

      {/* doc tabs */}
      <div className="scroll-thin flex shrink-0 gap-1.5 overflow-x-auto border-b border-cockpit-line bg-cockpit-panel px-2 py-2">
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
              className={`flex max-w-[240px] shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-2 text-left transition ${
                isNew ? "unlock-sweep " : ""
              }${
                isActive
                  ? "border-calm/50 bg-calm/10"
                  : "border-cockpit-line bg-cockpit-elevated/50 hover:bg-cockpit-elevated"
              }${unlocked ? "" : " opacity-60 grayscale"}`}
            >
              <TabIcon className="h-3.5 w-3.5 shrink-0 text-cockpit-muted" aria-hidden="true" />
              <span
                className={`truncate text-[12px] ${
                  isActive ? "font-semibold text-cockpit-text" : "text-cockpit-muted"
                }`}
              >
                {item.title}
              </span>
              {!unlocked && <Lock className="h-3 w-3 shrink-0 text-cockpit-muted" aria-hidden="true" />}
              {isNew && (
                <>
                  <Unlock className="h-3 w-3 shrink-0 text-unlocked" aria-hidden="true" />
                  <span className="shrink-0 rounded-full bg-unlocked px-1 py-px text-[9px] font-bold leading-relaxed text-cockpit-base">
                    {copy.newBadge}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>

      {!isUnlocked ? (
        <div className="scroll-thin flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-5">
          <div className="w-full max-w-md rounded-xl border border-cockpit-line bg-cockpit-elevated/60 p-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-cockpit-line bg-cockpit-base">
              <Lock className="h-6 w-6 text-cockpit-muted" aria-hidden="true" />
            </div>
            <h3 className="mt-3 text-[16px] font-semibold text-cockpit-text">{copy.lockedTitle}</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-cockpit-muted">
              {doc.unlockHint ?? copy.lockedHint}
            </p>
            <div className="mt-4 rounded-lg border border-cockpit-line bg-cockpit-panel p-3.5 text-left">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-cockpit-muted">
                {copy.ownerLabel}
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-[14px] text-cockpit-text">
                  {ownerNames[doc.id] ?? copy.unknownOwner}
                </span>
                {ownerId && (
                  <button
                    type="button"
                    onClick={() => onAskOwner(ownerId)}
                    className="flex shrink-0 items-center gap-1.5 rounded-md bg-cobalt px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-cobalt-hover"
                  >
                    <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    {copy.askOwner}
                  </button>
                )}
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-cockpit-muted/80">{copy.lockedFootnote}</p>
          </div>
        </div>
      ) : (
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[860px] px-5 py-5 sm:px-7 sm:py-6">
            <div className="flex items-start justify-between gap-3 border-b border-cockpit-line pb-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 shrink-0 text-calm" aria-hidden="true" />
                  <h1 className="text-[20px] font-semibold leading-snug text-cockpit-text">{doc.title}</h1>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-cockpit-muted">
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
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> {copy.authorized}
                  </span>
                </div>
              </div>
              <div className="shrink-0 rotate-2 rounded border border-critical/40 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-critical/80">
                {copy.confidential}
              </div>
            </div>

            <p className="mt-4 rounded-lg border-l-2 border-calm/50 bg-calm/[0.06] px-3.5 py-3 text-[14px] leading-relaxed text-cockpit-text/90">
              {doc.summary}
            </p>

            {/* KPI 數據指標 */}
            {doc.metrics && doc.metrics.length > 0 && (
              <section className="mt-5" aria-label={copy.kpiTitle}>
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 shrink-0 text-calm" aria-hidden="true" />
                  <h2 className="text-[11px] font-semibold uppercase tracking-widest text-cockpit-muted">
                    {copy.kpiTitle}
                  </h2>
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-2.5 xl:grid-cols-4">
                  {doc.metrics.map((metric) => (
                    <KpiCard key={`${doc.id}-kpi-${metric.label}`} metric={metric} />
                  ))}
                </div>
                <p className="mt-2 text-[11px] leading-snug text-cockpit-muted/80">{copy.kpiFootnote}</p>
              </section>
            )}

            <div className="mt-6 space-y-6">
              {doc.sections.map((section, index) => (
                <article key={`${doc.id}-${index}`}>
                  <h2 className="text-[15px] font-semibold leading-snug text-cockpit-text">
                    {section.heading}
                  </h2>
                  <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-cockpit-text/85">
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
                                className="whitespace-nowrap border-b border-cockpit-line px-3 py-2.5 text-[12px] font-semibold uppercase tracking-wide text-cockpit-muted"
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {section.tableData.rows.map((row, rowIndex) => (
                            <tr key={`${doc.id}-${index}-${rowIndex}`} className="even:bg-cockpit-elevated/40">
                              {row.map((cell, cellIndex) => {
                                const header = section.tableData?.headers[cellIndex] ?? "";
                                const alert = section.tableData?.alertValues?.includes(cell) ?? false;
                                const tone = alert ? "critical" : metricTone(cell, header);
                                const numeric = NUMERIC_CELL.test(cell);
                                return (
                                  <td
                                    key={`${doc.id}-${index}-${rowIndex}-${cellIndex}`}
                                    className={`border-b border-cockpit-line/70 px-3 py-2.5 align-top text-base last:border-0 ${
                                      numeric
                                        ? "tabular-telemetry font-bold text-white"
                                        : "text-cockpit-text/85"
                                    }`}
                                  >
                                    {tone ? (
                                      <span
                                        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-base font-bold ${
                                          tone === "critical"
                                            ? "border-red-500/40 bg-red-950/40 text-red-300"
                                            : "border-warn/40 bg-warn/15 text-warn"
                                        }`}
                                      >
                                        {tone === "critical" ? (
                                          <AlertOctagon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                        ) : (
                                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                        )}
                                        <span className="tabular-telemetry">{cell}</span>
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

            <div className="mt-8 flex items-center justify-between border-t border-cockpit-line pt-3 text-[10px] text-cockpit-muted">
              <span className="flex items-center gap-1">
                <Unlock className="h-3 w-3" aria-hidden="true" /> {copy.includedInDecision}
              </span>
              <span className="tabular-telemetry">DOC-{doc.id.toUpperCase()}</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
