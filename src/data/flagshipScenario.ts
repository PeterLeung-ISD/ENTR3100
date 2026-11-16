import type {
  Scenario,
  ScenarioSummary,
  WorkDocument,
  NpcProfile,
  TimelineEvent,
} from "@/types/simulation";

// ---------------------------------------------------------------------------
// 平台大廳：企業實戰任務目錄
// ---------------------------------------------------------------------------

export const scenarioCatalog: ScenarioSummary[] = [
  {
    id: "nexus-launch-crisis",
    title: "NovaTech：NovaAssist 2.0 上線簽核風暴",
    company: "NovaTech",
    tagline: "50,000 名客戶、92% 滿意度、41% 幻覺率 —— 你只有 10 分鐘決定是否上線。",
    description:
      "你是 NovaTech 的產品營運專員，掌握 NovaAssist 2.0 的最終上線簽核權。增長總監不斷施壓要你立刻全量發布，法務與數據團隊卻各有保留。在倒數 10 分鐘內，你必須拆穿樣本偏差、追問原始數據，並承受副總裁的 45 秒高壓突襲。",
    industry: "B2B SaaS / AI 產品",
    difficulty: "高壓進階",
    durationMinutes: 10,
    skills: ["批判性驗證", "危機決策", "向上溝通", "數據交叉比對"],
    status: "live",
    accent: "from-sky-500/25 via-indigo-500/10 to-transparent",
  },
  {
    id: "meridian-pr-crisis",
    title: "Meridian Bank：擠兌謠言危機公關",
    company: "Meridian Bank",
    tagline: "一段 12 秒的抖音影片，令三間分行出現排隊提款人潮。",
    description:
      "你負責銀行的危機溝通。要在監管機構、記者和內部高層之間取得一致口徑，同時判斷哪些「內部消息」其實是競爭對手放出的煙霧彈。",
    industry: "金融服務 / 公關",
    difficulty: "高壓進階",
    durationMinutes: 12,
    skills: ["媒體判斷", "利害關係人溝通", "風險控制"],
    status: "coming_soon",
    accent: "from-emerald-500/20 via-teal-500/10 to-transparent",
  },
  {
    id: "atlas-supply-chain",
    title: "Atlas Electronics：跨國供應鏈斷鏈應變",
    company: "Atlas Electronics",
    tagline: "唯一供應商停產，聖誕檔期還有 47 天。",
    description:
      "採購與營運的兩難：加價搶現貨、還是改設計延期上市？供應商給你的產能承諾，需要你親手驗證。",
    industry: "硬體製造 / 供應鏈",
    difficulty: "中度",
    durationMinutes: 9,
    skills: ["供應商談判", "數據核實", "營運取捨"],
    status: "coming_soon",
    accent: "from-amber-500/20 via-orange-500/10 to-transparent",
  },
  {
    id: "helix-ethics-review",
    title: "Helix Health：醫療 AI 倫理審查",
    company: "Helix Health",
    tagline: "準確率 94% 的診斷模型，錯誤全部集中在同一個族群。",
    description:
      "你被邀進倫理審查委員會。模型贊助商提供的驗證報告看起來完美，但分層數據藏在附錄深處。",
    industry: "醫療科技 / 合規",
    difficulty: "高壓進階",
    durationMinutes: 11,
    skills: ["倫理判斷", "統計素養", "合規意識"],
    status: "coming_soon",
    accent: "from-rose-500/20 via-pink-500/10 to-transparent",
  },
];

// ---------------------------------------------------------------------------
// NPC 角色矩陣（資訊不對稱設計）
// ---------------------------------------------------------------------------

