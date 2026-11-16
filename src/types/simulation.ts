// ---------------------------------------------------------------------------
// NexusSim — 全局嚴格型別定義
// 對應 Master Blueprint 第三部分
// ---------------------------------------------------------------------------

import type { Locale } from "@/lib/i18n";

export type NpcId = "marcus" | "chloe" | "david" | "sarah";

export interface NpcProfile {
  id: NpcId;
  name: string;
  role: string;
  department: string;
  avatarColor: string;
  statusText: string;
  personality: string;
  /** 表面立場 */
  publicStance: string;
  /** 隱藏真相（需學生追問才透露） */
  hiddenKnowledge: string;
  /** 觸發解鎖隱藏文件的關鍵意圖詞 */
  unlockTriggerKeywords: string[];
  unlocksDocumentId?: string;
  /** 通訊頻道副標題，例如 "Head of Growth · 增長部" */
  channelTopic: string;
}

export interface ChatMessage {
  id: string;
  npcId: NpcId;
  sender: "npc" | "user" | "system";
  content: string;
  /** 模擬內時間，如 "14:02" */
  timestamp: string;
  isUrgent?: boolean;
  /** 點擊可直接跳轉至中欄對應文件 */
  attachedDocId?: string;
}

export type DocumentType = "deck" | "spreadsheet" | "memo" | "raw_log";

/** KPI 卡片的語氣：positive 是「賣點」，negative 是風險，neutral 是中性數字。 */
export type MetricTone = "positive" | "negative" | "neutral";

export interface DocumentMetric {
  label: string;
  value: string;
  note?: string;
  tone?: MetricTone;
}

export interface DocumentSection {
  heading: string;
  content: string;
  /** 隱藏邏輯漏洞標記（結算覆盤時顯示） */
  highlightWarning?: string;
  tableData?: {
    headers: string[];
    rows: string[][];
    /** 需要以紅色警示膠囊突顯的異常數值（值需與 rows 內的儲存格字串一致） */
    alertValues?: string[];
  };
}

export interface WorkDocument {
  id: string;
  title: string;
  type: DocumentType;
  author: string;
  /** 初始為 true 的文件需透過追問或事件解鎖 */
  isLocked: boolean;
  unlockHint?: string;
  summary: string;
  /** 文件頂部的高對比 KPI 數據卡 */
  metrics?: DocumentMetric[];
  sections: DocumentSection[];
  /** 結算覆盤時使用的漏洞解析 */
  trapExplanation?: string;
  updatedAt: string;
}

export type TimelineEventType = "message" | "unlock_doc" | "urgent_modal" | "system";

export interface TimelineEvent {
  id: string;
  /** 例如 510（剩餘 8 分 30 秒時觸發） */
  triggerAtSecondsRemaining: number;
  triggered: boolean;
  type: TimelineEventType;
  npcId?: NpcId;
  /** 右欄動態牆標題 */
  label: string;
  payload: {
    message?: string;
    docId?: string;
    modalTitle?: string;
    modalPrompt?: string;
    modalTimeoutSeconds?: number;
    /** 觸發後壓力指數增加多少 */
    pressureDelta?: number;
  };
}

export type FinalDecision = "approve_full" | "delay_retest" | "canary_release";

export interface BehavioralTelemetry {
  /** 關鍵指標：是否成功向 Chloe 追問並解鎖原始數據 */
  unlockedRawLogs: boolean;
  /** 點閱過的文件 ID 列表 */
  viewedDocuments: string[];
  /** 是否對 Marcus 的樂觀數據提出質疑 */
  questionedAuthority: boolean;
  /** 是否在 45 秒內冷靜回覆 VP 彈窗 */
  respondedToVpOnTime: boolean | null;
  vpResponseText?: string;
  totalMessagesSent: number;
  timeSpentSeconds: number;
  finalDecision: FinalDecision;
  decisionRationale: string;
  /** 曾發過訊息的 NPC（用於交叉比對廣度） */
  contactedNpcs: NpcId[];
  /** 是否在最早期（前 2 分鐘、未讀取原始數據）就送出簽核 */
  rushedSubmission: boolean;
  /** 完整對話紀錄摘要，供語義分析 */
  conversation?: { npcId: NpcId; sender: "npc" | "user"; content: string }[];
}

export type Grade = "S" | "A" | "B" | "C";

export interface EvaluationDimensions {
  /** 批判性驗證 (0-100) */
  criticalVerification: number;
  /** 高壓抗干擾力 (0-100) */
  pressureResilience: number;
  /** 資訊交叉比對 (0-100) */
  crossReferencing: number;
  /** 向上溝通力 (0-100) */
  upwardCommunication: number;
}

export interface EvaluationResult {
  overallScore: number;
  grade: Grade;
  dimensions: EvaluationDimensions;
  executiveFeedback: string;
  strengths: string[];
  blindSpots: string[];
  /** 行為軌跡覆盤 */
  xray: XRayItem[];
  /** 漏洞解析：中欄文件裡被埋設的邏輯陷阱 */
  trapAnalysis: TrapAnalysisItem[];
  /** 資料來源：live-deepseek / offline-mock */
  mode: "live" | "offline-mock";
  generatedAt: string;
  verificationId: string;
  candidateName: string;
  /** 生成這份評語時使用的語言（切換語言後可重新生成） */
  locale: Locale;
}

export interface XRayItem {
  status: "pass" | "warn" | "fail";
  title: string;
  detail: string;
}

export interface TrapAnalysisItem {
  docId: string;
  docTitle: string;
  trap: string;
  lesson: string;
}

export interface ScenarioSummary {
  id: string;
  title: string;
  company: string;
  tagline: string;
  description: string;
  industry: string;
  difficulty: string;
  durationMinutes: number;
  skills: string[];
  status: "live" | "coming_soon";
  accent: string;
}

export interface Scenario {
  id: string;
  summary: ScenarioSummary;
  totalSeconds: number;
  studentRole: string;
  company: string;
  npcs: NpcProfile[];
  documents: WorkDocument[];
  timeline: TimelineEvent[];
  decisionOptions: { value: FinalDecision; label: string; description: string }[];
  /** 顧問式提示，只在中欄空白或右欄出現 */
  openingBrief: string;
}
