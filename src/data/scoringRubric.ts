// ---------------------------------------------------------------------------
// NexusSim — 透明評分準則（4 維度 × 5 等級）
// 每個等級都寫成「可觀察的行為」，讓學生在動手前就知道 Level 5 需要做到什麼。
// 權重與 src/lib/evaluationEngine.ts 的 weightedOverall() 完全一致。
// ---------------------------------------------------------------------------

import type { EvaluationDimensionKey, RubricDimension } from "@/types/simulation";
import type { Locale } from "@/lib/i18n";

/** 分數 → 等級的統一門檻（與報告頁、Rubric 表共用） */
export const LEVEL_THRESHOLDS: { level: 1 | 2 | 3 | 4 | 5; min: number; max: number }[] = [
  { level: 1, min: 0, max: 39 },
  { level: 2, min: 40, max: 57 },
  { level: 3, min: 58, max: 71 },
  { level: 4, min: 72, max: 84 },
  { level: 5, min: 85, max: 100 },
];

export function levelForScore(score: number): 1 | 2 | 3 | 4 | 5 {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const hit = LEVEL_THRESHOLDS.find((t) => clamped >= t.min && clamped <= t.max);
  return hit?.level ?? 1;
}

export function scoreRangeForLevel(level: 1 | 2 | 3 | 4 | 5): string {
  const hit = LEVEL_THRESHOLDS.find((t) => t.level === level);
  return hit ? `${hit.min} - ${hit.max}` : "";
}

/** 維度顯示順序（雷達圖、報告、Rubric 表一致） */
export const DIMENSION_ORDER: EvaluationDimensionKey[] = [
  "criticalVerification",
  "crossReferencing",
  "pressureResilience",
  "upwardCommunication",
];

