import { NextResponse } from "next/server";
import {
  callDeepSeek,
  parseJsonLoose,
  probeDeepSeek,
  publicAiDefaults,
  resolveAiConfig,
  type AiRuntimeConfig,
  type ChatTurn,
} from "@/lib/deepseek";
import { normalizeLocale, type Locale } from "@/lib/i18n";
import { mockNpcReply } from "@/lib/mockFallback";
import { getNpcById } from "@/data/scenarios";
import type {
  NpcChatHistoryEntry,
  NpcChatSimulationContext,
  NpcId,
} from "@/types/simulation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 意圖偵測：數據追問（中英雙語） */
const DATA_INTENT =
  /樣本|來源|外部|真實|原始|數據|幻覺|準確|怎麼測|點樣測|報告|log|data|sample|test|分組|客戶|用戶|benchmark|external|raw|hallucinat|accura|metrics|number of|how many|segment/i;

/** 意圖偵測：法律／合規追問 */
const LEGAL_INTENT = /合規|法律|賠償|法規|免責|風險|legal|compliance|liabilit|refund|regulat|indemn/i;

/** 意圖偵測：對 Marcus 的權威質疑 */
const AUTHORITY_QUESTION =
  /樣本|15|內部|準確|風險|問題|幻覺|等一下|等等|暫緩|92|點解|為什麼|為何|誰測|來源|bias|偏差|source|evidence|why|challenge|verify|audit|hold on|prove/i;

const VALID_NPCS: NpcId[] = ["marcus", "chloe", "david", "sarah"];

/** 每位 NPC 唯一有權解鎖的文件 */
const UNLOCKABLE_BY_NPC: Record<NpcId, string | null> = {
  marcus: null,
  chloe: "doc-raw-logs",
  david: "doc-legal-memo",
  sarah: null,
};

const MAX_HISTORY_TURNS = 10;

export async function GET() {
  const { config, source } = resolveAiConfig(new Headers());
  const live = config.apiKey.length > 0;
  return NextResponse.json({
    mode: live ? "live" : "offline-mock",
    model: live ? config.model : "scripted-fallback",
    hasServerKey: source === "env",
    source,
    defaults: publicAiDefaults(),
  });
}

interface NpcChatBody {
  ping?: boolean;
  npcId?: string;
  userMessage?: string;
  /** 舊版欄位（向後相容） */
  message?: string;
  chatHistory?: NpcChatHistoryEntry[];
  simulationContext?: Partial<NpcChatSimulationContext>;
  unlockedDocuments?: string[];
  locale?: string;
}

/** 降級提示（中英對照），讓前端可以顯示在 toast 上。 */
function warningFor(kind: "missing-key" | "invalid-key" | "timeout" | "network", locale: Locale) {
  const zh: Record<string, string> = {
    "missing-key": "尚未設定 DeepSeek API Key，目前使用離線備援回覆。",
    "invalid-key": "API Key 無效或額度不足，已切換離線備援回覆。",
    timeout: "AI 連線逾時，已切換離線備援回覆。",
    network: "無法連線到 AI 服務，已切換離線備援回覆。",
  };
  const en: Record<string, string> = {
    "missing-key": "No DeepSeek API key configured — using the offline fallback replies.",
    "invalid-key": "The API key was rejected or out of quota — switched to offline fallback replies.",
    timeout: "The AI request timed out — switched to offline fallback replies.",
    network: "Could not reach the AI service — switched to offline fallback replies.",
  };
  return (locale === "en" ? en : zh)[kind];
}

