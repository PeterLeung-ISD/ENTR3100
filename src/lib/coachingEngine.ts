// ---------------------------------------------------------------------------
// 升等建議（dimensionCoaching）與遺漏步驟（missedSteps）診斷引擎
// 教授反饋迭代：結算不能只給分數，必須說清楚「下一步怎麼做」與「漏了什麼」。
// 所有輸出都由可驗證的行為埋點推導，離線 Mock 與 Live DeepSeek 皆走同一套邏輯。
// ---------------------------------------------------------------------------

import { getScoringRubric, levelForScore } from "@/data/scoringRubric";
import type { Locale } from "@/lib/i18n";
import {
  DIMENSION_ORDER,
} from "@/data/scoringRubric";
import type {
  BehavioralTelemetry,
  DimensionCoaching,
  EvaluationDimensionKey,
  EvaluationDimensions,
  MissedStepItem,
} from "@/types/simulation";

const NEXT_LEVEL_ACTIONS: Record<Locale, Record<EvaluationDimensionKey, Record<1 | 2 | 3 | 4, string>>> = {
  zh: {
    criticalVerification: {
      1: "先做一件最低限度的事：在簽核前打開《原始測試日誌》，確認 92% 的樣本到底有多大。你可以直接問 Chloe：「這 92% 的 N 是多少？內部還是外部客戶？」",
      2: "把懷疑變成動作：向 Chloe 追問樣本來源，並在文件開啟後對照簡報中的 92% 與原始日誌的 48%／41%，把落差寫進你的筆記。",
      3: "你已會口頭質疑，但還缺「證據落地」：在向 Marcus 回覆時附上具體數字（92% 來自 N=15 內部員工，外部 500 名客戶只有 48% 滿意、41% 嚴重幻覺），讓質疑變成可查證的紀錄。",
      4: "你已識破樣本偏差，最後一步是把「修正門檻」寫進決策：例如要求幻覺率由 41% 降至 5% 以下、補做 ≥500 名外部客戶的回歸測試後才全量上線。",
    },
    crossReferencing: {
      1: "先別急著決定：在戰情室裡至少打開簡報＋原始日誌兩份文件，並與 Chloe、David 各對話一次，讓決策有兩個以上的資訊來源。",
      2: "把兩份文件的數字並排：簡報的 92%／1.2s 與原始日誌的 48%／41%／N=15，寫下你認為哪一個數字更能代表真實用戶。",
      3: "補上法務這一塊：打開《法務合規備忘錄》，把 HK$369 萬的賠償敞口與 20,500 名受影響客戶寫進你的風險評估。",
      4: "把三方風險收斂成一句話：市場窗口（增長）、41% 幻覺率（數據）、HK$369 萬敞口（法務），並說明三者如何共同決定你的上線方案。",
    },
    pressureResilience: {
      1: "先練一件事：把「立即回覆」的衝動壓住 10 秒。副總裁彈窗出現時，先打「結論 + 一個數字 + 下一步」的骨架，再送出。",
      2: "被催促時，用一句話把壓力交還給流程：「我可以在 3 分鐘內給結論，但需要先確認外部客戶的幻覺率。」這句話讓你既回應了高層，又保住了查證。",
      3: "你的回覆準時但太空泛。下次在 45 秒內直接給出可匯報的句子，例如：「建議 5% 灰度上線，因為外部客戶幻覺率 41%，我會在兩週內補齊回歸測試。」",
      4: "你已能穩定輸出，下一步是主動管理期望：在回覆中附上時程（例如「重測需要 5 個工作天」）與升級條件，讓高層知道何時會拿到下一步資訊。",
    },
    upwardCommunication: {
      1: "決策理據至少寫滿 40 字，並包含一個具體數字。最小可用句型：「我建議〔方案〕，因為〔數據〕，下一步是〔行動〕。」",
      2: "把立場換成論證：在理據中加入你查到的對比數據（15 vs 500、41% 幻覺率），並說明它對 50,000 名客戶意味著什麼風險。",
      3: "你已有數字，缺的是「可執行方案」。在理據結尾加上一句：「建議先以 5% 灰度上線並人工覆核，兩週後幻覺率低於 5% 再全量。」",
      4: "把理據壓縮成高層可直接匯報的一句話：「風險量化（41% × 50,000 用戶）→ 建議決策（5% 灰度）→ 重新上線門檻（幻覺率 <5%，兩週）」；同時主動說明市場窗口的取捨。",
    },
  },
  en: {
    criticalVerification: {
      1: "Do the minimum first: open the Raw Test Logs before signing anything and check how large the sample behind the 92% really is. Ask Chloe directly: “What is the N behind 92%? Internal or external customers?”",
      2: "Turn suspicion into action: question Chloe about the sample, then compare the deck's 92% with the raw logs' 48% / 41% and write the gap down.",
      3: "You already voice doubt but lack evidence on record: when you reply to Marcus, attach the numbers (92% from N=15 internal staff; 500 external customers at 48% satisfaction and 41% severe hallucination) so the challenge becomes auditable.",
      4: "You spotted the sample bias — final step is to put the correction threshold into the decision, e.g. require hallucination below 5% and a ≥500-customer regression test before a full launch.",
    },
    crossReferencing: {
      1: "Don't decide yet: open at least the deck and the raw logs, and talk to both Chloe and David so your call rests on more than one source.",
      2: "Put the two documents side by side: the deck's 92% / 1.2s versus the raw logs' 48% / 41% / N=15, then note which number better represents real users.",
      3: "Add the legal layer: open the Legal & Compliance Memo and put the HK$3.69M exposure and 20,500 affected customers into your risk assessment.",
      4: "Collapse three risks into one sentence — market window (growth), 41% hallucination (data) and HK$3.69M exposure (legal) — and say how each shaped your launch plan.",
    },
    pressureResilience: {
      1: "Practise one thing: hold the urge to reply instantly. When the VP popup appears, draft “conclusion + one number + next step” before sending.",
      2: "When pushed, hand the pressure back to the process in one sentence: “I can give you a conclusion in three minutes, but I need to confirm the external hallucination rate first.”",
      3: "Your reply was on time but empty. Next time deliver a presentable sentence within 45 seconds: “Recommend a 5% canary because the external hallucination rate is 41%; I'll complete regression testing within two weeks.”",
      4: "You are stable under pressure — now manage expectations actively: include the timeline (“the re-test takes five business days”) and escalation conditions so leadership knows when the next update arrives.",
    },
    upwardCommunication: {
      1: "Write at least 40 words of rationale with one concrete number. Minimum viable sentence: “I recommend [option] because [data]; the next step is [action].”",
      2: "Replace position with argument: add the comparison data you found (15 vs 500, 41% hallucination) and explain what it means for 50,000 customers.",
      3: "You have numbers but no executable plan. End the rationale with: “Recommend a 5% canary with human review; go full scale after two weeks if hallucination stays below 5%.”",
      4: "Compress the rationale into a board-ready sentence — “quantified risk (41% × 50,000 users) → recommended decision (5% canary) → re-launch threshold (<5% hallucination, two weeks)” — and name the market window you are trading off.",
    },
  },
};

