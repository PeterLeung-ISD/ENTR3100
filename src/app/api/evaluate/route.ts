import { NextResponse } from "next/server";
import { flagshipScenario } from "@/data/flagshipScenario";
import { callDeepSeekDetailed, parseJsonLoose, resolveAiConfig } from "@/lib/deepseek";
import {
  assembleEvaluation,
  computeRuleDimensions,
  type DimensionCoachingOverride,
  type SemanticAssessment,
} from "@/lib/evaluationEngine";
import { normalizeLocale, type Locale } from "@/lib/i18n";
import { mockSemanticAssessment } from "@/lib/mockFallback";
import { checkRateLimit } from "@/lib/rateLimit";
import type {
  BehavioralTelemetry,
  EvaluationDimensionKey,
  FinalDecision,
} from "@/types/simulation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 26;

const VALID_DECISIONS: FinalDecision[] = ["approve_full", "delay_retest", "canary_release"];
const DIMENSION_KEYS: EvaluationDimensionKey[] = [
  "criticalVerification",
  "crossReferencing",
  "pressureResilience",
  "upwardCommunication",
];

interface EvaluateBody {
  scenarioId?: string;
  candidateName?: string;
  locale?: string;
  telemetry?: Partial<BehavioralTelemetry>;
}

export async function POST(req: Request) {
  let body: EvaluateBody;
  try {
    body = (await req.json()) as EvaluateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.scenarioId && body.scenarioId !== flagshipScenario.id) {
    return NextResponse.json({ error: "Unknown scenario" }, { status: 404 });
  }

  const locale: Locale = normalizeLocale(body.locale);

  const rate = checkRateLimit(req.headers, "evaluate");
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error:
          locale === "en"
            ? "Too many evaluation requests in a short window. Please wait a moment and try again."
            : "短時間內結算次數過多，請稍等片刻再試。",
      },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  const telemetry = normalizeTelemetry(body.telemetry);
  const candidateName = (body.candidateName ?? "").trim() || "Alex Chen";
  const rule = computeRuleDimensions(telemetry, locale);
  const { config } = resolveAiConfig(req.headers);

  let semantic: SemanticAssessment | null = null;
  let mode: "live" | "offline-mock" = "offline-mock";

  if (config.apiKey) {
    const prompt = buildEvaluationPrompt(
      telemetry,
      rule.dimensions,
      rule.citedFigures.join(locale === "en" ? ", " : "、"),
      locale,
    );

    const system = buildEvaluationSystemPrompt(locale);

    const outcome = await callDeepSeekDetailed(
      [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      { temperature: 0.3, json: true, config, maxTokens: 680 },
    );

    if (outcome.ok) {
      const parsed = parseSemanticResponse(outcome.content, telemetry, locale);
      if (parsed) {
        semantic = parsed;
        mode = "live";
      }
    }
  }

  if (!semantic) {
    semantic = mockSemanticAssessment(telemetry, locale);
  }

  const evaluation = assembleEvaluation({
    telemetry,
    semantic,
    candidateName,
    mode,
    locale,
    verificationId: makeId(),
  });

  return NextResponse.json(evaluation);
}

function makeId(): string {
  const year = new Date().getFullYear();
  const n = Math.floor(1000 + Math.random() * 9000);
  return `NX-${year}-${n}`;
}

function clampScore(value: unknown): number | undefined {
  const num = Number(value);
  if (!Number.isFinite(num)) return undefined;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function parseCoachingMap(
  raw: unknown,
): Partial<Record<EvaluationDimensionKey, DimensionCoachingOverride>> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const source = raw as Record<string, unknown>;
  const result: Partial<Record<EvaluationDimensionKey, DimensionCoachingOverride>> = {};
  let hasAny = false;

  for (const key of DIMENSION_KEYS) {
    const entry = source[key];
    if (!entry || typeof entry !== "object") continue;
    const obj = entry as Record<string, unknown>;
    const evidence =
      typeof obj.e === "string"
        ? obj.e.trim()
        : typeof obj.evidenceObserved === "string"
          ? obj.evidenceObserved.trim()
          : undefined;
    const howTo =
      typeof obj.n === "string"
        ? obj.n.trim()
        : typeof obj.howToLevelUp === "string"
          ? obj.howToLevelUp.trim()
          : undefined;

    if (evidence || howTo) {
      result[key] = {
        ...(evidence ? { evidenceObserved: evidence } : {}),
        ...(howTo ? { howToLevelUp: howTo } : {}),
      };
      hasAny = true;
    }
  }

  return hasAny ? result : undefined;
}