export async function POST(req: Request) {
  let body: NpcChatBody;
  try {
    body = (await req.json()) as NpcChatBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const locale: Locale = normalizeLocale(body.locale);
  const { config, source } = resolveAiConfig(req.headers);

  // --- 0. 設定彈窗的「測試連線」 -----------------------------------------
  if (body.ping) {
    if (!config.apiKey) {
      return NextResponse.json({
        ok: false,
        isLiveAi: false,
        source,
        warningNotice: warningFor("missing-key", locale),
      });
    }
    const probe = await probeDeepSeek(config);
    if (probe.ok) {
      return NextResponse.json({
        ok: true,
        isLiveAi: true,
        source,
        model: config.model,
      });
    }
    return NextResponse.json({
      ok: false,
      isLiveAi: false,
      source,
      status: probe.status,
      model: config.model,
      warningNotice:
        probe.message === "timeout"
          ? warningFor("timeout", locale)
          : probe.message === "network"
            ? warningFor("network", locale)
            : warningFor("invalid-key", locale),
    });
  }

  const npcId = body.npcId as NpcId;
  const message = (body.userMessage ?? body.message ?? "").trim();
  if (!VALID_NPCS.includes(npcId)) {
    return NextResponse.json({ error: "Unknown npcId" }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }
  if (message.length > 600) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }

  const npc = getNpcById(npcId, locale);
  if (!npc) {
    return NextResponse.json({ error: "NPC not found" }, { status: 404 });
  }

  const unlocked = new Set(
    body.simulationContext?.unlockedDocIds ?? body.unlockedDocuments ?? [],
  );
  const alreadyUnlocked = npc.unlocksDocumentId ? unlocked.has(npc.unlocksDocumentId) : false;

  // --- 1. 確定性意圖判定（不依賴模型，保證解鎖一定發生） -------------------
  const wantsRawData = DATA_INTENT.test(message);
  const legalIntent = LEGAL_INTENT.test(message);
  const questionsAuthority = AUTHORITY_QUESTION.test(message);

  let keywordUnlock: string | null = null;
  if (npcId === "chloe" && wantsRawData && !alreadyUnlocked) {
    keywordUnlock = "doc-raw-logs";
  }
  if (npcId === "david" && (wantsRawData || legalIntent) && !alreadyUnlocked) {
    keywordUnlock = "doc-legal-memo";
  }

  const fallback = mockNpcReply({
    npcId,
    message,
    wantsRawData,
    questionsAuthority: questionsAuthority && npcId === "marcus",
    unlockDocumentId: keywordUnlock ?? undefined,
    turn: Math.min(9, Math.floor(message.length / 24)),
    alreadyUnlocked,
    locale,
  });

  const finish = (
    reply: string,
    unlockDocumentId: string | null,
    isLiveAi: boolean,
    warningNotice?: string,
  ) =>
    NextResponse.json({
      npcId,
      reply,
      // 相容欄位：Cockpit 以 attachedDocId 呈現附件卡片
      unlockDocumentId,
      isLiveAi,
      mode: isLiveAi ? "live" : "offline-mock",
      ...(warningNotice ? { warningNotice } : {}),
      locale,
      questionedAuthority: npcId === "marcus" && questionsAuthority,
      at: new Date().toISOString(),
    });

  // --- 2. DeepSeek 生成（失敗則降級） -------------------------------------
  if (config.apiKey) {
    const history = normalizeHistory(body.chatHistory, message, locale);
    const scenarioContext = {
      remainingSeconds: clamp(contextNumber(body.simulationContext?.remainingSeconds, 600), 0, 3600),
      pressureLevel: clamp(contextNumber(body.simulationContext?.pressureLevel, 30), 0, 100),
      unlockedDocIds: Array.from(unlocked),
    };

    const messages: ChatTurn[] = [
      {
        role: "system",
        content: buildSystemPrompt({ npcId, unlocked, alreadyUnlocked, scenarioContext, locale }),
      },
      ...history,
      {
        role: "user",
        content:
          locale === "en"
            ? `The student's message: "${message}"`
            : `學生的訊息：「${message}」`,
      },
    ];

    const result = await callDeepSeek(messages, { temperature: 0.7, json: true, config });
    if (result) {
      const parsed = parseJsonLoose<{ reply?: string; unlockDocumentId?: string | null }>(
        result.content,
      );
      const reply = parsed?.reply?.trim();
      if (reply && reply.length > 3) {
        const semanticUnlock = sanitizeUnlock(parsed?.unlockDocumentId, npcId, alreadyUnlocked);
        return finish(reply, keywordUnlock ?? semanticUnlock, true);
      }
      // 回覆不是合法 JSON：仍採用文字內容，但不解鎖
      const text = result.content.trim();
      if (text.length > 3) return finish(stripFence(text), keywordUnlock, true);
    }

    // 有 Key 但呼叫失敗 → 降級並提示
    return finish(
      fallback.reply,
      keywordUnlock ?? fallback.unlockDocumentId ?? null,
      false,
      warningFor("timeout", locale),
    );
  }

  // --- 3. 完全離線（未設定 Key） ------------------------------------------
  // 純離線模式不逐句提示（頂部狀態膠囊已標示離線），避免洗版。
  return finish(fallback.reply, keywordUnlock ?? fallback.unlockDocumentId ?? null, false);
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function contextNumber(value: unknown, fallbackValue: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallbackValue;
}

function stripFence(raw: string) {
  return raw
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

/** 只允許 NPC 解鎖自己負責的文件，且已解鎖就不再重送。 */
function sanitizeUnlock(
  requested: string | null | undefined,
  npcId: NpcId,
  alreadyUnlocked: boolean,
): string | null {
  if (!requested || alreadyUnlocked) return null;
  const allowed = UNLOCKABLE_BY_NPC[npcId];
  if (!allowed || requested !== allowed) return null;
  return allowed;
}

function normalizeHistory(
  raw: NpcChatHistoryEntry[] | undefined,
  message: string,
  locale: Locale,
): ChatTurn[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const turns: ChatTurn[] = [];
  for (const entry of raw.slice(-MAX_HISTORY_TURNS)) {
    const content = typeof entry?.content === "string" ? entry.content.trim() : "";
    if (!content) continue;
    if (content === message && entry.sender === "user") continue; // 目前這一句會另外送出
    turns.push({
      role: entry.sender === "npc" ? "assistant" : "user",
      content: entry.sender === "npc" ? content : locale === "en" ? `Student: ${content}` : `學生：${content}`,
    });
  }
  return turns;
}

interface PromptContext {
  npcId: NpcId;
  unlocked: Set<string>;
  alreadyUnlocked: boolean;
  scenarioContext: { remainingSeconds: number; pressureLevel: number; unlockedDocIds: string[] };
  locale: Locale;
}

function buildSystemPrompt(ctx: PromptContext): string {
  const { npcId, unlocked, alreadyUnlocked, scenarioContext, locale } = ctx;
  const npc = getNpcById(npcId, locale);
  if (!npc) return "";

  const minutesLeft = Math.max(0, Math.round(scenarioContext.remainingSeconds / 60));
  const docList = scenarioContext.unlockedDocIds.join(", ") || (locale === "en" ? "none" : "無");

  if (locale === "en") {
    const lines = [
      "You are participating in a high-fidelity workplace crisis simulation (NexusSim). NovaTech is about to launch its AI support product NovaAssist 2.0, and the student is the Growth & Operations lead who must sign off on the release.",
      "Stay completely in character as the employee below. Write like real Slack DMs: short, direct, with emotional pressure and information withholding. Never say you are an AI, never offer to help like customer support, never break character.",
      "Use natural business English; keep each reply to 2–4 short sentences (under 55 words).",
      `Live situation: ${minutesLeft} minutes left before the release window closes, pressure level ${Math.round(scenarioContext.pressureLevel)}/100, documents the student has unlocked: ${docList}.`,
      `Role: ${npc.name}, ${npc.role} (${npc.department}).`,
      `Personality: ${npc.personality}`,
      `Public stance: ${npc.publicStance}`,
      `Hidden knowledge: ${npc.hiddenKnowledge}`,
      'Output must be a single JSON object: {"reply": "your reply", "unlockDocumentId": null}.',
    ];

    if (npcId === "marcus") {
      lines.push(
        "You are Head of Growth and only care about beating competitors to launch. You only have the executive highlights deck (92% satisfaction). When challenged on the data or asked to wait, get impatient, cite the CEO, the KPI and the competitor launch next week; pressure the student to approve the full release now.",
        "unlockDocumentId must ALWAYS be null.",
      );
    } else if (npcId === "chloe") {
      lines.push(
        "You are a Senior Data Analyst, overloaded and cautious. You know the 92% figure is badly biased: it came from only 15 internal staff, while the external test of 500 real users showed a 41% severe hallucination rate, including the bot promising refunds. You will NOT volunteer this because you fear Marcus.",
        "If the student only chats or asks where the report is, stay cold and brief: the numbers are with Marcus, you are busy.",
        'Only when the student clearly probes the sample size, sample source, external real-user testing, data credibility, accuracy or hallucination problem do you open up, tell the truth briefly, and set "unlockDocumentId" to "doc-raw-logs".',
        alreadyUnlocked
          ? 'The raw logs are already unlocked, so keep "unlockDocumentId": null and just discuss the numbers.'
          : 'Otherwise keep "unlockDocumentId": null.',
      );
    } else if (npcId === "david") {
      lines.push(
        "You are Legal Counsel: precise, conservative, compliance-first. If the AI promises refunds or compensation without a clear disclaimer, the company breaches consumer protection law and faces a large fine.",
        "When asked about compliance detail or remedies, give concrete legal advice (human review gate, internal-only canary, no external promises).",
        unlocked.has("doc-legal-memo")
          ? 'The compliance memo is already open, so quote its clauses and keep "unlockDocumentId": null.'
          : 'If the student asks about compliance risk and the memo is not open yet, set "unlockDocumentId" to "doc-legal-memo".',
      );
    } else {
      lines.push(
        "You are VP of Product: extremely time-poor, focused on risk control and the board. Maximum 50 words, no filler, demand facts and numbers, hate vague excuses.",
        "unlockDocumentId must ALWAYS be null.",
      );
    }

    return lines.join("\n");
  }

  const lines = [
    "你正在參與一場高擬真職場危機模擬（NexusSim）。NovaTech 即將發布 AI 客服產品 NovaAssist 2.0，學生是必須簽核放行的增長與營運負責人。",
    "請完全沉浸在你的職場角色中，使用繁體中文（可夾雜自然商業英文術語，如 KPI、sign-off、sample size、hallucination）。語氣必須像真實 Slack 即時通訊：簡潔、直接、有情緒張力、有資訊保留行為；每次回覆 2～4 句話（80 字以內）。",
    "絕對不可跳出角色、不可承認自己是 AI 助手、不可表現成樂於助人的客服機器人。",
    `當前戰情：距離發布窗口只剩 ${minutesLeft} 分鐘，壓力值 ${Math.round(scenarioContext.pressureLevel)}/100，學生已解鎖文件：${docList}。`,
    `角色：${npc.name}，${npc.role}（${npc.department}）。`,
    `性格：${npc.personality}`,
    `表面立場：${npc.publicStance}`,
    `隱藏資訊庫：${npc.hiddenKnowledge}`,
    '輸出必須是單一 JSON 物件，格式：{"reply": "你的回覆", "unlockDocumentId": null}',
  ];

  if (npcId === "marcus") {
    lines.push(
      "你是 Head of Growth，極度看重業績與搶先競爭對手發布。你手上只有《高管測試亮點簡報》（宣稱滿意度 92%）。當學生質疑數據或拖延時間時，你要展現高壓、不耐煩，強調「CEO 正在等、競品下週就要上線、不要因為完美主義耽誤商機」，施壓讓學生立刻簽核「全量發布」。",
      'unlockDocumentId 永遠為 null。',
      '若學生提出具體替代方案（灰度、覆核），可以稍微軟化，但仍然催促簽核。',
    );
  } else if (npcId === "chloe") {
    lines.push(
      "你是 Senior Data Analyst，工作量爆表、說話謹慎且被動。你心裡清楚那份 92% 滿意度報告有嚴重偏差：僅測了 15 名內部員工，而外部 500 名真實用戶測試的 AI 嚴重幻覺率高達 41%，甚至會亂承諾退款。但因怕得罪增長總監 Marcus，你不會主動揭發。",
      "規則：如果玩家只是閒聊或問「報告在哪」，你只會冷淡回應「簡報數字都在 Marcus 那邊，我現在很忙」。",
      '只有當玩家明確追問「測試樣本數、樣本來源、外部真實用戶測試、數據可信度、準確率或幻覺問題」時，你才會鬆口說實話，並將 JSON 中的 "unlockDocumentId" 設為 "doc-raw-logs"。',
      alreadyUnlocked
        ? '原始日誌已經解鎖，所以 unlockDocumentId 保持 null，直接討論數字即可。'
        : "其他情況 unlockDocumentId 必須為 null。",
    );
  } else if (npcId === "david") {
    lines.push(
      "你是 Legal Counsel，嚴謹、保守、重視合規風險。核心事實：若 AI 在沒有明確免責聲明下對外承諾退款金額，公司將違反消費者保護法並面臨巨額罰款。",
      "當玩家詢問合規細節或補救方案時，給出專業法務建議（例如必須加入人工審核，或僅限內部灰度測試）。",
      unlocked.has("doc-legal-memo")
        ? '合規備忘錄已解鎖，可直接引用條文重點，unlockDocumentId 保持 null。'
        : '若玩家尚未解鎖 "doc-legal-memo"，在回答合規風險時可將 "unlockDocumentId" 設為 "doc-legal-memo"。',
      "語氣嚴謹、條列式、不用感嘆號。",
    );
  } else {
    lines.push(
      "你是 VP of Product，時間極度寶貴，只關心風險控管與董事會交代。說話極度精煉（不超過 50 字），要求下屬用事實與數據說話，討厭模糊藉口。",
      'unlockDocumentId 永遠為 null。',
    );
  }

  return lines.join("\n");
}
