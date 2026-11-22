import { NextResponse } from "next/server";
import { flagshipScenario } from "@/data/flagshipScenario";
import { callDeepSeek, hasDeepSeekKey, parseJsonLoose } from "@/lib/deepseek";
import {
  assembleEvaluation,
  computeRuleDimensions,
  type SemanticAssessment,
} from "@/lib/evaluationEngine";
import { normalizeLocale, type Locale } from "@/lib/i18n";
import { mockSemanticAssessment } from "@/lib/mockFallback";
import type { BehavioralTelemetry, FinalDecision } from "@/types/simulation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_DECISIONS: FinalDecision[] = ["approve_full", "delay_retest", "canary_release"];

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
  const telemetry = normalizeTelemetry(body.telemetry);
  const candidateName = (body.candidateName ?? "").trim() || "Alex Chen";
  const rule = computeRuleDimensions(telemetry, locale);

  let semantic: SemanticAssessment | null = null;
  let mode: "live" | "offline-mock" = "offline-mock";

  if (hasDeepSeekKey()) {
    const prompt = buildEvaluationPrompt(telemetry, rule.dimensions, rule.citedFigures.join("、"), locale);
    const system =
      locale === "en"
        ? "You are a senior corporate mentor assessing a student's performance in a workplace simulation. Judge only on concrete evidence; keep the tone professional without flattery. " +
          "Reply in English with a single JSON object: {\"upwardCommunication\": integer 0-100, \"executiveFeedback\": " +
          "\"a 90-140 word manager review\", \"strengths\": [\"2-4 points\"], \"blindSpots\": [\"2-4 points\"]}."
        : "你是資深企業導師，負責評估學生在職場模擬中的表現。評估務必基於具體證據、句式專業但不諂媚。" +
          "以香港繁體中文輸出單一 JSON 物件：{\"upwardCommunication\": 0-100 的整數, \"executiveFeedback\": " +
          "\"120-180 字的主管評語\", \"strengths\": [\"2-4 點\"], \"blindSpots\": [\"2-4 點\"]}。";

    const result = await callDeepSeek(
      [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      { temperature: 0.5, json: true },
    );

    if (result) {
      const parsed = parseJsonLoose<{
        upwardCommunication?: unknown;
        executiveFeedback?: unknown;
        strengths?: unknown;
        blindSpots?: unknown;
      }>(result.content);

      const score = Number(parsed?.upwardCommunication);
      if (Number.isFinite(score)) {
        semantic = {
          upwardCommunication: Math.max(0, Math.min(100, Math.round(score))),
          executiveFeedback:
            typeof parsed?.executiveFeedback === "string" && parsed.executiveFeedback.length > 20
              ? parsed.executiveFeedback
              : mockSemanticAssessment(telemetry, locale).executiveFeedback,
          strengths: toStringArray(parsed?.strengths),
          blindSpots: toStringArray(parsed?.blindSpots),
        };
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

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 4);
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
          .slice(-24)
          .map((m) => ({
            npcId: m.npcId,
            sender: m.sender === "user" ? ("user" as const) : ("npc" as const),
            content: String(m.content).slice(0, 400),
          }))
      : [],
  };
}

function buildEvaluationPrompt(
  telemetry: BehavioralTelemetry,
  rule: { criticalVerification: number; pressureResilience: number; crossReferencing: number; upwardCommunication: number },
  citedFigures: string,
  locale: Locale,
): string {
  const zh = locale !== "en";
  const transcript = (telemetry.conversation ?? [])
    .map((m) => `${m.sender === "user" ? (zh ? "學生" : "Student") : m.npcId}: ${m.content}`)
    .join("\n")
    .slice(0, 3200);

  const decisionLabel: Record<FinalDecision, string> = {
    approve_full: zh ? "立即全量發布" : "approve_full (ship immediately)",
    delay_retest: zh ? "暫緩並退回重測" : "delay_retest (pause and re-test)",
    canary_release: zh ? "縮小為 5% 灰度" : "canary_release (5% canary)",
  };

  if (!zh) {
    return [
      "[Scenario] NovaTech NovaAssist 2.0 launch sign-off crisis. Growth director Marcus demands a full launch on the strength of 92% satisfaction (actually 15 internal staff);",
      "data analyst Chloe holds the raw logs (500 external customers: 48% satisfaction, 41% severe hallucination rate); legal counsel David warns that wrong promises are binding liabilities;",
      "VP Sarah demands a one-sentence conclusion within 45 seconds with 3 minutes left.",
      "",
      "[Objective behavioural record]",
      `- Unlocked the raw test logs: ${telemetry.unlockedRawLogs ? "yes" : "no"}`,
      `- Documents opened: ${telemetry.viewedDocuments.join(", ") || "none"}`,
      `- Colleagues contacted: ${telemetry.contactedNpcs.join(", ") || "none"}`,
      `- Challenged Marcus's data: ${telemetry.questionedAuthority ? "yes" : "no"}`,
      `- Consulted legal counsel David: ${telemetry.consultedLegal ? "yes" : "no"}`,
      `- 45-second VP popup: ${telemetry.respondedToVpOnTime === null ? "not encountered" : telemetry.respondedToVpOnTime ? "answered on time" : "timed out"}`,
      `- VP reply content: ${telemetry.vpResponseText || "(none)"}`,
      `- Final decision: ${decisionLabel[telemetry.finalDecision]}`,
      `- Decision rationale: ${telemetry.decisionRationale || "(none)"}`,
      `- Time spent: ${telemetry.timeSpentSeconds}s; messages sent: ${telemetry.totalMessagesSent}`,
      `- Concrete figures the system detected: ${citedFigures || "(none)"}`,
      `- Rule-engine baseline: critical verification ${rule.criticalVerification}, pressure resilience ${rule.pressureResilience}, cross-referencing ${rule.crossReferencing}`,
      "",
      "[Conversation excerpt]",
      transcript || "(none)",
      "",
      "Assess ONLY “upward communication” (does the student support conclusions with concrete data, propose a constructive alternative, and keep a professional tone) and write the review.",
      "Do not re-score the other three dimensions. Write in English.",
    ].join("\n");
  }

  return [
    "【情境】NovaTech NovaAssist 2.0 上線簽核危機。增長總監 Marcus 以 92% 滿意度（實為 15 名內部員工）要求全量上線；",
    "數據分析師 Chloe 持有原始日誌（外部 500 名客戶：滿意度 48%、嚴重幻覺率 41%）；法務 David 提示錯誤承諾須履約賠償；",
    "副總裁 Sarah 在剩下 3 分鐘時限時 45 秒要求一句話結論。",
    "",
    "【學生的客觀行為紀錄】",
    `- 是否解鎖原始測試日誌：${telemetry.unlockedRawLogs ? "是" : "否"}`,
    `- 點閱文件：${telemetry.viewedDocuments.join("、") || "無"}`,
    `- 曾聯繫的同事：${telemetry.contactedNpcs.join("、") || "無"}`,
    `- 是否質疑 Marcus 的數據：${telemetry.questionedAuthority ? "是" : "否"}`,
    `- 是否與法務顧問 David 確認合規風險：${telemetry.consultedLegal ? "是" : "否"}`,
    `- 45 秒 VP 彈窗回覆：${telemetry.respondedToVpOnTime === null ? "未經歷" : telemetry.respondedToVpOnTime ? "準時完成" : "超時"}`,
    `- VP 回覆內容：${telemetry.vpResponseText || "（無）"}`,
    `- 最終決策：${decisionLabel[telemetry.finalDecision]}`,
    `- 決策理據：${telemetry.decisionRationale || "（無）"}`,
    `- 花費時間：${telemetry.timeSpentSeconds} 秒；發送訊息 ${telemetry.totalMessagesSent} 則`,
    `- 系統檢出的具體數據引用：${citedFigures || "（無）"}`,
    `- 規則引擎初評：批判性驗證 ${rule.criticalVerification}、高壓抗干擾 ${rule.pressureResilience}、交叉比對 ${rule.crossReferencing}`,
    "",
    "【對話節錄】",
    transcript || "（無）",
    "",
    "請只評估「向上溝通力」（是否用具體數據支撐結論、是否提出建設性替代方案、語氣是否專業），並生成評語。",
    "不要重複計算其他三個維度。",
  ].join("\n");
}