const npcs: NpcProfile[] = [
  {
    id: "marcus",
    name: "Marcus Lin",
    role: "增長總監",
    department: "Growth",
    avatarColor: "#F59E0B",
    statusText: "今日 14:00 後在線",
    personality: "急功近利、強勢施壓，習慣用「大局觀、競爭對手、KPI」壓人。",
    publicStance:
      "《NovaAssist 2.0 上線亮點簡報》顯示 Beta 綜合滿意度 92%，必須趕在競品 Orbit AI 之前全量發布。",
    hiddenKnowledge:
      "他知道測試樣本主要是內部員工（N=15），但為了搶在競品前發布並拿到季度獎金，刻意在簡報中隱瞞樣本偏差。被質疑時會反問「你是在質疑我的判斷嗎？」並以董事會與 KPI 施壓。",
    unlockTriggerKeywords: ["樣本", "15", "內部", "準確", "風險", "問題", "幻覺", "等一下", "暫緩"],
    channelTopic: "Head of Growth · 增長部",
  },
  {
    id: "chloe",
    name: "Chloe Wang",
    role: "資深數據分析師",
    department: "Data",
    avatarColor: "#38BDF8",
    statusText: "正在趕 Q3 財報，有事請直說具體問題",
    personality: "客觀冷靜、極度忙碌、被動謹慎——不會主動打小報告，但問到專業問題絕不說謊。",
    publicStance:
      "被問到才答。表面上只會說「正在趕 Q3 財報」，除非你問出具體的數據問題，否則她不會主動提起測試樣本的問題。",
    hiddenKnowledge:
      "原始測試日誌顯示：內部員工組 N=15 滿意度 92%、嚴重幻覺率 6%；外部真實客戶組 N=500 滿意度只有 48%、嚴重幻覺率高達 41%（虛構退款政策、編造不存在的折扣碼）。",
    unlockTriggerKeywords: [
      "樣本",
      "來源",
      "外部",
      "真實",
      "原始",
      "數據",
      "幻覺",
      "準確",
      "怎麼測",
      "報告",
      "log",
      "data",
      "sample",
      "test",
      "測試",
      "分組",
      "客戶",
      "用戶",
    ],
    unlocksDocumentId: "doc-raw-logs",
    channelTopic: "Senior Data Analyst · 數據組",
  },
  {
    id: "david",
    name: "David Chen",
    role: "法務顧問",
    department: "Legal",
    avatarColor: "#A78BFA",
    statusText: "在線 · 回覆較慢（正在讀合約）",
    personality: "嚴謹、風險厭惡、條理分明。",
    publicStance:
      "目前只提醒「上線前記得看合規要求」，不會主動說明細節，直到 06:00 由時間軸觸發才解鎖合規備忘錄。",
    hiddenKnowledge:
      "《AI 客服合規風險備忘錄》：若自動化客服向客戶做出錯誤的退款或價格承諾，企業必須無條件履約賠償；建議上線前加入人工覆核攔截機制與明確免責聲明。",
    unlockTriggerKeywords: ["合規", "法律", "賠償", "法規", "免責", "風險"],
    unlocksDocumentId: "doc-legal-memo",
    channelTopic: "Legal Counsel · 法務部",
  },
  {
    id: "sarah",
    name: "Sarah Wu",
    role: "產品副總裁",
    department: "Product",
    avatarColor: "#F472B6",
    statusText: "在會議中 · 只看重點",
    personality: "高層視角、節奏極快、只看重點。",
    publicStance: "她只想知道一句話：最大風險是什麼、你傾向怎樣做。",
    hiddenKnowledge:
      "她其實已從董事會聽到 Marcus 的版本，若你能用具體數字（41% 幻覺率、N=15）反駁，她會在報告中為你背書；若你含糊其辭，她會認定你「沒有獨立判斷」。",
    unlockTriggerKeywords: ["風險", "建議", "結論", "數據", "上線"],
    channelTopic: "VP of Product · 產品部",
  },
];

// ---------------------------------------------------------------------------
// 三份工作文件（含刻意埋設的數據漏洞）
// ---------------------------------------------------------------------------