function parseSemanticResponse(
  rawContent: string,
  telemetry: BehavioralTelemetry,
  locale: Locale,
): SemanticAssessment | null {
  const parsed = parseJsonLoose<{
    dimensions?: Partial<Record<EvaluationDimensionKey, unknown>>;
    criticalVerification?: unknown;
    crossReferencing?: unknown;
    pressureResilience?: unknown;
    upwardCommunication?: unknown;
    executiveFeedback?: unknown;
    strengths?: unknown;
    blindSpots?: unknown;
    coaching?: unknown;
    dimensionCoaching?: unknown;
  }>(rawContent);

  if (!parsed) return null;

  const upward =
    clampScore(parsed.dimensions?.upwardCommunication) ?? clampScore(parsed.upwardCommunication);
  if (upward === undefined) return null;

  const critical =
    clampScore(parsed.dimensions?.criticalVerification) ?? clampScore(parsed.criticalVerification);
  const cross =
    clampScore(parsed.dimensions?.crossReferencing) ?? clampScore(parsed.crossReferencing);
  const pressure =
    clampScore(parsed.dimensions?.pressureResilience) ?? clampScore(parsed.pressureResilience);

  const feedback =
    typeof parsed.executiveFeedback === "string" && parsed.executiveFeedback.trim().length > 20
      ? parsed.executiveFeedback.trim()
      : mockSemanticAssessment(telemetry, locale).executiveFeedback;

  return {
    upwardCommunication: upward,
    ...(critical !== undefined ? { criticalVerification: critical } : {}),
    ...(cross !== undefined ? { crossReferencing: cross } : {}),
    ...(pressure !== undefined ? { pressureResilience: pressure } : {}),
    executiveFeedback: feedback,
    strengths: toStringArray(parsed.strengths),
    blindSpots: toStringArray(parsed.blindSpots),
    dimensionCoaching: parseCoachingMap(parsed.coaching ?? parsed.dimensionCoaching),
  };
}

function normalizeTelemetry(input: Partial<BehavioralTelemetry> | undefined): BehavioralTelemetry {
  const t = input ?? {};
  const decision = VALID_DECISIONS.includes(t.finalDecision as FinalDecision)
    ? (t.finalDecision as FinalDecision)
    : "approve_full";

  return {
    unlockedRawLogs: Boolean(t.unlockedRawLogs),
    viewedDocuments: Array.isArray(t.viewedDocuments)
      ? t.viewedDocuments.filter((d): d is string => typeof d === "string").slice(0, 20)
      : [],
    questionedAuthority: Boolean(t.questionedAuthority),
    consultedLegal: Boolean(t.consultedLegal),
    respondedToVpOnTime:
      t.respondedToVpOnTime === true ? true : t.respondedToVpOnTime === false ? false : null,
    vpResponseText: typeof t.vpResponseText === "string" ? t.vpResponseText.slice(0, 1200) : "",
    totalMessagesSent: Math.max(0, Math.min(500, Number(t.totalMessagesSent) || 0)),
    timeSpentSeconds: Math.max(0, Math.min(3600, Number(t.timeSpentSeconds) || 0)),
    finalDecision: decision,
    decisionRationale:
      typeof t.decisionRationale === "string" ? t.decisionRationale.slice(0, 2000) : "",
    contactedNpcs: Array.isArray(t.contactedNpcs)
      ? t.contactedNpcs.filter((n): n is BehavioralTelemetry["contactedNpcs"][number] =>
          ["marcus", "chloe", "david", "sarah"].includes(String(n)),
        )
      : [],
    rushedSubmission: Boolean(t.rushedSubmission),
    conversation: Array.isArray(t.conversation)
      ? t.conversation
          .filter((m) => m && typeof m.content === "string")
          .slice(-40)
          .map((m) => ({
            npcId: m.npcId,
            sender: m.sender === "user" ? ("user" as const) : ("npc" as const),
            content: String(m.content).slice(0, 350),
          }))
      : [],
  };
}

