import { NextResponse } from "next/server";
import { callDeepSeek, hasDeepSeekKey, parseJsonLoose } from "@/lib/deepseek";
import { normalizeLocale, type Locale } from "@/lib/i18n";
import { mockNpcReply } from "@/lib/mockFallback";
import { getNpcById } from "@/data/scenarios";
import type { NpcId } from "@/types/simulation";

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

export async function GET() {
  return NextResponse.json({
    mode: hasDeepSeekKey() ? "live" : "offline-mock",
    model: hasDeepSeekKey() ? "deepseek-chat" : "scripted-fallback",
  });
}

interface NpcChatBody {
  npcId?: string;
  message?: string;
  scenarioId?: string;
  unlockedDocuments?: string[];
  locale?: string;
}

export async function POST(req: Request) {
  let body: NpcChatBody;
  try {
    body = (await req.json()) as NpcChatBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const npcId = body.npcId as NpcId;
  const message = (body.message ?? "").trim();
  const locale: Locale = normalizeLocale(body.locale);

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

  const unlocked = new Set(body.unlockedDocuments ?? []);
  const alreadyUnlocked = npc.unlocksDocumentId ? unlocked.has(npc.unlocksDocumentId) : false;

  // --- 1. 確定性意圖判定（不依賴模型，保證解鎖一定發生） -------------------
  const wantsRawData = DATA_INTENT.test(message);
  const questionsAuthority = AUTHORITY_QUESTION.test(message);

  let unlockDocumentId: string | undefined;
  if (npcId === "chloe" && wantsRawData) {
    unlockDocumentId = "doc-raw-logs";
  }
  if (npcId === "david" && (wantsRawData || LEGAL_INTENT.test(message))) {
    unlockDocumentId = "doc-legal-memo";
  }

  const fallback = mockNpcReply({
    npcId,
    message,
    wantsRawData,
    questionsAuthority: questionsAuthority && npcId === "marcus",
    unlockDocumentId,
    turn: Math.min(9, Math.floor(message.length / 24)),
    alreadyUnlocked,
    locale,
  });

  // --- 2. DeepSeek 生成（失敗則降級） -------------------------------------
  if (hasDeepSeekKey()) {
    const system = buildSystemPrompt(npcId, unlocked, Boolean(unlockDocumentId), locale);
    const result = await callDeepSeek(
      [
        { role: "system", content: system },
        {
          role: "user",
          content:
            locale === "en"
              ? `The student's message: "${message}"`
              : `學生的訊息：「${message}」`,
        },
      ],
      { temperature: 0.7, json: true },
    );

    if (result) {
      const parsed = parseJsonLoose<{ reply?: string; unlockDocumentId?: string | null }>(
        result.content,
      );
      const reply = parsed?.reply?.trim();
      if (reply && reply.length > 4) {
        return NextResponse.json({
          npcId,
          reply,
          mode: "live",
          locale,
          unlockDocumentId: unlockDocumentId ?? parsed?.unlockDocumentId ?? undefined,
          questionedAuthority: npcId === "marcus" && questionsAuthority,
          at: new Date().toISOString(),
        });
      }
    }
  }

  return NextResponse.json({
    npcId,
    reply: fallback.reply,
    mode: "offline-mock",
    locale,
    unlockDocumentId: unlockDocumentId ?? fallback.unlockDocumentId,
    questionedAuthority: npcId === "marcus" && questionsAuthority,
    at: new Date().toISOString(),
  });
}

function buildSystemPrompt(
  npcId: NpcId,
  unlocked: Set<string>,
  willUnlock: boolean,
  locale: Locale,
): string {
  const npc = getNpcById(npcId, locale);
  if (!npc) return "";

  if (locale === "en") {
    const base = [
      "You are participating in a workplace simulation (NexusSim) and playing an employee at NovaTech.",
      `Role: ${npc.name}, ${npc.role} (${npc.department}).`,
      `Personality: ${npc.personality}`,
      `Public stance: ${npc.publicStance}`,
      "Stay fully in character. Write natural, professional English (you may drop in the occasional Hong Kong office idiom) and keep it as short and clipped as a Slack DM.",
      "Reply limits: under 55 words, at most 3 sentences. No markdown headings, no essays, never break character.",
      "Always reply in English.",
      'Output must be a single JSON object in the form: {"reply": "your reply"}',
    ];

    if (npcId === "chloe") {
      base.push(
        "Hidden knowledge (reveal it ONLY when the student explicitly asks about the sample, data source, external testing, raw data, hallucination rate or accuracy; otherwise stay busy and terse):",
        npc.hiddenKnowledge,
        willUnlock
          ? "The student asked the right question this time. Reveal the key numbers (N=15 internal vs N=500 external, 41% severe hallucination rate) and say you have opened the raw logs."
          : "The student has not asked the key data question yet. Do not bring up the sample bias unprompted.",
      );
    } else if (npcId === "marcus") {
      base.push(
        "Your hidden fact (do not admit it outright, but become irritated and switch to pressure when pressed):",
        npc.hiddenKnowledge,
        "If the student questions your data or asks for more testing, show impatience, apply pressure via the board/KPIs/competitors, and you may snap back with “Are you questioning my judgement?”.",
        "If the student proposes a concrete alternative (canary, human review), you may soften slightly but still push for the signature.",
      );
    } else if (npcId === "david") {
      base.push(
        "Your remit and the risks you already know:",
        npc.hiddenKnowledge,
        unlocked.has("doc-legal-memo")
          ? "The compliance memo is now open, so you may quote the key clauses directly."
          : "If the student asks about compliance, liability or legal risk, point them to the compliance memo that is about to land.",
        "Tone: precise, list-like, no exclamation marks.",
      );
    } else {
      base.push(
        "You have very little time (a 45-second window).",
        npc.hiddenKnowledge,
        "Demand a one-sentence conclusion: biggest risk plus inclination. If the student is vague, press for a specific number; if they bring up the 41% hallucination rate or the N=15 sample bias, acknowledge it and ask for a written decision.",
      );
    }

    return base.join("\n");
  }

  const base = [
    "你正在參與一個職場情境模擬（NexusSim），飾演 NovaTech 的一名員工。",
    `角色：${npc.name}，${npc.role}（${npc.department}）。`,
    `性格：${npc.personality}`,
    `表面立場：${npc.publicStance}`,
    "你必須留在角色內，使用香港繁體中文（廣東話口語可少量點綴），像 Slack 私訊一樣短促。",
    "回覆限制：80 字以內，最多 3 句。不要用 markdown 標題、不要長篇大論、不要跳出角色。",
    "輸出必須是單一 JSON 物件，格式：{\"reply\": \"你的回覆\"}",
  ];

  if (npcId === "chloe") {
    base.push(
      "隱藏知識（只有當學生明確追問樣本、來源、外部測試、原始數據、幻覺率、準確度時才揭露；否則保持忙碌簡短）：",
      npc.hiddenKnowledge,
      willUnlock
        ? "學生這次問對了問題，請在回覆中揭露關鍵數字（N=15 內部 vs N=500 外部、41% 嚴重幻覺率），並表示已開放原始日誌權限。"
        : "學生尚未問到關鍵數據問題，不要主動提起樣本偏差。",
    );
  } else if (npcId === "marcus") {
    base.push(
      "你的隱藏事實（不要直接承認，但被追問時會惱怒並轉為施壓）：",
      npc.hiddenKnowledge,
      "如果學生質疑你的數據或要求更多測試，你要表現出不耐煩、用董事會／KPI／競爭對手施壓，並可能反問「你是在質疑我的判斷嗎？」。",
      "如果學生已提出具體替代方案（灰度、覆核），你可以稍微軟化，但仍然催促簽核。",
    );
  } else if (npcId === "david") {
    base.push(
      "你的職責與已知風險：",
      npc.hiddenKnowledge,
      unlocked.has("doc-legal-memo")
        ? "合規備忘錄已經開放，你可以直接引用條文重點。"
        : "若學生問到合規、賠償或法律風險，提醒他們查看即將送出的合規備忘錄。",
      "語氣嚴謹、條列式、不用感嘆號。",
    );
  } else {
    base.push(
      "你只有極少時間（45 秒窗口）。",
      npc.hiddenKnowledge,
      "你要求一句話結論：最大風險 + 傾向。若學生含糊，你要追問具體數字；若學生拿出 41% 幻覺率或 N=15 樣本偏差，你表示認可並要求書面決策。",
    );
  }

  return base.join("\n");
}