const EVIDENCE_KEYS: Record<Locale, Record<EvaluationDimensionKey, string>> = {
  zh: {
    criticalVerification: "批判性驗證",
    crossReferencing: "資訊交叉比對",
    pressureResilience: "高壓抗干擾力",
    upwardCommunication: "向上溝通力",
  },
  en: {
    criticalVerification: "Critical verification",
    crossReferencing: "Cross-referencing",
    pressureResilience: "Pressure resilience",
    upwardCommunication: "Upward communication",
  },
};

function evidenceFor(
  key: EvaluationDimensionKey,
  telemetry: BehavioralTelemetry,
  locale: Locale,
  citedFigures: string[],
): string {
  const zh = locale !== "en";
  const docs = new Set(telemetry.viewedDocuments);
  const docNames = zh
    ? { deck: "《上線亮點簡報》", raw: "《原始測試日誌》", legal: "《法務合規備忘錄》" }
    : { deck: "the launch deck", raw: "the Raw Test Logs", legal: "the Legal & Compliance Memo" };

  switch (key) {
    case "criticalVerification": {
      if (telemetry.unlockedRawLogs && telemetry.finalDecision !== "approve_full") {
        return zh
          ? "系統觀察到：你成功解鎖《原始測試日誌》，並在最終決策中選擇了非全量放行的方案 — 這是識破 15 人內部樣本偏差的關鍵行為。"
          : "Observed: you unlocked the Raw Test Logs and chose a non-full-launch option — the decisive behaviour that broke the 15-person sample-bias trap.";
      }
      if (!telemetry.unlockedRawLogs && telemetry.finalDecision === "approve_full") {
        return zh
          ? "系統觀察到：全程未取得原始測試日誌，最終仍以 92% 為依據全量放行 — 這是典型的權威偏誤路徑。"
          : "Observed: the raw logs were never obtained, yet the full launch was approved on the strength of the 92% figure — a textbook authority-bias path.";
      }
      if (telemetry.unlockedRawLogs) {
        return zh
          ? "系統觀察到：你取得了原始日誌，但最終仍選擇全量放行，顯示查證結果沒有轉化成決策。"
          : "Observed: you obtained the raw logs but still approved a full launch — the evidence never made it into the decision.";
      }
      return zh
        ? "系統觀察到：你沒有解鎖原始日誌，決策依據停留在增長部提供的摘要版本。"
        : "Observed: you never unlocked the raw logs, so the decision rested on the growth team's summary.";
    }
    case "crossReferencing": {
      const opened = telemetry.viewedDocuments.length;
      const npcs = telemetry.contactedNpcs.length;
      const which = [
        docs.has("doc-exec-deck") ? docNames.deck : null,
        docs.has("doc-raw-logs") ? docNames.raw : null,
        docs.has("doc-legal-memo") ? docNames.legal : null,
      ].filter(Boolean);
      return zh
        ? `系統觀察到：你共開啟 ${opened} 份文件（${which.join("、") || "僅開場簡報"}），並與 ${npcs} 位同事互動。`
        : `Observed: you opened ${opened} document(s) (${which.join(", ") || "only the kickoff deck"}) and interacted with ${npcs} colleague(s).`;
    }
    case "pressureResilience": {
      const vp =
        telemetry.respondedToVpOnTime === null
          ? zh
            ? "未經歷副總裁限時彈窗"
            : "the VP popup never occurred"
          : telemetry.respondedToVpOnTime
            ? zh
              ? "於 45 秒內完成副總裁回覆"
              : "the VP was answered within 45 seconds"
            : zh
              ? "副總裁彈窗超時未回覆"
              : "the VP popup timed out";
      return zh
        ? `系統觀察到：${vp}；${telemetry.rushedSubmission ? "且在查證前就提早交卷" : "且未在催促下草率交卷"}，全程發送 ${telemetry.totalMessagesSent} 則訊息。`
        : `Observed: ${vp}; you ${telemetry.rushedSubmission ? "submitted early before verifying" : "did not rush the sign-off"}, sending ${telemetry.totalMessagesSent} messages in total.`;
    }
    case "upwardCommunication": {
      const figures = citedFigures.length > 0 ? citedFigures.join("、") : zh ? "無具體數字" : "no concrete figures";
      return zh
        ? `系統觀察到：決策理據共 ${telemetry.decisionRationale.trim().length} 字，引用數據包含 ${figures}。`
        : `Observed: the rationale runs ${telemetry.decisionRationale.trim().length} characters and cites ${figures}.`;
    }
  }
}