function buildEvaluationSystemPrompt(locale: Locale): string {
  if (locale === "en") {
    return [
      "You are an objective senior executive assessor for NexusSim.",
      "Evaluate the student's actual chat transcript, 45s VP reply, and final sign-off rationale strictly against the 4-dimension Rubric (each 0-100; bands: L1 0-39, L2 40-57, L3 58-71, L4 72-84, L5 85-100):",
      "1) criticalVerification: did they probe behind the 92% deck (N=15 internal vs N=500 external, 48% sat, 41% severe hallucination), challenge Marcus with evidence, and set a concrete re-launch gate (<5% hallucination)?",
      "2) crossReferencing: did they integrate Growth (market window), Data (41% hallucination), and Legal (HK$3.69M liability across 20,500 users) across documents and NPCs?",
      "3) pressureResilience: under Marcus's push and Sarah's 45s drop-in, did they stay rational and deliver conclusion + data + next step instead of caving or going vague?",
      "4) upwardCommunication: is the rationale & VP answer boardroom-ready (quantified risk -> clear decision -> gate/timeline)?",
      "Quote or reference concrete moments from the student's actual messages/rationale. Be crisp, fair, and unsparing without flattery.",
      "If a dimension score is >=85 (already L5), advise how to sustain that boardroom habit; otherwise give a concrete next-level action.",
      'Return ONLY a single compact JSON object matching: {"dimensions":{"criticalVerification":int,"crossReferencing":int,"pressureResilience":int,"upwardCommunication":int},"executiveFeedback":"80-120 words","strengths":["2-3 concise evidence-backed points"],"blindSpots":["2-3 concise evidence-backed points"],"coaching":{"criticalVerification":{"e":"1 sentence observed evidence","n":"1 concrete tip"},"crossReferencing":{"e":"...","n":"..."},"pressureResilience":{"e":"...","n":"..."},"upwardCommunication":{"e":"...","n":"..."}}}',
    ].join("\n");
  }

  return [
    "你係 NexusSim 資深企業評核官。請嚴格根據學生嘅真實對話紀錄、45 秒 VP 回覆與最終決策理據，對照以下四個維度 Rubric（0-100 分；等級：L1 0-39 / L2 40-57 / L3 58-71 / L4 72-84 / L5 85-100）作出精準評分與個人化點評：",
    "1) criticalVerification（批判性驗證）：有冇拆穿 92% 僅來自 N=15 內部員工、追出 N=500 外部 48% 滿意與 41% 嚴重幻覺，並用具體數字質疑權威、設定重上線門檻（例如幻覺率 <5%）？",
    "2) crossReferencing（資訊交叉比對）：有冇將增長（市場窗口）、數據（41% 幻覺率）同法務（HK$3.69M 賠償敞口）三方文件與同事立場交叉整合？",
    "3) pressureResilience（高壓抗干擾力）：面對 Marcus 催促同 Sarah 45 秒突襲，有冇保持理性節奏並交出「結論＋數字＋下一步」，而非慌亂讓步或敷衍？",
    "4) upwardCommunication（向上溝通力）：決策理據與 VP 回覆有冇做到「風險量化 → 建議方案 → 門檻／時程」高層匯報水準？",
    "評語務必具體引用學生喺對話或理據中實際講過嘅論點與細節，專業客觀、切勿空泛讚美。若某維度達 ≥85 分（L5），請寫如何維持與複製該習慣；未達 L5 則給具體可執行嘅升等動作。",
    '請以香港繁體中文輸出單一精簡 JSON 物件：{"dimensions":{"criticalVerification":整數,"crossReferencing":整數,"pressureResilience":整數,"upwardCommunication":整數},"executiveFeedback":"100-150字總評（引用實際表現）","strengths":["2-3點具體亮點"],"blindSpots":["2-3點具體盲點"],"coaching":{"criticalVerification":{"e":"1句觀察到嘅實際對話/行為證據","n":"1句具體升等建議"},"crossReferencing":{"e":"...","n":"..."},"pressureResilience":{"e":"...","n":"..."},"upwardCommunication":{"e":"...","n":"..."}}}',
  ].join("\n");
}