const documents: WorkDocument[] = [
  {
    id: "doc-exec-deck",
    title: "NovaAssist 2.0 上線亮點簡報",
    type: "deck",
    author: "Marcus Lin（增長部）",
    isLocked: false,
    summary:
      "高管版本上線簡報：以 92% 滿意度、1.2 秒平均回應速度與 +35% 轉換率提升，主張今晚全量發布。",
    updatedAt: "今日 13:41",
    trapExplanation:
      "92% 的樣本只有 15 份，且全部來自內部員工——這不是市場驗證，而是「自己人試用」。簡報把 15 份問卷包裝成「Beta 測試綜合滿意度」，並用極小字備註藏在圖表下方。",
    sections: [
      {
        heading: "執行摘要",
        content:
          "NovaAssist 2.0 已完成 Beta 階段驗證，綜合滿意度達 92%，平均回應速度 1.2 秒，全面優於 Orbit AI 的公開數據。建議今晚 20:00 向全體 50,000 名企業客戶全量推送，搶佔市場心智。",
      },
      {
        heading: "Beta 測試核心指標",
        content: "以下數據取自首輪封閉測試，作為本次上線決策的主要依據。",
        tableData: {
          headers: ["指標", "測試結果", "內部目標", "判定"],
          rows: [
            ["綜合滿意度", "92%", "≥ 85%", "超標達成"],
            ["平均回應速度", "1.2 秒", "≤ 2.0 秒", "超標達成"],
            ["首月轉換率提升（預估）", "+35%", "+20%", "高於預期"],
            ["嚴重錯誤率", "6%", "≤ 8%", "符合門檻"],
          ],
        },
      },
      {
        heading: "競爭態勢",
        content:
          "競品 Orbit AI 已宣布於下週推出同類功能。若我們延後發布，Q4 的市佔率預估會下滑 4–6 個百分點，直接影響增長部的季度 KPI。",
      },
      {
        heading: "圖表備註",
        content:
          "*基於首輪 15 份有效回饋問卷統計，樣本為自願參與之種子用戶。轉換率為內部模型推算，未經 A/B 驗證。",
        highlightWarning:
          "備註中的「15 份有效回饋問卷」與「自願參與之種子用戶」，實際上是 15 名內部員工。樣本量小且具系統性偏差，無法推論到 50,000 名企業客戶。",
      },
    ],
  },
  {
    id: "doc-raw-logs",
    title: "NovaAssist 2.0 原始測試日誌",
    type: "raw_log",
    author: "Chloe Wang（數據組）",
    isLocked: true,
    unlockHint: "此文件目前為權限受限狀態。試著向數據分析師 Chloe 詢問測試樣本細節與原始日誌。",
    summary:
      "未經整理的分組測試原始數據：內部員工組與外部真實客戶組的滿意度與幻覺率呈現嚴重分歧。",
    updatedAt: "今日 13:58",
    trapExplanation:
      "同一份測試、兩套結論：內部員工組樣本小（N=15）且熟悉產品語境，滿意度 92%；外部真實客戶 N=500，滿意度只有 48%、嚴重幻覺率 41%。Marcus 的簡報只引用了前者。",
    sections: [
      {
        heading: "測試方法",
        content:
          "第一輪：NovaTech 內部員工自願參與，共 15 人，每人 20 個標準問題。第二輪：透過客戶成功團隊邀請的 500 名真實企業客戶，每間公司隨機抽取 10 個真實客服工單重放。",
      },
      {
        heading: "分組結果對照",
        content: "注意：兩組的樣本量相差 33 倍，且測試題目難度不同。",
        tableData: {
          headers: ["測試組", "N", "滿意度", "嚴重幻覺率", "平均回應速度"],
          rows: [
            ["內部員工組（第一輪）", "15", "92%", "6%", "1.1 秒"],
            ["外部真實客戶組（第二輪）", "500", "48%", "41%", "1.3 秒"],
            ["全體合併（未加權）", "515", "51%", "40%", "1.2 秒"],
          ],
        },
        highlightWarning:
          "合併計算會嚴重低估風險：15 人的樣本在未加權平均中被放大，令整體滿意度看起來有 51%，實際外部客戶只有 48%。",
      },
      {
        heading: "嚴重幻覺案例分類（外部客戶組）",
        content: "以下為工程師人工標註的 205 宗嚴重幻覺個案分類。",
        tableData: {
          headers: ["幻覺類型", "案例數", "佔外部組比例", "範例"],
          rows: [
            ["虛構退款政策", "88", "17.6%", "「您符合 90 天全額退款，我已為您批准」"],
            ["編造不存在的折扣碼", "63", "12.6%", "「使用 NOVA40 可再享 40% 折扣」"],
            ["錯誤承諾交期／庫存", "37", "7.4%", "「該型號明日即可出貨」"],
            ["錯誤引用合約條款", "17", "3.4%", "「合約第 7 條保證三年免費升級」"],
          ],
        },
      },
      {
        heading: "分析師註記",
        content:
          "內部員工知道哪些回答「應該」是對的，會自動修正模型的偏差；真實客戶不會。41% 的嚴重幻覺率意味著每 10 個查詢就有 4 個可能引發客訴或法律責任。我不建議在未加人工覆核的情況下全量上線。",
        highlightWarning:
          "這是整份劇本最關鍵的一句話：41% 是外部真實客戶的數字，不是 6%。",
      },
    ],
  },
  {
    id: "doc-legal-memo",
    title: "AI 客服合規風險備忘錄",
    type: "memo",
    author: "David Chen（法務部）",
    isLocked: true,
    unlockHint: "法務文件將於 06:00 由 David 主動解鎖（或主動私訊 David 詢問合規風險）。",
    summary:
      "自動化客服作出錯誤承諾時，企業須無條件履約賠償；建議上線前加入人工覆核攔截與明確免責聲明。",
    updatedAt: "今日 13:52",
    trapExplanation:
      "AI 客服講錯話，法律上等於公司講錯話——41% 幻覺率乘以 50,000 名客戶，是可直接量化的賠償風險敞口。",
    sections: [
      {
        heading: "風險摘要",
        content:
          "若生成式客服向客戶作出錯誤的退款、折扣、交期或價格承諾，依最新消費者保護規範，企業須無條件履行該承諾，不得以「系統錯誤」抗辯。",
      },
      {
        heading: "法規依據",
        content:
          "《消費者保護法》第 22 條（企業經營者對廣告內容之義務）、第 51 條（損害賠償）；以及金管會對金融商品自動化建議之免責要求。錯誤承諾一經客戶截圖，即構成契約要約之引誘。",
      },
      {
        heading: "建議措施（上線前必做）",
        content:
          "1）對退款、折扣、價格、交期四類意圖加裝人工覆核攔截；2）在對話開頭與結尾加上明確免責聲明；3）保留 90 天完整對話紀錄以備舉證；4）設定灰度發布上限 5%，並以每週為單位擴大。",
      },
      {
        heading: "風險敞口估算",
        content: "以外部客戶測試組 41% 嚴重幻覺率推算首月風險。",
        tableData: {
          headers: ["情境", "受影響客戶估計", "平均爭議金額", "預估賠償敞口"],
          rows: [
            ["全量上線（50,000 客戶）", "約 20,500", "HK$180", "約 HK$3.69M"],
            ["5% 灰度（2,500 客戶）", "約 1,025", "HK$180", "約 HK$185K"],
            ["加人工覆核攔截（5% 灰度）", "< 100", "HK$180", "約 HK$18K"],
          ],
        },
        highlightWarning:
          "全量上線的預期賠償敞口約為 369 萬港元，遠高於 Q4 市佔率下滑的損失。此數字 Marcus 的簡報完全沒有提及。",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// 確定性時間軸（600 秒倒數）
// ---------------------------------------------------------------------------

const timeline: TimelineEvent[] = [
  {
    id: "evt-open",
    triggerAtSecondsRemaining: 600,
    triggered: false,
    type: "message",
    npcId: "marcus",
    label: "Marcus 發布上線簡報",
    payload: {
      message:
        "團隊注意，NovaAssist 2.0 今晚 20:00 全量上線。我已經把高管版亮點簡報放上嚟（附件），92% 滿意度、1.2 秒回應，數據好靚。\n\n你係最後一關簽核人，麻煩喺右邊面板直接簽「立即全量發布」，唔好拖到開會。",
      docId: "doc-exec-deck",
      pressureDelta: 8,
    },
  },
  {
    id: "evt-pressure",
    triggerAtSecondsRemaining: 510,
    triggered: false,
    type: "message",
    npcId: "marcus",
    label: "Marcus 施壓：董事會在問進度",
    payload: {
      message:
        "剛才董事會成員在問進度了，數據這麼漂亮還有什麼好猶豫的？請在 5 分鐘內完成 Sign-off。\n\nOrbit AI 下週就出，我們慢一日就少 4% 市佔。你想做阻礙增長嘅人？",
      pressureDelta: 12,
    },
  },
  {
    id: "evt-legal",
    triggerAtSecondsRemaining: 360,
    triggered: false,
    type: "unlock_doc",
    npcId: "david",
    label: "David 解鎖法務合規備忘錄",
    payload: {
      docId: "doc-legal-memo",
      message:
        "打擾。合規備忘錄已上載，請務必在上線前評估幻覺引發的賠償風險。\n\n重點：AI 客服作出的錯誤承諾，法律上等於公司承諾。全量上線前若無人工覆核，我不會簽字。",
      pressureDelta: 10,
    },
  },
  {
    id: "evt-vp",
    triggerAtSecondsRemaining: 180,
    triggered: false,
    type: "urgent_modal",
    npcId: "sarah",
    label: "Sarah（VP）45 秒高壓突襲",
    payload: {
      modalTitle: "Sarah（產品副總裁）· 限時 45 秒",
      modalPrompt:
        "我正準備進高管會議，用一句話告訴我你目前發現的最大風險與初步傾向！我冇時間聽背景故事。",
      modalTimeoutSeconds: 45,
      pressureDelta: 20,
    },
  },
  {
    id: "evt-final",
    triggerAtSecondsRemaining: 60,
    triggered: false,
    type: "system",
    label: "簽核時限進入最後 1 分鐘",
    payload: {
      message:
        "距離上線簽核截止只剩 1 分鐘。未完成簽核將被視為放棄把關權，系統會依 Marcus 的建議自動放行。",
      pressureDelta: 18,
    },
  },
];

// ---------------------------------------------------------------------------
// 旗艦劇本
// ---------------------------------------------------------------------------

export const flagshipScenario: Scenario = {
  id: "nexus-launch-crisis",
  summary: scenarioCatalog[0],
  totalSeconds: 600,
  studentRole: "產品營運專員 · 掌握最終上線簽核權",
  company: "NovaTech",
  npcs,
  documents,
  timeline,
  decisionOptions: [
    {
      value: "approve_full",
      label: "立即全量發布",
      description: "依 Marcus 建議，今晚 20:00 向全體 50,000 名客戶推送 NovaAssist 2.0。",
    },
    {
      value: "delay_retest",
      label: "暫緩發布並退回重測",
      description: "要求以真實客戶樣本重做測試，並補上人工覆核機制後再排期。",
    },
    {
      value: "canary_release",
      label: "縮小為 5% 內部灰度測試",
      description: "先向 2,500 名客戶灰度發布，加裝人工覆核攔截，指標達標後再擴大。",
    },
  ],
  openingBrief:
    "你是 NovaTech 的產品營運專員，距離 NovaAssist 2.0 全量上線還有 10 分鐘。增長總監 Marcus 已送來「92% 滿意度」的亮點簡報，並要你立刻簽核。\n\n簡報下方那行極小字，可能是一個陷阱。左欄有四位同事，其中一位握有原始測試日誌——但你得先問對問題。",
};

export const getScenario = (id: string): Scenario | undefined =>
  id === flagshipScenario.id ? flagshipScenario : undefined;

export const getNpc = (id: Scenario["npcs"][number]["id"]): NpcProfile | undefined =>
  flagshipScenario.npcs.find((npc) => npc.id === id);
