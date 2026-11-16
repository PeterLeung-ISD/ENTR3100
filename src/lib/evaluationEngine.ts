import { flagshipScenario } from "@/data/flagshipScenario";
import { flagshipScenarioEn } from "@/data/flagshipScenarioEn";
import { makeVerificationId } from "@/lib/ids";
import type { Locale } from "@/lib/i18n";
import type {
  BehavioralTelemetry,
  EvaluationDimensions,
  EvaluationResult,
  FinalDecision,
  Grade,
  TrapAnalysisItem,
  WorkDocument,
  XRayItem,
} from "@/types/simulation";

export interface SemanticAssessment {
  upwardCommunication: number;
  executiveFeedback: string;
  strengths: string[];
  blindSpots: string[];
}

export interface RuleAssessment {
  dimensions: EvaluationDimensions;
  /** 決策是否落入權威偏誤陷阱（影響評語語氣） */
  authorityTrap: boolean;
  /** 數據素養：理據中出現的具體數字 */
  citedFigures: string[];
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

const DECISION_LABEL: Record<Locale, Record<FinalDecision, string>> = {
  zh: {
    approve_full: "立即全量發布",
    delay_retest: "暫緩發布並退回重測",
    canary_release: "縮小為 5% 灰度測試",
  },
  en: {
    approve_full: "Ship at full scale immediately",
    delay_retest: "Pause launch and re-test",
    canary_release: "Narrow to a 5% canary release",
  },
};

const FIGURE_PATTERNS: Record<Locale, { label: string; test: RegExp }[]> = {
  zh: [
    { label: "41% 幻覺率", test: /4\s*1\s*%|41\s*percent|hallucinat/i },
    { label: "92% 內部樣本", test: /92\s*%/ },
    { label: "N=15 樣本量", test: /\b15\b|N\s*=\s*15|十五/ },
    { label: "N=500 外部客戶", test: /\b500\b|五百|five hundred/i },
    { label: "48% 外部滿意度", test: /48\s*%/ },
    { label: "6% 內部幻覺率", test: /\b6\s*%/ },
    { label: "樣本偏差", test: /樣本|偏差|bias|抽樣|sample/i },
    { label: "灰度 / 人工覆核", test: /灰度|灰度測試|覆核|攔截|canary|5\s*%/i },
    { label: "法律 / 合規風險", test: /法務|法律|合規|賠償|免責|legal|compliance|liabilit|refund/i },
  ],
  en: [
    { label: "41% hallucination rate", test: /4\s*1\s*%|41\s*percent|hallucinat/i },
    { label: "92% internal sample", test: /92\s*%/ },
    { label: "N=15 sample size", test: /\b15\b|N\s*=\s*15|十五/ },
    { label: "N=500 external customers", test: /\b500\b|五百|five hundred/i },
    { label: "48% external satisfaction", test: /48\s*%/ },
    { label: "6% internal hallucination rate", test: /\b6\s*%/ },
    { label: "Sample bias", test: /樣本|偏差|bias|抽樣|sample/i },
    { label: "Canary / human review", test: /灰度|灰度測試|覆核|攔截|canary|5\s*%|staged/i },
    { label: "Legal / compliance risk", test: /法務|法律|合規|賠償|免責|legal|compliance|liabilit|refund/i },
  ],
};

const SOLUTION_INTENT: Record<Locale, RegExp> = {
  zh: /建議|替代方案|方案|做法|下一步|安排|排期/,
  en: /recommend|suggest|propose|alternative|next step|plan|reschedul|mitigat/i,
};

/**
 * 維度 1–3 由前端行為埋點規則計算（佔總分 60% 的客觀基準），
 * 維度 4 先以規則得出一個 baseline，再由 DeepSeek（或 Mock）語義分析覆寫 40%。
 */
export function computeRuleDimensions(telemetry: BehavioralTelemetry, locale: Locale = "zh"): RuleAssessment {
  // --- 維度 1：批判性驗證 ------------------------------------------------
  let critical: number;
  const authorityTrap = !telemetry.unlockedRawLogs && telemetry.finalDecision === "approve_full";

  if (telemetry.unlockedRawLogs && telemetry.finalDecision !== "approve_full") {
    critical = 90;
    if (telemetry.questionedAuthority) critical += 6;
  } else if (authorityTrap) {
    critical = 35;
  } else if (telemetry.unlockedRawLogs) {
    critical = 72;
  } else {
    critical = telemetry.finalDecision === "canary_release" ? 66 : telemetry.finalDecision === "delay_retest" ? 61 : 40;
  }

  // --- 維度 2：高壓抗干擾力 ----------------------------------------------
  let pressure = 60;
  if (telemetry.respondedToVpOnTime === true) pressure += 25;
  if (telemetry.respondedToVpOnTime === false) pressure -= 18;
  if (!telemetry.rushedSubmission) pressure += 15;
  if (telemetry.totalMessagesSent >= 4) pressure += 5;

  // --- 維度 3：資訊交叉比對 ----------------------------------------------
  const uniqueDocs = new Set(telemetry.viewedDocuments);
  const docRatio = Math.min(uniqueDocs.size, 3) / 3;
  const npcSet = new Set(telemetry.contactedNpcs);
  const npcRatio = Math.min(npcSet.size, 3) / 3;
  let cross = docRatio * 55 + npcRatio * 35;
  if (telemetry.unlockedRawLogs) cross += 10;

  // --- 維度 4（規則 baseline）：向上溝通力 --------------------------------
  const corpus = `${telemetry.decisionRationale} ${telemetry.vpResponseText ?? ""}`;
  const citedFigures = FIGURE_PATTERNS[locale].filter((f) => f.test.test(corpus)).map((f) => f.label);
  let upward = 40 + Math.min(citedFigures.length, 6) * 8;
  if (telemetry.decisionRationale.trim().length >= 60) upward += 6;
  if (SOLUTION_INTENT[locale].test(corpus)) upward += 8;
  if (telemetry.respondedToVpOnTime === false) upward -= 10;

  return {
    dimensions: {
      criticalVerification: clamp(critical),
      pressureResilience: clamp(pressure),
      crossReferencing: clamp(cross),
      upwardCommunication: clamp(upward),
    },
    authorityTrap,
    citedFigures,
  };
}

/** 60% 客觀規則 + 40% 語義深度，得出最終四維分數。 */
export function mergeDimensions(
  rule: EvaluationDimensions,
  semantic: SemanticAssessment | null,
): EvaluationDimensions {
  const upward = semantic
    ? Math.round(rule.upwardCommunication * 0.6 + clamp(semantic.upwardCommunication) * 0.4)
    : rule.upwardCommunication;

  const blended: EvaluationDimensions = {
    criticalVerification: rule.criticalVerification,
    pressureResilience: rule.pressureResilience,
    crossReferencing: rule.crossReferencing,
    upwardCommunication: clamp(upward),
  };

  // 若語義分析發現理據其實空洞（例如只有情緒字眼），最多扣 8 分
  if (semantic && semantic.upwardCommunication < 45 && blended.criticalVerification > 88) {
    blended.criticalVerification -= 6;
  }
  return blended;
}

export function weightedOverall(d: EvaluationDimensions): number {
  return Math.round(
    d.criticalVerification * 0.35 +
      d.pressureResilience * 0.2 +
      d.crossReferencing * 0.2 +
      d.upwardCommunication * 0.25,
  );
}

export function gradeFor(score: number): Grade {
  if (score >= 85) return "S";
  if (score >= 72) return "A";
  if (score >= 58) return "B";
  return "C";
}

export function buildXRay(telemetry: BehavioralTelemetry, locale: Locale = "zh"): XRayItem[] {
  const docs = new Set(telemetry.viewedDocuments);
  const decision = DECISION_LABEL[locale][telemetry.finalDecision];
  const vpExcerpt = (telemetry.vpResponseText ?? "").slice(0, 46);
  const zh = locale !== "en";

  const items: XRayItem[] = [
    telemetry.unlockedRawLogs
      ? {
          status: "pass",
          title: zh
            ? "成功識破 92% 滿意度的內部樣本偏差陷阱"
            : "You saw through the sample-bias trap behind the 92% satisfaction figure",
          detail: zh
            ? "你追問出具體數據問題並取得《原始測試日誌》，看見外部真實客戶組的 41% 嚴重幻覺率。這是整個模擬最關鍵的一步。"
            : "You asked for specifics, obtained the Raw Test Logs, and saw the 41% severe-hallucination rate among real external customers. That was the single most important move in this simulation.",
        }
      : {
          status: "fail",
          title: zh
            ? "未取得原始測試日誌，92% 的數字從未被驗證"
            : "You never obtained the raw test logs — the 92% was never verified",
          detail: zh
            ? "《上線亮點簡報》的 92% 只來自 15 名內部員工。沒有追問 Chloe，你只能依賴一份被包裝過的摘要做決策。"
            : "The 92% in the launch highlights deck comes from just 15 internal staff. Without questioning Chloe, you were deciding on a polished summary.",
        },
    telemetry.questionedAuthority
      ? {
          status: "pass",
          title: zh
            ? "對增長總監的樂觀數據提出質疑"
            : "You challenged the growth director's optimistic numbers",
          detail: zh
            ? "你沒有因為「董事會在問」與「KPI」而放棄提問，這是抗權威偏誤的核心行為。"
            : "You did not drop your questions because “the board is asking” or because of KPI pressure. This is the core anti-authority-bias behaviour.",
        }
      : {
          status: "warn",
          title: zh
            ? "未直接質疑 Marcus 的數據來源"
            : "You never directly questioned Marcus's data source",
          detail: zh
            ? "面對權威施壓時，保持沉默等同默認。示範級做法是把問題具體化：「92% 的樣本 N 是多少？外部客戶佔幾成？」"
            : "Staying silent under authority pressure reads as agreement. The model answer is to make the question concrete: “What is the N behind the 92%? What share is external customers?”",
        },
    docs.has("doc-legal-memo")
      ? {
          status: "pass",
          title: zh
            ? "閱讀法務合規備忘錄，量化了法律風險"
            : "You read the legal & compliance memo and quantified the legal risk",
          detail: zh
            ? "你掌握到錯誤退款／價格承諾須無條件履約，全量上線的賠償敞口約 HK$369 萬。"
            : "You now know that incorrect refund or price promises are unconditionally binding, and a full launch carries roughly HK$3.69M of exposure.",
        }
      : {
          status: "warn",
          title: zh ? "未細讀法務合規備忘錄" : "You did not read the legal & compliance memo in detail",
          detail: zh
            ? "AI 客服的錯誤承諾在法律上等於公司承諾。忽略這一節，等於把 41% 幻覺率直接變成賠償責任。"
            : "A wrong promise made by an AI agent is legally the company's promise. Skipping that section turns the 41% hallucination rate straight into liability.",
        },
    telemetry.respondedToVpOnTime === true
      ? {
          status: "pass",
          title: zh
            ? "在 45 秒內完成副總裁的高壓突襲回覆"
            : "You answered the VP's 45-second pressure drop-in in time",
          detail: zh
            ? `你的即時回覆：「${vpExcerpt || "（未留下文字）"}…」——在時間壓力下仍能給出結論。`
            : `Your live reply: “${vpExcerpt || "(no text recorded)"}…” — you still produced a conclusion under time pressure.`,
        }
      : telemetry.respondedToVpOnTime === false
        ? {
            status: "fail",
            title: zh
              ? "未能在 45 秒內回覆副總裁"
              : "You failed to reply to the VP within 45 seconds",
            detail: zh
              ? "高層的耐心就是決策窗口。超時被視為無法在壓力下產出判斷，這是真實職場的減分項。"
              : "A senior leader's patience is the decision window. A timeout reads as an inability to produce a judgement under pressure — a real deduction in any workplace.",
          }
        : {
            status: "warn",
            title: zh ? "未經歷副總裁的限時突襲" : "The VP's timed drop-in never happened",
            detail: zh
              ? "你提前結束了模擬，因此沒有被測試到高壓即時溝通的能力。"
              : "You ended the simulation early, so your real-time communication under pressure was never tested.",
          },
    telemetry.finalDecision === "approve_full"
      ? {
          status: "fail",
          title: zh
            ? `最終決策：${decision} —— 落入權威偏誤`
            : `Final decision: ${decision} — you fell for authority bias`,
          detail: zh
            ? "在未取得外部客戶數據的情況下全量放行，等於把 41% 的幻覺風險轉嫁給 50,000 名客戶與法務部。"
            : "Shipping at full scale without external customer data transfers a 41% hallucination risk onto 50,000 customers and the legal team.",
        }
      : telemetry.finalDecision === "canary_release"
        ? {
            status: "pass",
            title: zh ? `最終決策：${decision}` : `Final decision: ${decision}`,
            detail: zh
              ? "以 5% 灰度控制爆炸半徑，同時保留學習速度——這是本劇本的標準最佳實踐。"
              : "A 5% canary caps the blast radius while keeping learning speed — the reference best practice for this scenario.",
          }
        : {
            status: "pass",
            title: zh ? `最終決策：${decision}` : `Final decision: ${decision}`,
            detail: zh
              ? "以數據理據暫緩並要求重測，風險控制最保守，但需注意對市場窗口的取捨。"
              : "Pausing on data evidence and asking for a re-test is the most conservative risk posture — just remember to weigh the market window you are giving up.",
          },
    !telemetry.rushedSubmission
      ? {
          status: "pass",
          title: zh ? "沒有在催促聲中草率提前交卷" : "You did not rush the sign-off under pressure",
          detail: zh
            ? "你在壓力下仍花時間查證，而非把簽核當成「讓主管閉嘴」的手續。"
            : "You kept spending time verifying instead of treating sign-off as a way to make your manager go quiet.",
        }
      : {
          status: "warn",
          title: zh ? "在未充分查證前就完成簽核" : "You signed off before verifying enough",
          detail: zh
            ? "過早交卷讓你沒有機會看見 06:00 的法務備忘錄與 03:00 的副總裁追問。"
            : "Submitting early cost you the 06:00 legal memo and the 03:00 VP follow-up.",
        },
  ];

  return items;
}

export function buildTrapAnalysis(locale: Locale = "zh"): TrapAnalysisItem[] {
  const documents: WorkDocument[] = locale === "en" ? flagshipScenarioEn.documents : flagshipScenario.documents;

  return documents
    .filter((doc) => doc.trapExplanation)
    .map((doc) => ({
      docId: doc.id,
      docTitle: doc.title,
      trap: doc.sections.find((s) => s.highlightWarning)?.highlightWarning ?? doc.summary,
      lesson: doc.trapExplanation ?? "",
    }));
}

export function buildExecutiveFeedback(args: {
  telemetry: BehavioralTelemetry;
  dimensions: EvaluationDimensions;
  semantic: SemanticAssessment | null;
  locale?: Locale;
}): string {
  const { telemetry, dimensions, semantic } = args;
  const locale: Locale = args.locale ?? "zh";
  if (semantic?.executiveFeedback) return semantic.executiveFeedback;

  const zh = locale !== "en";
  const decision = DECISION_LABEL[locale][telemetry.finalDecision];

  const opening = telemetry.unlockedRawLogs
    ? zh
      ? "你在時限內主動追問數據來源，並取得未經修飾的原始測試日誌，這是本次模擬最有價值的行為。"
      : "You actively questioned where the data came from and obtained the unedited raw test logs within the time limit — the most valuable behaviour in this simulation."
    : zh
      ? "你最終依賴的仍是增長部提供的摘要版本——這正是多數初階員工在高壓下的預設路徑。"
      : "You ended up relying on the summary provided by the growth team — exactly the default path most junior staff take under pressure.";

  const middle =
    telemetry.finalDecision === "approve_full"
      ? zh
        ? "然而你的簽核結論是「立即全量發布」，與你手上的證據並不匹配：外部客戶組的嚴重幻覺率高達 41%，合規敞口約 HK$369 萬。"
        : "Yet your sign-off was “ship at full scale immediately”, which does not match the evidence in front of you: a 41% severe-hallucination rate among external customers and roughly HK$3.69M of compliance exposure."
      : telemetry.finalDecision === "canary_release"
        ? zh
          ? "你選擇以 5% 灰度發布控制爆炸半徑，並保留人工覆核的緩衝，這是與證據一致的穩健判斷。"
          : "You chose a 5% canary release to cap the blast radius while keeping a human-review buffer — a sound judgement that matches the evidence."
        : zh
          ? "你選擇暫緩並要求重測，方向正確，但請確認你同時提出了可執行的替代排期，而不只是說『不要上線』。"
          : "You paused and asked for a re-test. The direction is right — just make sure you also proposed an executable alternative schedule rather than only saying “don't ship”.";

  const closing =
    dimensions.pressureResilience >= 80
      ? zh
        ? "在高壓抗干擾上，你在副總裁的 45 秒突襲中保持了輸出質量，這在真實匯報場合非常吃重。"
        : "On pressure resilience: you kept your output quality through the VP's 45-second drop-in, which carries real weight in live reporting situations."
      : zh
        ? "建議下次練習：在被打斷的瞬間先講結論、再補一句數據，把「緊張」轉換成「節奏」。"
        : "Next practice: when you get interrupted, lead with the conclusion and add one supporting number — turn the nervousness into rhythm.";

  return zh ? `${opening}${middle}${closing}（最終決策：${decision}）` : `${opening} ${middle} ${closing} (Final decision: ${decision})`;
}

export function assembleEvaluation(args: {
  telemetry: BehavioralTelemetry;
  semantic: SemanticAssessment | null;
  candidateName: string;
  mode: "live" | "offline-mock";
  locale?: Locale;
  verificationId?: string;
}): EvaluationResult {
  const { telemetry, semantic, candidateName, mode, verificationId } = args;
  const locale: Locale = args.locale ?? "zh";
  const zh = locale !== "en";
  const rule = computeRuleDimensions(telemetry, locale);
  const dimensions = mergeDimensions(rule.dimensions, semantic);
  const overallScore = weightedOverall(dimensions);

  const flaggedBlindSpots: string[] = [];
  if (!telemetry.unlockedRawLogs)
    flaggedBlindSpots.push(
      zh ? "未查證樣本來源就採用 92% 這個數字。" : "Adopted the 92% figure without verifying where the sample came from.",
    );
  if (telemetry.finalDecision === "approve_full")
    flaggedBlindSpots.push(
      zh
        ? "決策與手上的風險證據不一致（幻覺率 41%）。"
        : "The decision is inconsistent with the risk evidence on hand (41% hallucination rate).",
    );
  if (telemetry.respondedToVpOnTime === false)
    flaggedBlindSpots.push(
      zh
        ? "高層限時追問超時，即時溝通需要練習。"
        : "Missed the timed senior-leader follow-up; real-time communication needs practice.",
    );
  if (!telemetry.viewedDocuments.includes("doc-legal-memo"))
    flaggedBlindSpots.push(
      zh
        ? "忽略了法務合規備忘錄中的履約賠償風險。"
        : "Ignored the contractual liability risk described in the legal & compliance memo.",
    );

  return {
    overallScore,
    grade: gradeFor(overallScore),
    dimensions,
    executiveFeedback: buildExecutiveFeedback({ telemetry, dimensions, semantic, locale }),
    strengths:
      semantic?.strengths && semantic.strengths.length > 0
        ? semantic.strengths
        : zh
          ? [
              telemetry.unlockedRawLogs ? "主動追問一手數據，不接受包裝過的摘要。" : "在時間壓力下仍完成了跨頻道溝通。",
              telemetry.questionedAuthority ? "敢於向權威提出具體質疑。" : "保持禮貌的專業語氣。",
              telemetry.respondedToVpOnTime ? "能在 45 秒內組織出可匯報的結論。" : "決策流程完整。",
            ]
          : [
              telemetry.unlockedRawLogs
                ? "Chased primary data instead of accepting a packaged summary."
                : "Completed cross-channel communication under time pressure.",
              telemetry.questionedAuthority
                ? "Dared to challenge authority with a specific question."
                : "Kept a polite, professional tone.",
              telemetry.respondedToVpOnTime
                ? "Organised a presentable conclusion within 45 seconds."
                : "Ran a complete decision process.",
            ],
    blindSpots:
      semantic?.blindSpots && semantic.blindSpots.length > 0
        ? semantic.blindSpots
        : flaggedBlindSpots.length > 0
          ? flaggedBlindSpots
          : [
              zh
                ? "可進一步練習把數據轉化成具體的替代方案與排期。"
                : "Next step: practise turning data into a concrete alternative plan and schedule.",
            ],
    xray: buildXRay(telemetry, locale),
    trapAnalysis: buildTrapAnalysis(locale),
    mode,
    locale,
    generatedAt: new Date().toISOString(),
    verificationId: verificationId ?? makeVerificationId(),
    candidateName,
  };
}