function buildEvaluationPrompt(
  telemetry: BehavioralTelemetry,
  rule: {
    criticalVerification: number;
    pressureResilience: number;
    crossReferencing: number;
    upwardCommunication: number;
  },
  citedFigures: string,
  locale: Locale,
): string {
  const zh = locale !== "en";
  const transcript = (telemetry.conversation ?? [])
    .map((m) => `${m.sender === "user" ? (zh ? "學生" : "Student") : m.npcId}: ${m.content}`)
    .join("\n")
    .slice(0, 5500);

  const decisionLabel: Record<FinalDecision, string> = {
    approve_full: zh ? "立即全量發布" : "approve_full (ship immediately)",
    delay_retest: zh ? "暫緩並退回重測" : "delay_retest (pause and re-test)",
    canary_release: zh ? "縮小為 5% 灰度" : "canary_release (5% canary)",
  };

  if (!zh) {
    return [
      "[Objective telemetry]",
      `- Unlocked raw logs (N=500, 41% hallucination): ${telemetry.unlockedRawLogs ? "yes" : "no"}`,
      `- Documents opened: ${telemetry.viewedDocuments.join(", ") || "none"}`,
      `- Colleagues contacted: ${telemetry.contactedNpcs.join(", ") || "none"}`,
      `- Challenged Marcus: ${telemetry.questionedAuthority ? "yes" : "no"} | Consulted Legal (David): ${telemetry.consultedLegal ? "yes" : "no"}`,
      `- 45s VP popup: ${telemetry.respondedToVpOnTime === null ? "not triggered" : telemetry.respondedToVpOnTime ? "answered on time" : "timed out"}`,
      `- VP reply text: ${telemetry.vpResponseText || "(none)"}`,
      `- Final decision: ${decisionLabel[telemetry.finalDecision]}`,
      `- Decision rationale: ${telemetry.decisionRationale || "(none)"}`,
      `- Time spent: ${telemetry.timeSpentSeconds}s | Messages sent: ${telemetry.totalMessagesSent} | Rushed: ${telemetry.rushedSubmission ? "yes" : "no"}`,
      `- Concrete figures detected: ${citedFigures || "(none)"}`,
      `- Rule baselines (for calibration): CV=${rule.criticalVerification}, CR=${rule.crossReferencing}, PR=${rule.pressureResilience}, UC=${rule.upwardCommunication}`,
      "",
      "[Full conversation transcript]",
      transcript || "(no dialogue)",
    ].join("\n");
  }

  return [
    "【客觀行為遙測】",
    `- 是否解鎖《原始測試日誌》（N=500、41% 幻覺率）：${telemetry.unlockedRawLogs ? "是" : "否"}`,
    `- 實際點閱文件：${telemetry.viewedDocuments.join("、") || "無"}`,
    `- 曾聯繫同事：${telemetry.contactedNpcs.join("、") || "無"}`,
    `- 是否質疑 Marcus：${telemetry.questionedAuthority ? "是" : "否"}｜是否諮詢法務 David：${telemetry.consultedLegal ? "是" : "否"}`,
    `- 45 秒 VP 緊急彈窗：${telemetry.respondedToVpOnTime === null ? "未觸發" : telemetry.respondedToVpOnTime ? "準時回覆" : "超時未覆"}`,
    `- VP 回覆內容：${telemetry.vpResponseText || "（無）"}`,
    `- 最終決策：${decisionLabel[telemetry.finalDecision]}`,
    `- 決策理據：${telemetry.decisionRationale || "（無）"}`,
    `- 用時：${telemetry.timeSpentSeconds} 秒｜發訊：${telemetry.totalMessagesSent} 則｜草率交卷：${telemetry.rushedSubmission ? "是" : "否"}`,
    `- 系統檢出引用數據：${citedFigures || "（無）"}`,
    `- 規則基準分（校準參考）：批判驗證=${rule.criticalVerification}、交叉比對=${rule.crossReferencing}、抗干擾=${rule.pressureResilience}、向上溝通=${rule.upwardCommunication}`,
    "",
    "【完整對話紀錄】",
    transcript || "（無對話）",
  ].join("\n");
}