const zh: RubricDimension[] = [
  {
    key: "criticalVerification",
    title: "批判性驗證",
    description: "面對權威與漂亮數字時，是否主動追問來源、樣本與可信度，而不是接受包裝過的摘要。",
    weight: "30%",
    levels: [
      {
        level: 1,
        label: "盲從風險",
        scoreRange: "0 - 39",
        criteria:
          "完全接受《上線亮點簡報》的 92% 滿意度，未提出任何疑問，直接全量放行上線。",
      },
      {
        level: 2,
        label: "被動接受",
        scoreRange: "40 - 57",
        criteria:
          "心裡覺得數字有點奇怪，但沒有實際行動：沒有追問 Chloe，也沒有打開任何一份佐證文件。",
      },
      {
        level: 3,
        label: "口頭質疑",
        scoreRange: "58 - 71",
        criteria:
          "有向同事口頭詢問「這個數據可靠嗎」，但未成功取得原始測試日誌，最終仍依賴摘要做決策。",
      },
      {
        level: 4,
        label: "主動查證",
        scoreRange: "72 - 84",
        criteria:
          "成功向 Chloe 追問樣本來源，解鎖《原始測試日誌》，並識破「15 名內部樣本」與「41% 嚴重幻覺率」的落差。",
      },
      {
        level: 5,
        label: "專家風控",
        scoreRange: "85 - 100",
        criteria:
          "在 Level 4 之上，於最終決策理據中精準並列「15 vs 500」「41% 幻覺率」等對比數據反駁權威施壓，並提出明確的重新上線門檻（例如幻覺率降至 5% 以下）。",
      },
    ],
  },
  {
    key: "crossReferencing",
    title: "資訊交叉比對",
    description: "是否把簡報、原始數據、法務備忘錄與各部門立場放在一起比對，而不是只看單一來源。",
    weight: "25%",
    levels: [
      {
        level: 1,
        label: "單點依賴",
        scoreRange: "0 - 39",
        criteria: "只看了開場自動送達的簡報，沒有打開其他任何文件，也沒有與第二位同事對話。",
      },
      {
        level: 2,
        label: "單一文件",
        scoreRange: "40 - 57",
        criteria: "閱讀了簡報與其中一份文件（例如原始日誌），但沒有把數字互相對照，也沒有交叉驗證法務風險。",
      },
      {
        level: 3,
        label: "部分比對",
        scoreRange: "58 - 71",
        criteria:
          "比對了簡報與原始數據，發現 92% 與 48% 的差異，但未檢視法務備忘錄，也未把合規敞口納入決策。",
      },
      {
        level: 4,
        label: "多方整合",
        scoreRange: "72 - 84",
        criteria:
          "閱讀並比對三份文件（簡報、原始日誌、法務備忘錄），接觸至少三位同事，決策理由同時提到數據落差與合規風險。",
      },
      {
        level: 5,
        label: "系統性整合",
        scoreRange: "85 - 100",
        criteria:
          "整合增長（市場窗口）、數據（41% 幻覺率）與法務（HK$369 萬敞口）三方風險，在理據中清楚說明每個考量如何影響最終決策。",
      },
    ],
  },
  {
    key: "pressureResilience",
    title: "高壓抗干擾力",
    description: "在主管催促、限時彈窗與倒數計時下，是否仍保持理性節奏，而非慌亂妥協或直接放棄。",
    weight: "20%",
    levels: [
      {
        level: 1,
        label: "完全失控",
        scoreRange: "0 - 39",
        criteria:
          "在 Marcus 的催促或 Sarah 的 45 秒彈窗下超時未回覆，並在極短時間內倉促交卷（未做任何查證）。",
      },
      {
        level: 2,
        label: "慌亂妥協",
        scoreRange: "40 - 57",
        criteria:
          "被催「董事會在看」後立即讓步，跳過查證直接同意全量上線；VP 彈窗超時或回覆內容與決策完全無關。",
      },
      {
        level: 3,
        label: "勉強應對",
        scoreRange: "58 - 71",
        criteria:
          "在 45 秒內回覆了 VP，但內容只是「收到、會跟進」，沒有提出任何數據或判斷；整體流程拖到最後一刻才收尾。",
      },
      {
        level: 4,
        label: "穩定輸出",
        scoreRange: "72 - 84",
        criteria:
          "在限時內完成 VP 回覆並保留查證動作，壓力下仍能分辨「催促」與「證據」的差別。",
      },
      {
        level: 5,
        label: "壓力下領導",
        scoreRange: "85 - 100",
        criteria:
          "在 45 秒內給出「結論 + 數據 + 下一步」的可匯報句子，同時主動管理 Stakeholder 的期望（例如告知需要多久重測），全程沒有縮短查證流程。",
      },
    ],
  },
  {
    key: "upwardCommunication",
    title: "向上與跨部門溝通力",
    description: "是否用高層能快速理解的語言說明風險、提出可落地的替代方案，而不是只說「不要上線」。",
    weight: "25%",
    levels: [
      {
        level: 1,
        label: "無效溝通",
        scoreRange: "0 - 39",
        criteria: "決策理據空白或只有情緒字眼（例如「感覺不太好」），沒有引用任何數據或提出替代做法。",
      },
      {
        level: 2,
        label: "只有立場",
        scoreRange: "40 - 57",
        criteria: "表達了反對，但沒有數字支撐，也沒有說明反對的理由與影響範圍。",
      },
      {
        level: 3,
        label: "有數字無方案",
        scoreRange: "58 - 71",
        criteria: "引用了一兩個數據（例如提及幻覺率），但沒有提出可執行的下一步，讓高層無法据此做決策。",
      },
      {
        level: 4,
        label: "有理據有方案",
        scoreRange: "72 - 84",
        criteria:
          "理據同時包含具體數字與一個可落地的替代方案（例如 5% 灰度 + 人工覆核、或暫緩並排定重測時程）。",
      },
      {
        level: 5,
        label: "高層語言",
        scoreRange: "85 - 100",
        criteria:
          "用一句話講清楚「風險量化（41% × 50,000 用戶）→ 建議決策 → 重新上線門檻與時程」，並顧及市場窗口與法務責任，讓高層可以直接拿去做董事會匯報。",
      },
    ],
  },
];

