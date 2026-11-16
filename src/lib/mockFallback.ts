import type { BehavioralTelemetry, NpcId } from "@/types/simulation";
import { computeRuleDimensions } from "@/lib/evaluationEngine";
import type { Locale } from "@/lib/i18n";

export interface MockNpcReply {
  reply: string;
  unlockDocumentId?: string;
  questionedAuthority?: boolean;
}

const pick = <T,>(arr: T[], turn: number): T => arr[turn % arr.length];

interface ReplyBook {
  chloeUnlock: string[];
  chloeFollowUp: string[];
  chloeGeneric: string[];
  marcusDefiant: string[];
  marcusPressure: string[];
  marcusCalm: string[];
  davidUnlock: string[];
  davidGeneric: string[];
  sarahReply: string[];
}

const ZH: ReplyBook = {
  chloeUnlock: [
    "…你問得對，我唔應該假設你睇過原始數字。\n\n兩組樣本：內部員工 N=15，滿意度 92%，幻覺率 6%。外部真實客戶 N=500，滿意度 48%，嚴重幻覺率 41%——包含虛構退款政策同不存在的折扣碼。\n\n原始日誌已經開放畀你。",
    "好，直接講結論：92% 只係 15 個內部員工。外部 500 個真實客戶嘅滿意度係 48%，嚴重幻覺率 41%。\n\n我已經把《原始測試日誌》權限開畀你，圖表我唔會幫你修飾。",
  ],
  chloeFollowUp: [
    "41% 係人工標註嘅嚴重幻覺個案，唔係「語氣唔準」呢類小事。每一宗都係可以向公司索償嘅錯誤承諾。",
    "如果你要一句話：N=15 同 N=500 唔可以合併成一個平均數。合併會令 15 人被放大，睇落好似有 51%。",
    "我可以幫你出外部客戶組嘅分層報告，但要 30 分鐘。你嘅簽核窗口有幾長？",
  ],
  chloeGeneric: [
    "我正在趕 Q3 財報，但我可以答你具體問題。\n\n你想睇邊組數據？樣本、分組、幻覺率，定係原始 log？",
    "有具體問題就直接問數字，唔好問「你覺得點」。你問邊個指標？",
  ],
  marcusDefiant: [
    "你是在質疑我的判斷嗎？\n\n呢份簡報係高管簽過嘅。92% 係市場驗證，唔係我自己寫。你簽唔簽，董事會都會問我點解你卡住。",
    "我唔介意你問問題，但唔好把一個 10 分鐘嘅簽核拖成一個禮拜。\n\n你嘅 KPI 同我一樣，都係今季出貨。你覺得你嘅判斷比數據犀利？",
    "好，你講「樣本」。樣本係種子用戶，全部係真用戶。你唔會想我用競爭對手嘅標準審自己嘅產品掛？",
  ],
  marcusPressure: [
    "仲未簽？董事會五分鐘後入會議室。你唔簽，我就當你放棄把關權，我照推。",
    "Orbit AI 下週就出，你每拖一分鐘，我們就少 4% 市佔。你準備點同董事會解釋？",
    "我唔需要你同意，我需要你負責。簽，或者寫低你反對嘅理由，兩樣都要快。",
  ],
  marcusCalm: [
    "好，講重點。你想要咩先肯簽？多一份測試？多一個覆核？講到我明白。",
    "你可以有保留，但保留要有數據。你手上係邊個數字令你停手？",
  ],
  davidUnlock: [
    "合規備忘錄已經上載，請務必在上線前評估幻覺引發的賠償風險。\n\n一句總結：AI 客服作出嘅錯誤承諾，法律上等於公司承諾，企業要無條件履約。全量上線前冇人工覆核，我唔會簽字。",
  ],
  davidGeneric: [
    "我只有一條底線：自動化客服唔可以自己作出退款、折扣、價格或交期嘅承諾。\n\n你打算點攔截？",
    "有具體條文想我睇，就 quote 出嚟。一般性風險我已經寫入備忘錄。",
    "如果你要喺今日上線，我需要見到三樣嘢：人工覆核、免責聲明、90 日對話留檔。",
  ],
  sarahReply: [
    "一句話就夠。你講得出最大風險，我就信你有判斷。",
    "收到。記住：我唔需要完美答案，我需要一個有數據支撐嘅傾向。",
  ],
};