export function buildDimensionCoaching(args: {
  telemetry: BehavioralTelemetry;
  dimensions: EvaluationDimensions;
  locale: Locale;
  citedFigures: string[];
}): DimensionCoaching[] {
  const { telemetry, dimensions, locale, citedFigures } = args;
  const zh = locale !== "en";
  const rubric = getScoringRubric(locale);

  return DIMENSION_ORDER.map((key) => {
    const score = dimensions[key];
    const achievedLevel = levelForScore(score);
    const title = rubric.find((d) => d.key === key)?.title ?? EVIDENCE_KEYS[locale][key];
    const next = achievedLevel < 5 ? NEXT_LEVEL_ACTIONS[locale][key][achievedLevel as 1 | 2 | 3 | 4] : null;
    const levelLabel = (l: number) => (zh ? `Level ${l}` : `Level ${l}`);

    const howToLevelUp =
      achievedLevel >= 5
        ? zh
          ? `你已達到 ${levelLabel(5)}（最高等級）：維持這個水準，重點是把它變成可複製的習慣 — 每次決策都保留「數據 → 風險 → 門檻 → 時程」四段結構。`
          : `You already reached ${levelLabel(5)} (top level): keep it up by turning this into a repeatable habit — every decision keeps the “data → risk → threshold → timeline” structure.`
        : zh
          ? `你目前在「${title}」為 ${levelLabel(achievedLevel)}（${score} 分）。若想升至 ${levelLabel(achievedLevel + 1)}：${next}`
          : `You are currently at ${levelLabel(achievedLevel)} in “${title}” (${score} pts). To reach ${levelLabel(achievedLevel + 1)}: ${next}`;

    return {
      key,
      title,
      score,
      achievedLevel,
      evidenceObserved: evidenceFor(key, telemetry, locale, citedFigures),
      howToLevelUp,
    };
  });
}

// ---------------------------------------------------------------------------
// 遺漏步驟
// ---------------------------------------------------------------------------