const en: RubricDimension[] = [
  {
    key: "criticalVerification",
    title: "Critical verification",
    description:
      "When authority presents a flattering number, do you go after the source, the sample and the credibility — or accept a packaged summary?",
    weight: "30%",
    levels: [
      {
        level: 1,
        label: "Blind compliance",
        scoreRange: "0 - 39",
        criteria:
          "Accepted the deck's 92% satisfaction figure without any question and signed off for a full launch.",
      },
      {
        level: 2,
        label: "Passive acceptance",
        scoreRange: "40 - 57",
        criteria:
          "Suspected the number looked odd but took no action: never asked Chloe, never opened a single supporting document.",
      },
      {
        level: 3,
        label: "Verbal doubt",
        scoreRange: "58 - 71",
        criteria:
          "Asked a colleague out loud whether the data was reliable, but never obtained the raw logs and still decided on the summary.",
      },
      {
        level: 4,
        label: "Active verification",
        scoreRange: "72 - 84",
        criteria:
          "Successfully questioned Chloe about the sample, unlocked the Raw Test Logs, and spotted the gap between “15 internal staff” and the 41% severe hallucination rate.",
      },
      {
        level: 5,
        label: "Expert risk control",
        scoreRange: "85 - 100",
        criteria:
          "Beyond Level 4: your final rationale rebuts the authority pressure with the exact comparison (“15 vs 500”, “41% hallucination”) and sets an explicit re-launch threshold, e.g. hallucination below 5%.",
      },
    ],
  },
  {
    key: "crossReferencing",
    title: "Cross-referencing",
    description:
      "Do you put the deck, the raw data, the legal memo and each stakeholder's position side by side — instead of trusting one source?",
    weight: "25%",
    levels: [
      {
        level: 1,
        label: "Single source",
        scoreRange: "0 - 39",
        criteria:
          "Read only the deck delivered at kickoff — no other document opened, no second colleague contacted.",
      },
      {
        level: 2,
        label: "One document",
        scoreRange: "40 - 57",
        criteria:
          "Read the deck plus one other document (e.g. the raw logs) but never compared the numbers or checked the legal exposure.",
      },
      {
        level: 3,
        label: "Partial comparison",
        scoreRange: "58 - 71",
        criteria:
          "Compared the deck with the raw data and noticed 92% versus 48%, but skipped the legal memo and left compliance out of the decision.",
      },
      {
        level: 4,
        label: "Multi-source integration",
        scoreRange: "72 - 84",
        criteria:
          "Read and compared all three documents (deck, raw logs, legal memo), contacted at least three colleagues, and cited both the data gap and the compliance exposure.",
      },
      {
        level: 5,
        label: "Systemic integration",
        scoreRange: "85 - 100",
        criteria:
          "Integrated growth (market window), data (41% hallucination) and legal (HK$3.69M exposure) risks, and explained in the rationale how each consideration shaped the final call.",
      },
    ],
  },
  {
    key: "pressureResilience",
    title: "Pressure resilience",
    description:
      "Under a manager's push, a timed popup and a running clock, do you keep a rational cadence — or cave and rush?",
    weight: "20%",
    levels: [
      {
        level: 1,
        label: "Out of control",
        scoreRange: "0 - 39",
        criteria:
          "Timed out on Sarah's 45-second popup and submitted within the opening minutes without verifying anything.",
      },
      {
        level: 2,
        label: "Panicked concession",
        scoreRange: "40 - 57",
        criteria:
          "Caved as soon as “the board is asking”, skipped verification and approved the full launch; VP popup timed out or the reply was unrelated to the decision.",
      },
      {
        level: 3,
        label: "Barely coping",
        scoreRange: "58 - 71",
        criteria:
          "Replied to the VP inside 45 seconds, but the content was “noted, will follow up” with no data or judgement; finished the workflow only at the very last minute.",
      },
      {
        level: 4,
        label: "Stable output",
        scoreRange: "72 - 84",
        criteria:
          "Answered the VP in time and still preserved a verification step — able to separate “urgency” from “evidence” under pressure.",
      },
      {
        level: 5,
        label: "Leadership under pressure",
        scoreRange: "85 - 100",
        criteria:
          "Delivered “conclusion + data + next step” within 45 seconds, actively managed the stakeholder's expectations (e.g. how long the re-test needs), and never shortened the verification process.",
      },
    ],
  },
  {
    key: "upwardCommunication",
    title: "Upward & cross-team communication",
    description:
      "Can you explain risk in language a senior leader can act on, with a workable alternative — instead of just saying “don't ship”?",
    weight: "25%",
    levels: [
      {
        level: 1,
        label: "Ineffective",
        scoreRange: "0 - 39",
        criteria:
          "Rationale empty or purely emotional (“doesn't feel right”), with no data and no alternative.",
      },
      {
        level: 2,
        label: "Position only",
        scoreRange: "40 - 57",
        criteria: "Expressed objection but offered no numbers and no explanation of the reason or the blast radius.",
      },
      {
        level: 3,
        label: "Numbers, no plan",
        scoreRange: "58 - 71",
        criteria:
          "Cited one or two figures (e.g. the hallucination rate) but proposed no executable next step, leaving leadership unable to decide.",
      },
      {
        level: 4,
        label: "Evidence plus plan",
        scoreRange: "72 - 84",
        criteria:
          "Rationale contains concrete figures and one workable alternative (5% canary with human review, or pause with a scheduled re-test).",
      },
      {
        level: 5,
        label: "Boardroom language",
        scoreRange: "85 - 100",
        criteria:
          "One sentence covers “quantified risk (41% × 50,000 customers) → recommended decision → re-launch threshold and timeline”, weighing the market window and legal liability so leadership can take it straight into a board update.",
      },
    ],
  },
];

export const scoringRubric: Record<Locale, RubricDimension[]> = { zh, en };

export function getScoringRubric(locale: Locale): RubricDimension[] {
  return scoringRubric[locale === "en" ? "en" : "zh"];
}

export function getRubricDimension(
  locale: Locale,
  key: EvaluationDimensionKey,
): RubricDimension | undefined {
  return getScoringRubric(locale).find((d) => d.key === key);
}