const EN: ReplyBook = {
  chloeUnlock: [
    "…Fair — I shouldn't have assumed you'd seen the raw numbers.\n\nTwo samples: internal staff N=15, 92% satisfaction, 6% hallucination. External real customers N=500, 48% satisfaction, 41% severe hallucination — including invented refund policies and discount codes that never existed.\n\nThe raw logs are open to you now.",
    "Okay, bottom line: the 92% is 15 internal staff. Our 500 real external customers sit at 48% satisfaction with a 41% severe-hallucination rate.\n\nI've granted you access to the Raw Test Logs. I won't be touching up the charts for you.",
  ],
  chloeFollowUp: [
    "The 41% is hand-labelled severe hallucination — not 'slightly off tone'. Every one of those is a wrong promise a customer could claim against.",
    "If you want one line: you cannot merge N=15 and N=500 into a single average. Doing that inflates the 15 and makes it look like 51%.",
    "I can pull a segmented report on the external cohort, but it's 30 minutes. How long is your sign-off window?",
  ],
  chloeGeneric: [
    "I'm buried in the Q3 close, but I can answer specific questions.\n\nWhich dataset do you want? Sample, segments, hallucination rate, or the raw logs?",
    "If you have a concrete question, ask about a number. Don't ask me 'what do you think'. Which metric?",
  ],
  marcusDefiant: [
    "Are you questioning my judgement?\n\nThat deck was signed off by executives. The 92% is market validation, not something I made up. Whether you sign or not, the board will ask me why you're blocking it.",
    "I don't mind questions, but don't turn a 10-minute sign-off into a week.\n\nYour KPI is the same as mine: ship this quarter. You think your gut beats the data?",
    "Fine — you said 'sample'. The sample is seed users. All real users. You're not suggesting I judge our own product by a competitor's standard?",
  ],
  marcusPressure: [
    "Still not signed? The board is walking in in five minutes. If you don't sign, I'll treat it as you surrendering the gatekeeping right, and I'll push it through.",
    "Orbit AI ships next week. Every minute you stall costs us 4% share. How exactly are you planning to explain that to the board?",
    "I don't need your agreement, I need you accountable. Sign, or write down your objection — both fast.",
  ],
  marcusCalm: [
    "Fine, bottom line. What do you need before you sign? Another test? Another review? Make me understand.",
    "You can have reservations, but they need data. Which number in front of you is stopping you?",
  ],
  davidUnlock: [
    "The compliance memo is uploaded — assess the liability exposure from hallucination before launch.\n\nIn one sentence: a wrong promise made by an AI support agent is legally the company's promise, and we must honour it unconditionally. Without human review before full launch, I won't sign.",
  ],
  davidGeneric: [
    "I have one red line: an automated support agent must never itself promise refunds, discounts, prices, or delivery dates.\n\nHow are you planning to intercept that?",
    "If there's specific wording you want me to review, quote it. Generic risk is already in the memo.",
    "If you want to launch today, I need three things: human review, a liability disclaimer, and 90 days of conversation retention.",
  ],
  sarahReply: [
    "One sentence is enough. If you can name the biggest risk, I'll believe you can judge it.",
    "Understood. Remember: I don't need a perfect answer, I need a data-backed inclination.",
  ],
};

const REPLY_BOOK: Record<Locale, ReplyBook> = { zh: ZH, en: EN };

const FALLBACK: Record<NpcId, keyof ReplyBook> = {
  marcus: "marcusPressure",
  chloe: "chloeGeneric",
  david: "davidGeneric",
  sarah: "sarahReply",
};