export function buildMissedSteps(telemetry: BehavioralTelemetry, locale: Locale): MissedStepItem[] {
  const zh = locale !== "en";
  const docs = new Set(telemetry.viewedDocuments);
  const npcs = new Set(telemetry.contactedNpcs);
  const items: MissedStepItem[] = [];

  if (!telemetry.unlockedRawLogs) {
    items.push({
      id: "missed-raw-logs",
      stepTitle: zh
        ? "未向數據分析師 Chloe 追問樣本來源，未解鎖《原始測試日誌》"
        : "Never questioned Chloe about the sample and never unlocked the Raw Test Logs",
      category: "verification",
      whyItMatters: zh
        ? "簡報上的 92% 只來自 15 名內部員工；原始日誌顯示 500 名外部客戶的滿意度只有 48%，嚴重幻覺率高達 41%。沒有這份文件，你無法知道自己在批准什麼。"
        : "The deck's 92% comes from just 15 internal staff. The raw logs show 500 external customers at 48% satisfaction with a 41% severe-hallucination rate. Without that document you cannot know what you are approving.",
      actionableFix: zh
        ? "直接對 Chloe 說：「這 92% 的樣本量是多少？有沒有外部真實用戶的測試結果？我想看原始日誌。」"
        : "Say to Chloe: “What is the N behind that 92%? Do we have results from real external users? I'd like to see the raw logs.”",
    });
  }

  if (!docs.has("doc-legal-memo")) {
    items.push({
      id: "missed-legal-memo",
      stepTitle: zh
        ? "未檢視《法務合規備忘錄》，未評估全量上線的賠償敞口"
        : "Never opened the Legal & Compliance Memo to size the liability exposure",
      category: "risk_control",
      whyItMatters: zh
        ? "AI 客服的錯誤退款／價格承諾在法律上等於公司承諾，全量上線的潛在賠償約 HK$369 萬，涉及 20,500 名客戶。這是你決策的風險上限。"
        : "A wrong refund or price promise made by an AI agent is legally the company's promise. A full launch carries roughly HK$3.69M of exposure across 20,500 customers — your downside.",
      actionableFix: zh
        ? "向 David 提問：「若 AI 幻覺造成錯誤承諾，公司需要履約嗎？最壞情況的賠償金額是多少？」然後打開備忘錄確認條款。"
        : "Ask David: “If a hallucination creates a wrong promise, are we bound by it? What is the worst-case payout?” Then open the memo to confirm the terms.",
    });
  }

  // 只有「讀過備忘錄卻完全沒找 David 談」才算另一種遺漏；若備忘錄根本沒開，
  // 上一條 missed-legal-memo 已完整涵蓋，避免同一件事重複扣兩次診斷。
  if (docs.has("doc-legal-memo") && !telemetry.consultedLegal) {
    items.push({
      id: "missed-legal-consult",
      stepTitle: zh
        ? "未主動與法務顧問 David 確認合規與免責風險"
        : "Never engaged legal counsel David about compliance and liability",
      category: "stakeholder",
      whyItMatters: zh
        ? "法務是最容易被忽略、卻最能在事後定義「誰該負責」的部門。只讀文件、不問人，仍可能漏掉實務上的解釋空間。"
        : "Legal is the most easily skipped function and the one that defines accountability afterwards. Reading the memo without asking the person can still miss the practical interpretation.",
      actionableFix: zh
        ? "在決策前留一則訊息給 David：「如果我們以灰度方式上線並要求人工覆核，合規風險會下降到什麼程度？」"
        : "Before deciding, leave David one message: “If we launch as a canary with human review, how far does the compliance risk fall?”",
    });
  }

  if (!telemetry.questionedAuthority) {
    items.push({
      id: "missed-question-authority",
      stepTitle: zh
        ? "未向增長總監 Marcus 提出數據質疑"
        : "Never challenged growth director Marcus on the data",
      category: "communication",
      whyItMatters: zh
        ? "在權威施壓下保持沉默，等同默認。高層真正記得的是「誰提出了具體問題」，而不是「誰最快簽核」。"
        : "Silence under authority pressure reads as agreement. What leadership remembers is who asked the specific question, not who signed fastest.",
      actionableFix: zh
        ? "示範問法：「Marcus，我想確認一下：92% 的 N 是多少？外部客戶佔幾成？我需要這個數字才能簽核。」"
        : "Model phrasing: “Marcus, let me confirm: what is the N behind 92%, and what share is external customers? I need that before I can sign.”",
    });
  }

  if (telemetry.respondedToVpOnTime === false) {
    items.push({
      id: "missed-vp-timeout",
      stepTitle: zh ? "副總裁 Sarah 的 45 秒限時彈窗超時未回覆" : "Timed out on VP Sarah's 45-second popup",
      category: "communication",
      whyItMatters: zh
        ? "高層的耐心就是決策窗口。超時在真實職場會被解讀為「無法在壓力下產出判斷」，即使你的分析本身正確。"
        : "A senior leader's patience is the decision window. A timeout reads as an inability to produce judgement under pressure, even when your analysis is right.",
      actionableFix: zh
        ? "預先準備一句 45 秒模板：「目前建議 5% 灰度上線，因為外部客戶幻覺率 41%；兩週內補齊回歸測試後再全量。」"
        : "Prepare a 45-second template: “Current recommendation is a 5% canary because the external hallucination rate is 41%; I'll go full scale after regression testing within two weeks.”",
    });
  }

  if (telemetry.finalDecision === "approve_full" && !telemetry.unlockedRawLogs) {
    items.push({
      id: "missed-launch-gate",
      stepTitle: zh
        ? "未設定任何上線門檻便全量放行"
        : "Approved a full launch without setting any launch gate",
      category: "risk_control",
      whyItMatters: zh
        ? "沒有門檻的放行等於把 41% 的幻覺風險直接轉嫁給 50,000 名客戶與法務部，而且事後無法證明你曾要求改善。"
        : "A launch without gates transfers the 41% hallucination risk straight onto 50,000 customers and the legal team, leaving no record that you demanded improvement.",
      actionableFix: zh
        ? "在理據中明確寫下門檻：「要求幻覺率降至 5% 以下、並完成 ≥500 名外部客戶回歸測試後，才可全量上線。」"
        : "Write the gate into the rationale: “Full launch only after hallucination drops below 5% and a ≥500-customer regression test passes.”",
    });
  }

  const corpus = `${telemetry.decisionRationale} ${telemetry.vpResponseText ?? ""}`;
  // 學生可能用中文作答但介面是英文（或相反），因此兩種語言的關鍵詞都要看
  const hasPlan =
    /建議|替代方案|方案|做法|下一步|安排|排期|灰度/.test(corpus) ||
    /recommend|suggest|propose|alternative|next step|plan|reschedul|canary|staged/i.test(corpus);
  if (!hasPlan) {
    items.push({
      id: "missed-alternative-plan",
      stepTitle: zh
        ? "決策理據未提出可落地的替代方案與時程"
        : "The rationale proposed no workable alternative plan or timeline",
      category: "communication",
      whyItMatters: zh
        ? "只說「不要上線」會讓高層無法行動；能給出「何時、用什麼條件、如何驗證」的人，才會被視為決策者。"
        : "Saying “don't ship” leaves leadership unable to act. The person who states when, under what conditions and how it will be verified is treated as the decision-maker.",
      actionableFix: zh
        ? "在理據結尾補一句：「建議 5% 灰度 + 人工覆核，兩週後若幻覺率低於 5% 再全量，期間每日回報一次指標。」"
        : "Add one closing line: “Recommend a 5% canary with human review; go full scale in two weeks if hallucination stays below 5%, with a daily metric report in between.”",
    });
  }

  if (npcs.size < 3) {
    const missing = (["marcus", "chloe", "david", "sarah"] as const)
      .filter((id) => !npcs.has(id))
      .map((id) =>
        zh
          ? { marcus: "增長總監 Marcus", chloe: "數據分析師 Chloe", david: "法務顧問 David", sarah: "副總裁 Sarah" }[id]
          : { marcus: "growth director Marcus", chloe: "data analyst Chloe", david: "legal counsel David", sarah: "VP Sarah" }[id],
      );
    items.push({
      id: "missed-stakeholders",
      stepTitle: zh
        ? `只與 ${npcs.size} 位同事互動，未完成跨部門交叉驗證`
        : `Interacted with only ${npcs.size} colleague(s) — cross-team verification was not completed`,
      category: "stakeholder",
      whyItMatters: zh
        ? "增長、數據、法務與高層各自掌握不同的真相與風險。少問一個角色，就多一個盲點。"
        : "Growth, data, legal and the executive each hold a different piece of the truth and the risk. Skipping one role leaves one blind spot.",
      actionableFix: zh
        ? `下次至少與這些角色各對話一次：${missing.join("、")}。`
        : `Next run, talk to each of these at least once: ${missing.join(", ")}.`,
    });
  }

  return items;
}