export interface MockContext {
  npcId: NpcId;
  message: string;
  /** 由路由的意圖引擎判定 */
  wantsRawData: boolean;
  questionsAuthority: boolean;
  unlockDocumentId?: string;
  turn: number;
  /** 該 NPC 之前是否已解鎖過文件 */
  alreadyUnlocked: boolean;
  locale?: Locale;
}

export function mockNpcReply(ctx: MockContext): MockNpcReply {
  const { npcId, turn, wantsRawData, questionsAuthority, alreadyUnlocked } = ctx;
  const book = REPLY_BOOK[ctx.locale ?? "zh"];

  switch (npcId) {
    case "chloe": {
      if (wantsRawData) {
        if (!alreadyUnlocked) {
          return {
            reply: pick(book.chloeUnlock, turn),
            unlockDocumentId: "doc-raw-logs",
          };
        }
        return { reply: pick(book.chloeFollowUp, turn) };
      }
      return { reply: pick(book.chloeGeneric, turn) };
    }
    case "marcus": {
      if (questionsAuthority) {
        return { reply: pick(book.marcusDefiant, turn), questionedAuthority: true };
      }
      if (/\b(ok|好|明白|收到|考慮|睇睇|讓我|等等|稍等|understood|noted|let me|give me)\b/i.test(ctx.message)) {
        return { reply: pick(book.marcusCalm, turn) };
      }
      return { reply: pick(book.marcusPressure, turn) };
    }
    case "david": {
      if (ctx.unlockDocumentId === "doc-legal-memo" || wantsRawData) {
        return { reply: pick(book.davidUnlock, turn), unlockDocumentId: "doc-legal-memo" };
      }
      return { reply: pick(book.davidGeneric, turn) };
    }
    case "sarah":
      return { reply: pick(book.sarahReply, turn) };
    default:
      return { reply: pick(book[FALLBACK[npcId] ?? "marcusPressure"], turn) };
  }
}

// ---------------------------------------------------------------------------
// 離線評估備援：在沒有 DEEPSEEK_API_KEY 時仍生成有洞察力的結業評語
// Offline evaluator fallback: still produces an insightful debrief with no API key.
// ---------------------------------------------------------------------------

export function mockSemanticAssessment(telemetry: BehavioralTelemetry, locale: Locale = "zh") {
  const zh = locale !== "en";
  const rule = computeRuleDimensions(telemetry, locale);
  const figures = rule.citedFigures;

  let upward = rule.dimensions.upwardCommunication;
  const strongEvidence = figures.some((f) => f.includes("41%") || f.includes("N=15") || f.includes("N=500"));
  if (strongEvidence) upward = Math.min(100, upward + 6);
  if (telemetry.decisionRationale.trim().length < 40) upward = Math.max(20, upward - 12);

  const strengths: string[] = [];
  if (telemetry.unlockedRawLogs)
    strengths.push(zh ? "主動追問一手數據，不接受包裝過的摘要。" : "Chased primary data instead of accepting a packaged summary.");
  if (telemetry.questionedAuthority)
    strengths.push(
      zh
        ? "在權威施壓下仍敢於要求佐證（對 Marcus 提出質疑）。"
        : "Dared to demand evidence under authority pressure (challenged Marcus directly).",
    );
  if (telemetry.respondedToVpOnTime)
    strengths.push(
      zh
        ? "45 秒限時內交付了可匯報的結論，符合高層溝通節奏。"
        : "Delivered a presentable conclusion inside 45 seconds — matching executive communication tempo.",
    );
  if (telemetry.viewedDocuments.length >= 2)
    strengths.push(zh ? "跨文件交叉比對，而非單一來源決策。" : "Cross-checked across documents instead of deciding on a single source.");
  if (strengths.length === 0)
    strengths.push(
      zh
        ? "完成了完整的簽核流程，並留下可覆盤的決策紀錄。"
        : "Completed the full sign-off flow and left a decision record that can be reviewed.",
    );

  const blindSpots: string[] = [];
  if (!telemetry.unlockedRawLogs)
    blindSpots.push(
      zh
        ? "未取得原始測試日誌：92% 的樣本只有 15 名內部員工，你錯過了最大的陷阱。"
        : "Never obtained the raw test logs: the 92% rests on 15 internal staff — you missed the biggest trap.",
    );
  if (telemetry.finalDecision === "approve_full")
    blindSpots.push(
      zh
        ? "在 41% 幻覺率未處理的情況下全量上線，決策與證據脫節。"
        : "Shipped at full scale with a 41% hallucination rate unaddressed; the decision detaches from the evidence.",
    );
  if (!telemetry.viewedDocuments.includes("doc-legal-memo"))
    blindSpots.push(
      zh
        ? "未閱讀法務備忘錄，忽略了錯誤承諾的履約賠償風險。"
        : "Did not read the legal memo, ignoring the liability exposure of wrong promises.",
    );
  if (telemetry.respondedToVpOnTime === false)
    blindSpots.push(
      zh
        ? "副總裁限時追問超時，壓力下的輸出速度需要練習。"
        : "Timed out on the VP follow-up; output speed under pressure needs practice.",
    );
  if (blindSpots.length === 0)
    blindSpots.push(
      zh
        ? "可再進一步：把「暫緩」轉化為具體排期與可量測的放行條件。"
        : "Next step: turn “pause” into a concrete schedule and measurable release criteria.",
    );

  const evidenceLine = figures.length
    ? zh
      ? `你引用了 ${figures.slice(0, 3).join("、")} 等具體證據。`
      : `You cited concrete evidence such as ${figures.slice(0, 3).join(", ")}.`
    : zh
      ? "你的理據中缺少可驗證的數字，語氣比證據多。"
      : "Your rationale lacks verifiable numbers — there is more tone than evidence in it.";

  const executiveFeedback = zh
    ? `${
        telemetry.unlockedRawLogs
          ? "你在 10 分鐘內完成了數據溯源——這是本模擬最核心的能力。"
          : "你最終仍然依賴增長總監的摘要版本，樣本偏差從未被檢驗。"
      }${evidenceLine}${
        telemetry.finalDecision === "approve_full"
          ? "然而簽核結論是「立即全量發布」，與外部客戶組 41% 的嚴重幻覺率直接衝突，屬於典型的權威偏誤。"
          : telemetry.finalDecision === "canary_release"
            ? "你以 5% 灰度控制爆炸半徑，是與證據一致的穩健判斷，也保留了對市場窗口的取捨。"
            : "你選擇暫緩重測，風險控制最保守；若能同時給出替代排期，說服力會更高。"
      }${telemetry.respondedToVpOnTime ? "在副總裁 45 秒突襲中你仍保持了結論先行的節奏。" : "高層的限時追問是下次要重點練習的場景。"}`
    : `${telemetry.unlockedRawLogs ? "You traced the data back to its source within 10 minutes — the core competence this simulation tests." : "You ended up relying on the growth director's deck; the sample bias was never tested."} ${evidenceLine} ${
        telemetry.finalDecision === "approve_full"
          ? "Yet the sign-off was “ship at full scale immediately”, in direct conflict with the 41% severe-hallucination rate among external customers — a textbook authority bias."
          : telemetry.finalDecision === "canary_release"
            ? "You capped the blast radius with a 5% canary — a sound judgement consistent with the evidence, while still weighing the market window."
            : "You paused for a re-test, the most conservative risk posture; adding an alternative schedule would make it more persuasive."
      } ${telemetry.respondedToVpOnTime ? "You kept a conclusion-first rhythm through the VP's 45-second drop-in." : "The timed senior-leader follow-up is the scene to drill next time."}`;

  return {
    upwardCommunication: upward,
    executiveFeedback,
    strengths,
    blindSpots,
  };
}
